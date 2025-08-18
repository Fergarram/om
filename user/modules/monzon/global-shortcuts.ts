import sys from "@/lib/bridge";
import { useTags } from "@/lib/ima";
import { AppSettings } from "@/monzon/state";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;
import { convertFromWindowsPath, finish, finishFrame } from "@/lib/utils";
import { openAssistant } from "@/monzon/applets/assistant";
import { toggleFileBrowser } from "@/monzon/applets/file-browser";
import { openSettingsWindow } from "@/monzon/applets/settings";
import { Button } from "@/om/ui/button";
import { useDesktop } from "@/monzon/ui/desktop";
import { closeDialog, useDialog } from "@/om/ui/dialog";
import { SelectItem, useSelect } from "@/om/ui/select";

const { div, icon } = useTags();

// @TODO: Load shortcuts from a settings file, the functions will live here but just the shortcuts themselves.

// Add keyboard shortcut listener for sidebar toggle
document.addEventListener("keydown", (e) => {
	// Check for Ctrl/Cmd + B
	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
		toggleFileBrowser();
	}

	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === ",") {
		openSettingsWindow();
	}

	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "/") {
		openAssistant();
	}

	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
		AppSettings.invert_colors = !AppSettings.invert_colors;
	}

	// Prevent reload
	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
		e.preventDefault();

		if (e.shiftKey) {
			reloadStormborn();
		}
	}
});

document.addEventListener("contextmenu", async (e) => {
	const desktop = useDesktop();
	if (e.target === desktop) {
		e.preventDefault();
		const selection = await useSelect(
			{
				click: e,
				follow_cursor: true,
			},
			SelectItem(
				{
					value: "change-wallpaper",
				},
				"Change wallpaper",
			),
		);
		await finishFrame();
		if (selection === "change-wallpaper") {
			sys.dialog
				.showOpen({
					title: "Select wallpaper",
					defaultPath: AppSettings.wallpaper_path,
					filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp", "webm"] }],
				})
				.then((result) => {
					if (result.canceled) return;
					AppSettings.wallpaper_path = encodeURI(convertFromWindowsPath(result.filePaths[0]))
						.replaceAll("(", "\\(")
						.replaceAll(")", "\\)");
				});
		}
	}
});

export function reloadStormborn() {
	useDialog(
		{},
		div(
			{ class: tw("flex flex-col items-center gap-2") },
			icon({
				name: "warning",
				class: tw("text-8 font-200"),
			}),
			div("Restarting will discard unsaved work."),
			div(
				{ class: tw("flex flex-row gap-1 w-full") },
				Button(
					{
						variant: "outline",
						class: tw("grow"),
						onclick() {
							window.location.reload();
						},
					},
					"Restart now",
				),
				Button(
					{
						variant: "outline",
						class: tw("grow"),
						onclick() {
							closeDialog();
						},
					},
					"Cancel",
				),
			),
		),
	);
}
