import { css, finish, GlobalStyleSheet, is_scrollable } from "../../lib/utils.js";
import van from "../../lib/van.js";
import { initialize_background_canvas } from "./background.js";
const { div, canvas } = van.tags;

//
// Desktop Setup
//

let desktop_el = null;
let surface_el = null;

const surface_initial_width = 100000;
const surface_initial_height = surface_initial_width * (window.innerHeight / window.innerWidth);
const applet_shadow_map = div({
	id: "applet-shadow-map",
	style: () => css`
		pointer-events: none;
		opacity: 0;
	`,
});

van.add(document.body, applet_shadow_map);

await finish();

const shadow_root = applet_shadow_map.attachShadow({ mode: "open" });

const HANDLE_CONFIG = {
	EDGE_SIZE: 12,
	CORNER_SIZE: 12,
	OFFSET: -6,
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1;

let applet_initializers = {};
let place_callbacks = [];
let remove_callbacks = [];
let order_change_callbacks = [];

// Camera Controls
let camera_x = 0;
let camera_y = 0;
let scrolling_timeout = null;
let zoom_timeout = null;
let is_panning = false;
let is_scrolling = false;
let last_middle_click_x = 0;
let last_middle_click_y = 0;
let current_scale = 1;
let pending_mouse_dx = 0;
let pending_mouse_dy = 0;
let has_pending_mouse_movement = false;
const zoom_level = van.state(1);
const is_zooming = van.state(false);
const scroll_thumb_x = van.state(0);
const scroll_thumb_y = van.state(0);

// Applet Interactions
let last_mouse_x = 0;
let last_mouse_y = 0;
let delta_x = 0;
let delta_y = 0;
let dragged_applet = null;
let dragging_x = 0;
let dragging_y = 0;
let last_width = 0;
let last_height = 0;
let last_left = 0;
let last_top = 0;
let current_mouse_button = null;
let min_width = 10;
let min_height = 10;
let is_resizing = false;
let resize_edge = null;
let is_right_resize = false;
let resize_start_width = 0;
let resize_start_height = 0;
let resize_start_x = 0;
let resize_start_y = 0;
let resize_quadrant = null;
let resize_start_left = 0;
let resize_start_top = 0;

const observer = new MutationObserver((mutations) => {
	for (let mutation of mutations) {
		if (mutation.type === "childList") {
			if (mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						node.getAttribute("om-motion") !== "elevated" &&
						node.hasAttribute("om-applet")
					) {
						place_applet(node);
					}
				});
			}

			if (mutation.removedNodes.length > 0) {
				mutation.removedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						node.getAttribute("om-motion") !== "elevated" &&
						node.hasAttribute("om-applet")
					) {
						remove_applet(node);
					}
				});
			}
		}
	}
});

//
// Layout and Styles

GlobalStyleSheet(css`
	#om-desktop {
		position: relative;
		width: 100%;
		height: auto;
		flex-grow: 1;
		overflow: hidden;
	}

	#om-desktop-canvas {
		position: absolute;
		width: 100%;
		height: auto;
		bottom: 0;
		flex-grow: 1;
		overflow: hidden;
	}

	#om-desktop-surface {
		position: absolute;
		transform-origin: 0 0;
		transform: scale(1);
		width: ${surface_initial_width}px;
		height: ${surface_initial_height}px;
	}
`);

