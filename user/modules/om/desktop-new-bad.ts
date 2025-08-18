import { finish, uniqueId } from "@/lib/utils";
import { useTags } from "@/lib/ima";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;

const { div, canvas } = useTags();

// Desktop configuration
interface DesktopConfig {
	width?: number;
	height?: number;
	disable_camera?: boolean;
}

// Default surface dimensions for canvas mode
const DEFAULT_SURFACE_WIDTH = 100000;
const DEFAULT_SURFACE_HEIGHT = DEFAULT_SURFACE_WIDTH * (window.innerHeight / window.innerWidth);

// Resize handle configuration
const resize_handles = {
	edge_size: 12,
	corner_size: 12,
	offset: -6,
};

// Camera constraints
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1;

// Shared state
let desktop_el: HTMLElement | null = null;
let surface_el: HTMLElement | null = null;
let canvas_el: HTMLCanvasElement | null = null;
let shadow_host: HTMLElement | null = null;
let shadow_root: ShadowRoot | null = null;

// Desktop configuration state
let desktop_config: DesktopConfig = {
	width: DEFAULT_SURFACE_WIDTH,
	height: DEFAULT_SURFACE_HEIGHT,
	disable_camera: true, // Default to classic mode
};

// Camera controls (canvas mode)
let camera_x = 0;
let camera_y = 0;
let current_scale = 1;
let zoom_level = 1;
let is_panning = false;
let is_scrolling = false;
let is_zooming = false;
let last_middle_click_x = 0;
let last_middle_click_y = 0;
let pending_mouse_dx = 0;
let pending_mouse_dy = 0;
let has_pending_mouse_movement = false;
let scrolling_timeout: NodeJS.Timeout | null = null;
let zoom_timeout: NodeJS.Timeout | null = null;

// Applet interaction state
let last_mouse_x = 0;
let last_mouse_y = 0;
let delta_x = 0;
let delta_y = 0;
let dragged_applet: HTMLElement | null = null;
let dragging_x = 0;
let dragging_y = 0;
let last_width = 0;
let last_height = 0;
let last_left = 0;
let last_top = 0;
let current_mouse_button: number | null = null;
let min_width = 10;
let min_height = 10;
let is_resizing = false;
let resize_edge: string | null = null;

// Callbacks
let applet_initializers: Record<string, (applet: HTMLElement) => any> = {};
let mount_callbacks: ((applet: HTMLElement, first_mount: boolean) => void)[] = [];
let unmount_callbacks: ((applet: HTMLElement) => void)[] = [];
let order_change_callbacks: ((applet: HTMLElement, z_index: number) => void)[] = [];

// WebGL wallpaper functions (will be imported from background module)
let draw_wallpaper: ((x: number, y: number, scale: number) => void) | null = null;
let resize_canvas: (() => void) | null = null;

export function getTopWindow() {
	const desktop = getDesktop();
	if (!desktop) return null;

	const surface = getSurface();
	if (!surface) return null;

	const applets = Array.from(surface.querySelectorAll("[om-applet]")) as HTMLElement[];
	if (applets.length === 0) return null;

	const top_applet = applets.reduce((prev, current) => {
		const prev_z = parseInt(prev.style.zIndex) || 0;
		const current_z = parseInt(current.style.zIndex) || 0;
		return current_z > prev_z ? current : prev;
	});

	return top_applet;
}

export function appletExists(name: string) {
	const surface = getSurface();
	if (!surface) return false;
	return surface.querySelector(`[om-applet="${name}"]`) !== null;
}

export function findApplet(name: string) {
	const surface = getSurface();
	if (!surface) return null;
	return surface.querySelector(`[om-applet="${name}"]`) as HTMLElement | null;
}

export function mountedApplets(name: string) {
	if (!name) {
		throw new Error("Name is required");
	}
	const surface = getSurface();
	if (!surface) return [];
	return Array.from(surface.querySelectorAll(`[om-applet="${name}"]`) ?? []) as HTMLElement[];
}

