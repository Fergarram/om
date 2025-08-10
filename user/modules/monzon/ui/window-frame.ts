import { useMonzonTheme } from "@/monzon/theme";
import { useTags, type Child } from "@/lib/ima";
import { tw } from "@/lib/tw";
import { css, finish } from "@/lib/utils";
import { Button } from "@/om/ui/button";
import { getTopWindow, onAppletRemoved, overrideDraggingPosition, useDesktop } from "./desktop";
import type { ShortcutCallback } from "@/monzon/types";
import { AppSettings } from "@/monzon/state";

const tags = useTags();
const { div, header, h2, icon, button } = tags;

const all_window_shortcuts: Record<string, Record<string, ShortcutCallback>> = {};

let snap_overlay: HTMLElement | null = null;
let current_snap_zone: "left" | "right" | "top" | null = null;
let window_restore_state: Map<string, { x: number; y: number; width: number; height: number }> = new Map();

export type WindowFrameProps = {
	name: string;
	x: number;
	y: number;
	width: number | "fit-content";
	height: number | "fit-content";
	min_width?: number;
	min_height?: number;
	max_width?: number;
	max_height?: number;
	title: Child;
	left_children: Child[];
	right_children: Child[];
	content_children: Child[];
	oncontextmenu?: (e: MouseEvent) => void;
	shortcuts?: Record<string, ShortcutCallback>;
	classes?: string;
	onclose?: (w: HTMLElement) => void;
	ondidclose?: (w: HTMLElement) => void;
	ontitleclick?: (e: MouseEvent) => void;
	ontitlemenu?: (e: MouseEvent) => void;
	initial_snap?: "left" | "right" | "top";
	preferred_sizes?: {
		snap: { width: number; height: number };
		unsnap: { width: number; height: number };
	};
};

// Create snap overlay for visual feedback
function createSnapOverlay() {
	if (snap_overlay) return snap_overlay;

	snap_overlay = div({
		class: "component-window-snap-overlay",
		style: css`
			display: none;
		`,
	});

	document.body.querySelector("main")?.appendChild(snap_overlay);
	return snap_overlay;
}

function isWindowResizable(win: HTMLElement): boolean {
	// Check if width or height is set to fit-content
	if (win.style.width === "fit-content" || win.style.height === "fit-content") {
		return false;
	}

	// Check if max-width or max-height are set (not 'none')
	if (win.style.maxWidth || win.style.maxHeight) {
		return false;
	}

	return true;
}

// Hide snap preview
function hideSnapPreview() {
	if (snap_overlay) {
		snap_overlay.style.display = "none";
	}
	current_snap_zone = null;
}

// Check if window is currently snapped
function isWindowSnapped(win: HTMLElement): "left" | "right" | "top" | null {
	const snap_value = win.getAttribute("stb-snap");

	return snap_value ? (snap_value as any) : null;
}

// Store window state before snapping
function storeWindowState(win: HTMLElement) {
	const win_id = win.getAttribute("stb-tsid") || win.getAttribute("stb-window") || "";
	if (!win_id) return;

	window_restore_state.set(win_id, {
		x: parseInt(win.style.left) || 0,
		y: parseInt(win.style.top) || 0,
		width: win.offsetWidth,
		height: win.offsetHeight,
	});
}

// Restore window to previous state
async function restoreWindowState(
	win: HTMLElement,
	event?: {
		drag_start_x: number;
		drag_start_y: number;
	},
) {
	const win_id = win.getAttribute("stb-tsid") || win.getAttribute("stb-window") || "";
	if (!win_id) return;

	const state = window_restore_state.get(win_id);
	if (!state) return;

	if (event) {
		const desktop = useDesktop();
		const desktop_rect = desktop.getBoundingClientRect();
		const header_el = win.querySelector("header");

		if (header_el) {
			const header_rect = header_el.getBoundingClientRect();
			const mouse_offset_in_header = event.drag_start_x - header_rect.left;

			// Use the restored window width for proportion calculation, not current header width
			const header_proportion = mouse_offset_in_header / header_rect.width;
			const new_mouse_x_in_restored_header = state.width * header_proportion;
			const new_window_x = event.drag_start_x - new_mouse_x_in_restored_header;

			// Ensure the window stays within desktop bounds
			const max_x = desktop_rect.width - state.width;
			const constrained_x = Math.max(0, Math.min(new_window_x, max_x));

			const y_offset = header_rect.height * 1.5;
			const constrained_y = event.drag_start_y - y_offset;

			overrideDraggingPosition(constrained_x, constrained_y);
		} else {
			throw new Error("Header element not found. bad.");
		}
	} else {
		// Update left, top because we're not in dragging state.
		win.style.left = `${state.x}px`;
		win.style.top = `${state.y}px`;
	}

	win.style.width = `${state.width}px`;
	win.style.height = `${state.height}px`;

	// Update stb-snap attribute when unsnapping
	win.setAttribute("stb-snap", "");

	window_restore_state.delete(win_id);
}

