import { finish, uniqueId } from "@/lib/utils";
import { useTags } from "@/lib/ima";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;

const { div } = useTags();

// @TODO: Find a way to load these from settings and fallback to these default values
const resize_handles = {
	edge_size: 12,
	corner_size: 12,
	offset: -6,
};

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

let shadow_host = null;
let shadow_root: ShadowRoot | null = null;
let applet_initializers: Record<string, (applet: HTMLElement) => {}> = {};
let mount_callbacks: ((applet: HTMLElement, first_mount: boolean) => {})[] = [];
let unmount_callbacks: Function[] = [];
let order_change_callbacks: Function[] = [];

export function getTopWindow() {
	const desktop = document.getElementById("desktop");
	if (!desktop) return null;

	const applets = Array.from(desktop.querySelectorAll("[om-applet]")) as HTMLElement[];
	if (applets.length === 0) return null;

	const top_applet = applets.reduce((prev, current) => {
		const prev_z = parseInt(prev.style.zIndex) || 0;
		const current_z = parseInt(current.style.zIndex) || 0;
		return current_z > prev_z ? current : prev;
	});

	return top_applet;
}

export function appletExists(name: string) {
	return document.querySelector(`[om-applet="${name}"]`) !== null;
}

export function findApplet(name: string) {
	return document.querySelector(`[om-applet="${name}"]`) as HTMLElement | null;
}

export function mountedApplets(name: string) {
	if (!name) {
		throw new Error("Name is required");
	}
	return Array.from(document.querySelectorAll(`[om-applet="${name}"]`) ?? []) as HTMLElement[];
}

export function spawnApplet(applet: HTMLElement) {
	const desktop = document.getElementById("desktop");
	if (!desktop) return;

	desktop.appendChild(applet);
}

export function onAppletMounted(callback: (applet: HTMLElement, first_mount: boolean) => {}) {
	mount_callbacks.push(callback);
}

export function onAppletRemoved(callback: (applet: HTMLElement) => void) {
	unmount_callbacks.push(callback);
}

export function onAppletOrderChange(callback: Function) {
	order_change_callbacks.push(callback);
}

export async function mountApplet(applet: HTMLElement, first_mount = false) {
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

export async function unmountApplet(applet: HTMLElement) {
	removeAppletMirror(applet);
	unmount_callbacks.forEach((c) => c(applet));
}

export function liftAppletMirror(tsid: string) {
	if (!shadow_root) return;
	const mirror = shadow_root.querySelector(`[om-tsid="${tsid}"]`);
	if (!mirror || !mirror.parentNode) return;

	mirror.parentNode.insertBefore(mirror, null);

	const desktop = document.getElementById("desktop");
	if (!desktop) return;

	const applets = Array.from(desktop.querySelectorAll("[om-applet]")) as HTMLElement[];

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

export function useDesktop() {
	const d = document.getElementById("desktop");
	if (!d) throw new Error("desktop not found");
	return d;
}

export async function Desktop() {
	const desktop = div({
		id: "desktop",
		component: "desktop",
		class: tw("relative w-full h-full"),
	});

	await finish();

	shadow_host = document.getElementById("applet-map");
	if (!shadow_host) throw new Error("applet-map not found");

	await finish();

	shadow_host.style.pointerEvents = "none";
	shadow_host.style.opacity = "0";
	shadow_root = shadow_host.attachShadow({ mode: "open" });

	observer.observe(desktop, { childList: true });

	onAppletMounted(initializeAppletEvents);

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

function addAppletMirror(applet: HTMLElement, id: string) {
	const mirror = document.createElement("div");
	mirror.style.position = "absolute";
	mirror.setAttribute("om-tsid", id);
	if (!shadow_root) return;

	shadow_root.appendChild(mirror);
	const new_z_index = shadow_root.children.length;
	applet.style.zIndex = String(new_z_index);
	// Trigger z-index change callbacks
	order_change_callbacks.forEach((c) => c(applet, new_z_index));
}

function removeAppletMirror(applet: HTMLElement) {
	if (!shadow_root) return;
	const removed_id = applet.getAttribute("om-tsid");
	const mirror = shadow_root.querySelector(`[om-tsid="${removed_id}"]`);
	if (mirror) {
		// Update z-index of other mirrors
		const mirrors = Array.from(shadow_root.children);
		mirrors
			.filter((m) => m.getAttribute("om-tsid") !== removed_id)
			.forEach((m, i) => {
				const desktop = document.getElementById("desktop");
				if (!desktop) return;

				const t = desktop.querySelector(`[om-tsid="${m.getAttribute("om-tsid")}"]`) as HTMLElement;
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

async function initializeAppletEvents(applet: HTMLElement, first_mount = false) {
	if (!first_mount) {
		await finish();
		applet.setAttribute("om-motion", "idle");
		applet.style.removeProperty("will-change");
	}

	applet.addEventListener("mousedown", handleMouseDownFocus);

	const header = applet.querySelector("header");
	if (!header) return;

	header.addEventListener("mousedown", handleMouseDown);

	async function handleMouseDownFocus(e: MouseEvent) {
		const tsid = applet.getAttribute("om-tsid");
		if (!tsid) return;
		liftAppletMirror(tsid);
	}

	async function handleMouseDown(e: MouseEvent) {
		if (!e.target) return;
		if (dragged_applet !== null) return;

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
			document.body.classList.toggle("is-dragging");
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
			applet.style.transform = `translate(${x}px, ${y}px) translateZ(0)`;

			dragged_applet = applet;
		}

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
	}

	addResizeHandles(applet);

	function addResizeHandles(applet: HTMLElement) {
		const constraints = getComputedMinMax(applet);

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
				dragged_applet = applet;

				// Store initial positions considering scale
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
}

function handleResize(e: MouseEvent) {
	if (!is_resizing || !dragged_applet) return;

	const constraints = getComputedMinMax(dragged_applet);

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

async function handleMouseMove(e: MouseEvent) {
	if (current_mouse_button === 0) {
		delta_x = last_mouse_x - e.clientX;
		delta_y = last_mouse_y - e.clientY;
		last_mouse_x = e.clientX;
		last_mouse_y = e.clientY;

		dragging_x = dragging_x - delta_x;
		dragging_y = dragging_y - delta_y;

		if (dragged_applet) {
			dragged_applet.style.transform = `translate(${dragging_x}px, ${dragging_y}px)`;
		}
	}
}

async function handleMouseUp(e: MouseEvent) {
	window.removeEventListener("mousemove", handleMouseMove);
	window.removeEventListener("mouseup", handleMouseUp);

	if (current_mouse_button === 0) {
		document.body.classList.toggle("is-dragging");

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