export function useApplet(applet: HTMLElement) {
	const surface = getSurface();
	if (!surface) return;
	surface.appendChild(applet);
}

export function onAppletMounted(callback: (applet: HTMLElement, first_mount: boolean) => void) {
	mount_callbacks.push(callback);
}

export function onAppletRemoved(callback: (applet: HTMLElement) => void) {
	unmount_callbacks.push(callback);
}

export function onAppletOrderChange(callback: (applet: HTMLElement, z_index: number) => void) {
	order_change_callbacks.push(callback);
}

export function getCameraPosition() {
	return { x: camera_x, y: camera_y };
}

export function getCameraCenter() {
	const desktop = getDesktop();
	if (!desktop) return { x: 0, y: 0 };

	return {
		x: (camera_x + desktop.offsetWidth / 2) / current_scale,
		y: (camera_y + desktop.offsetHeight / 2) / current_scale,
	};
}

export function updateDesktopConfig(config: Partial<DesktopConfig>) {
	desktop_config = { ...desktop_config, ...config };

	// Apply configuration changes
	if (config.disable_camera !== undefined) {
		toggleCameraMode(!config.disable_camera);
	}

	if (config.width !== undefined || config.height !== undefined) {
		updateSurfaceSize();
	}
}

function getDesktop(): HTMLElement | null {
	if (!desktop_el) {
		desktop_el = document.getElementById("desktop");
	}
	return desktop_el;
}

function getSurface(): HTMLElement | null {
	if (!surface_el) {
		surface_el = document.getElementById("desktop-surface");
	}
	return surface_el;
}

function toggleCameraMode(enable: boolean) {
	const desktop = getDesktop();
	const surface = getSurface();

	if (!desktop || !surface) return;

	if (enable) {
		// Enable canvas mode
		desktop.classList.add("canvas-mode");
		surface.style.width = `${desktop_config.width}px`;
		surface.style.height = `${desktop_config.height}px`;

		// Show canvas if available
		if (canvas_el) {
			canvas_el.style.display = "block";
		}

		// Reset camera to center
		scrollToCenter();
	} else {
		// Enable classic mode
		desktop.classList.remove("canvas-mode");
		surface.style.width = "100%";
		surface.style.height = "100%";

		// Hide canvas
		if (canvas_el) {
			canvas_el.style.display = "none";
		}

		// Reset zoom and position
		current_scale = 1;
		camera_x = 0;
		camera_y = 0;
		updateSurfaceScale();
	}
}

function updateSurfaceSize() {
	const surface = getSurface();
	if (!surface || desktop_config.disable_camera) return;

	surface.style.width = `${desktop_config.width}px`;
	surface.style.height = `${desktop_config.height}px`;
}

function updateSurfaceScale() {
	const surface = getSurface();
	if (!surface) return;

	if (!desktop_config.disable_camera) {
		surface.style.transform = `scale(${current_scale})`;
	} else {
		surface.style.transform = "none";
	}
	zoom_level = current_scale;
}

function scrollToCenter() {
	const desktop = getDesktop();
	const surface = getSurface();
	if (!desktop || !surface || desktop_config.disable_camera) return;

	const rect = surface.getBoundingClientRect();
	desktop.scroll({
		left: rect.width / 2 - desktop.offsetWidth / 2,
		top: rect.height / 2 - desktop.offsetHeight / 2,
	});
}

async function mountApplet(applet: HTMLElement, first_mount = false) {
	mount_callbacks.forEach((c) => c(applet, first_mount));

	if (!applet.hasAttribute("om-tsid")) {
		const uuid = uniqueId();
		applet.setAttribute("om-tsid", uuid);

		if (!first_mount) {
			addAppletMirror(applet, uuid);
		}
	}

	const applet_name = applet.getAttribute("om-applet") || "";
	if (applet_initializers && applet_initializers[applet_name]) {
		const destructor = applet_initializers[applet_name](applet);
		if (destructor && typeof destructor === "function") {
			onAppletRemoved(destructor as (a: HTMLElement) => void);
		}
	}

	if (!first_mount) save();
}

