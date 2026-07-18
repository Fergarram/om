"use strict";

//
// <isolated-webview src="...">
//
// A custom element that renders a URL inside its own isolated offscreen
// guest BrowserWindow, compositing the guest's frames into a per element
// canvas and forwarding input back. Instances are independent: each owns
// a separate guest process keyed by a unique id. All instances share one
// WebGPU device; only the canvas context and accumulation texture are
// per instance.
//
// Frame source is decided by the main process (shared texture when
// available, cpu bitmaps otherwise). The element reacts to whichever
// kind of frame arrives, so a given canvas only ever binds one context
// type and never gets poisoned.
//

//
// Constants
//

const CURSOR_MAP = {
	default: "default",
	pointer: "pointer",
	hand: "pointer",
	text: "text",
	crosshair: "crosshair",
	wait: "wait",
	help: "help",
	move: "move",
	"not-allowed": "not-allowed",
	"no-drop": "no-drop",
	grab: "grab",
	grabbing: "grabbing",
	"col-resize": "col-resize",
	"row-resize": "row-resize",
	"n-resize": "n-resize",
	"s-resize": "s-resize",
	"e-resize": "e-resize",
	"w-resize": "w-resize",
	"ne-resize": "ne-resize",
	"nw-resize": "nw-resize",
	"se-resize": "se-resize",
	"sw-resize": "sw-resize",
	"ew-resize": "ew-resize",
	"ns-resize": "ns-resize",
	"nesw-resize": "nesw-resize",
	"nwse-resize": "nwse-resize",
	"zoom-in": "zoom-in",
	"zoom-out": "zoom-out",
	none: "none",
};

const SPECIAL_KEY_CODES = {
	ArrowUp: "Up",
	ArrowDown: "Down",
	ArrowLeft: "Left",
	ArrowRight: "Right",
	" ": "Space",
};

//
// State
//

const instances = new Map();
let next_id = 1;
let gpu_shared = null;
let gpu_shared_promise = null;
let debug_frames_left = 3;

//
// Element
//

class IsolatedWebview extends HTMLElement {
	static observedAttributes = ["src"];

	constructor() {
		super();
		this.wv_id = null;
		this.canvas = null;
		this.gpu_context = null;
		this.frame_texture = null;
		this.webgl = null;
		this.resize_observer = null;
		this.stat_frames = 0;
		this.stat_draw_ms = 0;
		this.stat_last_report = 0;
	}

	connectedCallback() {
		if (this.wv_id) return;

		this.wv_id = String(next_id++);
		this.canvas = document.createElement("canvas");
		this.canvas.tabIndex = 0;
		this.appendChild(this.canvas);
		this.stat_last_report = performance.now();

		instances.set(this.wv_id, this);
		this.attachInput();
		this.observeResize();

		const rect = this.canvas.getBoundingClientRect();
		window.__sys.invoke("webview:create", {
			id: this.wv_id,
			url: this.getAttribute("src") || "about:blank",
			width: Math.max(1, Math.round(rect.width)),
			height: Math.max(1, Math.round(rect.height)),
		});
	}

	disconnectedCallback() {
		if (!this.wv_id) return;
		if (this.resize_observer) this.resize_observer.disconnect();
		instances.delete(this.wv_id);
		window.__sys.send("webview:destroy", this.wv_id);
		this.wv_id = null;
	}

	attributeChangedCallback(name, old_value, new_value) {
		// Initial src is consumed by connectedCallback; only react to
		// changes once the instance exists.
		if (name === "src" && this.wv_id && new_value && new_value !== old_value) {
			window.__sys.send("webview:navigate", this.wv_id, new_value);
		}
	}

	//
	// Public API
	//

	loadURL(url) {
		if (this.wv_id) window.__sys.send("webview:navigate", this.wv_id, url);
	}

	goBack() {
		if (this.wv_id) window.__sys.send("webview:back", this.wv_id);
	}

	goForward() {
		if (this.wv_id) window.__sys.send("webview:forward", this.wv_id);
	}

	reload() {
		if (this.wv_id) window.__sys.send("webview:reload", this.wv_id);
	}