export async function initialize_desktop(om_space) {
	const desktop = div(
		{
			id: "om-desktop",
		},
		div({
			id: "om-desktop-surface",
			style: () => (is_zooming.val ? `will-change: transform, width, height;` : ``),
		}),
	);

	const canvas_el = canvas({
		id: "om-desktop-canvas",
	});

	van.add(om_space, canvas_el);
	van.add(om_space, desktop);

	await finish();

	const { draw_wallpaper, resize_canvas } = await initialize_background_canvas(desktop, canvas_el);

	observer.observe(surface(), { childList: true });

	on_applet_place(handle_applet_placement);

	handle_resize();

	window.addEventListener("resize", handle_resize);
	window.addEventListener("keydown", handle_global_keydown);
	desktop.addEventListener("wheel", desktop_wheel, { passive: false });
	desktop.addEventListener("scroll", desktop_scroll);
	surface().addEventListener("mousedown", surface_mousedown);
	window.addEventListener("mouseleave", window_mouseout);
	window.addEventListener("mouseout", window_mouseout);
	window.addEventListener("dblclick", window_dblclick);
	window.addEventListener("mousedown", window_mousedown);
	window.addEventListener("mouseup", window_mouseup);
	window.addEventListener("mousemove", window_mousemove);
	requestAnimationFrame(step);

	scroll_to_center();

	function scroll_to_center() {
		const rect = surface().getBoundingClientRect();
		desktop.scroll({
			left: rect.width / 2 - desktop.offsetWidth / 2,
			top: rect.height / 2 - desktop.offsetHeight / 2,
		});
	}

	function update_surface_scale() {
		surface().style.transform = `scale(${current_scale})`;
		zoom_level.val = current_scale;
	}

	function handle_resize() {
		resize_canvas();
		draw_wallpaper(camera_x, camera_y, current_scale);
	}

	async function handle_global_keydown(e) {
		// Prevent default window zooming
		if ((e.ctrlKey || e.metaKey) && e.key === "=") {
			e.preventDefault();
		} else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
			e.preventDefault();
		} else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
			e.preventDefault();
		}

		if (e.altKey) {
			// Store current scroll position and viewport dimensions
			const prev_scroll_x = desktop.scrollLeft;
			const prev_scroll_y = desktop.scrollTop;
			const viewport_width = desktop.offsetWidth;
			const viewport_height = desktop.offsetHeight;

			// Calculate center point before scale change
			const center_x = (prev_scroll_x + viewport_width / 2) / current_scale;
			const center_y = (prev_scroll_y + viewport_height / 2) / current_scale;

			if (e.key === "≠") {
				e.preventDefault();
				is_zooming.val = true;
				current_scale = Math.min(current_scale + 0.1, 1.0);
			} else if (e.key === "–") {
				e.preventDefault();
				is_zooming.val = true;
				current_scale = Math.max(current_scale - 0.1, 0.1);
			} else if (e.key === "º") {
				e.preventDefault();
				is_zooming.val = true;
				current_scale = 1.0;
			} else {
				return;
			}

			// Update the scale immediately
			update_surface_scale();
			await finish();

			// Calculate new scroll position to maintain center point
			const new_scroll_x = center_x * current_scale - viewport_width / 2;
			const new_scroll_y = center_y * current_scale - viewport_height / 2;

			// Apply new scroll position
			desktop.scrollTo({
				left: new_scroll_x,
				top: new_scroll_y,
			});

			// Reset is_zooming after a short delay
			clearTimeout(zoom_timeout);
			zoom_timeout = setTimeout(() => {
				is_zooming.val = false;
			}, 150);
		}
	}

	async function desktop_wheel(e) {
		let target = e.target;
		while (target && target !== surface()) {
			if (is_scrollable(target) && !is_scrolling) {
				return;
			}
			target = target.parentElement;
		}

		if (window.is_trackpad.val && window.superkeydown && e.shiftKey && !e.ctrlKey) {
			e.preventDefault();
			desktop.scrollTo({
				left: camera_x + e.deltaX,
				top: camera_y + e.deltaY,
			});
		} else if (
			(window.superkeydown && !is_panning) ||
			(window.is_trackpad.val && window.superkeydown && e.shiftKey && e.ctrlKey)
		) {
			e.preventDefault();

			// Store current scroll position and viewport dimensions
			const prev_scroll_x = desktop.scrollLeft;
			const prev_scroll_y = desktop.scrollTop;

			// Get cursor position relative to the viewport
			const rect = desktop.getBoundingClientRect();
			const cursor_x = e.clientX - rect.left;
			const cursor_y = e.clientY - rect.top;

			// Calculate origin point before scale change
			const point_x = (prev_scroll_x + cursor_x) / current_scale;
			const point_y = (prev_scroll_y + cursor_y) / current_scale;

			// Calculate a scale factor that's smaller at low zoom levels
			// The 0.05 at scale 1.0 will reduce to 0.005 at scale 0.1
			const scale_factor = Math.max(0.005, current_scale * 0.05);

			// Calculate new scale with variable increment based on current scale
			const delta = e.deltaY > 0 ? -scale_factor : scale_factor;
			let new_scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current_scale + delta));

			// Only proceed if the scale actually changed
			if (new_scale !== current_scale) {
				is_zooming.val = true;
				current_scale = new_scale;

				// Update the scale immediately
				update_surface_scale();

				// Calculate new scroll position to maintain cursor point
				const new_scroll_x = point_x * current_scale - cursor_x;
				const new_scroll_y = point_y * current_scale - cursor_y;

				// Apply new scroll position
				desktop.scrollTo({
					left: new_scroll_x,
					top: new_scroll_y,
				});

				// Reset is_zooming after a short delay
				clearTimeout(zoom_timeout);
				zoom_timeout = setTimeout(() => {
					is_zooming.val = false;
				}, 150);
			}
		}
	}

	function desktop_scroll(e) {
		is_scrolling = true;

		clearTimeout(scrolling_timeout);
		scrolling_timeout = setTimeout(() => {
			is_scrolling = false;
		}, 150);

		const rect = surface().getBoundingClientRect();
		const max_x = rect.width - desktop.offsetWidth;
		const max_y = rect.height - desktop.offsetHeight;

		let new_x = desktop.scrollLeft;
		let new_y = desktop.scrollTop;

		if (new_x >= max_x) {
			new_x = max_x;
		}

		if (new_y >= max_y) {
			new_y = max_y;
		}

		camera_x = desktop.scrollLeft;
		camera_y = desktop.scrollTop;

		scroll_thumb_x.val = (desktop.scrollLeft / rect.width) * 100;
		scroll_thumb_y.val = (desktop.scrollTop / rect.height) * 100;
	}

	function surface_mousedown(e) {
		if ((window.superkeydown && e.button === 1) || (window.superkeydown && e.button === 0 && e.target === surface())) {
			e.preventDefault();
			is_panning = true;
			document.body.classList.add("is-panning");
			last_middle_click_x = e.clientX;
			last_middle_click_y = e.clientY;
		}
	}

	function window_mouseout(e) {
		if (e.target.tagName !== "HTML") return;
		is_panning = false;
		document.body.classList.remove("is-panning");
	}

	function window_dblclick(e) {
		// if (e.)
	}

	function window_mousedown(e) {}

	function window_mouseup(e) {
		if (e.button === 1 || e.button === 0) {
			is_panning = false;
			document.body.classList.remove("is-panning");
		}
	}

	function window_mousemove(e) {
		if (is_panning) {
			// Calculate the delta and store it for the next animation frame
			pending_mouse_dx += e.clientX - last_middle_click_x;
			pending_mouse_dy += e.clientY - last_middle_click_y;
			has_pending_mouse_movement = true;

			// Update the last mouse position
			last_middle_click_x = e.clientX;
			last_middle_click_y = e.clientY;
		}
	}

	function step() {
		// Process any pending mouse movements in the animation frame
		if (has_pending_mouse_movement && is_panning) {
			// Apply the delta, adjusted for scale
			camera_x -= pending_mouse_dx;
			camera_y -= pending_mouse_dy;
			pending_mouse_dx = 0;
			pending_mouse_dy = 0;
			has_pending_mouse_movement = false;
		}

		if (camera_x <= 0) {
			camera_x = 0;
		}

		if (camera_y <= 0) {
			camera_y = 0;
		}

		const rect = surface().getBoundingClientRect();
		const max_x = rect.width - desktop.offsetWidth;
		const max_y = rect.height - desktop.offsetHeight;

		if (camera_x >= max_x) {
			camera_x = max_x;
		}

		if (camera_y >= max_y) {
			camera_y = max_y;
		}

		if (is_panning) {
			desktop.scroll({
				left: camera_x,
				top: camera_y,
				behavior: "instant",
			});
		}

		// Update the scale consistently in the animation loop
		update_surface_scale();

		// Draw the wallpaper with the current scroll and zoom
		draw_wallpaper(camera_x, camera_y, current_scale);

		requestAnimationFrame(step);
	}
}

