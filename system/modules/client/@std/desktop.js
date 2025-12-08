import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";
import { isScrollable, finish, css, uniqueId } from "utils";
// import { initializeBackgroundCanvas } from "wallpaper";

//
// Constants
//

const LEFT_BUTTON = 0;
const MIDDLE_BUTTON = 1;
const RIGHT_BUTTON = 2;
const BACK_BUTTON = 3;
const FORWARD_BUTTON = 4;

const MOTION_IDLE = "idle";
const MOTION_LIFT = "lift";
const MOTION_RESIZE = "resize";

//
// Config
//

const ZOOM_EVENT_DELAY = 150;
const SCROLL_EVENT_DELAY = 150;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const SURFACE_WIDTH = 100_000;
const SURFACE_HEIGHT = 100_000;

//
// Desktop View (ustom element setup)
//

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
let zoom_level = 1;
let is_zooming = false;
let scroll_thumb_x = 0;
let scroll_thumb_y = 0;
let last_z_index = 0;
let frame_count = 0;

const { div, main, canvas } = useTags();

export const Desktop = registerCustomTag("desktop-view", {
	//
	// Hydration for desktop
	//
	async onconnected() {
		// By default the desktop element places itself as follows:
		this.style.display = "flex";
		// this.style.position = "relative";
		// this.style.top = "0";
		// this.style.left = "0";
		this.style.width = "100vw";
		this.style.height = "100vh";

		const back_canvas_el =
			this.querySelector("canvas[layer='back']") ||
			this.appendChild(
				canvas({
					layer: "back",
					style: `
						position: absolute;
						width: 100%;
						height: 100%;
						flex-grow: 1;
						overflow: hidden;
						pointer-events: none;
					`,
				}),
			);

		const desktop_el =
			this.querySelector("main") ||
			this.appendChild(
				main(
					{
						style: css`
							position: relative;
							width: 100%;
							height: auto;
							flex-grow: 1;
							/* @TODO: overflow scroll is NO JS fallback, we need a fallback */
							/*        Maybe via a CSS var that is inlined via module and */
							/*        overwritten at runtime? */
							overflow: hidden;
						`,
					},
					div({
						id: "surface",
						// still not sure if I need to set this
						// style: () => (is_zooming ? `will-change: transform, width, height;` : ``),
						style: `
							position: absolute;
							transform-origin: 0 0;
							transform: scale(1);
							width: ${SURFACE_WIDTH}px;
							height: ${SURFACE_HEIGHT}px;
						`,
					}),
				),
			);

		const surface_el = desktop_el.firstElementChild;

		const front_canvas_el =
			this.querySelector("canvas[layer='front']") ||
			this.appendChild(
				canvas({
					layer: "front",
					style: `
						position: absolute;
						width: 100%;
						height: 100%;
						flex-grow: 1;
						overflow: hidden;
						pointer-events: none;
					`,
				}),
			);

		// Let's wait for the browser to finish the current queue of actions.
		await finish();

		// Here we would deal with the WebGL wallpaper.
		// const { drawWallpaper, resizeCanvas } = await initializeBackgroundCanvas(
		// 	desktop_el,
		// 	canvas_el,
		// );

		handleResize();

		// Scroll to the center of the canvas. This may cause a jumping
		// effect with async events so we might remove this.
		const current_camera_x = this.getAttribute("camera-x");
		const current_camera_y = this.getAttribute("camera-y");
		const current_camera_scale = this.getAttribute("camera-scale");

		if (current_camera_x === null || current_camera_y === null || current_camera_scale === null) {
			scrollToCenter();
		} else {
			desktop_el.scrollTo(current_camera_x, current_camera_y);
		}

		//
		// Setup event listeners
		//

		desktop_el.addEventListener("wheel", desktopWheel, { passive: false });
		desktop_el.addEventListener("scroll", desktopScroll);
		surface_el.addEventListener("mousedown", surfaceMouseDown);

		window.addEventListener("resize", handleResize);
		window.addEventListener("keydown", handleGlobalKeydown);
		window.addEventListener("mouseleave", windowMouseOut);
		window.addEventListener("mouseout", windowMouseOut);
		window.addEventListener("mousedown", windowMouseDown);
		window.addEventListener("mouseup", windowMouseUp);
		window.addEventListener("mousemove", windowMouseMove);

		function handleResize() {
			// resizeCanvas();
			// drawWallpaper(camera_x, camera_y, current_scale);
		}

		async function handleGlobalKeydown(e) {
			if (e.ctrlKey || e.metaKey) {
				// Store current scroll position and viewport dimensions
				const prev_scroll_x = desktop_el.scrollLeft;
				const prev_scroll_y = desktop_el.scrollTop;
				const viewport_width = desktop_el.offsetWidth;
				const viewport_height = desktop_el.offsetHeight;

				// Calculate center point before scale change
				const center_x = (prev_scroll_x + viewport_width / 2) / current_scale;
				const center_y = (prev_scroll_y + viewport_height / 2) / current_scale;

				if (e.key === "=") {
					e.preventDefault();
					is_zooming = true;
					current_scale = Math.min(current_scale + 0.1, MAX_ZOOM);
				} else if (e.key === "-") {
					e.preventDefault();
					is_zooming = true;
					current_scale = Math.max(current_scale - 0.1, MIN_ZOOM);
				} else if (e.key === "0") {
					e.preventDefault();
					is_zooming = true;
					current_scale = 1.0;
				} else {
					return;
				}

				// Update the scale immediately
				updateSurfaceScale();
				await finish();

				// Calculate new scroll position to maintain center point
				const new_scroll_x = center_x * current_scale - viewport_width / 2;
				const new_scroll_y = center_y * current_scale - viewport_height / 2;

				// Apply new scroll position
				desktop_el.scrollTo({
					left: new_scroll_x,
					top: new_scroll_y,
				});

				// Reset is_zooming after a short delay
				clearTimeout(zoom_timeout);
				zoom_timeout = setTimeout(() => {
					is_zooming = false;
				}, ZOOM_EVENT_DELAY);
			}
		}

		async function desktopWheel(e) {
			let target = e.target;
			while (target && target !== surface_el) {
				if (isScrollable(target) && !is_scrolling) {
					return;
				}
				target = target.parentElement;
			}

			if (!e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				desktop_el.scrollTo({
					left: camera_x + e.deltaX * 1.2,
					top: camera_y + e.deltaY * 1.2,
				});
			} else if ((e.metaKey || e.ctrlKey) && !is_panning) {
				e.preventDefault();

				// Store current scroll position and viewport dimensions
				const prev_scroll_x = desktop_el.scrollLeft;
				const prev_scroll_y = desktop_el.scrollTop;

				// Get cursor position relative to the viewport
				const rect = desktop_el.getBoundingClientRect();
				const cursor_x = e.clientX - rect.left;
				const cursor_y = e.clientY - rect.top;

				// Calculate origin point before scale change
				const point_x = (prev_scroll_x + cursor_x) / current_scale;
				const point_y = (prev_scroll_y + cursor_y) / current_scale;

				// Calculate a scale factor that's smaller at low zoom levels
				// The 0.05 at scale 1.0 will reduce to 0.005 at scale 0.1
				const base_scale_factor = Math.max(0.005, current_scale * 0.05);

				// Make mouse wheel zoom faster than trackpad
				const scale_factor = base_scale_factor;

				// Calculate new scale with variable increment based on current scale
				const delta = e.deltaY > 0 ? -scale_factor : scale_factor;
				let new_scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current_scale + delta));

				// Only proceed if the scale actually changed
				if (new_scale !== current_scale) {
					is_zooming = true;
					current_scale = new_scale;

					// Update the scale immediately
					updateSurfaceScale();

					// Calculate new scroll position to maintain cursor point
					const new_scroll_x = point_x * current_scale - cursor_x;
					const new_scroll_y = point_y * current_scale - cursor_y;

					// Apply new scroll position
					desktop_el.scrollTo({
						left: new_scroll_x,
						top: new_scroll_y,
					});

					// Reset is_zooming after a short delay
					clearTimeout(zoom_timeout);
					zoom_timeout = setTimeout(() => {
						is_zooming = false;
					}, ZOOM_EVENT_DELAY);
				}
			}
		}

		function desktopScroll(e) {
			is_scrolling = true;

			clearTimeout(scrolling_timeout);
			scrolling_timeout = setTimeout(() => {
				is_scrolling = false;
			}, SCROLL_EVENT_DELAY);

			const rect = surface_el.getBoundingClientRect();
			const max_x = rect.width - desktop_el.offsetWidth;
			const max_y = rect.height - desktop_el.offsetHeight;

			let new_x = desktop_el.scrollLeft;
			let new_y = desktop_el.scrollTop;

			if (new_x >= max_x) {
				new_x = max_x;
			}

			if (new_y >= max_y) {
				new_y = max_y;
			}

			camera_x = desktop_el.scrollLeft;
			camera_y = desktop_el.scrollTop;

			scroll_thumb_x = (desktop_el.scrollLeft / rect.width) * 100;
			scroll_thumb_y = (desktop_el.scrollTop / rect.height) * 100;
		}

		function surfaceMouseDown(e) {
			if (
				e.button === MIDDLE_BUTTON ||
				((e.ctrlKey || e.metaKey) && e.button === LEFT_BUTTON && e.target === surface_el)
			) {
				e.preventDefault();
				is_panning = true;
				document.body.classList.add("is-panning");
				last_middle_click_x = e.clientX;
				last_middle_click_y = e.clientY;
			}
		}

		function windowMouseOut(e) {
			if (e.target.tagName !== "HTML") return;
			is_panning = false;
			document.body.classList.remove("is-panning");
		}

		function windowMouseDown(e) {}

		function windowMouseUp(e) {
			if (e.button === MIDDLE_BUTTON || e.button === LEFT_BUTTON) {
				is_panning = false;
				document.body.classList.remove("is-panning");
			}
		}

		function windowMouseMove(e) {
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

		//
		// Frame callback loop
		//

		requestAnimationFrame(step);

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

			const rect = surface_el.getBoundingClientRect();
			const max_x = rect.width - desktop_el.offsetWidth;
			const max_y = rect.height - desktop_el.offsetHeight;

			if (camera_x >= max_x) {
				camera_x = max_x;
			}

			if (camera_y >= max_y) {
				camera_y = max_y;
			}

			if (is_panning) {
				desktop_el.scroll({
					left: camera_x,
					top: camera_y,
					behavior: "instant",
				});
			}

			// Update the scale consistently in the animation loop
			updateSurfaceScale();

			// Draw the wallpaper with the current scroll and zoom
			// drawWallpaper(camera_x, camera_y, current_scale);

			// Check periodically if we should normalize
			if (frame_count === undefined) frame_count = 0;
			// Every 10 seconds
			if (++frame_count >= 60 * 10) {
				frame_count = 0;
				normalizeZIndexes();
			}

			// Save state in DOM
			desktop_el.setAttribute("camera-x", camera_x);
			desktop_el.setAttribute("camera-y", camera_y);
			desktop_el.setAttribute("camera-scale", current_scale);

			requestAnimationFrame(step);
		}

		//
		// Desktop utilities
		//

		function scrollToCenter() {
			const rect = surface_el.getBoundingClientRect();
			desktop_el.scroll({
				left: rect.width / 2 - desktop_el.offsetWidth / 2,
				top: rect.height / 2 - desktop_el.offsetHeight / 2,
			});
		}

		function updateSurfaceScale() {
			surface_el.style.transform = `scale(${current_scale})`;
			zoom_level = current_scale;
		}

		function normalizeZIndexes() {
			const all_applets = document.querySelectorAll("[motion]");

			if (all_applets.length === 0) return;

			// Check if all applets are idle
			const all_idle = Array.from(all_applets).every(
				(applet) => applet.getAttribute("motion") === MOTION_IDLE,
			);

			if (!all_idle) return;

			// Find minimum z-index
			let min_z = Infinity;
			all_applets.forEach((applet) => {
				const z = parseInt(applet.style.zIndex) || 0;
				if (z < min_z) {
					min_z = z;
				}
			});

			// If minimum is already low enough, no need to normalize
			if (min_z <= 1) return;

			// Subtract minimum from all z-indexes
			all_applets.forEach((applet) => {
				const current_z = parseInt(applet.style.zIndex) || 0;
				applet.style.zIndex = current_z - min_z + 1;
			});

			// Update last_z_index to reflect the new maximum
			last_z_index =
				Math.max(...Array.from(all_applets).map((a) => parseInt(a.style.zIndex) || 0)) + 1;
		}
	},
});