	//
	// Sizing and stats
	//
	// Frames arrive in physical pixels at the display scale factor. The
	// canvas fills the element via CSS, so only the intrinsic backing
	// size must track the frame for coordinate math to stay in DIP.
	//

	ensureCanvasSize(width, height) {
		if (this.canvas.width === width && this.canvas.height === height) return false;
		this.canvas.width = width;
		this.canvas.height = height;
		return true;
	}

	countFrame(draw_start) {
		this.stat_frames++;
		this.stat_draw_ms += performance.now() - draw_start;
		const now = performance.now();
		if (now - this.stat_last_report >= 1000) {
			const avg_ms = this.stat_frames > 0 ? this.stat_draw_ms / this.stat_frames : 0;
			this.dispatchEvent(
				new CustomEvent("webview-stats", {
					detail: { fps: this.stat_frames, draw_ms: avg_ms },
				}),
			);
			this.stat_frames = 0;
			this.stat_draw_ms = 0;
			this.stat_last_report = now;
		}
	}

	//
	// Shared texture path
	//
	// The VideoFrame is imported as a WebGPU external texture (zero copy)
	// and a fullscreen quad samples it into a persistent per instance
	// texture, scissored to the update rect (only that region is fresh in
	// the rotating surface pool). That texture accumulates and is copied
	// to the canvas each frame.
	//

	async drawVideoFrame(video_frame, meta) {
		const draw_start = performance.now();
		const shared = await ensureGpuShared();

		if (!this.gpu_context) {
			this.gpu_context = this.canvas.getContext("webgpu");
			if (!this.gpu_context) {
				window.__sys.send(
					"webview:log",
					"webgpu context unavailable for isolated-webview canvas",
				);
				return;
			}
			this.gpu_context.configure({
				device: shared.device,
				format: shared.format,
				alphaMode: "opaque",
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
			});
		}

		const frame_width = video_frame.displayWidth;
		const frame_height = video_frame.displayHeight;

		if (debug_frames_left > 0) {
			debug_frames_left--;
			window.__sys.send(
				"webview:log",
				`videoframe id=${meta.id} display=${frame_width}x${frame_height}` +
					` visible=${JSON.stringify(meta.visible_rect)} content=${JSON.stringify(meta.content_size)}`,
			);
		}

		const resized = this.ensureCanvasSize(frame_width, frame_height);

		if (resized || !this.frame_texture) {
			if (this.frame_texture) this.frame_texture.destroy();
			this.frame_texture = shared.device.createTexture({
				size: { width: frame_width, height: frame_height },
				format: shared.format,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
			});
		}

		const meta_full = meta.visible_rect || { width: frame_width, height: frame_height };
		const scale_x = frame_width / meta_full.width;
		const scale_y = frame_height / meta_full.height;

		// Full redraw after a resize or when no update rect came
		let rect = resized ? null : meta.update_rect;
		if (rect) {
			rect = {
				x: Math.floor(rect.x * scale_x),
				y: Math.floor(rect.y * scale_y),
				width: Math.ceil(rect.width * scale_x),
				height: Math.ceil(rect.height * scale_y),
			};
		}
		const fits =
			rect &&
			rect.width > 0 &&
			rect.height > 0 &&
			rect.x >= 0 &&
			rect.y >= 0 &&
			rect.x + rect.width <= frame_width &&
			rect.y + rect.height <= frame_height;
		const full_draw = !fits;
		if (full_draw) rect = { x: 0, y: 0, width: frame_width, height: frame_height };

		const external_texture = shared.device.importExternalTexture({ source: video_frame });
		const bind_group = shared.device.createBindGroup({
			layout: shared.bind_group_layout,
			entries: [
				{ binding: 0, resource: external_texture },
				{ binding: 1, resource: shared.sampler },
			],
		});

		const encoder = shared.device.createCommandEncoder();
		const pass = encoder.beginRenderPass({
			colorAttachments: [
				{
					view: this.frame_texture.createView(),
					loadOp: full_draw ? "clear" : "load",
					storeOp: "store",
					clearValue: { r: 0, g: 0, b: 0, a: 1 },
				},
			],
		});
		pass.setPipeline(shared.pipeline);
		pass.setBindGroup(0, bind_group);
		pass.setScissorRect(rect.x, rect.y, rect.width, rect.height);
		pass.draw(6);
		pass.end();

		encoder.copyTextureToTexture(
			{ texture: this.frame_texture },
			{ texture: this.gpu_context.getCurrentTexture() },
			{ width: frame_width, height: frame_height },
		);
		shared.device.queue.submit([encoder.finish()]);

		this.countFrame(draw_start);
	}

