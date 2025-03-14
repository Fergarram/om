import { css, finish, GlobalStyleSheet, try_catch } from "../../../lib/utils.js";
import { get_camera_center, surface } from "../desktop.js";
import van from "../../../lib/van.js";
import sys from "../bridge.js";
const { div, canvas, video, source } = van.tags;

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
	}
`);

async function add_appview() {
	let { x, y } = get_camera_center();
	const id = crypto.randomUUID();

	// First, find the window you want to capture
	const sources = await sys.appstream.select({
		types: ["window"],
		thumbnailSize: { width: 0, height: 0 },
	});

	console.log(sources);

	const source = sources.find((source) => source.name === "-zsh");

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
					},
				},
			}),
	);

	if (err) {
		console.error(err);
		return;
	}

	// Create a temporary video element to get the stream dimensions
	const temp_video = document.createElement("video");
	temp_video.srcObject = stream;

	// Wait for the video metadata to load to get dimensions
	await new Promise((resolve) => {
		temp_video.onloadedmetadata = resolve;
	});

	// Get the stream dimensions
	const width = temp_video.videoWidth;
	const height = temp_video.videoHeight;

	// Position at center
	x = x - width / 2;
	y = y - height / 2;

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
				width: ${width}px;
				height: ${height}px;
				min-width: ${width}px;
				min-height: ${height}px;
				max-width: ${width}px;
				max-height: ${height}px;
			`,
		},
		video_el,
	);

	van.add(surface(), appview);

	await finish();

	// Set the stream to the actual video element and play it
	video_el.srcObject = stream;
	video_el.play();
}