//
// Applets (custom element setup)
//

let last_mouse_x = 0;
let last_mouse_y = 0;
let delta_x = 0;
let delta_y = 0;
let dragged_applet = null;
let dragging_x = 0;
let dragging_y = 0;
let current_mouse_button = null;
let min_width = 10;
let min_height = 10;
let is_resizing = false;
let is_right_resize = false;
let resize_start_width = 0;
let resize_start_height = 0;
let resize_start_x = 0;
let resize_start_y = 0;
let resize_quadrant = null;
let resize_start_left = 0;
let resize_start_top = 0;

export function registerAppletTag(name, config) {
	async function handleAppletMouseDown(e) {
		if (!e.target || e.target === e.currentTarget || dragged_applet !== null || is_panning)
			return;

		current_mouse_button = e.button;

		const target = e.target;
		const is_contenteditable =
			target.isContentEditable || target.closest('[contenteditable="true"]');

		const is_super_down = e.metaKey || e.ctrlKey;

		if (
			this.getAttribute("motion") !== MOTION_IDLE ||
			target.tagName === "A" ||
			target.tagName === "BUTTON" ||
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.tagName === "SELECT" ||
			is_contenteditable ||
			(target.tagName === "IMG" && target.getAttribute("draggable") !== "false")
		) {
			if (is_super_down) e.preventDefault();
		}

		// Start resize interaction
		if (is_super_down && current_mouse_button === RIGHT_BUTTON) {
			e.preventDefault();

			// Start resizing with right click
			is_right_resize = true;
			dragged_applet = this;

			// Store initial dimensions and mouse position
			resize_start_width = this.offsetWidth;
			resize_start_height = this.offsetHeight;
			resize_start_x = e.clientX;
			resize_start_y = e.clientY;
			resize_start_left = parseInt(this.style.left) || 0;
			resize_start_top = parseInt(this.style.top) || 0;

			// Determine which quadrant the click happened in
			const applet_rect = this.getBoundingClientRect();
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
			this.style.willChange = "width, height, left, top";
		}
		// Start drag interaction
		else if (is_super_down && current_mouse_button === LEFT_BUTTON) {
			e.preventDefault();

			document.body.classList.add("is-dragging");
			let x = Number(this.style.left.replace("px", ""));
			let y = Number(this.style.top.replace("px", ""));

			dragging_x = x;
			dragging_y = y;
			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;

			this.style.willChange = "filter, transform, left, top";

			await finish();

			this.style.left = "0";
			this.style.top = "0";
			this.setAttribute("motion", MOTION_LIFT);
			// I should take more care of the transform, rotate, scale values here...
			// Z and scale are currently arbitrary and rotation is simply not there.
			this.style.transform = `translate(${x}px, ${y}px) translateZ(0) scale(1.01)`;

			dragged_applet = this;
		}

		// Add mousemove and mouseup events on mousedown
		window.addEventListener("mousemove", handleAppletMouseMove);
		window.addEventListener("mouseup", handleAppletMouseUp);
	}

	async function handleAppletMouseUp(e) {
		window.removeEventListener("mousemove", handleAppletMouseMove);
		window.removeEventListener("mouseup", handleAppletMouseUp);

		if (!dragged_applet) return;

		if (current_mouse_button === LEFT_BUTTON) {
			document.body.classList.remove("is-dragging");

			if (!e.shiftKey) {
				dragged_applet.style.left = `${dragging_x}px`;
				dragged_applet.style.top = `${dragging_y}px`;
				dragged_applet.style.removeProperty("transform");
				dragged_applet.style.removeProperty("will-change");
				await finish();
				dragged_applet.style.removeProperty("transition");
				await finish();
				dragged_applet.setAttribute("motion", MOTION_IDLE);
			} else {
				dragged_applet.style.removeProperty("will-change");
			}
		}
		// Handle completion of right-click resize
		else if (current_mouse_button === RIGHT_BUTTON && is_right_resize) {
			// Clean up
			is_resizing = false;
			is_right_resize = false;
			const ev = new CustomEvent("applet-resize-stop", { detail: { applet: dragged_applet } });
			window.dispatchEvent(ev);
			resize_quadrant = null;
			dragged_applet.style.removeProperty("will-change");
			dragged_applet.setAttribute("motion", MOTION_IDLE);
			document.body.classList.remove("is-resizing");
		}

		dragged_applet = null;
	}

	async function handleAppletMouseMove(e) {
		// Handle regular drag operation
		if (current_mouse_button === LEFT_BUTTON) {
			delta_x = (last_mouse_x - e.clientX) / current_scale;
			delta_y = (last_mouse_y - e.clientY) / current_scale;
			last_mouse_x = e.clientX;
			last_mouse_y = e.clientY;

			dragging_x = dragging_x - delta_x;
			dragging_y = dragging_y - delta_y;

			if (dragged_applet && !e.shiftKey) {
				// I should take more care of the transform, rotate, scale values here...
				// Z and scale are currently arbitrary and rotation is simply not there.
				dragged_applet.style.transform = `translate(${dragging_x}px, ${dragging_y}px) translateZ(0) scale(1.01)`;
			} else if (dragged_applet && e.shiftKey) {
				dragged_applet.style.left = `${dragging_x}px`;
				dragged_applet.style.top = `${dragging_y}px`;
			}
		}
		// Handle right-click resize operation with quadrants
		else if (current_mouse_button === RIGHT_BUTTON && is_right_resize && dragged_applet) {
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
				const ev = new CustomEvent("applet-resize-start", {
					detail: { applet: dragged_applet },
				});
				window.dispatchEvent(ev);
				document.body.classList.add("is-resizing");
				dragged_applet.setAttribute("motion", MOTION_RESIZE);
			}
		}
	}

	function preventContextMenu(e) {
		if ((e.metaKey || e.ctrlKey) && e.button === 2) {
			e.preventDefault();
			return false;
		}
		return true;
	}

	return registerCustomTag(`applet-${name}`, {
		setup() {
			// Update last_z_index if this applet has a higher z-index
			const current_z = parseInt(this.style.zIndex) || this.start_z;
			if (current_z >= last_z_index) {
				last_z_index = current_z + 1;
			}

			// Default starting dimensions and position
			this.start_x = 0;
			this.start_y = 0;
			this.start_z = last_z_index++;
			this.start_w = 0;
			this.start_h = 0;

			// Starting values could be overwritten here
			config.setup?.call(this);

			this.resize_observer = null;
			this.$on("contextmenu", preventContextMenu);
			this.$on("mousedown", handleAppletMouseDown);
		},
		onconnected() {
			// Configure applet element attributes
			const attrs = {
				instance: uniqueId(),
				motion: MOTION_IDLE,
				style: `
					display: block;
					position: absolute;
					left: ${this.style.left || this.start_x + "px"};
					top: ${this.style.top || this.start_y + "px"};
					z-index: ${this.style.zIndex || this.start_z};
					width: ${this.style.width || this.start_w + "px"};
					height: ${this.style.height || this.start_h + "px"};
				`,
			};

			for (const [attr, value] of Object.entries(attrs)) {
				this.setAttribute(attr, value);
			}

			// Run hydration code
			config.hydrate?.call(this);

			// Setup applet resize observer
			if (config.onresize) {
				this.resize_observer = new ResizeObserver((entries) => {
					for (const entry of entries) {
						config.onresize.call(this, entry);
					}
				});

				this.resize_observer.observe(this);
			}
		},
		attrs: ["motion"],
		onattributechanged(name, old_value, new_value) {
			if (name === "motion") {
				if (new_value === MOTION_LIFT && old_value !== MOTION_LIFT) {
					this.style.zIndex = last_z_index++;
					config.onlift?.call(this);
				} else if (new_value === MOTION_IDLE && old_value !== MOTION_IDLE) {
					config.onplace?.call(this);
				}
			}

			config.onattributechanged?.call(this, name, old_value, new_value);
		},
		ondisconnected() {
			if (this.resize_observer) {
				this.resize_observer.disconnect();
				this.resize_observer = null;
			}

			config.onremove?.call(this);
		},
	});
}