// Snap window to specified zone
function snapWindow(win: HTMLElement, zone: "left" | "right" | "top", preferred_snap_size?: { width: number; height: number }) {
	const desktop = useDesktop();
	const desktop_rect = desktop.getBoundingClientRect();

	storeWindowState(win);

	switch (zone) {
		case "left":
			win.style.left = "0px";
			win.style.top = "0px";
			win.style.width = preferred_snap_size ? `${preferred_snap_size.width}px` : `${desktop_rect.width / 2}px`;
			win.style.height = preferred_snap_size ? `${preferred_snap_size.height}px` : `${desktop_rect.height}px`;
			break;
		case "right":
			const right_x = preferred_snap_size ? desktop_rect.width - preferred_snap_size.width : desktop_rect.width / 2;
			win.style.left = `${right_x}px`;
			win.style.top = "0px";
			win.style.width = preferred_snap_size ? `${preferred_snap_size.width}px` : `${desktop_rect.width / 2}px`;
			win.style.height = preferred_snap_size ? `${preferred_snap_size.height}px` : `${desktop_rect.height}px`;
			break;
		case "top":
			win.style.left = "0px";
			win.style.top = "0px";
			win.style.width = preferred_snap_size ? `${preferred_snap_size.width}px` : `${desktop_rect.width}px`;
			win.style.height = preferred_snap_size ? `${preferred_snap_size.height}px` : `${desktop_rect.height}px`;
			break;
	}

	// Update stb-snap attribute when snapping
	win.setAttribute("stb-snap", zone);
}

// Detect snap zone based on mouse position
function detectSnapZone(mouse_x: number, mouse_y: number): "left" | "right" | "top" | null {
	const desktop = useDesktop();
	const desktop_rect = desktop.getBoundingClientRect();

	// Top edge (maximize)
	if (mouse_y <= desktop_rect.top + AppSettings.windows.snapping_distance) {
		return "top";
	}

	// Left edge
	if (mouse_x <= desktop_rect.left + AppSettings.windows.snapping_distance) {
		return "left";
	}

	// Right edge
	if (mouse_x >= desktop_rect.right - AppSettings.windows.snapping_distance) {
		return "right";
	}

	return null;
}

window.addEventListener("keydown", (e: KeyboardEvent) => {
	const top_window = getTopWindow();
	if (!top_window) return;

	// Prevent app closing
	if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
		e.preventDefault();
	}

	// Only return early if it's just modifier keys being pressed
	if ((e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) && ["Meta", "Control", "Alt", "Shift"].includes(e.key)) {
		return;
	}

	const window_name = top_window.getAttribute("stb-window");
	if (!window_name || !all_window_shortcuts[window_name]) return;

	for (let [shortcut, callback] of Object.entries(all_window_shortcuts[window_name])) {
		const parts = shortcut.split("+");
		const key = parts.pop() || "";

		// Convert "Space" to actual space character for comparison
		const normalizedShortcutKey = key.toLowerCase() === "space" ? " " : key;

		// Simple check if key matches
		if (normalizedShortcutKey.toLowerCase() !== e.key.toLowerCase()) continue;

		// Handle modifiers including CmdOrCtrl
		const has_cmdorctrl = parts.some((mod) => mod.toLowerCase() === "cmdorctrl" || mod.toLowerCase() === "commandorcontrol");

		// Regular modifiers
		const has_ctrl = parts.some((mod) => mod.toLowerCase() === "ctrl" || mod.toLowerCase() === "control");
		const has_alt = parts.some((mod) => mod.toLowerCase() === "alt");
		const has_shift = parts.some((mod) => mod.toLowerCase() === "shift");
		const has_meta = parts.some((mod) => mod.toLowerCase() === "meta" || mod.toLowerCase() === "command");

		// Check if modifiers match
		const ctrl_matches = has_cmdorctrl ? e.metaKey || e.ctrlKey : has_ctrl === e.ctrlKey;
		const meta_matches = has_cmdorctrl ? e.metaKey || e.ctrlKey : has_meta === e.metaKey;

		if (ctrl_matches && meta_matches && has_alt === e.altKey && has_shift === e.shiftKey) {
			e.preventDefault();
			callback({
				event: e,
				win: top_window,
			});
			break;
		}
	}
});