	//
	// Pixel path (cpu mode)
	//
	// Frames arrive as byte buffers over IPC and upload through WebGL:
	// raw bgra/rgba bytes go into an RGBA texture and a fullscreen
	// triangle swaps channels in the shader. UNPACK_ROW_LENGTH handles
	// stride.
	//

	drawPixelFrame(frame) {
		const draw_start = performance.now();

		if (!this.webgl) this.webgl = createGlContext(this.canvas);
		const { gl, swap_rb_location } = this.webgl;

		if (this.ensureCanvasSize(frame.width, frame.height)) {
			gl.viewport(0, 0, frame.width, frame.height);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				frame.width,
				frame.height,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
		}

		const { dirty } = frame;
		if (
			dirty.x + dirty.width > this.canvas.width ||
			dirty.y + dirty.height > this.canvas.height
		) {
			// Stale frame from before a resize, a full repaint follows
			return;
		}

		const { pixels, band_x, band_y, bytes_per_row, pixel_format } = frame;
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, bytes_per_row >> 2);
		gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, dirty.x - band_x);
		gl.pixelStorei(gl.UNPACK_SKIP_ROWS, dirty.y - band_y);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			dirty.x,
			dirty.y,
			dirty.width,
			dirty.height,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			pixels,
			0,
		);

		gl.uniform1i(swap_rb_location, pixel_format !== "rgba" ? 1 : 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		this.countFrame(draw_start);
	}

	//
	// Resize
	//

	observeResize() {
		this.resize_observer = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect;
			if (rect.width >= 1 && rect.height >= 1) {
				window.__sys.send("webview:resize", this.wv_id, {
					width: rect.width,
					height: rect.height,
				});
			}
		});
		this.resize_observer.observe(this);
	}

	//
	// Input forwarding
	//

	attachInput() {
		const canvas = this.canvas;
		const id = this.wv_id;

		// mousemove is rAF aligned (coalesced to one event per host
		// display frame), adding a frame of latency. pointerrawupdate is
		// unaligned and delivers at device rate.
		const forwardMouseMove = (event) => {
			const { x, y } = this.canvasCoords(event);
			window.__sys.send("webview:input", id, {
				type: "mouseMove",
				x,
				y,
				modifiers: eventModifiers(event),
			});
		};

		if ("onpointerrawupdate" in window) {
			canvas.addEventListener("pointerrawupdate", forwardMouseMove);
		} else {
			canvas.addEventListener("mousemove", forwardMouseMove);
		}

		canvas.addEventListener("mousedown", (event) => {
			canvas.focus();
			window.__sys.send("webview:focus", id);
			const { x, y } = this.canvasCoords(event);
			window.__sys.send("webview:input", id, {
				type: "mouseDown",
				x,
				y,
				button: mouseButtonName(event.button),
				clickCount: event.detail || 1,
				modifiers: eventModifiers(event),
			});
		});

		canvas.addEventListener("mouseup", (event) => {
			const { x, y } = this.canvasCoords(event);
			window.__sys.send("webview:input", id, {
				type: "mouseUp",
				x,
				y,
				button: mouseButtonName(event.button),
				clickCount: event.detail || 1,
				modifiers: eventModifiers(event),
			});
		});

		// hasPreciseScrollingDeltas marks deltas as trackpad style so the
		// guest applies them immediately instead of easing through the
		// smooth scroll animation, which reads as lag.
		canvas.addEventListener(
			"wheel",
			(event) => {
				event.preventDefault();
				const { x, y } = this.canvasCoords(event);
				const line_mode = event.deltaMode === WheelEvent.DOM_DELTA_LINE;
				const scale = line_mode ? 16 : 1;
				const delta_x = -event.deltaX * scale;
				const delta_y = -event.deltaY * scale;
				window.__sys.send("webview:input", id, {
					type: "mouseWheel",
					x,
					y,
					deltaX: delta_x,
					deltaY: delta_y,
					wheelTicksX: delta_x / 120,
					wheelTicksY: delta_y / 120,
					hasPreciseScrollingDeltas: !line_mode,
					canScroll: true,
					modifiers: eventModifiers(event),
				});
			},
			{ passive: false },
		);

		canvas.addEventListener("contextmenu", (event) => event.preventDefault());

		canvas.addEventListener("keydown", (event) => {
			event.preventDefault();

			const command = editCommandFor(event);
			if (command) {
				window.__sys.send("webview:command", id, command);
				return;
			}

			const modifiers = eventModifiers(event);
			if (event.repeat) modifiers.push("isAutoRepeat");

			window.__sys.send("webview:input", id, {
				type: "keyDown",
				keyCode: electronKeyCode(event),
				modifiers,
			});

			// Printable characters and Enter need a char event. Skip it
			// when a command modifier is held so shortcuts do not type.
			const printable = event.key.length === 1 && !event.metaKey && !event.ctrlKey;
			if (printable || event.key === "Enter") {
				window.__sys.send("webview:input", id, {
					type: "char",
					keyCode: event.key === "Enter" ? "Return" : event.key,
					modifiers,
				});
			}
		});

		canvas.addEventListener("keyup", (event) => {
			event.preventDefault();
			window.__sys.send("webview:input", id, {
				type: "keyUp",
				keyCode: electronKeyCode(event),
				modifiers: eventModifiers(event),
			});
		});
	}

	canvasCoords(event) {
		const rect = this.canvas.getBoundingClientRect();
		return {
			x: Math.round(event.clientX - rect.left),
			y: Math.round(event.clientY - rect.top),
		};
	}
}