export function get_camera_position() {
	return { x: camera_x, y: camera_y };
}

export function get_camera_center() {
	return {
		x: (camera_x + desktop().offsetWidth / 2) / current_scale,
		y: (camera_y + desktop().offsetHeight / 2) / current_scale,
	};
}

export function desktop() {
	if (!desktop_el) {
		desktop_el = document.getElementById("om-desktop");
	}
	return desktop_el;
}

export function surface() {
	if (!surface_el) {
		surface_el = document.getElementById("om-desktop-surface");
	}
	return surface_el;
}

export function register_applet_initializer(window_name, initializer) {
	applet_initializers[window_name] = initializer;
}

export function on_applet_place(callback) {
	place_callbacks.push(callback);
}

export function on_applet_remove(callback) {
	remove_callbacks.push(callback);
}

export function on_order_change(callback) {
	order_change_callbacks.push(callback);
}

export async function place_applet(applet, first_mount = false) {
	place_callbacks.forEach((c) => c(applet, first_mount));

	if (!applet.hasAttribute("om-tsid")) {
		const uuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
		);
		applet.setAttribute("om-tsid", uuid);

		if (!first_mount) {
			add_shadow_clone(applet, uuid);
		}
	}

	if (!first_mount) save();
}

export async function remove_applet(applet) {
	remove_shadow_clone(applet);
	remove_callbacks.forEach((c) => c(applet));
}

