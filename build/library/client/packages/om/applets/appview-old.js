import { css, finish, GlobalStyleSheet, try_catch } from "../../../lib/utils.js";
import { get_camera_center, surface } from "../desktop.js";
import van from "../../../lib/van.js";
import sys from "../../../lib/bridge.js";
const { div, button, canvas, video, source } = van.tags;

window.addEventListener("keydown", (e) => {
	if (e.metaKey && e.key.toLowerCase() === "5") {
		add_appview();
	}
});

GlobalStyleSheet(css`
	[om-applet="appview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		color: var(--color-white);
		background-color: var(--color-black);
		border-radius: var(--size-2_5);
		overflow: hidden;

		canvas,
		video {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}

		.list {
			display: flex;
			flex-direction: column;
			gap: var(--size-1);
			padding: var(--size-1);
			background-color: var(--color-black);
			border-radius: var(--size-1);
		}
	}
`);

async function add_appview() {
	const id = crypto.randomUUID();

	// First, find the window you want to capture
	const sources = await sys.appstream.select({
		types: ["window"],
		thumbnailSize: { width: 0, height: 0 },
	});

	const source_list = van.state(sources);
	const selected_source = van.state(null);

	const width = van.state(320);
	const height = van.state(320);

	let { x, y } = get_camera_center();

	// Adjust position to center
	x = x - width.val / 2;
	y = y - height.val / 2;

	// Add some randomness to position
	x += Math.floor(Math.random() * 100) - 50;
	y += Math.floor(Math.random() * 100) - 50;

	const video_el = video({
		id,
	});

	const appview = div(
		{
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
		() =>
			!selected_source.val && source_list.val
				? div(
						{
							class: "list",
						},
						...source_list.val.map((source) =>
							button(
								{
									variant: "default",
									onclick: () => select_app(source.name),
								},
								source.name,
							),
						),
					)
				: video_el,
	);

	van.add(surface(), appview);

	await finish();

	async function select_app(name) {
		const source = sources.find((source) => source.name === name);

		if (!source) {
			console.error("Source not found");
			return;
		}

		// Get the stream before creating the element
		const [stream, err] = await try_catch(
			async () =>
				await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						mandatory: {
							chromeMediaSource: "desktop",
							chromeMediaSourceId: source.id,
							frameRate: { ideal: 60, max: 60 },
						},
					},
				}),
		);

		if (err) {
			console.error(err);
			return;
		}

		// Create a temporary video element to get the stream dimensions
		video_el.srcObject = stream;

		// Wait for the video metadata to load to get dimensions
		await new Promise((resolve) => {
			video_el.onloadedmetadata = resolve;
		});

		// Get the stream dimensions
		width.val = video_el.videoWidth;
		height.val = video_el.videoHeight;

		// Set the stream to the actual video element and play it
		video_el.play();

		selected_source.val = source;
	}
}
