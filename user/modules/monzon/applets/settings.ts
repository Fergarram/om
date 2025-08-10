import { useTags } from "@/lib/ima";
import { convertFromWindowsPath, convertToWindowsPath, shortcut } from "@/lib/utils";
import { liftAppletMirror, spawnApplet, mountedApplets, useDesktop } from "@/monzon/ui/desktop";
import { WindowFrame } from "@/monzon/ui/window-frame";
import { SelectItem, SelectSeparator, useSelect } from "@/om/ui/select";
import { tw } from "@/lib/tw.js";
import { ComboBox } from "@/om/ui/combobox";
import sys from "@/lib/bridge";
import { Button } from "@/om/ui/button";
import { closeDialog, useDialog } from "@/om/ui/dialog";
import Anthropic from "@/lib/anthropic";
import { openCodeEditor } from "./code-editor";
import { AppSettings } from "@/monzon/state";
import { reloadStormborn } from "@/monzon/global-shortcuts";
import { useMonzonTheme } from "@/monzon/theme";
import { Textfield } from "@/om/ui/textfield";

const { div, icon, label, input } = useTags();

const window_name = "user-settings";
const basepath = await sys.process.cwd();

const versions_path = `${basepath}/user/spaces/monzon/files/engines`;
const versions_tree = await sys.file.directoryTree(versions_path);

const themes_path = `${basepath}/user/config/themes/monzon`;
const themes_tree = await sys.file.directoryTree(themes_path);

async function openVersionsFolder(version: string) {
	const path = `${versions_path}/${version}`;
	if (await sys.process.isWin32()) {
		const parent_dir = await sys.file.dirname(path);
		await sys.shell.exec(`explorer "${convertToWindowsPath(parent_dir)}"`);
	} else {
		await sys.shell.exec(`open -R "${path}"`);
	}
}

async function openThemeFolder(theme: string) {
	const path = `${themes_path}/${theme}`;
	if (await sys.process.isWin32()) {
		const parent_dir = await sys.file.dirname(path);
		await sys.shell.exec(`explorer "${convertToWindowsPath(parent_dir)}"`);
	} else {
		await sys.shell.exec(`open -R "${path}"`);
	}
}