//
// Code execution
//

const style = document.createElement("style");
style.textContent = `
		isolated-webview {
			display: block;
			position: relative;
			overflow: hidden;
		}
		isolated-webview > canvas {
			display: block;
			width: 100%;
			height: 100%;
			outline: none;
		}
	`;
document.head.appendChild(style);

// One shared texture receiver and one pixel frame listener for the whole
// page, both routing to the right instance by id.

if (window.__sys.shared_texture_supported) {
	window.__sys.setSharedTextureReceiver(async (imported, meta) => {
		const instance = instances.get(meta.id);
		if (!instance) return;
		const video_frame = imported.getVideoFrame();
		try {
			await instance.drawVideoFrame(video_frame, meta);
		} finally {
			video_frame.close();
		}
	});
}

window.__sys.on("webview:frame", (id, frame) => {
	const instance = instances.get(id);
	if (instance) instance.drawPixelFrame(frame);
});

window.__sys.on("webview:cursor", (id, type) => {
	const instance = instances.get(id);
	if (instance) instance.canvas.style.cursor = CURSOR_MAP[type] || "default";
});

window.__sys.on("webview:url", (id, url) => {
	const instance = instances.get(id);
	if (instance) instance.dispatchEvent(new CustomEvent("did-navigate", { detail: { url } }));
});

window.__sys.on("webview:title", (id, title) => {
	const instance = instances.get(id);
	if (instance)
		instance.dispatchEvent(new CustomEvent("page-title-updated", { detail: { title } }));
});

window.__sys.send("webview:ready");

customElements.define("isolated-webview", IsolatedWebview);

//
// Functions
//

async function ensureGpuShared() {
	if (gpu_shared) return gpu_shared;
	if (!gpu_shared_promise) {
		gpu_shared_promise = initGpuShared().catch((error) => {
			gpu_shared_promise = null;
			throw error;
		});
	}
	gpu_shared = await gpu_shared_promise;
	return gpu_shared;
}

