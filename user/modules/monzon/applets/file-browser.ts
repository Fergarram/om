import sys from "@/lib/bridge";
import { useTags } from "@/lib/ima";
import { tw } from "@/lib/tw";
import type { DirectoryEntry } from "@/monzon/types";
import {
	convertFromWindowsPath,
	convertToWindowsPath,
	finish,
	finishFrame,
	getFileLanguage,
	isImageFile,
	isSoundFile,
	shortcut,
} from "@/lib/utils";
import { Button } from "@/om/ui/button";
import { liftAppletMirror, spawnApplet, mountedApplets, useDesktop } from "@/monzon/ui/desktop";
import { playGame } from "@/monzon/ui/runner";
import { SelectItem, SelectSeparator, useSelect } from "@/om/ui/select";
import { WindowFrame } from "@/monzon/ui/window-frame";
import { AppSettings, AppState, findEntry, readDirectoryEntries, syncWorkingDirectory } from "@/monzon/state";
import { openCodeEditor } from "@/monzon/applets/code-editor";
import { openImageViewer } from "@/monzon/applets/image-viewer";
import { openSoundViewer } from "@/monzon/applets/sound-viewer";
import { closeDialog, useDialog } from "@/om/ui/dialog";
import { openAssistant } from "@/monzon/applets/assistant";
import { useMonzonTheme } from "@/monzon/theme";

const tags = useTags();
const { div, icon, button, span } = tags;

const FOLDER_OPEN_DELAY = 800; // ms until folder opens when dragging
const window_name = "file-browser";

let is_selecting_working_directory = false;
let last_selected_entry: string | null = null;
let drag_hover_timer: NodeJS.Timeout | null = null;
let last_dragged_over_entry: DirectoryEntry | null = null;

export function toggleFileBrowser() {
	const [existing_window] = mountedApplets(window_name);

	if (existing_window) {
		existing_window.remove();
	} else {
		openFileBrowser();
	}
}

async function selectWorkingDirectory() {
	if (is_selecting_working_directory) return;
	is_selecting_working_directory = true;

	const res = await sys.dialog.showOpen({
		properties: ["openDirectory"],
	});

	const folder_path = res.filePaths[0];
	const new_path = convertFromWindowsPath(folder_path);
	AppState.working_directory_path = new_path;

	const directory_entries = await readDirectoryEntries(new_path);
	AppState.projects_directory_tree = directory_entries;

	const directory_name = new_path.split("/").pop();
	if (!directory_name) throw new Error("Invalid directory path");
	AppState.working_directory_name = directory_name;

	is_selecting_working_directory = false;

	refreshWorkingDirectory();
}

function removeWorkingDirectory() {
	AppState.clean();
}

function getIcon(entry: DirectoryEntry) {
	const { icons } = useMonzonTheme();
	switch (entry.type) {
		case "file":
			return icons.file_browser.file;
		case "folder":
			return entry.filename.toLowerCase().includes("trash")
				? icons.file_browser.trash
				: entry.is_open
					? icons.file_browser.folder_opened
					: icons.file_browser.folder_closed;
		case "project":
			return entry.project!.type === "prototype" ? icons.file_browser.prototype : icons.file_browser.project;
		default:
			return icons.file_browser.unknown;
	}
}

async function renameFile(full_path: string, new_name: string) {
	await sys.file.rename(full_path, new_name);
	await refreshWorkingDirectory();
}

async function openFile(entry: DirectoryEntry) {
	if (entry) {
		const content_type = await sys.file.getContentType(entry.full_path);
		switch (content_type) {
			case "text": {
				const language = getFileLanguage(entry.filename);
				const ext = entry.filename.split(".").pop();
				if (ext === "chat") {
					openAssistant({
						filename: entry.filename,
						relative_path: entry.relative_path,
						fullpath: entry.full_path,
					});
				} else {
					openCodeEditor({
						filename: entry.filename,
						relative_path: entry.relative_path,
						fullpath: entry.full_path,
						language,
					});
				}
				break;
			}
			case "binary": {
				const ext = entry.filename.split(".").pop();
				if (ext) {
					if (isImageFile(ext)) {
						openImageViewer({
							relative_path: entry.relative_path,
							filename: entry.filename,
							full_path: entry.full_path,
						});
						break;
					}
					if (isSoundFile(ext)) {
						openSoundViewer({
							relative_path: entry.relative_path,
							filename: entry.filename,
							full_path: entry.full_path,
						});
						break;
					}
				}
				console.log(entry);
				break;
			}
			default:
				console.warn("Trying to open unkown file type.");
				break;
		}
	}
}

