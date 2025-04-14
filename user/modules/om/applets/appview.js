import { css, finish, GlobalStyleSheet, try_catch } from "../../../lib/utils.js";
import { get_camera_center, surface } from "../desktop.js";
import van from "../../../lib/van.js";
import sys from "../../../lib/bridge.js";
const { div, header, span, icon, button, canvas, video, source } = van.tags;

sys.appstream.window_capture_updated(async (id) => {
	// const ids = await sys.appstream.get_captured_windows();
	// console.log(ids);
	// return;

	const window_data = await sys.appstream.get_window_capture(id);
	if (window_data) {
		add_appview(id, window_data);
	} else {
		console.error(`Failed to capture window with ID ${id}`);
	}
});

// Listen for window close events from the window manager
sys.appstream.on_window_closed((window_id) => {
	console.log(window_id);
	const appview = document.getElementById(`appview-${window_id}`);
	if (appview) {
		appview.remove();
	}
});

async function add_appview(window_id, window_data) {
	const id = `appview-${window_id}`;

	// Check if the window is already captured
	const existing_appview = document.getElementById(id);
	if (existing_appview) {
		const canvas_el = existing_appview.querySelector("canvas");
		if (canvas_el) {
			// Update canvas size if needed
			if (canvas_el.width !== window_data.width || canvas_el.height !== window_data.height) {
				canvas_el.width = window_data.width;
				canvas_el.height = window_data.height;
			}

			const ctx = canvas_el.getContext("2d");

			// Create image data with the right dimensions
			const image_data = new ImageData(
				new Uint8ClampedArray(window_data.pixel_data),
				window_data.width,
				window_data.height,
			);

			// Render the image data
			ctx.putImageData(image_data, 0, 0);
		}
		return;
	}

	const width = van.state(window_data.width);
	const height = van.state(window_data.height);

	let { x, y } = get_camera_center();

	// Adjust position to center
	x = x - width.val / 2;
	y = y - height.val / 2;

	// Add some randomness to position
	x += Math.floor(Math.random() * 100) - 50;
	y += Math.floor(Math.random() * 100) - 50;

	const canvas_el = canvas({
		width: width.val,
		height: height.val,
		onmousedown: async (e) => {
			if (e.altKey) return;

			// Prevent click from propagating to desktop
			e.stopPropagation();

			try {
				await sys.appstream.focus_window(window_id);
			} catch (err) {
				console.error("Failed to focus window:", err);
			}
		},
	});

	const appview = div(
		{
			id: id,
			"om-applet": "appview",
			"om-motion": "idle",
			style: () => css`
				top: ${y}px;
				left: ${x}px;
				width: ${width.val}px;
				height: ${height.val}px;
				min-width: ${width.val}px;
				min-height: ${height.val}px;
				max-width: ${width.val}px;
				max-height: ${height.val}px;
			`,
		},
		header(
			button(
				{
					variant: "icon",
					async onclick() {
						try {
							await sys.appstream.close_window(window_id);
							appview.remove();
						} catch (err) {
							console.error("Failed to close window:", err);
						}
					},
				},
				icon({
					name: "close",
				}),
			),
			div({ "drag-handle": true }),
		),
		canvas_el,
	);

	van.add(surface(), appview);

	// @TODO: Add observer so when removed we close the window.

	await finish();

	const ctx = canvas_el.getContext("2d");

	// Create image data directly from the ArrayBuffer
	const image_data = new ImageData(new Uint8ClampedArray(window_data.pixel_data), window_data.width, window_data.height);

	// Render the image data
	ctx.putImageData(image_data, 0, 0);
}

GlobalStyleSheet(css`
	[om-applet="appview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		display: flex;
		flex-direction: column;

		canvas {
			border-radius: var(--size-2_5);
			background: var(--color-black);
			overflow: hidden;
		}

		header {
			position: absolute;
			top: var(--size-neg-0_5);
			left: 0;
			transform: translateY(-100%);
			display: flex;
			height: fit-content;
			width: 100%;
			border-radius: var(--size-2_5);
			background: var(--color-black);
			color: var(--color-white);

			[drag-handle] {
				flex-grow: 1;
				width: 100%;
				height: var(--size-7);
				cursor: move;
			}
		}
	}
`);