async function unmountApplet(applet: HTMLElement) {
	removeAppletMirror(applet);
	unmount_callbacks.forEach((c) => c(applet));
}

function liftAppletMirror(tsid: string) {
	if (!shadow_root) return;
	const mirror = shadow_root.querySelector(`[om-tsid="${tsid}"]`);
	if (!mirror || !mirror.parentNode) return;

	mirror.parentNode.insertBefore(mirror, null);

	const surface = getSurface();
	if (!surface) return;

	const applets = Array.from(surface.querySelectorAll("[om-applet]")) as HTMLElement[];

	applets.forEach((applet: HTMLElement) => {
		if (!shadow_root) return;
		const id = applet.getAttribute("om-tsid");
		const m = shadow_root.querySelector(`[om-tsid="${id}"]`);
		if (!m || !m.parentNode) return;
		const new_z_index = Array.from(m.parentNode.children).indexOf(m);
		applet.style.zIndex = String(new_z_index);
		order_change_callbacks.forEach((c) => c(applet, new_z_index));
	});
}

function addAppletMirror(applet: HTMLElement, id: string) {
	if (!shadow_root) return;

	const mirror = document.createElement("div");
	mirror.style.position = "absolute";
	mirror.setAttribute("om-tsid", id);
	shadow_root.appendChild(mirror);
	const new_z_index = shadow_root.children.length;
	applet.style.zIndex = String(new_z_index);
	order_change_callbacks.forEach((c) => c(applet, new_z_index));
}

function removeAppletMirror(applet: HTMLElement) {
	if (!shadow_root) return;
	const removed_id = applet.getAttribute("om-tsid");
	const mirror = shadow_root.querySelector(`[om-tsid="${removed_id}"]`);
	if (mirror) {
		const mirrors = Array.from(shadow_root.children);
		mirrors
			.filter((m) => m.getAttribute("om-tsid") !== removed_id)
			.forEach((m, i) => {
				const surface = getSurface();
				if (!surface) return;

				const t = surface.querySelector(`[om-tsid="${m.getAttribute("om-tsid")}"]`) as HTMLElement;
				if (t) {
					const new_z_index = i + 1;
					t.style.zIndex = String(new_z_index);
					order_change_callbacks.forEach((c) => c(t, new_z_index));
				}
			});
		mirror.remove();
	}
}

function save() {
	// Implementation for saving layout state
}

function handleDesktopWheel(e: WheelEvent) {
	if (desktop_config.disable_camera) return;

	const desktop = getDesktop();
	if (!desktop) return;

	// Handle zoom with super key
	if (window.superkeydown) {
		e.preventDefault();

		const prev_scroll_x = desktop.scrollLeft;
		const prev_scroll_y = desktop.scrollTop;

		const rect = desktop.getBoundingClientRect();
		const cursor_x = e.clientX - rect.left;
		const cursor_y = e.clientY - rect.top;

		const point_x = (prev_scroll_x + cursor_x) / current_scale;
		const point_y = (prev_scroll_y + cursor_y) / current_scale;

		const scale_factor = Math.max(0.005, current_scale * 0.05);
		const delta = e.deltaY > 0 ? -scale_factor : scale_factor;
		let new_scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current_scale + delta));

		if (new_scale !== current_scale) {
			is_zooming = true;
			current_scale = new_scale;
			updateSurfaceScale();

			const new_scroll_x = point_x * current_scale - cursor_x;
			const new_scroll_y = point_y * current_scale - cursor_y;

			desktop.scrollTo({
				left: new_scroll_x,
				top: new_scroll_y,
			});

			clearTimeout(zoom_timeout!);
			zoom_timeout = setTimeout(() => {
				is_zooming = false;
			}, 150);
		}
	}
}

