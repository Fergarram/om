import sys from "./bridge.js";
import { css, finish, GlobalStyleSheet, is_scrollable } from "../../lib/utils.js";
import van from "../../lib/van.js";
const { div, span, button } = van.tags;

//
// Desktop Setup
//

GlobalStyleSheet(css`
	[drag-handle] {
		position: absolute;
		z-index: 1;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
	}
`);

let surface_el = null;
const surface_initial_width = window.innerWidth * 10;
const surface_initial_height = (window.innerHeight - 56) * 10;
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
const current_scale = van.state(1);

const HANDLE_CONFIG = {
	EDGE_SIZE: 12, // Size of edge handles (was 6)
	CORNER_SIZE: 12, // Size of corner handles (was 6)
	OFFSET: -6, // Offset from window edge (was -3)
};

let applet_initializers = {};
let place_callbacks = [];
let remove_callbacks = [];
let order_change_callbacks = [];

// Camera Controls
let camera_x = 0;
let camera_y = 0;
let scroll_ticking = false;
let scrolling_timeout = null;
let is_panning = false;
let is_scrolling = false;
let is_zooming = false;
let last_middle_click_x = 0;
let last_middle_click_y = 0;
let last_pan_mouse_x = 0;
let last_pan_mouse_y = 0;

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

GlobalStyleSheet(css`
	#om-desktop {
		position: relative;
		width: 100%;
		height: auto;
		flex-grow: 1;
		border-radius: var(--size-2);
		overflow: overlay;
		background-color: var(--color-neutral-700);
	}

	#om-desktop-surface {
		position: absolute;
		transform-origin: 0 0;
	}
`);

