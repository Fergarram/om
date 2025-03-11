import van from "../../../lib/van.js";
import { css, GlobalStyleSheet } from "../../../lib/utils.js";
import { surface } from "../desktop.js";

const { div, header, button, icon, h2, h1, span } = van.tags;

GlobalStyleSheet(css`
	#space-statusbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--color-black);
		color: var(--color-white);
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

	// Format: "Mon 10 Mar 19:20"
	return `${day} ${date} ${month} ${hours}:${minutes}`;
};

const current_date = van.state(format_date());

// Update the date every second
setInterval(() => {
	current_date.val = format_date();
}, 1000);

export async function StatusBar() {
	return header(
		{
			id: "space-statusbar",
		},
		button(
			{
				variant: "icon",
				title: "Toggle Sidebar",
				"aria-label": "Toggle Sidebar",
				async onclick(e) {
					const x = 300;
					const y = 100;
					const width = 400;
					const height = 400;
					const test = div(
						{
							"om-applet": "test",
							"om-motion": "idle",
							style: () => css`
								position: absolute;
								top: ${y}px;
								left: ${x}px;
								min-width: 100px;
								min-height: 100px;
								width: ${width}px;
								height: ${height}px;
								background-color: var(--color-slate-300);
							`,
						},
						div({ "drag-handle": "" }),
					);

					van.add(surface(), test);
				},
			},
			icon({ name: "action_key", size: "sm" }),
		),
		button(
			{
				variant: "text",
				size: "sm",
				title: "Toggle Date Details",
				"aria-label": "Toggle Date Details",
				onclick() {},
			},
			() => span(current_date.val),
		),
	);
}
