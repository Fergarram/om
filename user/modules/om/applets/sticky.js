import { css, finish, useGlobalStyles } from "../../../lib/utils.js";
import { getCameraCenter, onAppletRemoved, useApplet } from "../desktop.js";
import { useTags } from "../../../lib/ima.js";

const { div } = useTags();

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
	if (e.metaKey && e.key === "1") {
		const random_color_index = Math.floor(Math.random() * PASTEL_COLORS.length);
		addSticky(random_color_index);
		e.preventDefault();
	}
});

async function addSticky(colorIndex = 0) {
	let { x, y } = getCameraCenter();

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

	let is_resizing = false;

	const sticky = div(
		{
			"om-applet": "sticky",
			"om-motion": "idle",
			style: css`
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
			contenteditable: () => (is_resizing ? "false" : "true"),
			onkeydown(e) {
				// Close the sticky note with Cmd+W (Mac) or Ctrl+W (Windows/Linux)
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
					sticky.remove();
				}

				// Check for Cmd+Shift+V (Mac) or Ctrl+Shift+V (Windows/Linux)
				if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
					e.preventDefault();

					// Get clipboard content as plain text
					navigator.clipboard
						.readText()
						.then((text) => {
							// Save current selection for undo functionality
							const selection = window.getSelection();
							const range = selection.getRangeAt(0);

							// Use execCommand which registers with the undo stack
							document.execCommand("insertText", false, text);
						})
						.catch((err) => {
							console.error("Failed to read clipboard contents: ", err);
						});
				}
			},
		}),
	);

	useApplet(sticky);

	await finish();

	// Focus the content area to start typing immediately
	sticky.querySelector(".content").focus();

	window.addEventListener("applet-resize-start", handleAppletResizeStart);
	window.addEventListener("applet-resize-stop", handleAppletResizeStop);

	onAppletRemoved((a) => {
		if (a === sticky) {
			window.removeEventListener("applet-resize-start", handleAppletResizeStart);
			window.removeEventListener("applet-resize-stop", handleAppletResizeStop);
		}
	});

	function handleAppletResizeStart(e) {
		if (e.detail.applet === sticky) {
			is_resizing = true;
		}
	}

	function handleAppletResizeStop(e) {
		if (e.detail.applet === sticky) {
			is_resizing = false;
		}
	}
}

//
// Styles
//

useGlobalStyles(css`
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