function handleDesktopScroll() {
	if (desktop_config.disable_camera) return;

	const desktop = getDesktop();
	const surface = getSurface();
	if (!desktop || !surface) return;

	is_scrolling = true;

	clearTimeout(scrolling_timeout!);
	scrolling_timeout = setTimeout(() => {
		is_scrolling = false;
	}, 150);

	camera_x = desktop.scrollLeft;
	camera_y = desktop.scrollTop;
}

function handleSurfaceMouseDown(e: MouseEvent) {
	if (desktop_config.disable_camera) return;

	const surface = getSurface();
	if (!surface) return;

	if (window.superkeydown && (e.button === 1 || (e.button === 0 && e.target === surface))) {
		e.preventDefault();
		is_panning = true;
		document.body.classList.add("is-panning");
		last_middle_click_x = e.clientX;
		last_middle_click_y = e.clientY;
	}
}

function handleWindowMouseMove(e: MouseEvent) {
	if (!desktop_config.disable_camera && is_panning) {
		pending_mouse_dx += e.clientX - last_middle_click_x;
		pending_mouse_dy += e.clientY - last_middle_click_y;
		has_pending_mouse_movement = true;

		last_middle_click_x = e.clientX;
		last_middle_click_y = e.clientY;
	}
}

function handleWindowMouseUp(e: MouseEvent) {
	if (e.button === 1 || e.button === 0) {
		is_panning = false;
		document.body.classList.remove("is-panning");
	}
}

function animationStep() {
	const desktop = getDesktop();

	if (!desktop_config.disable_camera) {
		// Process pending mouse movements for panning
		if (has_pending_mouse_movement && is_panning && desktop) {
			camera_x -= pending_mouse_dx;
			camera_y -= pending_mouse_dy;
			pending_mouse_dx = 0;
			pending_mouse_dy = 0;
			has_pending_mouse_movement = false;

			// Clamp camera position
			const surface = getSurface();
			if (surface) {
				const rect = surface.getBoundingClientRect();
				const max_x = Math.max(0, rect.width - desktop.offsetWidth);
				const max_y = Math.max(0, rect.height - desktop.offsetHeight);

				camera_x = Math.max(0, Math.min(max_x, camera_x));
				camera_y = Math.max(0, Math.min(max_y, camera_y));
			}

			if (is_panning) {
				desktop.scroll({
					left: camera_x,
					top: camera_y,
					behavior: "instant",
				});
			}
		}

		// Update scale
		updateSurfaceScale();

		// Draw wallpaper if available
		if (draw_wallpaper) {
			draw_wallpaper(camera_x, camera_y, current_scale);
		}
	}

	requestAnimationFrame(animationStep);
}

async function initializeAppletEvents(applet: HTMLElement, first_mount = false) {
	if (!first_mount) {
		await finish();
		applet.setAttribute("om-motion", "idle");
		applet.style.removeProperty("will-change");
	}

	applet.addEventListener("mousedown", handleAppletMouseDownFocus);

	const header = applet.querySelector("header");
	if (header) {
		header.addEventListener("mousedown", handleAppletMouseDown);
	}

	async function handleAppletMouseDownFocus(e: MouseEvent) {
		const tsid = applet.getAttribute("om-tsid");
		if (!tsid) return;
		liftAppletMirror(tsid);
	}

	async function handleAppletMouseDown(e: MouseEvent) {
		if (!e.target || dragged_applet !== null) return;

		current_mouse_button = e.button;

		const target = e.target as HTMLElement;
		const is_contenteditable = target.isContentEditable || target.closest('[contenteditable="true"]');

		if (target.classList.contains("rename-input")) {
			return;
		}

		if (
			applet.getAttribute("om-motion") !== "idle" ||
			(target.tagName !== "H2" &&
				(target.tagName === "A" ||
					target.tagName === "BUTTON" ||
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					is_contenteditable ||
					(target.tagName === "IMG" && target.getAttribute("draggable") !== "false")))
		) {
			e.preventDefault();
			return;
		}

		if (target.getAttribute("draggable") === "true") {
			return;
		}

		if (current_mouse_button === 0) {
			document.body.classList.add("is-dragging");
			let x = Number(applet.style.left.replace("px", ""));
			let y = Number(applet.style.top.replace("px", ""));

			dragging_x = x;
			dragging_y = y;
			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;

			applet.style.willChange = "filter, transform, left, top";

			const tsid = applet.getAttribute("om-tsid");
			if (!tsid) return;
			liftAppletMirror(tsid);
			await finish();
			applet.style.left = "0";
			applet.style.top = "0";
			applet.style.transition = "none";
			applet.setAttribute("om-motion", "elevated");

			// Add scale effect only in canvas mode
			const scale_effect = !desktop_config.disable_camera ? " scale(1.01)" : "";
			applet.style.transform = `translate(${x}px, ${y}px) translateZ(0)${scale_effect}`;

			dragged_applet = applet;
		}

		window.addEventListener("mousemove", handleAppletMouseMove);
		window.addEventListener("mouseup", handleAppletMouseUp);
	}

	addResizeHandles(applet);
}

