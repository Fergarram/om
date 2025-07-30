import sys from "@/monzon/src/lib/bridge";
import { useTags } from "@/lib/ima";
import { finish } from "@/lib/utils";

// import { create_editor_window } from "@/windows/editor";
// import { create_assistant_window } from "@/windows/assistant";
// import { create_image_viewer_window } from "@/windows/image-viewer";
// import { create_sound_viewer_window } from "@/windows/sound-viewer";

const { div, aside, button, p, span, input } = useTags();
const folder_open_states = new Map();
const FOLDER_OPEN_DELAY = 800; // ms

let current_folder = "";
let drag_hover_timer = null;

export function set_active_project(project) {
	window.current_project.val = project;
	window.recent_projects.val = [project, ...window.recent_projects.val.filter((p) => p.full_path !== project.full_path)];
}

export async function Sidebar() {
	const projects_tree = van.state(null);
	const current_editing_item = van.state(null);
	const is_selecting_folder = van.state(false);

	window.addEventListener("focus", () => {
		if (!is_selecting_folder.val) refresh_handler();
	});
	window.addEventListener("refresh-file-browser", refresh_handler);

	async function refresh_handler() {
		const stored_path = localStorage.getItem("selected_projects_folder");

		if (stored_path) {
			await load_projects_from_folder(stored_path, projects_tree);
		}
	}

	function sort_items(items) {
		return items.sort((a, b) => {
			// If both are directories or both are files, sort alphabetically
			if (a.is_directory === b.is_directory) {
				return a.file_name.localeCompare(b.file_name);
			}
			// If a is a directory and b isn't, a should come first
			return a.is_directory ? -1 : 1;
		});
	}

	async function load_projects_from_folder(folder_path, projects_tree) {
		try {
			// Check if directory is empty
			const files = await sys.file.directory_tree(folder_path);
			projects_tree.val = [];

			if (files.length > 0) {
				projects_tree.val = sort_items(files);
				current_folder.val = folder_path;
			}

			localStorage.setItem("selected_projects_folder", convert_from_windows_path(folder_path));
		} catch (error) {
			console.error("Error loading projects:", error);
			localStorage.removeItem("selected_projects_folder");
		}
	}

	function render_tree_item(item, is_root = false) {
		const is_valid_project = van.state(false);

		// If this is a root directory, check if it's a valid project
		if (item.is_directory) {
			is_valid_project.val = is_valid_project_folder(item);
		}

		function get_icon(item, is_open = false) {
			if (is_valid_project.val) {
				// Determine project type and return appropriate icon
				if (item.children) {
					const folder_files = item.children.map(
						(child) => child.file_name + (child.extension ? "." + child.extension : ""),
					);

					const has_public_dir = item.children.some((child) => child.is_directory && child.file_name === "public");

					if (folder_files.includes("package.json") && has_public_dir) {
						return "cyclone"; // Project type
					} else if (
						folder_files.includes("index.html") &&
						!folder_files.includes("template.html") &&
						!folder_files.includes("package.json")
					) {
						return "bolt"; // Prototype type
					} else {
						return "sync_problem"; // Legacy type
					}
				}
				return "cyclone"; // Default if can't determine
			}
			if (item.is_directory) {
				return is_open ? "folder_open" : "folder";
			}
			if (is_image_file(item.extension)) {
				return "image";
			}
			if (is_sound_file(item.extension)) {
				return "music_note";
			}
			switch (item.extension) {
				default:
					return "draft";
			}
		}

		// Initialize the state based on the stored value, or false if not stored
		const children_visible = van.state(folder_open_states.get(item.full_path) || false);

		const complete_rename = async (new_name) => {
			if (new_name && new_name !== item.file_name) {
				try {
					await sys.file.rename(item.full_path, new_name);
					// Refresh the file browser
					const stored_path = localStorage.getItem("selected_projects_folder");
					if (stored_path) {
						await load_projects_from_folder(stored_path, projects_tree);
					}
				} catch (error) {
					console.error("Error renaming item:", error);
				}
			}
			current_editing_item.val = null;
		};

		// Update the stored state when it changes
		van.derive(() => {
			folder_open_states.set(item.full_path, children_visible.val);
		});

		const item_el = div(
			{
				class: `tree-item ${is_root ? "root-item" : ""}`,
			},
			() =>
				current_editing_item.val === item.full_path
					? input({
							type: "text",
							class: "rename-input",
							value: `${item.file_name}${item.is_directory || !item.extension ? "" : "."}${item.extension}`,
							onkeydown: (e) => {
								if (e.key === "Enter") {
									e.currentTarget.blur();
								} else if (e.key === "Escape") {
									current_editing_item.val = null;
								}
							},
							onblur: (e) => {
								complete_rename(e.target.value);
							},
						})
					: div(
							{
								class: "tree-item-row",
							},
							button(
								{
									"project-type": () => {
										if (!is_valid_project.val) return "none";

										if (item.children) {
											const folder_files = item.children.map(
												(child) => child.file_name + (child.extension ? "." + child.extension : ""),
											);

											const has_public_dir = item.children.some(
												(child) => child.is_directory && child.file_name === "public",
											);

											if (folder_files.includes("package.json") && has_public_dir) {
												return "project";
											} else if (
												folder_files.includes("index.html") &&
												!folder_files.includes("template.html") &&
												!folder_files.includes("manifest.json")
											) {
												return "prototype";
											} else {
												return "legacy";
											}
										}
										return "none";
									},
									"selected-project": () =>
										window.current_project.val && window.current_project.val.file_name === item.file_name,
									variant: "text",
									class: "tree-item-button",
									draggable: true,
									ondragstart: (e) => {
										e.stopPropagation();
										e.dataTransfer.setData(
											"text/plain",
											JSON.stringify({
												path: item.full_path,
												is_directory: item.is_directory,
											}),
										);
										e.dataTransfer.effectAllowed = "move";
									},
									ondragover: (e) => {
										e.preventDefault();
										e.stopPropagation();
										if (item.is_directory) {
											e.currentTarget.classList.add("drag-over");
											e.dataTransfer.dropEffect = "move";

											// Set new timer to open folder
											if (!drag_hover_timer) {
												drag_hover_timer = setTimeout(() => {
													children_visible.val = true;
												}, FOLDER_OPEN_DELAY);
											}
										}
									},
									ondragleave: (e) => {
										e.preventDefault();
										e.stopPropagation();
										e.currentTarget.classList.remove("drag-over");

										// Clear the timer when leaving
										if (drag_hover_timer) {
											clearTimeout(drag_hover_timer);
											drag_hover_timer = null;
										}
									},
									ondrop: async (e) => {
										e.preventDefault();
										e.stopPropagation();
										e.currentTarget.classList.remove("drag-over");

										// Clear the timer on drop
										if (drag_hover_timer) {
											clearTimeout(drag_hover_timer);
											drag_hover_timer = null;
										}

										if (!item.is_directory) return;

										try {
											const drag_data = JSON.parse(e.dataTransfer.getData("text/plain"));
											const source_path = drag_data.path;
											const target_path = item.full_path;

											// Don't allow dropping into itself or its children
											if (source_path === target_path || target_path.startsWith(source_path + "/")) {
												return;
											}

											const filename = await sys.file.parse_path(source_path);
											const new_path = `${target_path}/${filename.base}`;

											if (await sys.process.is_win32()) {
												if (drag_data.is_directory) {
													await sys.shell.exec(
														`move "${convert_to_windows_path(source_path)}" "${convert_to_windows_path(new_path)}"`,
													);
												} else {
													await sys.shell.exec(
														`move "${convert_to_windows_path(source_path)}" "${convert_to_windows_path(new_path)}"`,
													);
												}
											} else {
												await sys.shell.exec(`mv "${source_path}" "${new_path}"`);
											}

											// Refresh the file browser
											const stored_path = localStorage.getItem("selected_projects_folder");
											if (stored_path) {
												await load_projects_from_folder(stored_path, projects_tree);
											}
										} catch (error) {
											console.error("Error moving file:", error);
										}
									},
									onclick: () => {
										const desktop_viewport = document.getElementById("desktop-viewport");
										if (item.is_directory) {
											children_visible.val = !children_visible.val;
										} else {
											if (is_image_file(item.extension)) {
												create_image_viewer_window({
													x: desktop_viewport.scrollLeft + 400,
													y: desktop_viewport.scrollTop + 100,
													width: 600,
													height: 600,
													file: item,
												});
											} else if (is_sound_file(item.extension)) {
												create_sound_viewer_window({
													x: desktop_viewport.scrollLeft + 400,
													y: desktop_viewport.scrollTop + 100,
													width: 600,
													height: 300,
													file: item,
												});
											} else if (item.extension === "chat") {
												create_assistant_window({
													x: desktop_viewport.scrollLeft + 400,
													y: desktop_viewport.scrollTop + 100,
													width: 640,
													height: 700,
													file: item,
												});
											} else {
												create_editor_window({
													x: desktop_viewport.scrollLeft + 400,
													y: desktop_viewport.scrollTop + 100,
													width: 800,
													height: 600,
													item,
												});
											}
										}
									},
								},
								span({ class: "icon" }, () => get_icon(item, children_visible.val)),
								span(
									{ class: "name" },
									`${item.file_name}${item.is_directory || !item.extension ? "" : "."}${item.extension}`,
								),
							),
							() =>
								is_valid_project.val && !window.is_game_running.val
									? button(
											{
												variant: "small",
												title: `Run ${item.file_name}`,
												class: "tree-item-play",
												async onclick() {
													set_active_project(item);
													await finish();
													run_project_game();
												},
											},
											span(
												{
													class: "icon",
												},
												"play_arrow",
											),
										)
									: "",
						),
			item.is_directory && item.children?.length > 0
				? div(
						{
							class: "tree_item_children",
							style: () => `display: ${children_visible.val ? "block" : "none"}`,
						},
						...sort_items(item.children).map((child) => render_tree_item(child, false)),
					)
				: null,
		);

		item_el.addEventListener("contextmenu", async (e) => {
			if (e.target !== item_el.firstElementChild.firstElementChild) {
				return;
			}

			e.preventDefault();

			const menu_items = [
				...(item.is_directory
					? [
							...(!window.is_game_running.val && is_valid_project.val
								? [
										{
											label: "Play",
											action: "PLAY_GAME",
											payload: item,
										},
									]
								: []),
							{ type: "separator" },
						]
					: []),
				{
					label: "Rename",
					action: "RENAME",
					payload: item.full_path,
				},
				{
					label: "Duplicate",
					action: "DUPLICATE",
					payload: item.full_path,
				},
				{
					label: `Trash ${item.is_directory ? "folder" : "file"}`,
					action: "TRASH",
					payload: item.full_path,
				},
				{
					type: "separator",
				},
				{
					label: "Show in file explorer",
					action: "SHOW_IN_EXPLORER",
					payload: item.full_path,
				},
				{
					type: "separator",
				},
				{
					label: "New folder",
					action: "NEW_FOLDER",
					payload: item.full_path,
				},
				{
					label: "New file",
					action: "NEW_FILE",
					payload: item.full_path,
				},
			];

			// Show the context menu
			await sys.menu.show("sidebar-menu", menu_items, e.x, e.y);
		});

		return item_el;
	}

	sys.menu.on_click(async (ev, { id, item }) => {
		if (id !== "sidebar-menu") return;

		const action = item.action;
		const payload = item.payload;

		try {
			switch (action) {
				case "RENAME": {
					current_editing_item.val = payload;
					await finish();
					const input_el = document.querySelector(".rename-input");
					if (input_el) {
						input_el.focus();
						input_el.select();
					}
					return;
				}
				case "PLAY_GAME": {
					set_active_project(payload);
					await finish();
					run_project_game();
					break;
				}
				case "NEW_FILE": {
					if (await sys.process.is_win32()) {
						if (await sys.file.is_dir(payload)) {
							await sys.shell.exec(`type nul > "${convert_to_windows_path(payload + "\\new_file.txt")}"`);
						} else {
							const parent_dir = await sys.file.dirname(payload);
							await sys.shell.exec(`type nul > "${convert_to_windows_path(parent_dir + "\\new_file.txt")}"`);
						}
					} else {
						if (await sys.file.is_dir(payload)) {
							await sys.shell.exec(`touch "${payload}/new_file.txt"`);
						} else {
							const parent_dir = await sys.file.dirname(payload);
							await sys.shell.exec(`touch "${parent_dir}/new_file.txt"`);
						}
					}
					break;
				}

				case "NEW_PROTOTYPE": {
					try {
						const basepath = await sys.process.cwd();
						const template_path = `${basepath}/user/spaces/monzon/config/${window.user_settings.default_version}/blank-prototype`;
						let target_name = "new_prototype";
						let target_path = `${payload}/${target_name}`;

						// Check if directory exists and increment number if needed
						let counter = 1;
						while (await sys.file.exists(target_path)) {
							target_name = `new_prototype_${counter}`;
							target_path = `${payload}/${target_name}`;
							counter++;
						}

						// Copy recursively based on platform
						if (await sys.process.is_win32()) {
							await sys.shell.exec(
								`xcopy "${convert_to_windows_path(template_path)}" "${convert_to_windows_path(target_path)}" /E /I /H /K`,
							);
						} else {
							await sys.shell.exec(`cp -r "${template_path}" "${target_path}"`);
						}
					} catch (error) {
						console.error("Error creating new protoype:", error);
					}
					break;
				}

				case "NEW_PROJECT": {
					try {
						const basepath = await sys.process.cwd();
						const template_path = `${basepath}/user/spaces/monzon/config/${window.user_settings.default_version}/blank-project`;
						let target_name = "new_project";
						let target_path = `${payload}/${target_name}`;

						// Check if directory exists and increment number if needed
						let counter = 1;
						while (await sys.file.exists(target_path)) {
							target_name = `new_project_${counter}`;
							target_path = `${payload}/${target_name}`;
							counter++;
						}

						// Copy recursively based on platform
						if (await sys.process.is_win32()) {
							await sys.shell.exec(
								`xcopy "${convert_to_windows_path(template_path)}" "${convert_to_windows_path(target_path)}" /E /I /H /K`,
							);
						} else {
							await sys.shell.exec(`cp -r "${template_path}" "${target_path}"`);
						}
					} catch (error) {
						console.error("Error creating new project:", error);
					}
					break;
				}

				case "NEW_FOLDER": {
					const is_dir = await sys.file.is_dir(payload);
					if (await sys.process.is_win32()) {
						if (is_dir) {
							await sys.shell.exec(`mkdir "${convert_to_windows_path(payload + "\\new_folder")}"`);
						} else {
							const parent_dir = await sys.file.dirname(payload);
							await sys.shell.exec(`mkdir "${convert_to_windows_path(parent_dir + "\\new_folder")}"`);
						}
					} else {
						if (is_dir) {
							await sys.shell.exec(`mkdir -p "${payload}/new_folder"`);
						} else {
							const parent_dir = await sys.file.dirname(payload);
							await sys.shell.exec(`mkdir -p "${parent_dir}/new_folder"`);
						}
					}
					break;
				}

				case "DUPLICATE": {
					const parsed_path = await sys.file.parse_path(payload);
					const new_name = `${parsed_path.name}_copy${parsed_path.ext}`;
					const is_dir = await sys.file.is_dir(payload);
					if (await sys.process.is_win32()) {
						const new_path = parsed_path.dir + "\\" + new_name;
						if (is_dir) {
							await sys.shell.exec(
								`xcopy "${convert_to_windows_path(payload)}" "${convert_to_windows_path(new_path)}" /E /I /H /K`,
							);
						} else {
							await sys.shell.exec(
								`copy "${convert_to_windows_path(payload)}" "${convert_to_windows_path(new_path)}"`,
							);
						}
					} else {
						const new_path = parsed_path.dir + "/" + new_name;
						if (is_dir) {
							await sys.shell.exec(`cp -r "${payload}" "${new_path}"`);
						} else {
							await sys.shell.exec(`cp "${payload}" "${new_path}"`);
						}
					}
					break;
				}

				case "TRASH": {
					if (await sys.process.is_win32()) {
						if (await sys.file.is_dir(payload)) {
							await sys.shell.exec(`rmdir /S /Q "${convert_to_windows_path(payload)}"`);
						} else {
							await sys.shell.exec(`del /F /Q "${convert_to_windows_path(payload)}"`);
						}
					} else {
						await sys.shell.exec(`rm -rf "${payload}"`);
					}
					break;
				}

				case "SHOW_IN_EXPLORER": {
					const parent_dir = await sys.file.dirname(payload);
					if (await sys.process.is_win32()) {
						await sys.shell.exec(`explorer "${convert_to_windows_path(parent_dir)}"`);
					} else {
						await sys.shell.exec(`open -R "${payload}"`);
					}
					break;
				}
			}

			// Refresh the file browser after any action
			const stored_path = localStorage.getItem("selected_projects_folder");
			if (stored_path) {
				await load_projects_from_folder(stored_path, projects_tree);
			}
		} catch (error) {
			console.error("Error handling context menu action:", error);
		}
	});

	await refresh_handler();

	return aside(
		{
			id: "window-sidebar",
			class: () => (window.is_sidebar_visible.val ? "" : "hidden"),
		},
		div(
			button(
				{
					variant: "text",
					title: "Change projects folder",
					onclick: async () => {
						is_selecting_folder.val = true;
						const res = await sys.dialog.show_open({
							properties: ["openDirectory"],
						});

						const folder_path = res.filePaths[0];
						console.log(folder_path);

						if (folder_path) {
							await load_projects_from_folder(folder_path);
							is_selecting_folder.val = false;
						}
					},
				},
				() => current_folder.val.split("/").pop(),
			),
		),
		div(
			{
				class: "content",
				async oncontextmenu(e) {
					if (e.target === e.currentTarget) {
						e.preventDefault();

						const stored_path = localStorage.getItem("selected_projects_folder");
						if (!stored_path) return;

						const menu_items = [
							{
								label: "New prototype",
								action: "NEW_PROTOTYPE",
								payload: stored_path,
							},
							{
								label: "New project",
								action: "NEW_PROJECT",
								payload: stored_path,
							},
							{
								label: "New folder",
								action: "NEW_FOLDER",
								payload: stored_path,
							},
							{
								label: "New file",
								action: "NEW_FILE",
								payload: stored_path,
							},
						];

						// Show the context menu
						await sys.menu.show("sidebar-menu", menu_items, e.x, e.y);
					}
				},
				ondragover(e) {
					e.preventDefault();
					e.stopPropagation();
					if (e.target === e.currentTarget) {
						e.currentTarget.classList.add("drag-over");
						e.dataTransfer.dropEffect = "move";
					}
				},
				ondragleave(e) {
					e.preventDefault();
					e.stopPropagation();
					if (e.target === e.currentTarget) {
						e.currentTarget.classList.remove("drag-over");
					}
				},
				async ondrop(e) {
					e.preventDefault();
					e.stopPropagation();

					if (e.target === e.currentTarget) {
						e.currentTarget.classList.remove("drag-over");

						const stored_path = localStorage.getItem("selected_projects_folder");
						if (!stored_path) return;

						try {
							const drag_data = JSON.parse(e.dataTransfer.getData("text/plain"));
							const source_path = drag_data.path;
							const target_path = stored_path;

							// Don't allow dropping if source is the same as target
							if (source_path === target_path) {
								return;
							}

							const filename = await sys.file.parse_path(source_path);
							const new_path = `${target_path}/${filename.base}`;

							if (await sys.process.is_win32()) {
								if (drag_data.is_directory) {
									await sys.shell.exec(
										`move "${convert_to_windows_path(source_path)}" "${convert_to_windows_path(new_path)}"`,
									);
								} else {
									await sys.shell.exec(
										`move "${convert_to_windows_path(source_path)}" "${convert_to_windows_path(new_path)}"`,
									);
								}
							} else {
								await sys.shell.exec(`mv "${source_path}" "${new_path}"`);
							}

							// Refresh the file browser
							if (stored_path) {
								await load_projects_from_folder(stored_path, projects_tree);
							}
						} catch (error) {
							console.error("Error moving file:", error);
						}
					}
				},
			},
			() =>
				projects_tree.val === null
					? div(
							{
								class: "empty-state",
							},
							p("Select an existing projects folder or select a folder where your projects will be stored."),
							button(
								{
									variant: "default",
									class: "empty-state-button",
									async onclick() {
										const res = await sys.dialog.show_open({
											properties: ["openDirectory"],
										});

										const folder_path = res.filePaths[0];
										if (folder_path) {
											await load_projects_from_folder(folder_path, projects_tree);
										}
									},
								},
								"Select projects folder",
							),
							p("Stop fucking around and start making games with our high quality examples."),
							button(
								{
									variant: "sell",
									class: "empty-state-button",
									onclick() {
										sys.app.open_in_browser("https://stormborn.pro/99plus");
									},
								},
								"Download examples",
							),
						)
					: projects_tree.val.length === 0
						? div(
								{
									class: "empty-state",
								},
								p("Projects directory is empty."),
							)
						: div(
								{
									class: "tree-container",
								},
								...projects_tree.val.map((item) => render_tree_item(item, true)),
							),
		),
	);
}
