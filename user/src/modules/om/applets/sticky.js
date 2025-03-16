import { css, finish, GlobalStyleSheet } from "../../../lib/utils.js";
import { get_camera_center, surface } from "../desktop.js";
import van from "../../../lib/van.js";

const { div } = van.tags;

const PASTEL_COLORS = [
	{
		bg: "var(--color-yellow-200)",
		handle: "var(--color-yellow-300)",
		text: "var(--color-yellow-900)",
	},
	{
		bg: "var(--color-blue-200)",
		handle: "var(--color-blue-300)",
		text: "var(--color-blue-900)",
	},
	{
		bg: "var(--color-green-200)",
		handle: "var(--color-green-300)",
		text: "var(--color-green-900)",
	},
	{
		bg: "var(--color-pink-200)",
		handle: "var(--color-pink-300)",
		text: "var(--color-pink-900)",
	},
];

window.addEventListener("keydown", (e) => {
	if (e.metaKey) {
		// Check for number keys 1-4
		const keyNum = parseInt(e.key);
		if (keyNum >= 1 && keyNum <= 4) {
			add_sticky(keyNum - 1); // Convert to 0-based index
			e.preventDefault();
		}
	}
});

GlobalStyleSheet(css`
	[om-applet="sticky"] {
		position: absolute;
		min-width: 150px;
		min-height: 150px;
		font-family: var(--font-mono);
		line-height: 1.5;
		border-radius: 2px;
		box-shadow: var(--fast-thickness-1);
		display: flex;
		flex-direction: column;
		overflow: hidden;

		.content {
			flex: 1;
			padding: 10px;
			outline: none;
			overflow-y: auto;
			word-wrap: break-word;
		}
	}
`);

async function add_sticky(colorIndex = 0) {
	let { x, y } = get_camera_center();

	// Randomize width and height
	const width = 200 + Math.floor(Math.random() * 100);
	const height = 200 + Math.floor(Math.random() * 100);

	// Adjust position to center
	x = x - width / 2;
	y = y - height / 2;

	// Add some randomness to position
	x += Math.floor(Math.random() * 100) - 50;
	y += Math.floor(Math.random() * 100) - 50;

	// Use the color corresponding to the pressed number key
	const color_scheme = PASTEL_COLORS[colorIndex];

	const sticky = div(
		{
			"om-applet": "sticky",
			"om-motion": "idle",
			style: () => css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
				background-color: ${color_scheme.bg};
				color: ${color_scheme.text};
			`,
		},
		div({
			"drag-handle": true,
			style: css`
				height: var(--size-6);
				width: 100%;
				background-color: ${color_scheme.handle};
				cursor: move;
			`,
		}),
		div({
			class: "content",
			spellcheck: "false",
			contenteditable: "true",
		}),
	);

	van.add(surface(), sticky);

	await finish();

	// Focus the content area to start typing immediately
	sticky.querySelector(".content").focus();
}
