import { tw } from "@/lib/tw";
import { useTags } from "@/lib/ima";
import { finish } from "@/lib/utils";
import { initializeThemeSettings } from "@/monzon/src/settings/theme";
import "@/monzon/src/settings/global-shortcuts";

import { Titlebar } from "@/monzon/src/ui/titlebar";
import { Desktop } from "@/monzon/src/ui/desktop";
import { AppState, AppSettings } from "./lib/state";
import sys from "@/monzon/src/lib/bridge";

const { main } = useTags();

await sys.monzon.start_runner();

// Load settings using the new proxy
await AppSettings.load();
const theme = await initializeThemeSettings(AppSettings.theme);

AppState.load();

const app = main(
	{
		class: () =>
			tw("absolute w-full h-full flex flex-col overflow-hidden", theme.global_classes, {
				invert: AppSettings.invert_colors,
			}),
	},
	Titlebar(),
	await Desktop(),
);

document.body.appendChild(app);

await finish();

export function useTheme() {
	if (!theme) {
		throw new Error("Theme not initialized yet");
	}

	return theme;
}