export async function initialize_desktop(om_space) {
	const desktop = div(
		{
			id: "om-desktop",
		},
		div({
			id: "om-desktop-surface",
			style: () => css`
				width: ${surface_initial_width * current_scale.val}px;
				height: ${surface_initial_height * current_scale.val}px;
				transform: scale(${current_scale.val});
			`,
		}),
	);

	van.add(om_space, desktop);

	await finish();

	observer.observe(surface(), { childList: true });

	on_place(handle_applet_placement);

	async function handle_keydown(e) {
		if (e.metaKey || e.ctrlKey) {
			// Prevent reload
			if (e.key.toLowerCase() === "r") {
				e.preventDefault();
			}

			// Prevent closing host window
			if (e.key.toLowerCase() === "w") {
				e.preventDefault();
			}

			// Store current scroll position and viewport dimensions
			const prev_scroll_x = desktop.scrollLeft;
			const prev_scroll_y = desktop.scrollTop;
			const viewport_width = desktop.offsetWidth;
			const viewport_height = desktop.offsetHeight;

			// Calculate center point before scale change
			const center_x = (prev_scroll_x + viewport_width / 2) / current_scale.val;
			const center_y = (prev_scroll_y + viewport_height / 2) / current_scale.val;

			if (e.key === "=") {
				e.preventDefault();
				current_scale.val = Math.min(current_scale.val + 0.1, 1.0);
			} else if (e.key === "-") {
				e.preventDefault();
				current_scale.val = Math.max(current_scale.val - 0.1, 0.1);
			} else if (e.key === "0") {
				e.preventDefault();
				current_scale.val = 1.0;
			} else {
				return;
			}

			await finish();
			// Calculate new scroll position to maintain center point
			const new_scroll_x = center_x * current_scale.val - viewport_width / 2;
			const new_scroll_y = center_y * current_scale.val - viewport_height / 2;

			// Apply new scroll position
			desktop.scrollTo({
				left: new_scroll_x,
				top: new_scroll_y,
			});
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

		if (!e.altKey) {
			e.preventDefault();
			e.stopPropagation();
		}

		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();

			// Get cursor position relative to the viewport
			const rect = desktop.getBoundingClientRect();
			const cursor_x = e.clientX - rect.left;
			const cursor_y = e.clientY - rect.top;

			// Calculate the point on the desktop under the cursor before scaling
			const point_x = (desktop.scrollLeft + cursor_x) / current_scale.val;
			const point_y = (desktop.scrollTop + cursor_y) / current_scale.val;

			// Calculate new scale
			const delta = e.deltaY > 0 ? -e.deltaY / 100 : -e.deltaY / 100;
			const new_scale = Math.max(0.1, Math.min(1.0, current_scale.val + delta));

			// Only proceed if the scale actually changed
			if (new_scale !== current_scale.val) {
				current_scale.val = new_scale;

				await finish();

				// Calculate new scroll position to maintain cursor point
				const new_scroll_x = point_x * current_scale.val - cursor_x;
				const new_scroll_y = point_y * current_scale.val - cursor_y;

				// Apply new scroll position
				desktop.scrollTo({
					left: new_scroll_x,
					top: new_scroll_y,
				});
			}
		}
	}

	function desktop_scroll(e) {
		if (!scroll_ticking) {
			window.requestAnimationFrame(() => {
				is_scrolling = true;

				clearTimeout(scrolling_timeout);
				scrolling_timeout = setTimeout(() => {
					is_scrolling = false;
				}, 150);
				camera_x = desktop.scrollLeft;
				camera_y = desktop.scrollTop;
				scroll_ticking = false;
			});
			scroll_ticking = true;
		}
	}

	function surface_mousedown(e) {
		if (e.altKey && e.button === 1) {
			e.preventDefault();
			is_panning = true;
			document.body.classList.toggle("is-panning");
			last_middle_click_x = e.clientX;
			last_middle_click_y = e.clientY;
		}
	}

	function window_mouseout(e) {
		is_panning = false;
		document.body.classList.remove("is-panning");
	}

	function window_mouseup(e) {
		if (e.button === 1) {
			is_panning = false;
			document.body.classList.toggle("is-panning");
		}
	}

	function window_mousemove(e) {
		last_pan_mouse_x = e.clientX;
		last_pan_mouse_y = e.clientY;
		if (is_panning) {
			const dx = e.clientX - last_middle_click_x;
			const dy = e.clientY - last_middle_click_y;
			camera_x -= dx;
			camera_y -= dy;
			last_middle_click_x = e.clientX;
			last_middle_click_y = e.clientY;
		}
	}

	window.addEventListener("keydown", handle_keydown);
	desktop.addEventListener("wheel", desktop_wheel, { passive: false });
	desktop.addEventListener("scroll", desktop_scroll);
	surface().addEventListener("mousedown", surface_mousedown);
	surface().addEventListener("mouseleave", window_mouseout);
	surface().addEventListener("mouseout", window_mouseout);
	window.addEventListener("mouseup", window_mouseup);
	window.addEventListener("mousemove", window_mousemove);

	function step() {
		if (camera_x <= 0) {
			camera_x = 0;
		}

		if (camera_y <= 0) {
			camera_y = 0;
		}

		if (camera_x >= surface().offsetWidth - desktop.offsetWidth) {
			camera_x = surface().offsetWidth - desktop.offsetWidth;
		}

		if (camera_y >= surface().offsetHeight - desktop.offsetHeight) {
			camera_y = surface().offsetHeight - desktop.offsetHeight;
		}

		if (is_panning) {
			desktop.scroll({
				top: camera_y,
				left: camera_x,
				behavior: "instant",
			});
		}

		requestAnimationFrame(step);
	}

	requestAnimationFrame(step);
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

export function on_place(callback) {
	place_callbacks.push(callback);
}

export function on_remove(callback) {
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

	const window_name = applet.getAttribute("om-applet");
	if (applet_initializers && applet_initializers[window_name]) {
		const destructor = applet_initializers[window_name](applet);
		if (destructor && typeof destructor === "function") {
			on_remove(destructor);
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

	applet.addEventListener("mousedown", handle_mousedown_focus);

	const drag_handle = applet.querySelector("[drag-handle]");
	if (drag_handle) drag_handle.addEventListener("mousedown", handle_mousedown);

	async function handle_mousedown_focus(e) {
		const tsid = applet.getAttribute("om-tsid");
		lift(tsid);
	}

	async function handle_mousedown(e) {
		if (!e.target) return;
		if (dragged_applet !== null) return;

		current_mouse_button = e.button;

		const target = e.target;
		const is_contenteditable = target.isContentEditable || target.closest('[contenteditable="true"]');

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

		if (current_mouse_button === 0) {
			document.body.classList.toggle("is-dragging");
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

	const dx = (e.clientX - last_mouse_x) / current_scale.val;
	const dy = (e.clientY - last_mouse_y) / current_scale.val;

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
		resize_edge = null;
		dragged_applet = null;
		window.removeEventListener("mousemove", handle_resize);
		window.removeEventListener("mouseup", stop_resize);
		save();
	}
}

async function handle_mousemove(e) {
	if (current_mouse_button === 0) {
		delta_x = (last_mouse_x - e.clientX) / current_scale.val;
		delta_y = (last_mouse_y - e.clientY) / current_scale.val;
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
}

async function handle_mouseup(e) {
	window.removeEventListener("mousemove", handle_mousemove);
	window.removeEventListener("mouseup", handle_mouseup);

	if (current_mouse_button === 0) {
		document.body.classList.toggle("is-dragging");

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

	if (current_mouse_button === 0 || current_mouse_button === 2) {
		save();
	}

	dragged_applet = null;
}
