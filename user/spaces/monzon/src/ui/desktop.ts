import { css, finish, uniqueId } from "@/monzon/src/lib/utils";
import { useTags } from "@/lib/ima";
import { useTheme } from "@/monzon/src/main";
import { tw } from "@/lib/tw";
import { AppSettings } from "@/monzon/src/lib/state";

const { div } = useTags();

let last_mouse_x = 0;
let last_mouse_y = 0;
let delta_x = 0;
let delta_y = 0;
let dragged_window: HTMLElement | null = null;
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

let shadow_host = null;
let shadow_root: ShadowRoot | null = null;
let window_initializers: Record<string, (win: HTMLElement) => {}> = {};
let open_callbacks: ((win: HTMLElement, first_mount: boolean) => {})[] = [];
let close_callbacks: Function[] = [];
let order_change_callbacks: Function[] = [];

export function getTopWindow() {
	const desktop = document.getElementById("desktop");
	if (!desktop) return null;

	const windows = Array.from(desktop.querySelectorAll("[stb-window]")) as HTMLElement[];
	if (windows.length === 0) return null;

	const top_window = windows.reduce((prev, current) => {
		const prev_z = parseInt(prev.style.zIndex) || 0;
		const current_z = parseInt(current.style.zIndex) || 0;
		return current_z > prev_z ? current : prev;
	});

	return top_window;
}

export function windowExists(name: string) {
	return document.querySelector(`[stb-window="${name}"]`) !== null;
}

export function findWindow(name: string) {
	return document.querySelector(`[stb-window="${name}"]`) as HTMLElement | null;
}

export function openedWindows(name: string) {
	return Array.from(document.querySelectorAll(name ? `[stb-window="${name}"]` : "[stb-window]") ?? []) as HTMLElement[];
}

export function mountWindow(win: HTMLElement) {
	const desktop = document.getElementById("desktop");
	if (!desktop) return;

	desktop.appendChild(win);
}

export function onPlace(callback: (win: HTMLElement, first_mount: boolean) => {}) {
	open_callbacks.push(callback);
}

export function onRemove(callback: (win: HTMLElement) => void) {
	close_callbacks.push(callback);
}

export function onOrderChange(callback: Function) {
	order_change_callbacks.push(callback);
}

export async function openWindow(win: HTMLElement, first_mount = false) {
	open_callbacks.forEach((c) => c(win, first_mount));

	if (!win.hasAttribute("stb-tsid")) {
		const uuid = uniqueId();
		win.setAttribute("stb-tsid", uuid);

		if (!first_mount) {
			addMirror(win, uuid);
		}
	}

	const window_name = win.getAttribute("stb-window") || "";
	if (window_initializers && window_initializers[window_name]) {
		const destructor = window_initializers[window_name](win);
		if (destructor && typeof destructor === "function") {
			onRemove(destructor as (win: HTMLElement) => void);
		}
	}

	if (!first_mount) save();
}

export async function closeWindow(win: HTMLElement) {
	removeMirror(win);
	close_callbacks.forEach((c) => c(win));
}

export function liftMirror(tsid: string) {
	if (!shadow_root) return;
	const mirror = shadow_root.querySelector(`[stb-tsid="${tsid}"]`);
	if (!mirror || !mirror.parentNode) return;

	mirror.parentNode.insertBefore(mirror, null);

	const desktop = document.getElementById("desktop");
	if (!desktop) return;

	const windows = Array.from(desktop.querySelectorAll("[stb-window]")) as HTMLElement[];

	windows.forEach((win: HTMLElement) => {
		if (!shadow_root) return;
		const id = win.getAttribute("stb-tsid");
		const m = shadow_root.querySelector(`[stb-tsid="${id}"]`);
		if (!m || !m.parentNode) return;
		const new_z_index = Array.from(m.parentNode.children).indexOf(m);
		win.style.zIndex = String(new_z_index);
		order_change_callbacks.forEach((c) => c(win, new_z_index));
	});
}