export async function openSettingsWindow() {
	const [existing_window] = mountedApplets(window_name);

	if (existing_window) {
		existing_window.focus();
		const id = existing_window.getAttribute("stb-tsid");
		if (!id) throw new Error("Window ID not found");
		liftAppletMirror(id);
		return;
	}

	const width = 400;
	const height = 400;
	const theme = useMonzonTheme();
	const desktop = useDesktop();
	const center_x = desktop.offsetWidth / 2;
	const center_y = desktop.offsetHeight / 2;
	const offset_range = 50;
	const x = Math.max(center_x - width / 2 + (Math.random() - 0.5) * offset_range * 2, 0);
	const y = Math.max(center_y - height / 2 + (Math.random() - 0.5) * offset_range * 2, 0);

	let settings_backup = AppSettings.clone();
	let available_models: {
		value: string;
		label: string;
	}[] = [];

	const anthropic = new Anthropic({
		// @ts-ignore
		dangerouslyAllowBrowser: true,
		apiKey: AppSettings.assistants[AppSettings.default_assistant].key,
	});

	anthropic.models
		.list({
			limit: 10,
		})
		.then(({ data }: any) => {
			available_models = data.map(({ id }: { id: string }) => ({ value: id, label: id }));
		});

	let dropdown_selected_assistant = AppSettings.default_assistant;

	function canRevertChanges() {
		return JSON.stringify(settings_backup) !== JSON.stringify(AppSettings);
	}

	const settings_window = WindowFrame({
		name: window_name,
		x,
		y,
		width,
		height: "fit-content",
		min_width: width,
		// min_height: height,
		title: () => "User Settings",
		oncontextmenu(e) {
			useSelect(
				{
					click: e,
					// follow_cursor: true,
					width: "fit",
					onselect: (action: string) => {
						switch (action) {
							case "reload":
								console.log("reload");
								break;
							case "close":
								settings_window.remove();
								break;
						}
					},
				},
				SelectItem({ value: "reload" }, "Open settings file"),
				SelectSeparator(),
				SelectItem({ value: "close" }, "Close"),
			);
		},
		onclose() {
			settings_window.remove();
		},
		shortcuts: {
			[shortcut("CmdOrCtrl", "w")]: ({ win }) => {
				const name = win.getAttribute("stb-window");
				if (!name) return;
				settings_window.remove();
			},
		},
		left_children: [
			icon({
				name: theme.icons.settings.window,
			}),
		],
		right_children: [
			// Button(
			// 	{
			// 		size: "icon",
			// 	},
			// 	icon({
			// 		name: "edit_square",
			// 	}),
			// ),
		],
		content_children: [
			div(
				{
					class: tw("w-full h-fit flex flex-col items-start justify-start p-2 gap-1 select-none overflow-y-auto"),
				},
				div(
					{
						class: tw("component-settings-heading"),
					},
					"General",
				),
				div(
					{
						class: tw("w-full flex flex-col gap-1"),
					},
					...Object.entries(AppSettings).map(([key, value]) => {
						switch (key) {
							case "default_version":
								return div(
									{
										class: tw("flex items-center gap-2"),
									},
									div(
										{
											class: tw("component-settings-label min-w-32 w-1/2"),
										},
										key.replace(/_/g, " "),
									),
									ComboBox({
										classes: tw("grow w-1/2"),
										value: value as string,
										list: versions_tree.map((version: any) => ({
											value: `${version.file_name}.${version.extension}`,
											label: `${version.file_name}.${version.extension}`,
										})),
										onselect(value) {
											AppSettings.default_version = value;
										},
									}),
									Button(
										{
											size: "icon",
											title: "Open versions folder",
											onclick() {
												openVersionsFolder(AppSettings.default_version);
											},
										},
										icon({
											name: theme.icons.settings.open_folder,
										}),
									),
								);
							case "theme":
								return div(
									{
										class: tw("flex items-center gap-2"),
									},
									div(
										{
											class: tw("component-settings-label min-w-32 w-1/2"),
										},
										key.replace(/_/g, " "),
									),
									ComboBox({
										classes: tw("grow w-1/2"),
										value: value as string,
										list: themes_tree.map((theme: any) => ({
											value: theme.file_name,
											label: theme.file_name,
										})),
										onselect(selected_theme) {
											AppSettings.theme = selected_theme;
										},
									}),
									Button(
										{
											size: "icon",
											title: "Open theme folder",
											onclick() {
												openThemeFolder(AppSettings.theme);
											},
										},
										icon({
											name: theme.icons.settings.open_folder,
										}),
									),
								);
							case "invert_colors":
								return div(
									{
										class: tw("flex items-center gap-2 mb-4 mt-1"),
									},
									() =>
										input({
											id: "invert_colors",
											type: "checkbox",
											"data-checked": AppSettings.invert_colors,
											checked: AppSettings.invert_colors,
											onchange(e: InputEvent) {
												const el = e.target as HTMLInputElement;
												AppSettings.invert_colors = el.checked;
											},
										}),
									label(
										{
											for: "invert_colors",
											class: tw(""),
										},
										key.replace(/_/g, " ").charAt(0).toUpperCase() + key.replace(/_/g, " ").slice(1),
									),
								);
							case "wallpaper_path":
								return div(
									{
										class: tw("flex items-center gap-2"),
									},
									div(
										{
											class: tw("component-settings-label min-w-32 w-1/2"),
										},
										key.replace(/_/g, " "),
									),
									Textfield({
										id: "wallpaper-input",
										class: tw("grow w-1/2"),
										value: value,
										oninput(e: InputEvent) {
											const el = e.target as HTMLInputElement;
											AppSettings.wallpaper_path = el.value;
											el.value = AppSettings.wallpaper_path;
										},
									}),
									Button(
										{
											size: "icon",
											title: "Select wallpaper",
											onclick() {
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
														const input_el = document.getElementById("wallpaper-input") as HTMLInputElement;
														input_el.value = AppSettings.wallpaper_path;
													});
											},
										},
										icon({
											name: theme.icons.settings.select_wallpaper,
										}),
									),
								);
							case "default_assistant":
								return div(
									{
										class: tw("flex items-center gap-2"),
									},
									div(
										{
											class: tw("component-settings-label min-w-32 w-1/2"),
										},
										key.replace(/_/g, " "),
									),
									ComboBox({
										classes: tw("grow w-1/2"),
										value: AppSettings.default_assistant,
										list: Object.entries(AppSettings.assistants).map(([id]) => ({
											value: id,
											label: id,
										})),
										onselect(value) {
											AppSettings.default_assistant = value;
										},
									}),
									div({
										class: tw("w-6 h-6 min-w-6 min-h-6"),
									}),
								);
							case "windows":
								return div(
									{
										class: tw("w-full flex flex-col gap-1"),
									},
									div(
										{
											class: tw("component-settings-heading mt-2"),
										},
										key.replace(/_/g, " "),
									),
									...Object.entries(
										value as {
											menu_button: string;
											snapping_distance: number;
										},
									).map(([key, value]) => {
										switch (key) {
											case "menu_button":
												return div(
													{
														class: tw("flex items-center gap-2"),
													},
													div(
														{
															class: tw("component-settings-label min-w-32 w-1/2"),
														},
														key.replace(/_/g, " "),
													),
													ComboBox({
														classes: tw("grow w-1/2"),
														value: value as string,
														onselect(value) {
															AppSettings.windows = {
																...AppSettings.windows,
																menu_button: value,
															};
														},
														list: [
															{
																value: "Left click",
																label: "Left click",
															},
															{
																value: "Right click",
																label: "Right click",
															},
															{
																value: "Either click",
																label: "Either click",
															},
														],
													}),
													div({
														class: tw("w-6 h-6 min-w-6 min-h-6"),
													}),
												);
											default:
												return div(
													{
														class: tw("flex items-center gap-2"),
													},
													div(
														{
															class: tw("component-settings-label min-w-32 w-1/2"),
														},
														key.replace(/_/g, " "),
													),
													Textfield({
														class: tw("grow w-1/2"),
														value: value,
														oninput(e: InputEvent) {
															const el = e.target as HTMLInputElement;
															AppSettings.windows = {
																...AppSettings.windows,
																[key]: Number(el.value),
															};
														},
													}),
													div({
														class: tw("w-6 h-6 min-w-6 min-h-6"),
													}),
												);
										}
									}),
								);
							case "assistants":
								return () =>
									div(
										{
											class: tw("contents"),
										},
										div(
											{
												class: tw("component-settings-heading mt-5"),
											},
											"Assistant Instructions",
										),
										div(
											{
												class: tw("w-full flex flex-col gap-1"),
											},
											div(
												{
													class: tw("flex items-center gap-1"),
												},
												ComboBox({
													classes: tw("grow w-1/2"),
													value: dropdown_selected_assistant,
													list: () =>
														Object.entries(AppSettings.assistants).map(([id, assistant]) => ({
															value: id,
															label: id,
														})),
													onselect(item_key) {
														dropdown_selected_assistant = item_key;
													},
												}),
												Button(
													{
														variant: "outline",
														size: "icon",
														onclick() {
															useDialog(
																{},
																div(
																	{
																		class: tw("flex flex-col gap-1"),
																	},
																	"Choose a name for the assistant",
																	Textfield({
																		id: "new-assistant-name",
																		class: tw("grow w-1/2"),
																		placeholder: "Enter a name",
																		onkeydown(e: KeyboardEvent) {
																			if (e.key === "Enter") {
																				const input_el = document.getElementById(
																					"new-assistant-name",
																				) as HTMLInputElement;
																				AppSettings.assistants[input_el.value] = {
																					model: "",
																					key: "",
																					instructions: "",
																					examples: "",
																					use_embeddings_for_examples: false,
																				};
																				AppSettings.save();
																				dropdown_selected_assistant = input_el.value;
																				closeDialog();
																			}
																		},
																	}),
																	Button(
																		{
																			variant: "outline",
																			onclick() {
																				const input_el = document.getElementById(
																					"new-assistant-name",
																				) as HTMLInputElement;
																				AppSettings.assistants[input_el.value] = {
																					model: "",
																					key: "",
																					instructions: "",
																					examples: "",
																					use_embeddings_for_examples: false,
																				};
																				AppSettings.save();
																				dropdown_selected_assistant = input_el.value;
																				closeDialog();
																			},
																		},
																		"Create",
																	),
																),
															);
														},
													},
													icon({
														name: theme.icons.settings.add_assistant,
													}),
												),
											),
											div(
												{
													class: "component-settings-fieldset",
												},
												...Object.entries(AppSettings.assistants[dropdown_selected_assistant]).map(([key, value]) => {
													switch (key) {
														case "model":
															return div(
																{
																	class: tw("flex items-center gap-2"),
																},
																div(
																	{
																		class: tw("component-settings-label min-w-32 w-1/2"),
																	},
																	key.replace(/_/g, " "),
																),
																ComboBox({
																	classes: tw("grow w-1/2"),
																	value: value as string,
																	list: () => available_models,
																	onselect(selected_model) {
																		AppSettings.assistants[dropdown_selected_assistant] = {
																			...AppSettings.assistants[dropdown_selected_assistant],
																			model: selected_model,
																		};
																		AppSettings.save();
																	},
																}),
																div({
																	class: tw("w-6 h-6 min-w-6 min-h-6"),
																}),
															);
														case "instructions":
															const fullpath = `${versions_path}/${AppSettings.default_version}/${value as string}`;
															const filename = fullpath.split("/").pop();
															if (!filename) return;

															return div(
																{
																	class: tw("flex items-center gap-2"),
																},
																div(
																	{
																		class: tw("component-settings-label min-w-32 w-1/2"),
																	},
																	key.replace(/_/g, " "),
																),
																Textfield({
																	class: tw("grow w-1/2"),
																	value: `${AppSettings.default_version}/${filename}`,
																	disabled: true,
																}),
																Button(
																	{
																		size: "icon",
																		onclick() {
																			openCodeEditor({
																				filename: filename,
																				fullpath: fullpath,
																				relative_path: fullpath,
																				language: "markdown",
																			});
																		},
																	},
																	icon({
																		name: theme.icons.settings.edit_instructions,
																	}),
																),
															);
														case "examples":
															return div(
																{
																	class: tw(
																		"flex items-center gap-2 pointer-events-none opacity-20 cursor-not-allowed",
																	),
																},
																div(
																	{
																		class: tw("component-settings-label min-w-32 w-1/2"),
																	},
																	key.replace(/_/g, " "),
																),
																Textfield({
																	disabled: true,
																	class: tw("grow w-1/2"),
																	value: value,
																	oninput(e: InputEvent) {
																		const el = e.target as HTMLInputElement;
																		AppSettings.assistants[dropdown_selected_assistant] = {
																			...AppSettings.assistants[dropdown_selected_assistant],
																			examples: el.value,
																		};
																	},
																}),
																Button(
																	{
																		disabled: true,
																		size: "icon",
																		async onclick() {
																			const res = await sys.dialog.showOpen({
																				properties: ["openDirectory"],
																			});

																			const folder_path = res.filePaths[0];
																			const new_path = convertFromWindowsPath(folder_path);
																			AppSettings.assistants[dropdown_selected_assistant] = {
																				...AppSettings.assistants[dropdown_selected_assistant],
																				examples: new_path,
																			};
																			AppSettings.save();
																		},
																	},
																	icon({
																		name: theme.icons.settings.open_folder,
																	}),
																),
															);
														case "use_embeddings_for_examples":
															return div(
																{
																	class: tw(
																		"flex items-center gap-2 mt-1 pointer-events-none opacity-20 cursor-not-allowed",
																	),
																},
																Textfield({
																	disabled: true,
																	id: "use_embeddings_for_examples",
																	type: "checkbox",
																	checked: value as boolean,
																	onchange(e: InputEvent) {
																		const el = e.target as HTMLInputElement;
																		AppSettings.assistants[dropdown_selected_assistant] = {
																			...AppSettings.assistants[dropdown_selected_assistant],
																			use_embeddings_for_examples: el.checked,
																		};
																		AppSettings.save();
																	},
																}),
																label(
																	{
																		for: "use_embeddings_for_examples",
																		class: tw(""),
																	},
																	key.replace(/_/g, " ").charAt(0).toUpperCase() +
																		key.replace(/_/g, " ").slice(1),
																),
															);
														default:
															return div(
																{
																	class: tw("flex items-center gap-2"),
																},
																div(
																	{
																		class: tw("component-settings-label min-w-32 w-1/2"),
																	},
																	key.replace(/_/g, " "),
																),
																Textfield({
																	class: tw("grow w-1/2"),
																	value: value,
																	oninput(e: InputEvent) {
																		const el = e.target as HTMLInputElement;
																		AppSettings.assistants[dropdown_selected_assistant] = {
																			...AppSettings.assistants[dropdown_selected_assistant],
																			[key]: String(el.value),
																		};
																	},
																}),
																div({
																	class: tw("w-6 h-6 min-w-6 min-h-6"),
																}),
															);
													}
												}),
												div(
													{
														class: tw("mt-2 flex gap-2 justify-end w-full"),
													},
													Button(
														{
															variant: "outline",
															onclick() {
																useDialog(
																	{},
																	div(
																		{ class: tw("flex flex-col items-center gap-2") },
																		icon({
																			name: theme.icons.settings.restart_warning,
																			class: tw("text-8 font-200"),
																		}),
																		div("You will not be able to recover this preset."),
																		div(
																			{ class: tw("flex flex-row gap-1 w-full") },
																			Button(
																				{
																					variant: "outline",
																					class: tw("grow"),
																					onclick() {
																						delete AppSettings.assistants[dropdown_selected_assistant];
																						AppSettings.save();
																						dropdown_selected_assistant = AppSettings.default_assistant;
																						closeDialog();
																					},
																				},
																				"Delete forever",
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
															},
														},
														"Delete preset",
													),
												),
											),
										),
									);
							default:
								return div(
									{
										class: tw("flex items-center gap-2"),
									},
									div(
										{
											class: tw("component-settings-label min-w-32 w-1/2"),
										},
										key.replace(/_/g, " "),
									),
									Textfield({
										class: tw("grow w-1/2"),
										value: value,
										oninput(e: InputEvent) {
											const el = e.target as HTMLInputElement;
											AppSettings.replace({
												...AppSettings,
												[key]: el.value as string,
											});
										},
									}),
									div({
										class: tw("w-6 h-6 min-w-6 min-h-6"),
									}),
								);
						}
					}),
				),
				div(
					{
						class: tw("flex gap-1 justify-end w-full"),
					},
					() =>
						canRevertChanges()
							? Button(
									{
										variant: "outline",
										onclick() {
											AppSettings.replace(settings_backup);
										},
									},
									"Revert changes",
								)
							: null,
					Button(
						{
							variant: "outline",
							onclick() {
								reloadStormborn();
							},
						},
						"Reload",
					),
				),
			),
		],
	});

	spawnApplet(settings_window);
}