//
// Global styles to prevent unwanted selection
//

BlobLoader.addStyleModule(
	"desktop-styles",
	css`
		body {
			user-select: none;
			background-color: black;
		}

		desktop-view [motion] > :first-child {
			transition: box-shadow 120ms cubic-bezier(0.25, 0.8, 0.25, 1);
		}

		desktop-view [motion="${MOTION_IDLE}"] > :first-child,
		desktop-view [motion="${MOTION_RESIZE}"] > :first-child {
			box-shadow:
				0 1px 3px rgba(0, 0, 0, 0.12),
				0 1px 2px rgba(0, 0, 0, 0.24);
		}

		desktop-view [motion="${MOTION_LIFT}"] > :first-child {
			box-shadow:
				0 19px 38px rgba(0, 0, 0, 0.3),
				0 15px 12px rgba(0, 0, 0, 0.22);
		}

		#surface {
			background-image: var(--BM-grid-svg-light);
		}

		@media (prefers-color-scheme: dark) {
			#surface {
				background-image: var(--BM-grid-svg-dark);
			}
		}
	`,
	{},
	{ override: true },
);

//
// Utilities
//

export function mountApplet(applet_el) {
	const surface_el = document.querySelector("desktop-view > main > div");
	surface_el.appendChild(applet_el);
}