function addResizeHandles(applet: HTMLElement) {
	const constraints = getComputedMinMax(applet);

	if (!constraints.can_resize) {
		return;
	}

	const edges = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];

	edges.forEach((edge) => {
		const affects_width = edge.includes("e") || edge.includes("w");
		const affects_height = edge.includes("n") || edge.includes("s");

		if ((affects_width && !constraints.can_resize_width) || (affects_height && !constraints.can_resize_height)) {
			if (affects_width && !constraints.can_resize_width && affects_height && !constraints.can_resize_height) {
				return;
			}
			if (affects_width && !affects_height && !constraints.can_resize_width) {
				return;
			}
			if (affects_height && !affects_width && !constraints.can_resize_height) {
				return;
			}
		}

		const handle = document.createElement("div");
		handle.className = `resize-handle resize-${edge}`;
		handle.style.position = "absolute";

		// Set positioning based on edge
		setHandlePosition(handle, edge, constraints);

		handle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.button !== 0) return;

			const affects_width = edge.includes("e") || edge.includes("w");
			const affects_height = edge.includes("n") || edge.includes("s");

			if ((affects_width && !constraints.can_resize_width) || (affects_height && !constraints.can_resize_height)) {
				return;
			}

			is_resizing = true;
			resize_edge = edge;
			dragged_applet = applet;

			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;
			last_width = applet.offsetWidth;
			last_height = applet.offsetHeight;
			last_left = parseInt(applet.style.left) || 0;
			last_top = parseInt(applet.style.top) || 0;

			window.addEventListener("mousemove", handleResize);
			window.addEventListener("mouseup", stopResize);
		});

		applet.appendChild(handle);
	});
}

