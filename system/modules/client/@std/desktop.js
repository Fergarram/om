import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";
import { isScrollable, finish } from "utils";
import { initializeBackgroundCanvas } from "wallpaper";

//
// Config
//

const HANDLE_CONFIG = {
	EDGE_SIZE: 12,
	CORNER_SIZE: 12,
	OFFSET: -6,
};

const ZOOM_EVENT_DELAY = 150;
const SCROLL_EVENT_DELAY = 150;

const IS_TRACKPAD = false;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1;

const surface_initial_width = 100_000;
const surface_initial_height = 100_000; //surface_initial_width * (window.innerHeight / window.innerWidth);

//
// State
//

let applet_initializers = {};
let place_callbacks = [];
let remove_callbacks = [];
let order_change_callbacks = [];
let superkeydown = true;

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
let zoom_level = 1;
let is_zooming = false;
let scroll_thumb_x = 0;
let scroll_thumb_y = 0;

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

//
// Custom element setup
//

const { div, main, canvas } = useTags();

export const Desktop = registerCustomTag("desktop-view", {
	setup() {
		this.shadow_map = null;
	},

	//
	// Hydration for desktop
	//
	async onconnected() {
		// Setting up the root element styles.
		this.style.display = "flex";
		this.style.position = "absolute";
		this.style.top = "0";
		this.style.left = "0";
		this.style.width = "100%";
		this.style.height = "100%";

		const canvas_el =
			this.querySelector("#desktop-canvas") ||
			this.appendChild(
				canvas({
					id: "desktop-canvas",
					style: `
						position: absolute;
						width: 100%;
						height: 100%;
						flex-grow: 1;
						overflow: hidden;
					`,
				}),
			);

		const desktop_el =
			this.querySelector("#desktop") ||
			this.appendChild(
				main(
					{
						id: "desktop",
						style: `
							position: relative;
							width: 100%;
							height: auto;
							flex-grow: 1;
							overflow: hidden;
						`,
					},
					div({
						id: "desktop-surface",
						// style: () => (is_zooming ? `will-change: transform, width, height;` : ``),
						style: `
							position: absolute;
							transform-origin: 0 0;
							transform: scale(1);
							width: ${surface_initial_width}px;
							height: ${surface_initial_height}px;
						`,
					}),
				),
			);

		const surface_el = desktop_el.firstElementChild;

		const shadow_map_el =
			this.querySelector("#applet-shadow-map") ||
			this.appendChild(
				div({
					id: "applet-shadow-map",
					style: `
						width: 0;
						height: 0;
						pointer-events: none;
						opacity: 0;
					`,
				}),
			);

		this.shadow_map = shadow_map_el.attachShadow({ mode: "open" });

		// Let's wait for the browser to finish the current queue of actions.
		await finish();

		// Here we would deal with the WebGL wallpaper.
		const { drawWallpaper, resizeCanvas } = await initializeBackgroundCanvas(desktop_el, canvas_el);

		handleResize();

		// Scroll to the center of the canvas. This may cause a jumping effect with async events so we might remove this.
		scrollToCenter();

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

		requestAnimationFrame(step);

		//
		// Desktop closures
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

		function handleResize() {
			resizeCanvas();
			drawWallpaper(camera_x, camera_y, current_scale);
		}

		async function handleGlobalKeydown(e) {
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
				const prev_scroll_x = desktop_el.scrollLeft;
				const prev_scroll_y = desktop_el.scrollTop;
				const viewport_width = desktop_el.offsetWidth;
				const viewport_height = desktop_el.offsetHeight;

				// Calculate center point before scale change
				const center_x = (prev_scroll_x + viewport_width / 2) / current_scale;
				const center_y = (prev_scroll_y + viewport_height / 2) / current_scale;

				if (e.key === "≠") {
					e.preventDefault();
					is_zooming = true;
					current_scale = Math.min(current_scale + 0.1, 1.0);
				} else if (e.key === "–") {
					e.preventDefault();
					is_zooming = true;
					current_scale = Math.max(current_scale - 0.1, 0.1);
				} else if (e.key === "º") {
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

			if (IS_TRACKPAD && superkeydown && e.shiftKey && !e.ctrlKey) {
				e.preventDefault();
				desktop_el.scrollTo({
					left: camera_x + e.deltaX,
					top: camera_y + e.deltaY,
				});
			} else if ((superkeydown && !is_panning) || (IS_TRACKPAD && superkeydown && e.shiftKey && e.ctrlKey)) {
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
				const scale_factor = Math.max(0.005, current_scale * 0.05);

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
			if ((superkeydown && e.button === 1) || (superkeydown && e.button === 0 && e.target === surface_el)) {
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
			if (e.button === 1 || e.button === 0) {
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
			drawWallpaper(camera_x, camera_y, current_scale);

			requestAnimationFrame(step);
		}
	},
});

export function registerAppletTag(name, config, ...children) {
	return registerCustomTag(`applet-${name}`, {
		setup() {
			// We can extract state from the applet wrapper html here like motion, tsid, etc

			this.resize_observer = null;

			// Call setup last
			config.setup?.call(this);
		},
		onconnected() {
			// Update needed attributes for "motion", "tsid", position, etc.
			// Should we await for this?
			config.hydrate?.call(this);
			// Inject children. It will have callbacks that use data or simply use primitives on the tree it builds.

			if (config.onresize) {
				this.resize_observer = new ResizeObserver((entries) => {
					for (const entry of entries) {
						config.onresize.call(this, entry);
					}
				});

				this.resize_observer.observe(this);
			}
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
