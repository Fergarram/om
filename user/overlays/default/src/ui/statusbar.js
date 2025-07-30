import { useTags } from "@/lib/ima.js";
import { css, GlobalStyleSheet } from "@/lib/utils.js";
import { useCommandPalette } from "./command-palette.js";

const { div, header, button, icon, h2, h1, span } = useTags();

GlobalStyleSheet(css`
	#space-statusbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--color-black);
		color: var(--color-white);
		/* app-region: drag; */
		/* height: var(--size-8); */
		height: 1px;
		padding: 0 var(--size-1);
		opacity: 0;
		pointer-events: none;

		button,
		button * {
			app-region: no-drag;
		}

		.indicators {
			display: flex;
			width: fit-content;
			flex-grow: 1;
			justify-content: flex-end;
			align-items: center;
		}
	}
`);

const format_date = () => {
	const now = new Date();

	// Get day of week (Mon, Tue, etc.)
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const day = days[now.getDay()];

	// Get date (1-31)
	const date = now.getDate();

	// Get month (Jan, Feb, etc.)
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const month = months[now.getMonth()];

	// Get hours and minutes
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");
	// const seconds = now.getSeconds().toString().padStart(2, "0");

	// Format: "Mon 10 Mar 19:20"
	return `${day} ${date} ${month} ${hours}:${minutes}`;
};

let current_date = format_date();

// Update the date every second
setInterval(() => {
	current_date = format_date();
}, 1000 * 60);

export async function StatusBar() {
	return header(
		{
			id: "space-statusbar",
		},
		button(
			{
				variant: "icon",
				title: "Toggle Launcher",
				"aria-label": "Toggle Launcher",
				async onclick(e) {
					useCommandPalette();
				},
			},
			icon({ name: "action_key", size: "sm" }),
		),
		div(
			{
				class: "indicators",
			},
			button(
				{
					variant: "icon",
					title: () => (window.is_trackpad ? "Using trackpad" : "Using mouse"),
					"aria-label": "Toggle Input Device",
					onclick() {
						window.is_trackpad = !window.is_trackpad;
					},
				},
				icon({ name: () => (window.is_trackpad ? "trackpad_input_2" : "mouse"), size: "sm" }),
			),
			button(
				{
					variant: "text",
					size: "sm",
					title: "Toggle Date Details",
					"aria-label": "Toggle Date Details",
					onclick() {},
				},
				span(() => current_date),
			),
		),
	);
}
