import { useTags } from "@/lib/ima";
import { css, finish } from "@/lib/utils";
import { Button } from "../../om/ui/button";
import type { Project } from "@/monzon/types";
import { SelectItem, useSelect } from "@/om/ui/select";
import { AppState } from "@/monzon/state";
import { useMonzonTheme } from "@/monzon/theme";
import { monzon } from "@/monzon/bridge";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;

const { icon, span } = useTags();

const layout_classes = tw("relative !min-w-6 !min-h-6");
const dropdown_classes = tw("min-w-32");
const icon_classes = tw(
	// This sucks
	"[&_icon]:!text-40 [&_icon]:!font-100 [&_icon]:absolute [&_icon]:left-1/2 [&_icon]:top-1/2 [&_icon]:-translate-x-1/2 [&_icon]:-translate-y-1/2",
	"w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform origin-center",
);

monzon.onClose(() => {
	AppState.running_game = false;
});

const button_state = {
	NOTHING: 90,
	PLAYING: -90,
	PLAY: 0,
	DEBUG: -180,
};

const tooltip_text = `shift + click: switch between debug and fullscreen mode

pointing down: no game selected; click to select a game

pointing up: game is running; click to stop it

pointing left: run game in debug mode

pointing right: run game in fullscreen mode

right-click: deselect the current game`;

let button_rotation: number = button_state.NOTHING;

export async function stopGame() {
	await fetch("http://localhost:1961/change-directory", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			directory: null,
		}),
	});

	await monzon.closeWindow({});
}

export async function playGame(project: Project) {
	if (AppState.running_game) {
		stopGame();
	}

	try {
		await fetch("http://localhost:1961/change-directory", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				directory: project.full_path,
				project_type: project.type,
			}),
		});

		await monzon.createWindow({
			width: 1024,
			height: 768,
			debug: AppState.last_running_mode === "debug",
		});
		await finish(50);
		AppState.running_game = true;
		AppState.active_project = project;

		const existing_index = AppState.recent_projects.findIndex((p) => p.full_path === project.full_path);
		const filtered_recent_projects =
			existing_index !== -1
				? AppState.recent_projects.filter((_, index) => index !== existing_index)
				: AppState.recent_projects.slice(0, 9);

		AppState.recent_projects = [project, ...filtered_recent_projects];
	} catch (error) {
		console.error("Failed to start project:", error);
	}
}

function showRecentProjects(e: MouseEvent) {
	useSelect(
		{
			click: e,
			align: "center",
			class: dropdown_classes,
			onselect: (project_name: string) => {
				AppState.active_project =
					(AppState.recent_projects.find((project) => project.name === project_name) as Project) || null;
			},
		},
		...(AppState.recent_projects.length > 0
			? AppState.recent_projects.map((project) => SelectItem({ value: project.name }, project.name))
			: [SelectItem({ disabled: true }, "No recent projects")]),
	);
}

export function RunnerButton() {
	const theme = useMonzonTheme();

	return Button(
		{
			component: "runner",
			title: tooltip_text,
			class: layout_classes,
			size: "icon",
			oncontextmenu(e: MouseEvent) {
				e.preventDefault();
				if (!AppState.active_project) {
					showRecentProjects(e);
				} else {
					if (AppState.running_game) {
						stopGame();
					} else {
						AppState.active_project = null;
					}
				}
			},
			onclick(e: MouseEvent) {
				if (e.shiftKey) {
					AppState.last_running_mode = AppState.last_running_mode === "debug" ? "play" : "debug";
					return;
				}
				if (AppState.active_project) {
					if (AppState.running_game) {
						stopGame();
					} else if (!AppState.running_game) {
						playGame(AppState.active_project);
					}
				} else if (!AppState.active_project) {
					showRecentProjects(e);
				}
			},
		},
		span(
			{
				class: icon_classes,
				style: () => {
					if (!AppState.active_project) {
						button_rotation = button_state.NOTHING;
					} else if (AppState.active_project && AppState.running_game) {
						button_rotation = button_state.PLAYING;
					} else if (AppState.active_project) {
						button_rotation = AppState.last_running_mode === "debug" ? button_state.DEBUG : button_state.PLAY;
					}
					return css`
						--tw-rotate-z: rotateZ(${button_rotation}deg);
					`;
				},
			},
			icon({
				name: theme.icons.runner.arrow,
			}),
		),
	);
}