export function lift(tsid) {
	const shadow_clone = shadow_root.querySelector(`[om-tsid="${tsid}"]`);
	shadow_clone.parentNode.insertBefore(shadow_clone, null);
	const applets = Array.from(surface().querySelectorAll("[om-applet]"));
	applets.forEach((win) => {
		const id = win.getAttribute("om-tsid");
		const m = shadow_root.querySelector(`[om-tsid="${id}"]`);
		const new_z_index = Array.from(m.parentNode.children).indexOf(m);
		win.style.zIndex = new_z_index;
		order_change_callbacks.forEach((c) => c(win, new_z_index));
	});
}

function save() {
	// console.log("If we want to save the current applet layout");
}

function add_shadow_clone(win, id) {
	const shadow_clone = document.createElement("div");
	shadow_clone.style.position = "absolute";
	shadow_clone.setAttribute("om-tsid", id);
	shadow_root.appendChild(shadow_clone);
	const new_z_index = shadow_root.children.length;
	win.style.zIndex = new_z_index;
	// Trigger z-index change callbacks
	order_change_callbacks.forEach((c) => c(win, new_z_index));
}

function remove_shadow_clone(win) {
	const removed_id = win.getAttribute("om-tsid");
	const shadow_clone = shadow_root.querySelector(`[om-tsid="${removed_id}"]`);
	if (shadow_clone) {
		// Update z-index of other mirrors
		const mirrors = Array.from(shadow_root.children);
		mirrors
			.filter((m) => m.getAttribute("om-tsid") !== removed_id)
			.forEach((m, i) => {
				const t = surface().querySelector(`[om-tsid="${m.getAttribute("om-tsid")}"]`);
				if (t) {
					const new_z_index = i + 1;
					t.style.zIndex = new_z_index;
					// Trigger z-index change callbacks
					order_change_callbacks.forEach((c) => c(t, new_z_index));
				}
			});
		shadow_clone.remove();
	}
}