async function initGpuShared() {
	if (!navigator.gpu) throw new Error("WebGPU unavailable");
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) throw new Error("no WebGPU adapter");
	const device = await adapter.requestDevice();
	const format = navigator.gpu.getPreferredCanvasFormat();

	const bind_group_layout = device.createBindGroupLayout({
		entries: [
			{ binding: 0, visibility: GPUShaderStage.FRAGMENT, externalTexture: {} },
			{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
		],
	});

	const vertex_wgsl = `
		struct VSOut {
			@builtin(position) pos: vec4<f32>,
			@location(0) uv: vec2<f32>,
		};
		@vertex
		fn main(@builtin(vertex_index) index: u32) -> VSOut {
			var positions = array<vec2<f32>, 6>(
				vec2<f32>(-1.0, -1.0),
				vec2<f32>(1.0, -1.0),
				vec2<f32>(-1.0, 1.0),
				vec2<f32>(-1.0, 1.0),
				vec2<f32>(1.0, -1.0),
				vec2<f32>(1.0, 1.0)
			);
			let p = positions[index];
			var out: VSOut;
			out.pos = vec4<f32>(p, 0.0, 1.0);
			out.uv = vec2<f32>((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5);
			return out;
		}
	`;

	const fragment_wgsl = `
		@group(0) @binding(0) var ext_tex: texture_external;
		@group(0) @binding(1) var samp: sampler;
		@fragment
		fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
			return textureSampleBaseClampToEdge(ext_tex, samp, uv);
		}
	`;

	const pipeline = device.createRenderPipeline({
		layout: device.createPipelineLayout({ bindGroupLayouts: [bind_group_layout] }),
		vertex: {
			module: device.createShaderModule({ code: vertex_wgsl }),
			entryPoint: "main",
		},
		fragment: {
			module: device.createShaderModule({ code: fragment_wgsl }),
			entryPoint: "main",
			targets: [{ format }],
		},
		primitive: { topology: "triangle-list" },
	});

	return { device, format, bind_group_layout, pipeline, sampler: device.createSampler() };
}

function createGlContext(canvas) {
	const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });

	const vertex_src = `#version 300 es
	layout(location = 0) in vec2 pos;
	out vec2 uv;
	void main() {
		uv = pos * 0.5 + 0.5;
		uv.y = 1.0 - uv.y;
		gl_Position = vec4(pos, 0.0, 1.0);
	}`;

	const fragment_src = `#version 300 es
	precision mediump float;
	uniform sampler2D frame_tex;
	uniform bool swap_rb;
	in vec2 uv;
	out vec4 color;
	void main() {
		vec4 c = texture(frame_tex, uv);
		color = vec4(swap_rb ? c.bgr : c.rgb, 1.0);
	}`;

	function compileShader(type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(gl.getShaderInfoLog(shader));
		}
		return shader;
	}

	const program = gl.createProgram();
	gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertex_src));
	gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragment_src));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramInfoLog(program));
	}
	gl.useProgram(program);

	const swap_rb_location = gl.getUniformLocation(program, "swap_rb");

	const quad_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const frame_texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, frame_texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	return { gl, swap_rb_location };
}

function eventModifiers(event) {
	const modifiers = [];
	if (event.ctrlKey) modifiers.push("control");
	if (event.shiftKey) modifiers.push("shift");
	if (event.altKey) modifiers.push("alt");
	if (event.metaKey) modifiers.push("meta");
	return modifiers;
}

function mouseButtonName(button) {
	if (button === 1) return "middle";
	if (button === 2) return "right";
	return "left";
}

function electronKeyCode(event) {
	return SPECIAL_KEY_CODES[event.key] || event.key;
}

// Synthesized key events do not trigger clipboard or menu actions, so
// editing shortcuts dispatch as webContents commands instead.
function editCommandFor(event) {
	if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
	const key = event.key.toLowerCase();
	if (key === "c" && !event.shiftKey) return "copy";
	if (key === "x" && !event.shiftKey) return "cut";
	if (key === "v") return event.shiftKey ? "pasteAndMatchStyle" : "paste";
	if (key === "a" && !event.shiftKey) return "selectAll";
	if (key === "z") return event.shiftKey ? "redo" : "undo";
	return null;
}