const observer = new MutationObserver((mutations) => {
	for (let mutation of mutations) {
		if (mutation.type === "childList") {
			if (mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						(node as HTMLElement).getAttribute("stb-motion") !== "elevated" &&
						(node as HTMLElement).hasAttribute("stb-window")
					) {
						openWindow(node as HTMLElement);
					}
				});
			}

			if (mutation.removedNodes.length > 0) {
				mutation.removedNodes.forEach((node) => {
					if (
						node.nodeType === 1 &&
						(node as HTMLElement).getAttribute("stb-motion") !== "elevated" &&
						(node as HTMLElement).hasAttribute("stb-window")
					) {
						closeWindow(node as HTMLElement);
					}
				});
			}
		}
	}
});

export function useDesktop() {
	const d = document.getElementById("desktop");
	if (!d) throw new Error("desktop not found");
	return d;
}

export async function Desktop() {
	const desktop = div({
		id: "desktop",
		class: tw("relative"),
		component: "desktop",
		style: () => css`
			width: 100%;
			height: 100%;
			background-image: url(${AppSettings.wallpaper_path});
			background-size: ${AppSettings.wallpaper_size};
			background-position: ${AppSettings.wallpaper_position};
			image-rendering: ${AppSettings.wallpaper_rendering};
		`,
	});

	await finish();

	shadow_host = document.getElementById("window-map");
	if (!shadow_host) throw new Error("window-map not found");

	await finish();

	shadow_host.style.pointerEvents = "none";
	shadow_host.style.opacity = "0";
	shadow_root = shadow_host.attachShadow({ mode: "open" });

	observer.observe(desktop, { childList: true });

	onPlace(handleWindowPlacement);

	return desktop;
}