function setHandlePosition(handle: HTMLElement, edge: string, constraints: any) {
	switch (edge) {
		case "n":
			handle.style.top = `${resize_handles.offset}px`;
			handle.style.left = "0";
			handle.style.right = "0";
			handle.style.height = `${resize_handles.edge_size}px`;
			handle.style.cursor = constraints.can_resize_height ? "n-resize" : "default";
			break;
		case "s":
			handle.style.bottom = `${resize_handles.offset}px`;
			handle.style.left = "0";
			handle.style.right = "0";
			handle.style.height = `${resize_handles.edge_size}px`;
			handle.style.cursor = constraints.can_resize_height ? "s-resize" : "default";
			break;
		case "e":
			handle.style.right = `${resize_handles.offset}px`;
			handle.style.top = "0";
			handle.style.bottom = "0";
			handle.style.width = `${resize_handles.edge_size}px`;
			handle.style.cursor = constraints.can_resize_width ? "e-resize" : "default";
			break;
		case "w":
			handle.style.left = `${resize_handles.offset}px`;
			handle.style.top = "0";
			handle.style.bottom = "0";
			handle.style.width = `${resize_handles.edge_size}px`;
			handle.style.cursor = constraints.can_resize_width ? "w-resize" : "default";
			break;
		case "ne":
			handle.style.top = `${resize_handles.offset}px`;
			handle.style.right = `${resize_handles.offset}px`;
			handle.style.width = `${resize_handles.corner_size}px`;
			handle.style.height = `${resize_handles.corner_size}px`;
			handle.style.cursor = constraints.can_resize_width && constraints.can_resize_height ? "ne-resize" : "default";
			break;
		case "se":
			handle.style.bottom = `${resize_handles.offset}px`;
			handle.style.right = `${resize_handles.offset}px`;
			handle.style.width = `${resize_handles.corner_size}px`;
			handle.style.height = `${resize_handles.corner_size}px`;
			handle.style.cursor = constraints.can_resize_width && constraints.can_resize_height ? "se-resize" : "default";
			break;
		case "sw":
			handle.style.bottom = `${resize_handles.offset}px`;
			handle.style.left = `${resize_handles.offset}px`;
			handle.style.width = `${resize_handles.corner_size}px`;
			handle.style.height = `${resize_handles.corner_size}px`;
			handle.style.cursor = constraints.can_resize_width && constraints.can_resize_height ? "sw-resize" : "default";
			break;
		case "nw":
			handle.style.top = `${resize_handles.offset}px`;
			handle.style.left = `${resize_handles.offset}px`;
			handle.style.width = `${resize_handles.corner_size}px`;
			handle.style.height = `${resize_handles.corner_size}px`;
			handle.style.cursor = constraints.can_resize_width && constraints.can_resize_height ? "nw-resize" : "default";
			break;
	}
}

function getComputedMinMax(win: HTMLElement) {
	const computed = window.getComputedStyle(win);

	const computed_min_width = computed.minWidth;
	const computed_max_width = computed.maxWidth;
	const computed_min_height = computed.minHeight;
	const computed_max_height = computed.maxHeight;

	const parseSize = (value: string): number => {
		if (value === "none" || value === "auto") return 0;
		if (value.includes("fit-content")) return -1;
		return parseFloat(value) || 0;
	};

	const min_width_computed = parseSize(computed_min_width);
	const max_width_computed = parseSize(computed_max_width);
	const min_height_computed = parseSize(computed_min_height);
	const max_height_computed = parseSize(computed_max_height);

	const has_fit_content_width = win.style.width.includes("fit-content");
	const has_fit_content_height = win.style.height.includes("fit-content");

	const is_width_fixed = max_width_computed > 0 && min_width_computed === max_width_computed;
	const is_height_fixed = max_height_computed > 0 && min_height_computed === max_height_computed;

	return {
		min_width: min_width_computed > 0 ? min_width_computed : min_width,
		max_width: max_width_computed > 0 ? max_width_computed : Infinity,
		min_height: min_height_computed > 0 ? min_height_computed : min_height,
		max_height: max_height_computed > 0 ? max_height_computed : Infinity,
		can_resize_width: !has_fit_content_width && !is_width_fixed,
		can_resize_height: !has_fit_content_height && !is_height_fixed,
		can_resize: (!has_fit_content_width && !is_width_fixed) || (!has_fit_content_height && !is_height_fixed),
	};
}

function handleResize(e: MouseEvent) {
	if (!is_resizing || !dragged_applet || !resize_edge) return;

	const scale_factor = !desktop_config.disable_camera ? current_scale : 1;
	const dx = (e.clientX - last_mouse_x) / scale_factor;
	const dy = (e.clientY - last_mouse_y) / scale_factor;

	const constraints = getComputedMinMax(dragged_applet);

	let new_width = last_width;
	let new_height = last_height;
	let new_left = last_left;
	let new_top = last_top;

	if (constraints.can_resize_width) {
		if (resize_edge.includes("e")) {
			new_width = Math.max(constraints.min_width, Math.min(constraints.max_width, last_width + dx));
		}
		if (resize_edge.includes("w")) {
			const max_delta = last_width - constraints.min_width;
			const min_delta = last_width - constraints.max_width;
			const width_delta = Math.max(min_delta, Math.min(max_delta, dx));
			new_width = last_width - width_delta;
			new_left = last_left + width_delta;
		}
	}

	if (constraints.can_resize_height) {
		if (resize_edge.includes("s")) {
			new_height = Math.max(constraints.min_height, Math.min(constraints.max_height, last_height + dy));
		}
		if (resize_edge.includes("n")) {
			const max_delta = last_height - constraints.min_height;
			const min_delta = last_height - constraints.max_height;
			const height_delta = Math.max(min_delta, Math.min(max_delta, dy));
			new_height = last_height - height_delta;
			new_top = last_top + height_delta;
		}
	}

	if (new_top < 0) {
		new_top = 0;
	}

	dragged_applet.style.width = `${new_width}px`;
	dragged_applet.style.height = `${new_height}px`;
	dragged_applet.style.left = `${new_left}px`;
	dragged_applet.style.top = `${new_top}px`;
}