export function WindowFrame({
	name,
	x,
	y,
	width,
	height,
	title,
	left_children = [],
	right_children = [],
	content_children = [],
	oncontextmenu,
	shortcuts,
	classes = "",
	onclose,
	ondidclose,
	ontitleclick,
	ontitlemenu,
	min_width = undefined,
	min_height = undefined,
	max_width = undefined,
	max_height = undefined,
	initial_snap = undefined,
	preferred_sizes = undefined,
}: WindowFrameProps) {
	const { icons } = useMonzonTheme();

	let is_dragging = false;
	let was_snapped_before_drag: "left" | "right" | "top" | null = null;
	let drag_start_x = 0;
	let drag_start_y = 0;
	let has_restored = false;
	let is_snapped = !!initial_snap;

	const win = div(
		{
			component: "window",
			"stb-window": name,
			"stb-motion": "idle",
			"stb-snap": initial_snap || "",
			class: () => {
				return tw("component-window-base", classes, {
					"component-window-floating": !is_snapped,
					"component-window-snapped": is_snapped,
				});
			},
			style: css`
				position: absolute;
				top: ${y}px;
				left: ${x}px;
				width: ${width !== "fit-content" ? `${width}px` : "fit-content"};
				height: ${height !== "fit-content" ? `${height}px` : "fit-content"};
				transform: translate(var(--translate-x, 0), var(--translate-y, 0)) translateZ(0);
				${min_width ? `min-width: ${min_width}px;` : ""}
				${min_height ? `min-height: ${min_height}px;` : ""}
				${max_width ? `max-width: ${max_width}px;` : ""}
				${max_height ? `max-height: ${max_height}px;` : ""}
			`,
		},
		header(
			{
				class: "component-window-titlebar",
				onmousedown(e: MouseEvent) {
					if (!isWindowResizable(win)) return;
					if (e.button !== 0) return;

					const target = e.target as HTMLElement;
					if (target.tagName === "BUTTON" || target.tagName === "INPUT") return;

					is_dragging = true;
					was_snapped_before_drag = isWindowSnapped(win);
					drag_start_x = e.clientX;
					drag_start_y = e.clientY;
					has_restored = false;
				},
			},
			tags[AppSettings.windows.menu_button !== "Right click" ? "button" : "div"](
				{
					class: () =>
						tw("group component-window-menu-base", {
							"component-window-menu-right-click": oncontextmenu && AppSettings.windows.menu_button === "Right click",
						}),
					oncontextmenu(e) {
						if (AppSettings.windows.menu_button === "Left click") return;
						if (oncontextmenu) oncontextmenu(e);
					},
					onclick(e) {
						if (AppSettings.windows.menu_button === "Right click") return;
						if (oncontextmenu) oncontextmenu(e);
					},
				},
				...left_children,
				AppSettings.windows.menu_button !== "Right click"
					? icon({
							class: "component-window-menu-arrow",
							name: icons.windows.menu_icon,
						})
					: null,
			),
			div(
				{
					class: "component-window-titlebar-handle",
					ondblclick(e) {
						const target_el = e.target as HTMLElement;
						const current_target_el = e.currentTarget as HTMLElement;

						if (current_target_el === target_el) {
							if (!isWindowSnapped(win)) {
								snapWindow(win, "top", preferred_sizes ? preferred_sizes.snap : undefined);
								is_snapped = true;
							} else {
								restoreWindowState(win);
								is_snapped = false;
							}
						}
					},
				},
				h2(
					{
						ondblclick: ontitleclick,
						oncontextmenu: ontitlemenu,
						class: "component-window-title",
					},
					title,
				),
			),
			div(
				{ class: "component-window-titlebar-buttons" },
				...right_children,
				Button(
					{
						size: "icon",
						onclick() {
							if (onclose) {
								onclose(win);
							} else {
								win.remove();
							}
						},
					},
					icon({ name: icons.windows.window_close }),
				),
			),
		),
		div(
			{
				class: "component-window-content",
			},
			div(
				{
					class: tw("overflow-hidden w-full h-full", {
						absolute: width !== "fit-content" && height !== "fit-content",
						relative: width === "fit-content" || height === "fit-content",
					}),
				},
				...content_children,
			),
		),
	);

	if (shortcuts) {
		all_window_shortcuts[name] = shortcuts;
	}

	if (ondidclose) {
		onAppletRemoved((w) => {
			if (w.getAttribute("stb-tsid") === win.getAttribute("stb-tsid")) {
				ondidclose(w);
			}
		});
	}

	if (!isWindowResizable(win)) {
		return win;
	}

	finish().then(() => {
		if (initial_snap) {
			const win_id = win.getAttribute("stb-tsid") || win.getAttribute("stb-window") || "";
			if (win_id) {
				window_restore_state.set(win_id, {
					x: x,
					y: y,
					width: preferred_sizes ? preferred_sizes.unsnap.width : win.offsetWidth,
					height: preferred_sizes ? preferred_sizes.unsnap.height : win.offsetHeight,
				});
			}
		}
	});

	// Listen for mouse move during drag
	window.addEventListener("mousemove", (e: MouseEvent) => {
		if (!is_dragging) return;

		if (was_snapped_before_drag && !has_restored) {
			// Calculate distance moved
			const distance_x = Math.abs(e.clientX - drag_start_x);
			const distance_y = Math.abs(e.clientY - drag_start_y);
			const total_distance = Math.sqrt(distance_x * distance_x + distance_y * distance_y);

			// Only restore if minimum threshold is met
			if (total_distance >= 5) {
				restoreWindowState(win, {
					drag_start_x: e.clientX,
					drag_start_y: e.clientY,
				});
				is_snapped = false;
				was_snapped_before_drag = null;
				has_restored = true;
			}
			return;
		}

		const snap_zone = detectSnapZone(e.clientX, e.clientY);

		if (snap_zone && snap_zone !== current_snap_zone) {
			current_snap_zone = snap_zone;
			if (!snap_overlay) createSnapOverlay();
			if (!snap_overlay) return;

			const desktop = useDesktop();
			const desktop_rect = desktop.getBoundingClientRect();

			snap_overlay.style.display = "block";

			switch (current_snap_zone) {
				case "left":
					snap_overlay.style.left = `${desktop_rect.left}px`;
					snap_overlay.style.top = `${desktop_rect.top}px`;
					snap_overlay.style.width = preferred_sizes ? `${preferred_sizes.snap.width}px` : `${desktop_rect.width / 2}px`;
					snap_overlay.style.height = preferred_sizes ? `${preferred_sizes.snap.height}px` : `${desktop_rect.height}px`;
					break;
				case "right":
					const right_x = preferred_sizes
						? desktop_rect.left + desktop_rect.width - preferred_sizes.snap.width
						: desktop_rect.left + desktop_rect.width / 2;
					snap_overlay.style.left = `${right_x}px`;
					snap_overlay.style.top = `${desktop_rect.top}px`;
					snap_overlay.style.width = preferred_sizes ? `${preferred_sizes.snap.width}px` : `${desktop_rect.width / 2}px`;
					snap_overlay.style.height = preferred_sizes ? `${preferred_sizes.snap.height}px` : `${desktop_rect.height}px`;
					break;
				case "top":
					snap_overlay.style.left = `${desktop_rect.left}px`;
					snap_overlay.style.top = `${desktop_rect.top}px`;
					snap_overlay.style.width = preferred_sizes ? `${preferred_sizes.snap.width}px` : `${desktop_rect.width}px`;
					snap_overlay.style.height = preferred_sizes ? `${preferred_sizes.snap.height}px` : `${desktop_rect.height}px`;
					break;
			}
		} else if (!snap_zone && current_snap_zone) {
			hideSnapPreview();
		}
	});

	// Listen for mouse up to complete snap
	window.addEventListener("mouseup", (e: MouseEvent) => {
		if (!is_dragging) return;

		is_dragging = false;

		finish().then(() => {
			if (current_snap_zone) {
				snapWindow(win, current_snap_zone, preferred_sizes ? preferred_sizes.snap : undefined);
				is_snapped = true;
				hideSnapPreview();
			}
		});

		was_snapped_before_drag = null;
		has_restored = false;
	});

	return win;
}