function getComputedMinMax(win: HTMLElement) {
	const computed = window.getComputedStyle(win);

	// Get computed values
	const computed_min_width = computed.minWidth;
	const computed_max_width = computed.maxWidth;
	const computed_min_height = computed.minHeight;
	const computed_max_height = computed.maxHeight;

	// Parse values to numbers (handle px, em, rem, etc.)
	const parseSize = (value: string): number => {
		if (value === "none" || value === "auto") return 0;
		if (value.includes("fit-content")) return -1; // Special flag for fit-content
		return parseFloat(value) || 0;
	};

	const min_width_computed = parseSize(computed_min_width);
	const max_width_computed = parseSize(computed_max_width);
	const min_height_computed = parseSize(computed_min_height);
	const max_height_computed = parseSize(computed_max_height);

	// Check for fit-content
	const has_fit_content_width = win.style.width.includes("fit-content");
	const has_fit_content_height = win.style.height.includes("fit-content");

	// Check if min equals max (fixed size)
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

function save() {
	// console.log("If we want to save the current window layout");
}

function addMirror(win: HTMLElement, id: string) {
	const mirror = document.createElement("div");
	mirror.style.position = "absolute";
	mirror.setAttribute("stb-tsid", id);
	if (!shadow_root) return;

	shadow_root.appendChild(mirror);
	const new_z_index = shadow_root.children.length;
	win.style.zIndex = String(new_z_index);
	// Trigger z-index change callbacks
	order_change_callbacks.forEach((c) => c(win, new_z_index));
}

function removeMirror(win: HTMLElement) {
	if (!shadow_root) return;
	const removed_id = win.getAttribute("stb-tsid");
	const mirror = shadow_root.querySelector(`[stb-tsid="${removed_id}"]`);
	if (mirror) {
		// Update z-index of other mirrors
		const mirrors = Array.from(shadow_root.children);
		mirrors
			.filter((m) => m.getAttribute("stb-tsid") !== removed_id)
			.forEach((m, i) => {
				const desktop = document.getElementById("desktop");
				if (!desktop) return;

				const t = desktop.querySelector(`[stb-tsid="${m.getAttribute("stb-tsid")}"]`) as HTMLElement;
				if (t) {
					const new_z_index = i + 1;
					t.style.zIndex = String(new_z_index);
					// Trigger z-index change callbacks
					order_change_callbacks.forEach((c) => c(t, new_z_index));
				}
			});
		mirror.remove();
	}
}

async function handleWindowPlacement(win: HTMLElement, first_mount = false) {
	if (!first_mount) {
		await finish();
		win.setAttribute("stb-motion", "idle");
		win.style.removeProperty("will-change");
	}

	win.addEventListener("mousedown", handleMouseDownFocus);

	const header = win.querySelector("header");
	if (!header) return;

	header.addEventListener("mousedown", handleMouseDown);

	async function handleMouseDownFocus(e: MouseEvent) {
		const tsid = win.getAttribute("stb-tsid");
		if (!tsid) return;
		liftMirror(tsid);
	}

	async function handleMouseDown(e: MouseEvent) {
		if (!e.target) return;
		if (dragged_window !== null) return;

		current_mouse_button = e.button;

		const target = e.target as HTMLElement;
		const is_contenteditable = target.isContentEditable || target.closest('[contenteditable="true"]');

		if (target.classList.contains("rename-input")) {
			return;
		}

		if (
			win.getAttribute("stb-motion") !== "idle" ||
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
			document.body.classList.toggle("is-dragging");
			let x = Number(win.style.left.replace("px", ""));
			let y = Number(win.style.top.replace("px", ""));

			dragging_x = x;
			dragging_y = y;
			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;

			win.style.willChange = "filter, transform, left, top";

			const tsid = win.getAttribute("stb-tsid");
			if (!tsid) return;
			liftMirror(tsid);
			await finish();
			win.style.left = "0";
			win.style.top = "0";
			win.style.transition = "none";
			win.setAttribute("stb-motion", "elevated");
			win.style.transform = `translate(${x}px, ${y}px) translateZ(0)`;

			dragged_window = win;
		}

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
	}

	addResizeHandles(win);

	function addResizeHandles(win: HTMLElement) {
		const constraints = getComputedMinMax(win);

		// If the window can't be resized at all, don't add handles
		if (!constraints.can_resize) {
			return;
		}

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

		const {
			windows: { resize_handles },
		} = useTheme();

		edges.forEach((edge) => {
			// Skip handles that would resize in disabled directions
			const affects_width = edge.includes("e") || edge.includes("w");
			const affects_height = edge.includes("n") || edge.includes("s");

			if ((affects_width && !constraints.can_resize_width) || (affects_height && !constraints.can_resize_height)) {
				// Skip this handle if it would resize in a disabled direction
				if (affects_width && !constraints.can_resize_width && affects_height && !constraints.can_resize_height) {
					return; // Skip corner handles if both directions are disabled
				}
				if (affects_width && !affects_height && !constraints.can_resize_width) {
					return; // Skip horizontal-only handles
				}
				if (affects_height && !affects_width && !constraints.can_resize_height) {
					return; // Skip vertical-only handles
				}
			}

			const handle = document.createElement("div");
			handle.className = `resize-handle resize-${edge}`;
			handle.style.position = "absolute";

			// Set positioning and dimensions for each handle
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
					handle.style.cursor =
						constraints.can_resize_width && constraints.can_resize_height ? "ne-resize" : "default";
					break;
				case "se":
					handle.style.bottom = `${resize_handles.offset}px`;
					handle.style.right = `${resize_handles.offset}px`;
					handle.style.width = `${resize_handles.corner_size}px`;
					handle.style.height = `${resize_handles.corner_size}px`;
					handle.style.cursor =
						constraints.can_resize_width && constraints.can_resize_height ? "se-resize" : "default";
					break;
				case "sw":
					handle.style.bottom = `${resize_handles.offset}px`;
					handle.style.left = `${resize_handles.offset}px`;
					handle.style.width = `${resize_handles.corner_size}px`;
					handle.style.height = `${resize_handles.corner_size}px`;
					handle.style.cursor =
						constraints.can_resize_width && constraints.can_resize_height ? "sw-resize" : "default";
					break;
				case "nw":
					handle.style.top = `${resize_handles.offset}px`;
					handle.style.left = `${resize_handles.offset}px`;
					handle.style.width = `${resize_handles.corner_size}px`;
					handle.style.height = `${resize_handles.corner_size}px`;
					handle.style.cursor =
						constraints.can_resize_width && constraints.can_resize_height ? "nw-resize" : "default";
					break;
			}

			handle.addEventListener("mousedown", (e) => {
				e.preventDefault();
				e.stopPropagation();

				if (e.button !== 0) return;

				// Check if this resize direction is allowed
				const affects_width = edge.includes("e") || edge.includes("w");
				const affects_height = edge.includes("n") || edge.includes("s");

				if ((affects_width && !constraints.can_resize_width) || (affects_height && !constraints.can_resize_height)) {
					return;
				}

				is_resizing = true;
				resize_edge = edge;
				dragged_window = win;

				// Store initial positions considering scale
				last_mouse_x = e.clientX;
				last_mouse_y = e.clientY;
				last_width = win.offsetWidth;
				last_height = win.offsetHeight;
				last_left = parseInt(win.style.left) || 0;
				last_top = parseInt(win.style.top) || 0;

				window.addEventListener("mousemove", handleResize);
				window.addEventListener("mouseup", stopResize);
			});

			win.appendChild(handle);
		});
	}
}