async function duplicateEntry(entry: DirectoryEntry) {
	const parsed_path = await sys.file.parsePath(entry.full_path);
	const new_name = `${parsed_path.name}_copy${parsed_path.ext}`;
	const is_dir = await sys.file.isDir(entry.full_path);
	if (await sys.process.isWin32()) {
		const new_path = parsed_path.dir + "\\" + new_name;
		if (is_dir) {
			await sys.shell.exec(`xcopy "${convertToWindowsPath(entry.full_path)}" "${convertToWindowsPath(new_path)}" /E /I /H /K`);
		} else {
			await sys.shell.exec(`copy "${convertToWindowsPath(entry.full_path)}" "${convertToWindowsPath(new_path)}"`);
		}
	} else {
		const new_path = parsed_path.dir + "/" + new_name;
		if (is_dir) {
			await sys.shell.exec(`cp -r "${entry.full_path}" "${new_path}"`);
		} else {
			await sys.shell.exec(`cp "${entry.full_path}" "${new_path}"`);
		}
	}
}

async function trashEntry(entry: DirectoryEntry, is_in_trash: boolean) {
	if (is_in_trash) {
		const { icons } = useMonzonTheme();
		await useDialog(
			{},
			div(
				{ class: tw("flex flex-col items-center gap-2") },
				icon({
					class: tw("text-8 font-200"),
					name: icons.file_browser.trash_dialog,
				}),
				div(`"${entry.filename}" will be deleted forever`),
				div(
					{ class: tw("flex flex-row gap-1 w-full") },
					Button(
						{
							variant: "outline",
							class: tw("grow"),
							async onclick() {
								if (await sys.process.isWin32()) {
									if (await sys.file.isDir(entry.full_path)) {
										await sys.shell.exec(`rmdir /S /Q "${convertToWindowsPath(entry.full_path)}"`);
									} else {
										await sys.shell.exec(`del /F /Q "${convertToWindowsPath(entry.full_path)}"`);
									}
								} else {
									await sys.shell.exec(`rm -rf "${entry.full_path}"`);
								}
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
		return;
	}

	// Calculate project root by removing relative_path from full_path
	const project_root = entry.full_path.replace(entry.relative_path, "");
	const trash_dir = `${project_root}/Trash`;

	// Ensure Trash directory exists
	if (await sys.process.isWin32()) {
		await sys.shell.exec(`if not exist "${convertToWindowsPath(trash_dir)}" mkdir "${convertToWindowsPath(trash_dir)}"`);
	} else {
		await sys.shell.exec(`mkdir -p "${trash_dir}"`);
	}

	// Get the filename/dirname from the entry
	const parsed_path = await sys.file.parsePath(entry.full_path);
	const destination_path = `${trash_dir}/${parsed_path.base}`;

	// Move to trash instead of deleting
	if (await sys.process.isWin32()) {
		await sys.shell.exec(`move "${convertToWindowsPath(entry.full_path)}" "${convertToWindowsPath(destination_path)}"`);
	} else {
		await sys.shell.exec(`mv "${entry.full_path}" "${destination_path}"`);
	}
}

async function showInOsFileExplorer(entry?: DirectoryEntry) {
	const path = entry ? entry.full_path : AppState.working_directory_path;

	const parent_dir = await sys.file.dirname(path);
	if (await sys.process.isWin32()) {
		await sys.shell.exec(`explorer "${convertToWindowsPath(parent_dir)}"`);
	} else {
		await sys.shell.exec(`open -R "${path}"`);
	}
}

async function newFolder(entry?: DirectoryEntry) {
	const path = entry ? entry.full_path : AppState.working_directory_path;

	const is_dir = await sys.file.isDir(path);
	if (await sys.process.isWin32()) {
		if (is_dir) {
			await sys.shell.exec(`mkdir "${convertToWindowsPath(path + "\\new_folder")}"`);
		} else {
			const parent_dir = await sys.file.dirname(path);
			await sys.shell.exec(`mkdir "${convertToWindowsPath(parent_dir + "\\new_folder")}"`);
		}
	} else {
		if (is_dir) {
			await sys.shell.exec(`mkdir -p "${path}/new_folder"`);
		} else {
			const parent_dir = await sys.file.dirname(path);
			await sys.shell.exec(`mkdir -p "${parent_dir}/new_folder"`);
		}
	}
}

async function newPrototype(entry?: DirectoryEntry) {
	const basepath = await sys.process.cwd();
	const template_path = `${basepath}/user/spaces/monzon/files/engines/${AppSettings.default_version}/templates/blank-prototype`;
	let target_name = "new_prototype";
	let target_path = "";
	if (!entry) {
		target_path = `${AppState.working_directory_path}/${target_name}`;
	} else {
		target_path = `${entry.full_path}/${target_name}`;
	}

	// Copy recursively based on platform
	if (await sys.process.isWin32()) {
		await sys.shell.exec(`xcopy "${convertToWindowsPath(template_path)}" "${convertToWindowsPath(target_path)}" /E /I /H /K`);
	} else {
		await sys.shell.exec(`cp -r "${template_path}" "${target_path}"`);
	}
}

async function newFile(entry?: DirectoryEntry) {
	const path = entry ? entry.full_path : AppState.working_directory_path;

	if (await sys.process.isWin32()) {
		if (await sys.file.isDir(path)) {
			await sys.shell.exec(`type nul > "${convertToWindowsPath(path + "\\new_file.txt")}"`);
		} else {
			const parent_dir = await sys.file.dirname(path);
			await sys.shell.exec(`type nul > "${convertToWindowsPath(parent_dir + "\\new_file.txt")}"`);
		}
	} else {
		if (await sys.file.isDir(path)) {
			await sys.shell.exec(`touch "${path}/new_file.txt"`);
		} else {
			const parent_dir = await sys.file.dirname(path);
			await sys.shell.exec(`touch "${parent_dir}/new_file.txt"`);
		}
	}
}

async function moveFile(source_path: string, target_path: string) {
	const filename = await sys.file.parsePath(source_path);
	const new_path = `${target_path}/${filename.base}`;

	if (await sys.process.isWin32()) {
		await sys.shell.exec(`move "${convertToWindowsPath(source_path)}" "${convertToWindowsPath(new_path)}"`);
	} else {
		await sys.shell.exec(`mv "${source_path}" "${new_path}"`);
	}

	await refreshWorkingDirectory();
}

function toggleIsOpen(entry: DirectoryEntry) {
	let current_entry = findEntry(entry.full_path);

	if (current_entry) {
		current_entry.is_open = !current_entry.is_open;
	}

	AppState.save();
	reRenderWorkingDirectory();
}

function toggleIsRenaming(entry: DirectoryEntry) {
	let current_entry = findEntry(entry.full_path);

	if (current_entry) {
		current_entry.is_renaming = !current_entry.is_renaming;
	}

	console.log("Renaming toggled");
	AppState.save();
}

async function showFileMenu(e: MouseEvent, entry?: DirectoryEntry) {
	if (entry) {
		last_selected_entry = entry.full_path;
	}

	const is_in_trash = entry && entry.full_path.toLowerCase().includes("trash");

	await useSelect(
		{
			click: e,
			follow_cursor: true,
			async onselect(action: string) {
				switch (action) {
					case "play":
						if (entry && entry.project) await playGame(entry.project);
						break;
					case "rename":
						if (entry) {
							const current_entry = findEntry(entry.full_path);
							if (current_entry && !current_entry.is_renaming) {
								toggleIsRenaming(current_entry);
								await finishFrame();
								const rename_input = document.getElementById("active-rename-input") as HTMLInputElement;
								rename_input.focus();
								rename_input.select();
								return;
							}
						}
						break;
					case "duplicate":
						entry && (await duplicateEntry(entry));
						break;
					case "delete":
						entry && (await trashEntry(entry, is_in_trash || false));
						break;
					case "show":
						await showInOsFileExplorer(entry ? entry : undefined);
						break;
					case "new_folder":
						if (entry) {
							const current_entry = findEntry(entry.full_path);
							if (current_entry && current_entry.type === "folder" && !current_entry.is_open) {
								toggleIsOpen(current_entry);
							}
						}
						await newFolder(entry ? entry : undefined);
						break;
					case "new_file":
						if (entry) {
							const current_entry = findEntry(entry.full_path);
							if (current_entry && current_entry.type === "folder" && !current_entry.is_open) {
								toggleIsOpen(current_entry);
							}
						}
						await newFile(entry ? entry : undefined);
						break;
					case "new_prototype":
						if (entry) {
							const current_entry = findEntry(entry.full_path);
							if (current_entry && current_entry.type === "folder" && !current_entry.is_open) {
								toggleIsOpen(current_entry);
							}
						}
						await newPrototype(entry ? entry : undefined);
						break;
				}

				await refreshWorkingDirectory();
			},
		},
		entry && entry.type === "project" ? SelectItem({ value: "play" }, "Play") : null,
		entry && entry.type === "project" ? SelectSeparator() : null,
		entry ? SelectItem({ value: "rename" }, "Rename") : null,
		entry ? SelectItem({ value: "duplicate" }, "Duplicate") : null,
		entry ? SelectItem({ value: "delete" }, `${is_in_trash ? "Delete" : "Trash"} ${entry.project ? entry.project.type : entry.type}`) : null,
		entry ? SelectSeparator() : null,
		SelectItem({ value: "show" }, "Show in file explorer"),
		!is_in_trash && ((entry && entry.type !== "project") || !entry) ? SelectSeparator() : null,
		!is_in_trash && ((entry && entry.type !== "project") || !entry) ? SelectItem({ value: "new_prototype" }, "New prototype") : null,
		!is_in_trash && ((entry && entry.type !== "project") || !entry) ? SelectItem({ value: "new_project" }, "New advanced project") : null,
		SelectSeparator(),
		SelectItem({ value: "new_folder" }, "New folder"),
		SelectItem({ value: "new_file" }, "New file"),
	);
	last_selected_entry = null;
}

function flattenDirectoryTree(entries: DirectoryEntry[], depth = 0): Array<DirectoryEntry & { indent_level: number }> {
	const flattened: Array<DirectoryEntry & { indent_level: number }> = [];

	for (const entry of entries) {
		// Add the current entry with its indent level
		flattened.push({
			...entry,
			indent_level: depth,
		});

		// Only include children if the entry is open AND has children
		if (entry.children && entry.children.length > 0) {
			flattened.push(...flattenDirectoryTree(entry.children, depth + 1));
		}
	}

	return flattened;
}

function isParentOpen(entry: DirectoryEntry): boolean {
	if (!AppState.working_directory_path) return false;

	// If entry is at root level, consider parent as "open"
	const entry_dir = entry.full_path.substring(0, entry.full_path.lastIndexOf("/"));
	if (entry_dir === AppState.working_directory_path) return true;

	// Find parent entry and check if it's open
	const parent_entry = findEntry(entry_dir);
	return parent_entry ? parent_entry.is_open === true : false;
}

export async function openFileBrowser() {
	const desktop = useDesktop();

	const [existing_window] = mountedApplets(window_name);

	if (existing_window) {
		existing_window.focus();
		const id = existing_window.getAttribute("stb-tsid");
		if (!id) throw new Error("Window ID not found");
		liftAppletMirror(id);
		return;
	}

	const x = 0;
	const y = 0;
	const width = 240;
	const height = desktop.offsetHeight;

	const { icons } = useMonzonTheme();

	const file_browser = WindowFrame({
		name: window_name,
		x,
		y,
		width,
		height,
		initial_snap: "left",
		preferred_sizes: {
			snap: {
				width,
				height,
			},
			unsnap: {
				width: 240,
				height: 320,
			},
		},
		title: () =>
			AppState.working_directory_name
				? AppState.working_directory_name
				: div(
						{
							oncontextmenu: selectWorkingDirectory,
							class: tw("px-4 w-fit"),
						},
						"/",
					),
		ondidclose() {
			refreshWorkingDirectory();
		},
		oncontextmenu(e) {
			useSelect(
				{
					click: e,
					follow_cursor: true,
					onselect: (action: string) => {
						switch (action) {
							case "snap":
								console.log("snap");
								break;
							case "refresh":
								refreshWorkingDirectory();
								break;
							case "change":
								selectWorkingDirectory();
								break;
							case "remove":
								removeWorkingDirectory();
								break;
							case "close":
								file_browser.remove();
								break;
						}
					},
				},
				SelectItem({ value: "snap" }, "Snap to side"),
				SelectItem({ value: "refresh" }, "Refresh directory"),
				SelectItem({ value: "change" }, "Select working directory"),
				SelectItem({ value: "remove" }, "Remove directory"),
				SelectSeparator(),
				SelectItem({ value: "close" }, "Close"),
			);
		},
		shortcuts: {
			[shortcut("CmdOrCtrl", "r")]: () => {
				refreshWorkingDirectory();
			},
		},
		left_children: [
			icon({
				name: icons.file_browser.window,
			}),
		],
		right_children: [],
		content_children: [
			() =>
				!AppState.working_directory_name
					? div(
							{
								class: tw("w-full h-full flex flex-col bg-file-browser-bg p-1 items-center justify-center gap-2 px-6"),
							},
							Button(
								{
									variant: "outline",
									class: tw("w-full uppercase"),
									onclick: selectWorkingDirectory,
								},
								`Select working directory`,
							),
							div("or"),
							Button(
								{
									variant: "outline",
									class: tw("w-full uppercase"),
									onclick() {
										sys.win.openInBrowser("https://stormborn.pro");
									},
								},
								"Download 99+ examples",
							),
						)
					: null,
			div(
				{
					id: "working-directory",
					class: () =>
						tw("component-file-browser-content", {
							hidden: !AppState.working_directory_name,
							flex: AppState.working_directory_name,
						}),
					oncontextmenu(e) {
						if (e.currentTarget === e.target) {
							showFileMenu(e);
						}
					},
					ondragover(e) {
						e.preventDefault();
						e.stopPropagation();
						if (e.target === e.currentTarget) {
							e.dataTransfer!.dropEffect = "move";
						}
					},
					async ondrop(e) {
						e.preventDefault();
						e.stopPropagation();

						if (e.target === e.currentTarget) {
							if (!AppState.working_directory_path) return;

							try {
								const drag_data = JSON.parse(e.dataTransfer!.getData("text/plain"));
								const source_path = drag_data.path;
								const target_path = AppState.working_directory_path;

								// Don't allow dropping if source is the same as target
								if (source_path === target_path) {
									return;
								}

								await moveFile(source_path, target_path);
							} catch (error) {
								console.error("Error moving file:", error);
							}
						}
					},
				},
				div(
					{
						class: tw("contents"),
					},
					...flattenDirectoryTree(AppState.projects_directory_tree).map((old_entry) => {
						return renderDirectoryEntry(old_entry);
					}),
				),
			),
		],
	});

	spawnApplet(file_browser);
}

function reRenderWorkingDirectory() {
	const el = document.getElementById("working-directory");
	if (el) {
		el.replaceChildren(
			div(
				{
					class: "contents",
				},
				...flattenDirectoryTree(AppState.projects_directory_tree).map((old_entry) => {
					return renderDirectoryEntry(old_entry);
				}),
			),
		);
	}
}

export async function refreshWorkingDirectory() {
	await syncWorkingDirectory();
	reRenderWorkingDirectory();
}

function renderDirectoryEntry(old_entry: DirectoryEntry & { indent_level: number }) {
	const entry = findEntry(old_entry.full_path) as DirectoryEntry & { indent_level: number };
	if (entry) {
		(entry as any).indent_level = old_entry.indent_level;
	}
	return entry &&
		(isParentOpen(entry) ||
			(entry.is_open && entry.indent_level > 0) ||
			(entry.project && AppState.active_project ? AppState.active_project.name === entry.project.name : false) ||
			entry.indent_level === 0)
		? button(
				{
					draggable: "true",
					class: () =>
						tw("component-file-browser-entry", {
							"component-file-browser-entry-dragover":
								(last_selected_entry === entry.full_path && !last_dragged_over_entry) ||
								(last_dragged_over_entry && last_dragged_over_entry.full_path === entry.full_path),
							"component-file-browser-entry-active":
								entry.project && AppState.active_project ? AppState.active_project.name === entry.project.name : false,
						}),
					onclick() {
						if (entry.type !== "file") toggleIsOpen(entry);
						else if (entry.type === "file") {
							openFile(entry);
						}
					},
					oncontextmenu(e) {
						showFileMenu(e, entry);
					},
					ondragstart(e) {
						e.stopPropagation();
						e.dataTransfer!.setData(
							"text/plain",
							JSON.stringify({
								path: entry.full_path,
							}),
						);
						e.dataTransfer!.effectAllowed = "move";
					},
					ondragover(e) {
						e.preventDefault();
						e.stopPropagation();
						if (entry.type === "folder" || entry.type === "project") {
							last_dragged_over_entry = entry;
							e.dataTransfer!.dropEffect = "move";

							// Set timer to auto-expand folder
							if (!drag_hover_timer) {
								drag_hover_timer = setTimeout(() => {
									if (!entry.is_open) {
										toggleIsOpen(entry);
									}
								}, FOLDER_OPEN_DELAY);
							}
						}
					},
					ondragleave(e) {
						e.preventDefault();
						e.stopPropagation();
						last_dragged_over_entry = null;

						// Clear timer when leaving
						if (drag_hover_timer) {
							clearTimeout(drag_hover_timer);
							drag_hover_timer = null;
						}
					},
					async ondrop(e) {
						e.preventDefault();
						e.stopPropagation();
						last_dragged_over_entry = null;

						// Clear the timer on drop
						if (drag_hover_timer) {
							clearTimeout(drag_hover_timer);
							drag_hover_timer = null;
						}

						if (entry.type !== "folder" && entry.type !== "project") return;

						try {
							const drag_data = JSON.parse(e.dataTransfer!.getData("text/plain"));
							const source_path = drag_data.path;
							const target_path = entry.full_path;

							// Don't allow dropping into itself or its children
							if (source_path === target_path || target_path.startsWith(source_path + "/")) {
								return;
							}

							if (entry) {
								const current_entry = findEntry(entry.full_path);
								if (current_entry && current_entry.type === "folder" && !current_entry.is_open) {
									toggleIsOpen(current_entry);
								}
							}

							await moveFile(source_path, target_path);
						} catch (error) {
							console.error("Error moving file:", error);
						}
					},
				},
				span({
					style: `min-width: calc(var(--size-5) * ${entry.indent_level});`,
				}),
				tags[entry.is_renaming ? "div" : "span"](
					{
						class: tw("component-file-browser-entry-text", {
							"pointer-events-none": !entry.is_renaming,
							"component-file-browser-entry-open": entry.is_open,
						}),
					},
					icon({
						name: getIcon(entry),
						class: () =>
							tw("component-file-browser-entry-icon", {
								"component-file-browser-entry-icon-selected":
									entry.project && AppState.active_project ? AppState.active_project.name === entry.project.name : false,
							}),
					}),
					() =>
						entry.is_renaming
							? tags.input({
									id: "active-rename-input",
									value: entry.filename,
									onblur(e) {
										toggleIsRenaming(entry);
										entry.filename = (e.target as HTMLInputElement).value; // To show effect immediately before finished renaming
										renameFile(entry.full_path, (e.target as HTMLInputElement).value);
									},
									onkeydown(e) {
										if (e.key === "Enter" || e.key === "Escape") {
											e.preventDefault();
											(e.target as HTMLInputElement).blur();
										}
									},
								})
							: entry.filename,
				),
			)
		: null;
}