async function handle_applet_placement(applet, first_mount = false) {
	if (!first_mount) {
		await finish();
		applet.setAttribute("om-motion", "idle");
		applet.style.removeProperty("will-change");
	}

	applet.addEventListener("contextmenu", prevent_context_menu);
	applet.addEventListener("mousedown", handle_mousedown);

	async function handle_mousedown(e) {
		if (!e.target || dragged_applet !== null || is_panning) return;

		current_mouse_button = e.button;

		const target = e.target;
		const is_contenteditable = target.isContentEditable || target.closest('[contenteditable="true"]');
		const is_drag_handle = target.hasAttribute("drag-handle");

		if (
			applet.getAttribute("om-motion") !== "idle" ||
			target.tagName === "A" ||
			target.tagName === "BUTTON" ||
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.tagName === "SELECT" ||
			is_contenteditable ||
			(target.tagName === "IMG" && target.getAttribute("draggable") !== "false")
		) {
			if (window.superkeydown) e.preventDefault();
		}

		if (window.superkeydown && current_mouse_button === 2) {
			e.preventDefault();

			// Start resizing with right click
			is_right_resize = true;
			dragged_applet = applet;

			// Store initial dimensions and mouse position
			resize_start_width = applet.offsetWidth;
			resize_start_height = applet.offsetHeight;
			resize_start_x = e.clientX;
			resize_start_y = e.clientY;
			resize_start_left = parseInt(applet.style.left) || 0;
			resize_start_top = parseInt(applet.style.top) || 0;

			// Determine which quadrant the click happened in
			const applet_rect = applet.getBoundingClientRect();
			const click_x = e.clientX;
			const click_y = e.clientY;

			// Calculate relative position within the applet
			const relative_x = (click_x - applet_rect.left) / applet_rect.width;
			const relative_y = (click_y - applet_rect.top) / applet_rect.height;

			// Determine quadrant (tl, tr, bl, br)
			if (relative_x < 0.5) {
				if (relative_y < 0.5) {
					resize_quadrant = "tl"; // top-left
				} else {
					resize_quadrant = "bl"; // bottom-left
				}
			} else {
				if (relative_y < 0.5) {
					resize_quadrant = "tr"; // top-right
				} else {
					resize_quadrant = "br"; // bottom-right
				}
			}

			// Set styling for resize operation
			applet.style.willChange = "width, height, left, top";

			// Lift the applet to the top
			const tsid = applet.getAttribute("om-tsid");
			lift(tsid);
		} else if ((window.superkeydown || is_drag_handle) && current_mouse_button === 0) {
			document.body.classList.add("is-dragging");
			let x = Number(applet.style.left.replace("px", ""));
			let y = Number(applet.style.top.replace("px", ""));

			dragging_x = x;
			dragging_y = y;
			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;

			applet.style.willChange = "filter, transform, left, top";

			const tsid = applet.getAttribute("om-tsid");
			lift(tsid);
			await finish();
			applet.style.left = "0";
			applet.style.top = "0";
			applet.setAttribute("om-motion", "elevated");
			applet.style.transform = `translate(${x}px, ${y}px) translateZ(0) scale(1.01)`;

			dragged_applet = applet;
		}

		window.addEventListener("mousemove", handle_mousemove);
		window.addEventListener("mouseup", handle_mouseup);
	}

	add_resize_handles(applet);

	function add_resize_handles(applet) {
		const edges = [
			"n",
			"e",
			"s",
			"w", // sides
			"ne",
			"se",
			"sw",
			"nw", // corners
		];

		edges.forEach((edge) => {
			const handle = document.createElement("div");
			handle.className = `resize-handle resize-${edge}`;
			handle.style.position = "absolute";

			// Set positioning and dimensions for each handle
			switch (edge) {
				case "n":
					handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.left = "0";
					handle.style.right = "0";
					handle.style.height = `${HANDLE_CONFIG.EDGE_SIZE}px`;
					handle.style.cursor = "n-resize";
					break;
				case "s":
					handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.left = "0";
					handle.style.right = "0";
					handle.style.height = `${HANDLE_CONFIG.EDGE_SIZE}px`;
					handle.style.cursor = "s-resize";
					break;
				case "e":
					handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.top = "0";
					handle.style.bottom = "0";
					handle.style.width = `${HANDLE_CONFIG.EDGE_SIZE}px`;
					handle.style.cursor = "e-resize";
					break;
				case "w":
					handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.top = "0";
					handle.style.bottom = "0";
					handle.style.width = `${HANDLE_CONFIG.EDGE_SIZE}px`;
					handle.style.cursor = "w-resize";
					break;
				case "ne":
					handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.cursor = "ne-resize";
					break;
				case "se":
					handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.right = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.cursor = "se-resize";
					break;
				case "sw":
					handle.style.bottom = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.cursor = "sw-resize";
					break;
				case "nw":
					handle.style.top = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.left = `${HANDLE_CONFIG.OFFSET}px`;
					handle.style.width = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.height = `${HANDLE_CONFIG.CORNER_SIZE}px`;
					handle.style.cursor = "nw-resize";
					break;
			}

			handle.addEventListener("mousedown", (e) => {
				if (e.button !== 0) return;

				e.preventDefault();
				e.stopPropagation();

				is_resizing = true;
				const ev = new CustomEvent("applet-resize-start", { detail: { applet } });
				window.dispatchEvent(ev);
				applet.setAttribute("om-motion", "resizing");
				document.body.classList.add("is-resizing");
				resize_edge = edge;
				dragged_applet = applet;

				// Store initial positions considering scale
				last_mouse_x = e.clientX;
				last_mouse_y = e.clientY;
				last_width = applet.offsetWidth;
				last_height = applet.offsetHeight;
				last_left = parseInt(applet.style.left) || 0;
				last_top = parseInt(applet.style.top) || 0;

				window.addEventListener("mousemove", handle_resize);
				window.addEventListener("mouseup", stop_resize);
			});

			applet.appendChild(handle);
		});
	}
}

