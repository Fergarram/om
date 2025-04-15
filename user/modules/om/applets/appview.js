import { css, finish, GlobalStyleSheet, try_catch, debounce } from "../../../lib/utils.js";
import { get_camera_center, on_applet_remove, surface } from "../desktop.js";
import van from "../../../lib/van.js";
import sys from "../../../lib/bridge.js";
const { div, header, span, icon, button, canvas, video, source } = van.tags;

sys.appstream.window_capture_updated(async (id) => {
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

// Handle close when element is removed
on_applet_remove(async (applet) => {
	try_catch(async () => {
		await sys.appstream.close_window(applet.id.replace("appview-", ""));
	});
});

async function add_appview(window_id, window_data) {
	const id = `appview-${window_id}`;
	const width = window_data.width;
	const height = window_data.height;

	// Check if the window is already captured
	const existing_appview = document.getElementById(id);
	if (existing_appview) {
		const canvas_el = existing_appview.querySelector("canvas");
		if (canvas_el) {
			const is_resizing = existing_appview.getAttribute("om-motion") === "resizing";

			if (!is_resizing) {
				existing_appview.style.width = `${width}px`;
				existing_appview.style.height = `${height}px`;
			}

			canvas_el.width = width;
			canvas_el.height = height;

			const ctx = canvas_el.getContext("2d");

			// Create image data with the right dimensions
			const image_data = new ImageData(new Uint8ClampedArray(window_data.pixel_data), width, height);

			// Render the image data
			ctx.putImageData(image_data, 0, 0);
		}
		return;
	}

	let resize_animation_frame = null;
	let last_resize_width = 0;
	let last_resize_height = 0;

	let { x, y } = get_camera_center();

	// Adjust position to center
	x = x - width / 2;
	y = y - height / 2;

	// Add some randomness to position
	x += Math.floor(Math.random() * 100) - 50;
	y += Math.floor(Math.random() * 100) - 50;

	const canvas_el = canvas({
		width: width,
		height: height,
		onmousedown: async (e) => {
			if (e.altKey) return;
			e.stopPropagation();

			try {
				const rect = e.target.getBoundingClientRect();
				await sys.appstream.set_window_position(window_id, Math.round(rect.left), Math.round(rect.top));
				await sys.appstream.focus_window(window_id);
			} catch (err) {
				console.error("Failed to forward mouse press:", err);
			}
		},
	});

	const appview = div(
		{
			id: id,
			"om-applet": "appview",
			"om-motion": "idle",
			style: css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
			`,
		},
		header(
			button(
				{
					variant: "icon",
					async onclick() {
						appview.remove();
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

	// Handle resize
	const handle_resize_end = debounce(async (new_width, new_height) => {
		try_catch(async () => {
			await sys.appstream.resize_window(window_id, {
				width: Math.round(new_width),
				height: Math.round(new_height),
			});
		});
	}, 150);

	// Handle position updates
	const handle_position_update = debounce(async () => {
		try_catch(async () => {
			const rect = appview.getBoundingClientRect();
			await sys.appstream.set_window_position(window_id, Math.round(rect.left), Math.round(rect.top));
		});
	}, 50);

	// Watch for position changes
	const position_observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes" && mutation.attributeName === "style") {
				handle_position_update();
			}
		}
	});

	position_observer.observe(appview, {
		attributes: true,
		attributeFilter: ["style"],
	});

	const resize_observer = new ResizeObserver((entries) => {
		const entry = entries[0];
		if (entry) {
			handle_resize_end(entry.contentRect.width, entry.contentRect.height);
			handle_position_update(); // Also update position on resize
		}
	});

	resize_observer.observe(appview);

	await finish();

	const ctx = canvas_el.getContext("2d");
	const image_data = new ImageData(new Uint8ClampedArray(window_data.pixel_data), width, height);
	ctx.putImageData(image_data, 0, 0);

	// Set initial position
	handle_position_update();
}

GlobalStyleSheet(css`
	[om-applet="appview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		display: flex;
		flex-direction: column;
		border-radius: var(--size-2_5);

		canvas {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
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