function handleResize(e: MouseEvent) {
	if (!is_resizing || !dragged_window) return;

	const constraints = getComputedMinMax(dragged_window);

	const dx = e.clientX - last_mouse_x;
	const dy = e.clientY - last_mouse_y;

	let new_width = last_width;
	let new_height = last_height;
	let new_left = last_left;
	let new_top = last_top;

	if (!resize_edge) return;

	// Only resize width if allowed
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

	// Only resize height if allowed
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

	dragged_window.style.width = `${new_width}px`;
	dragged_window.style.height = `${new_height}px`;
	dragged_window.style.left = `${new_left}px`;
	dragged_window.style.top = `${new_top}px`;
}

function stopResize() {
	if (is_resizing) {
		is_resizing = false;
		resize_edge = null;
		dragged_window = null;
		window.removeEventListener("mousemove", handleResize);
		window.removeEventListener("mouseup", stopResize);
		save();
	}
}

async function handleMouseMove(e: MouseEvent) {
	if (current_mouse_button === 0) {
		delta_x = last_mouse_x - e.clientX;
		delta_y = last_mouse_y - e.clientY;
		last_mouse_x = e.clientX;
		last_mouse_y = e.clientY;

		dragging_x = dragging_x - delta_x;
		dragging_y = dragging_y - delta_y;

		if (dragged_window) {
			dragged_window.style.transform = `translate(${dragging_x}px, ${dragging_y}px)`;
		}
	}
}

async function handleMouseUp(e: MouseEvent) {
	window.removeEventListener("mousemove", handleMouseMove);
	window.removeEventListener("mouseup", handleMouseUp);

	if (current_mouse_button === 0) {
		document.body.classList.toggle("is-dragging");

		if (dragged_window) {
			dragged_window.style.left = `${dragging_x}px`;
			dragged_window.style.top = `${dragging_y}px`;
			dragged_window.style.removeProperty("transform");
			dragged_window.style.removeProperty("will-change");
			await finish();
			dragged_window.style.removeProperty("transition");
			await finish();
			dragged_window.setAttribute("stb-motion", "idle");
		}
	}

	if (current_mouse_button === 0 || current_mouse_button === 2) {
		save();
	}

	dragged_window = null;
}

export function overrideDraggingPosition(x: number, y: number) {
	dragging_x = x;
	dragging_y = y;
}