function handle_resize(e) {
	if (!is_resizing || !dragged_applet) return;

	const dx = (e.clientX - last_mouse_x) / current_scale;
	const dy = (e.clientY - last_mouse_y) / current_scale;

	// Get computed style to respect min-width and min-height CSS properties
	const computed_style = window.getComputedStyle(dragged_applet);
	const css_min_width = parseFloat(computed_style.minWidth) || min_width;
	const css_min_height = parseFloat(computed_style.minHeight) || min_height;

	let new_width = last_width;
	let new_height = last_height;
	let new_left = last_left;
	let new_top = last_top;

	if (resize_edge.includes("e")) {
		new_width = Math.max(css_min_width, last_width + dx);
	}
	if (resize_edge.includes("w")) {
		const max_delta = last_width - css_min_width;
		const width_delta = Math.min(dx, max_delta);
		new_width = last_width - width_delta;
		new_left = last_left + width_delta;
	}
	if (resize_edge.includes("s")) {
		new_height = Math.max(css_min_height, last_height + dy);
	}
	if (resize_edge.includes("n")) {
		const max_delta = last_height - css_min_height;
		const height_delta = Math.min(dy, max_delta);
		new_height = last_height - height_delta;
		new_top = last_top + height_delta;
	}

	dragged_applet.style.width = `${new_width}px`;
	dragged_applet.style.height = `${new_height}px`;
	dragged_applet.style.left = `${new_left}px`;
	dragged_applet.style.top = `${new_top}px`;
}

function stop_resize() {
	if (is_resizing) {
		is_resizing = false;
		const ev = new CustomEvent("applet-resize-stop", { detail: { applet: dragged_applet } });
		window.dispatchEvent(ev);
		dragged_applet.setAttribute("om-motion", "idle");
		document.body.classList.remove("is-resizing");
		resize_edge = null;
		dragged_applet = null;
		window.removeEventListener("mousemove", handle_resize);
		window.removeEventListener("mouseup", stop_resize);
		save();
	}
}

