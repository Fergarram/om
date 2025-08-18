import { tw } from "@/lib/tw.macro" with { type: "macro" };
import { useTags } from "@/lib/ima";
import { cn, finish } from "@/lib/utils";

import "@/monzon/global-shortcuts";

import { Titlebar } from "@/monzon/ui/titlebar";
import { Desktop } from "@/monzon/ui/desktop";
import { AppState, AppSettings } from "@/monzon/state";
import { monzon } from "@/monzon/bridge";
import { initializeMonzonThemeSystem } from "@/monzon/theme";

const { main } = useTags();

await monzon.startRunner();

// Load settings using the new proxy
await AppSettings.load();
const theme = await initializeMonzonThemeSystem(AppSettings.theme);

AppState.load();

const app = main(
	{
		class: () =>
			cn(
				tw("absolute w-full h-full flex flex-col overflow-hidden"),
				theme.global_classes, // this will get removed
				AppSettings.invert_colors ? tw("invert") : "",
			),
	},
	Titlebar(),
	await Desktop(),
);

document.body.appendChild(app);

await finish();