function stopResize() {
	if (is_resizing) {
		is_resizing = false;
		resize_edge = null;
		dragged_applet = null;
		window.removeEventListener("mousemove", handleResize);
		window.removeEventListener("mouseup", stopResize);
		save();
	}
}

async function handleAppletMouseMove(e: MouseEvent) {
	if (current_mouse_button === 0 && dragged_applet) {
		const scale_factor = !desktop_config.disable_camera ? current_scale : 1;
		delta_x = (last_mouse_x - e.clientX) / scale_factor;
		delta_y = (last_mouse_y - e.clientY) / scale_factor;
		last_mouse_x = e.clientX;
		last_mouse_y = e.clientY;

		dragging_x = dragging_x - delta_x;
		dragging_y = dragging_y - delta_y;

		const scale_effect = !desktop_config.disable_camera ? " scale(1.01)" : "";
		dragged_applet.style.transform = `translate(${dragging_x}px, ${dragging_y}px) translateZ(0)${scale_effect}`;
	}
}

async function handleAppletMouseUp(e: MouseEvent) {
	window.removeEventListener("mousemove", handleAppletMouseMove);
	window.removeEventListener("mouseup", handleAppletMouseUp);

	if (current_mouse_button === 0) {
		document.body.classList.remove("is-dragging");

		if (dragged_applet) {
			dragged_applet.style.left = `${dragging_x}px`;
			dragged_applet.style.top = `${dragging_y}px`;
			dragged_applet.style.removeProperty("transform");
			dragged_applet.style.removeProperty("will-change");
			await finish();
			dragged_applet.style.removeProperty("transition");
			await finish();
			dragged_applet.setAttribute("om-motion", "idle");
		}
	}

	if (current_mouse_button === 0 || current_mouse_button === 2) {
		save();
	}

	dragged_applet = null;
}

export function overrideDraggingPosition(x: number, y: number) {
	dragging_x = x;
	dragging_y = y;
}

const observer = new MutationObserver((mutations) => {
	for (let mutation of mutations) {
		if (mutation.type === "childList") {
			if (mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						(node as HTMLElement).getAttribute("om-motion") !== "elevated" &&
						(node as HTMLElement).hasAttribute("om-applet")
					) {
						mountApplet(node as HTMLElement);
					}
				});
			}

			if (mutation.removedNodes.length > 0) {
				mutation.removedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						(node as HTMLElement).getAttribute("om-motion") !== "elevated" &&
						(node as HTMLElement).hasAttribute("om-applet")
					) {
						unmountApplet(node as HTMLElement);
					}
				});
			}
		}
	}
});