async function handle_mousemove(e) {
	// Handle regular drag operation
	if (current_mouse_button === 0) {
		// Existing drag code
		delta_x = (last_mouse_x - e.clientX) / current_scale;
		delta_y = (last_mouse_y - e.clientY) / current_scale;
		last_mouse_x = e.clientX;
		last_mouse_y = e.clientY;

		dragging_x = dragging_x - delta_x;
		dragging_y = dragging_y - delta_y;

		if (dragged_applet && !e.shiftKey) {
			dragged_applet.style.transform = `translate(${dragging_x}px, ${dragging_y}px) translateZ(0) scale(1.01)`;
		} else if (dragged_applet && e.shiftKey) {
			dragged_applet.style.left = `${dragging_x}px`;
			dragged_applet.style.top = `${dragging_y}px`;
		}
	}
	// Handle right-click resize operation with quadrants
	else if (current_mouse_button === 2 && is_right_resize && dragged_applet) {
		// Calculate how much the mouse has moved since starting the resize
		const dx = (e.clientX - resize_start_x) / current_scale;
		const dy = (e.clientY - resize_start_y) / current_scale;

		// Get computed style to respect min-width and min-height CSS properties
		const computed_style = window.getComputedStyle(dragged_applet);
		const css_min_width = parseFloat(computed_style.minWidth) || min_width;
		const css_min_height = parseFloat(computed_style.minHeight) || min_height;

		// Initialize new dimensions and position
		let new_width = resize_start_width;
		let new_height = resize_start_height;
		let new_left = resize_start_left;
		let new_top = resize_start_top;

		// Apply changes based on which quadrant the resize started in
		switch (resize_quadrant) {
			case "br": // bottom-right
				// Just adjust width and height
				new_width = Math.max(css_min_width, resize_start_width + dx);
				new_height = Math.max(css_min_height, resize_start_height + dy);
				break;

			case "bl": // bottom-left
				// Adjust width (inversely) and height, and reposition left
				const width_change_bl = Math.min(dx, resize_start_width - css_min_width);
				new_width = Math.max(css_min_width, resize_start_width - dx);
				new_height = Math.max(css_min_height, resize_start_height + dy);
				new_left = resize_start_left + (resize_start_width - new_width);
				break;

			case "tr": // top-right
				// Adjust width and height (inversely), and reposition top
				new_width = Math.max(css_min_width, resize_start_width + dx);
				new_height = Math.max(css_min_height, resize_start_height - dy);
				new_top = resize_start_top + (resize_start_height - new_height);
				break;

			case "tl": // top-left
				// Adjust width and height (both inversely), and reposition both
				new_width = Math.max(css_min_width, resize_start_width - dx);
				new_height = Math.max(css_min_height, resize_start_height - dy);
				new_left = resize_start_left + (resize_start_width - new_width);
				new_top = resize_start_top + (resize_start_height - new_height);
				break;
		}

		// Apply the new dimensions and position
		dragged_applet.style.width = `${new_width}px`;
		dragged_applet.style.height = `${new_height}px`;
		dragged_applet.style.left = `${new_left}px`;
		dragged_applet.style.top = `${new_top}px`;

		// Set state
		if (!is_resizing) {
			is_resizing = true;
			const ev = new CustomEvent("applet-resize-start", { detail: { applet: dragged_applet } });
			window.dispatchEvent(ev);
			document.body.classList.add("is-resizing");
			dragged_applet.setAttribute("om-motion", "resizing");
		}
	}
}

async function handle_mouseup(e) {
	window.removeEventListener("mousemove", handle_mousemove);
	window.removeEventListener("mouseup", handle_mouseup);

	if (!dragged_applet) return;

	if (current_mouse_button === 0) {
		document.body.classList.remove("is-dragging");

		if (!e.shiftKey) {
			dragged_applet.style.left = `${dragging_x}px`;
			dragged_applet.style.top = `${dragging_y}px`;
			dragged_applet.style.removeProperty("transform");
			dragged_applet.style.removeProperty("will-change");
			await finish();
			dragged_applet.style.removeProperty("transition");
			await finish();
			dragged_applet.setAttribute("om-motion", "idle");
		} else {
			dragged_applet.style.removeProperty("will-change");
		}
	}
	// Handle completion of right-click resize
	else if (current_mouse_button === 2 && is_right_resize) {
		// Clean up
		is_resizing = false;
		is_right_resize = false;
		const ev = new CustomEvent("applet-resize-stop", { detail: { applet: dragged_applet } });
		window.dispatchEvent(ev);
		resize_quadrant = null;
		dragged_applet.style.removeProperty("will-change");
		dragged_applet.setAttribute("om-motion", "idle");
		document.body.classList.remove("is-resizing");
	}

	if (current_mouse_button === 0 || current_mouse_button === 2) {
		save();
	}

	dragged_applet = null;
}

function prevent_context_menu(e) {
	if ((e.metaKey || e.ctrlKey) && e.button === 2) {
		e.preventDefault();
		return false;
	}
	return true;
}
