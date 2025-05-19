import { useTags } from "../../../lib/ima.js";
import { tw } from "../../../lib/tw.js";
import { docMain, finish } from "../../../lib/utils.js";
import sys from "../../../lib/bridge.js";

const { div, button, icon, span, input } = useTags();

let command_palette = null;

sys.shortcuts.register({
	accelerator: "CmdOrCtrl+Escape",
	name: "toggle-command-palette",
	description: "Show or hide the command palette",
	async callback() {
		useCommandPalette();
	},
});

export async function useCommandPalette() {
	const main = docMain();

	async function closeCommandPalette() {
		command_palette.remove();
		command_palette = null;
		main.style.removeProperty("height");
		await sys.win.focus();
	}

	if (command_palette) {
		closeCommandPalette();
		return;
	}

	const input_el = input({
		type: "text",
		async onkeydown(e) {
			const value = e.target.value.trim();

			if (e.key === "Enter") {
				closeCommandPalette();
				await finish();

				if (value === "inspect overlay") {
					await sys.overlay.openDevTools();
				} else if (value === "earth") {
					await sys.win.openSpace("earth");
				} else if (value === "home") {
					await sys.win.openSpace("home");
				}
			}
		},
	});

	command_palette = div(
		{
			id: "command-palette",
			class: tw("flex items-center justify-center text-white w-full grow"),
		},
		div({
			class: tw("bg-black/50 absolute top-0 left-0 w-full h-full"),
			onclick() {
				closeCommandPalette();
			},
		}),
		div(
			{
				class: tw("relative z-1 bg-black p-4 rounded-md flex flex-col"),
			},
			input_el,
		),
	);

	const bounds = await sys.win.getBounds();
	main.style.height = `${bounds.height}px`;

	main.appendChild(command_palette);

	await finish();
	await sys.overlay.focus();
	input_el.focus();
}
