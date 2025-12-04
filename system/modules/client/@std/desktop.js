import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";

//
// Config
//

const HANDLE_CONFIG = {
	EDGE_SIZE: 12,
	CORNER_SIZE: 12,
	OFFSET: -6,
};

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

const canvas_ref = { current: null };
const desktop_ref = { current: null };
const surface_ref = { current: null };
const shadow_map_ref = { current: null };

export const Desktop = registerCustomTag("applet-desktop", {
	setup() {
		this.shadow_map = null;
	},
	onconnected() {
		// Otherwise we add children
		const canvas_el =
			this.querySelector("#desktop-canvas") ||
			this.appendChild(
				canvas({
					ref: canvas_ref,
					id: "desktop-canvas",
					style: `
						position: absolute;
						width: 100%;
						height: auto;
						bottom: 0;
						flex-grow: 1;
						overflow: hidden;
					`,
				}),
			);

		const main_el =
			this.querySelector("#desktop") ||
			this.appendChild(
				main(
					{
						ref: desktop_ref,
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
						ref: surface_ref,
						id: "desktop-surface",
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

		const shadow_map_el =
			this.querySelector("#applet-shadow-map") ||
			this.appendChild(
				div({
					ref: shadow_map_ref,
					id: "applet-shadow-map",
					style: `
						pointer-events: none;
						opacity: 0;
					`,
				}),
			);

		this.shadow_map = shadow_map_el.attachShadow({ mode: "open" });

		// Here we would deal with the WebGL wallpaper.
		// And scroll to center if needed
		// Then we also start the step frame loop
		//
		// We also need to setup multiple window, desktop, and surface events
		//
		// The cool thing about using custom elements for applets too
		// is that they manage hydration by themselves
	},
});

export function registerAppletTag(name, config, ...children) {
	return registerCustomTag(`applet-${name}`, {
		setup() {
			config.setup?.call(this);
			// We can extract state from the applet wrapper html here like motion, tsid, etc
		},
		onconnected() {
			config.hydrate?.call(this);
			// Add needed attributes for "motion", "tsid", position, etc.
			// Inject children. It will have callbacks that use data or simply use primitives on the tree it builds.
		},
		ondisconnected() {
			config.onremove?.call(this);
		},
	});
}
