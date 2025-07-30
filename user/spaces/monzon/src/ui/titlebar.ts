import { useTheme } from "@/monzon/src/main";
import sys from "@/monzon/src/lib/bridge";
import { useTags } from "@/lib/ima";
import { tw } from "@/lib/tw";
import { Button } from "./button";
import { RunnerButton } from "@/monzon/src/tools/runner";
import { toggleFileBrowser } from "@/monzon/src/tools/file-browser";
import { windowExists } from "./desktop";
import { openSettingsWindow } from "@/monzon/src/tools/settings";
import { isSelectOpen } from "./select";
import { openAssistant } from "@/monzon/src/tools/assistant";

// import { create_assistant_window } from "@/windows/assistant";
// import { create_settings_window } from "@/windows/settings";

const { div, header, icon } = useTags();

let is_maximized = await sys.win.is_maximized();

export async function toggleMaximizeState() {
	if (is_maximized) {
		sys.win.unmaximize();
	} else {
		sys.win.maximize();
	}
}

export function Titlebar() {
	sys.win.on_maximize(() => {
		is_maximized = true;
	});

	sys.win.on_unmaximize(() => {
		is_maximized = false;
	});

	const theme = useTheme();
	const icons = theme.icons.titilebar;

	let tool_rotation = 1;

	return header(
		{
			id: "window-titlebar",
			component: "titlebar",
			class: "component-titlebar-layout component-titlebar-colors",
		},
		div(
			{ class: "component-titlebar-children-left" },
			Button(
				{
					size: "icon",
					onclick() {
						toggleFileBrowser();
					},
				},
				icon({
					name: () => (windowExists("file-browser") ? icons.file_browser_opened : icons.file_browser_closed),
				}),
			),
			Button(
				{
					size: "icon",
					oncontextmenu() {
						tool_rotation += 90;
					},
					onclick() {
						openSettingsWindow();
					},
				},
				icon({
					name: icons.settings_launcher,
					style: () => `transform: rotate(${tool_rotation}deg)`,
				}),
			),
			Button(
				{
					size: "icon",
					onclick() {
						openAssistant();
					},
				},
				icon({
					name: icons.assistant_launcher,
				}),
			),
		),
		div(
			{
				class: () =>
					tw("grow flex w-full h-full opacity-0", {
						"app-drag": !isSelectOpen(),
					}),
			},
			".",
		),
		RunnerButton(),
		div(
			{
				class: () =>
					tw("grow flex w-full h-full opacity-0", {
						"app-drag": !isSelectOpen(),
					}),
			},
			".",
		),
		div(
			{ class: "component-titlebar-children-right" },
			Button(
				{
					size: "icon",
					onclick() {
						sys.win.minimize();
					},
				},
				icon({
					name: icons.window_minimize,
				}),
			),
			Button(
				{
					size: "icon",
					onclick() {
						toggleMaximizeState();
					},
				},
				icon({
					name: () => (is_maximized ? icons.window_unmaximize : icons.window_maximize),
				}),
			),
			Button(
				{
					size: "icon",
					onclick() {
						sys.win.close();
					},
				},
				icon({
					name: icons.window_close,
				}),
			),
		),
	);
}