export async function Desktop(config?: DesktopConfig) {
	// Apply configuration
	if (config) {
		desktop_config = { ...desktop_config, ...config };
	}

	// Create desktop structure
	const desktop = div({
		id: "desktop",
		component: "desktop",
		class: tw("relative w-full h-full overflow-hidden"),
	});

	const surface = div({
		id: "desktop-surface",
		class: tw("absolute inset-0"),
		style: desktop_config.disable_camera
			? "width: 100%; height: 100%;"
			: `width: ${desktop_config.width}px; height: ${desktop_config.height}px; transform-origin: 0 0;`,
	});

	desktop.appendChild(surface);

	// Add canvas for WebGL wallpaper if in canvas mode
	if (!desktop_config.disable_camera) {
		canvas_el = canvas({
			id: "desktop-canvas",
			class: tw("absolute inset-0 w-full h-full pointer-events-none"),
			style: "z-index: -1;",
		}) as HTMLCanvasElement;
		desktop.appendChild(canvas_el);
	}

	await finish();

	// Initialize shadow DOM for applet management
	shadow_host = document.getElementById("applet-map");
	if (!shadow_host) {
		shadow_host = div({
			id: "applet-map",
			style: "pointer-events: none; opacity: 0; position: absolute;",
		});
		document.body.appendChild(shadow_host);
	}

	await finish();

	shadow_root = shadow_host.attachShadow({ mode: "open" });

	// Set up observer
	observer.observe(surface, { childList: true });

	// Initialize applet events
	onAppletMounted(initializeAppletEvents);

	// Set up event listeners based on mode
	if (!desktop_config.disable_camera) {
		desktop.addEventListener("wheel", handleDesktopWheel, { passive: false });
		desktop.addEventListener("scroll", handleDesktopScroll);
		surface.addEventListener("mousedown", handleSurfaceMouseDown);
		window.addEventListener("mousemove", handleWindowMouseMove);
		window.addEventListener("mouseup", handleWindowMouseUp);

		// Initialize WebGL wallpaper if available
		if (canvas_el) {
			try {
				const { initializeBackgroundCanvas } = await import("./background");
				const wallpaper = await initializeBackgroundCanvas(desktop, canvas_el);
				draw_wallpaper = wallpaper ? wallpaper.drawWallpaper : () => {};
				resize_canvas = wallpaper ? wallpaper.resizeCanvas : () => {};

				// Handle window resize
				window.addEventListener("resize", () => {
					if (resize_canvas) resize_canvas();
					if (draw_wallpaper) draw_wallpaper(camera_x, camera_y, current_scale);
				});
			} catch (error) {
				console.warn("WebGL wallpaper not available:", error);
			}
		}

		// Start animation loop
		requestAnimationFrame(animationStep);

		// Scroll to center on initialization
		setTimeout(scrollToCenter, 100);
	}

	// Store references
	desktop_el = desktop;
	surface_el = surface;

	return desktop;
}

// Additional styles for different modes
// useGlobalStyles(css`
// 	#desktop {
// 		position: relative;
// 		width: 100%;
// 		height: 100%;
// 		overflow: hidden;
// 	}

// 	#desktop.canvas-mode {
// 		overflow: auto;
// 	}

// 	#desktop-surface {
// 		position: absolute;
// 		transform-origin: 0 0;
// 	}

// 	#desktop:not(.canvas-mode) #desktop-surface {
// 		inset: 0;
// 		width: 100% !important;
// 		height: 100% !important;
// 		transform: none !important;
// 	}

// 	#desktop-canvas {
// 		position: absolute;
// 		width: 100%;
// 		height: 100%;
// 		top: 0;
// 		left: 0;
// 		pointer-events: none;
// 		z-index: -1;
// 	}

// 	.is-dragging {
// 		user-select: none;
// 		cursor: grabbing !important;
// 	}

// 	.is-panning {
// 		user-select: none;
// 		cursor: grab !important;
// 	}

// 	.is-resizing {
// 		user-select: none;
// 	}

// 	[om-applet] {
// 		position: absolute;
// 		will-change: auto;
// 	}

// 	[om-applet][om-motion="elevated"] {
// 		will-change: transform;
// 		pointer-events: auto;
// 	}

// 	[om-applet][om-motion="resizing"] {
// 		will-change: width, height, left, top;
// 	}

// 	.resize-handle {
// 		position: absolute;
// 		background: transparent;
// 		z-index: 10;
// 	}

// 	.resize-handle:hover {
// 		background: rgba(0, 123, 255, 0.1);
// 	}
// `);
