import { useTags, type Ref } from "@/lib/ima";
import { finishFrame, shortcut } from "@/monzon/src/lib/utils";
import { liftMirror, mountWindow, openedWindows, useDesktop } from "@/monzon/src/ui/desktop.ts";
import { WindowFrame } from "@/monzon/src/ui/window-frame.ts";
import { SelectItem, SeparatorItem, useSelect } from "@/monzon/src/ui/select.ts";
import { tw } from "@/lib/tw.js";
import { Editor } from "@/monzon/src/ui/monaco-editor";
import sys from "@/monzon/src/lib/bridge";
import { Button } from "@/monzon/src/ui/button";
import { refreshWorkingDirectory } from "./file-browser";
import { closeDialog, useDialog } from "@/monzon/src/ui/dialog";
import type { ShortcutCallback } from "@/monzon/src/lib/types";
import { useTheme } from "@/monzon/src/main";
import { openAssistant } from "./assistant";

const { div, icon, input } = useTags();

export type CodeEditorProps = {
	filename: string;
	fullpath: string;
	relative_path: string;
	language: string;
};

const active_editors = new Map<
	string,
	{
		win: HTMLElement;
		editor: monaco.editor.IStandaloneCodeEditor;
		filename: string;
		relative_path: string;
		fullpath: string;
	}
>();

export async function openCodeEditor(props: CodeEditorProps) {
	const file_data = { ...props };

	let window_name = `code-editor---${file_data.fullpath}`;
	const [existing_window] = openedWindows(window_name);

	if (existing_window) {
		existing_window.focus();
		const id = existing_window.getAttribute("stb-tsid");
		if (!id) throw new Error("Window ID not found");
		liftMirror(id);
		return;
	}

	const theme = useTheme();
	const desktop = useDesktop();
	const width = 640;
	const height = Math.min(desktop.offsetHeight, 600);
	const center_x = desktop.offsetWidth / 2;
	const center_y = desktop.offsetHeight / 2;
	const offset_range = 50;
	const x = Math.max(center_x - width / 2 + (Math.random() - 0.5) * offset_range * 2, 0);
	const y = Math.max(center_y - height / 2 + (Math.random() - 0.5) * offset_range * 2, 0);

	const content = file_data ? await sys.file.read(file_data.fullpath) : "";

	let has_unsaved_changes = false;
	let is_editing_title = false;

	const shortcuts: Record<string, ShortcutCallback> = {
		[shortcut("CmdOrCtrl", "w")]: ({ win }) => {
			const name = win.getAttribute("stb-window");
			if (!name) return;
			if (has_unsaved_changes) {
				showUnsavedWarning(name);
			} else {
				closeWindow(window_name);
			}
		},
		[shortcut("CmdOrCtrl", "s")]: saveContents,
		[shortcut("CmdOrCtrl", "p")]: openCommandPalette,
	};

	const rename_input_ref: Ref<HTMLInputElement> = {
		current: null,
	};

	const { editor, container: editor_el } = Editor({
		class: tw("grow w-full h-full"),
		content,
		language: file_data.language,
	});

	const editor_model = editor.getModel();
	if (editor_model) {
		editor_model.onDidChangeContent(() => {
			has_unsaved_changes = true;
		});
	}

	function closeWindow(window_name: string) {
		const active_editor = active_editors.get(window_name);
		if (!active_editor) return;
		active_editor.win.remove();
		active_editors.delete(window_name);
	}

	function saveContents() {
		if (!has_unsaved_changes) return;
		const content = editor.getValue();
		if (!file_data.fullpath) return;

		sys.file.write(file_data.fullpath, content);
		has_unsaved_changes = false;
	}

	function openCommandPalette() {
		if (!editor.hasTextFocus()) return;
		const action = editor.getAction("editor.action.quickCommand");
		if (!action) return;
		action.run();
	}

	async function renameFile(new_name: string) {
		await sys.file.rename(file_data.fullpath, new_name);
		file_data.filename = new_name;
		file_data.fullpath = file_data.fullpath.split("/").slice(0, -1).join("/") + "/" + new_name;
		file_data.relative_path = file_data.relative_path.split("/").slice(0, -1).join("/") + "/" + new_name;

		active_editors.delete(window_name);
		window_name = `code-editor---${file_data.fullpath}`;
		active_editors.set(window_name, {
			win: editor_window,
			editor,
			relative_path: file_data.relative_path,
			filename: file_data.filename,
			fullpath: file_data.fullpath,
		});

		await refreshWorkingDirectory();
	}

	async function startRenaming() {
		if (is_editing_title) return;
		is_editing_title = true;

		await finishFrame();

		if (rename_input_ref.current) {
			rename_input_ref.current.focus();
			rename_input_ref.current.select();
		}
	}

	function showUnsavedWarning(window_name: string) {
		const relative_path = active_editors.get(window_name)?.relative_path;
		if (!relative_path) return;

		useDialog(
			{},
			div(
				{ class: tw("flex flex-col items-center gap-2") },
				icon({
					name: theme.icons.code_editor.unsaved_warning,
					class: tw("text-8 font-200"),
				}),
				div(`"${relative_path}" have unsaved changes`),
				div(
					{ class: tw("flex flex-row gap-1 w-full") },
					Button(
						{
							variant: "outline",
							class: tw("grow"),
							onclick() {
								closeDialog();
								closeWindow(window_name);
							},
						},
						"Discard changes",
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

	function showAssistant() {
		openAssistant(undefined, file_data);
	}

	const editor_window = WindowFrame({
		name: window_name,
		x,
		y,
		width,
		height,
		ontitleclick: startRenaming,
		ontitlemenu(e) {
			useSelect(
				{
					click: e,
					follow_cursor: true,
					async onselect(action: string) {
						switch (action) {
							case "rename":
								startRenaming();
								break;
						}
					},
				},
				SelectItem({ value: "rename" }, "Rename"),
			);
		},
		title: () =>
			is_editing_title
				? input({
						ref: rename_input_ref,
						class: tw("rename-input w-fit text-center"),
						value: file_data.filename,
						async onkeydown(e) {
							const input_val = (e.currentTarget as HTMLInputElement).value;
							if (e.key === "Enter") {
								await renameFile(input_val);
								is_editing_title = false;
							} else if (e.key === "Escape") {
								is_editing_title = false;
							}
						},
						onblur() {
							is_editing_title = false;
						},
					})
				: `${file_data.relative_path}${has_unsaved_changes ? "*" : ""}`,
		onclose() {
			if (has_unsaved_changes) {
				showUnsavedWarning(window_name);
			} else {
				closeWindow(window_name);
			}
		},
		oncontextmenu(e) {
			useSelect(
				{
					click: e,
					follow_cursor: false,
					width: "fit",
					onselect: (action: string) => {
						switch (action) {
							case "save":
								console.log("save");
								break;
							case "close":
								if (has_unsaved_changes) {
									showUnsavedWarning(window_name);
								} else {
									closeWindow(window_name);
								}
								break;
						}
					},
				},
				SelectItem({ value: "save" }, "Save"),
				SeparatorItem(),
				SelectItem({ value: "close" }, "Close"),
			);
		},
		shortcuts,
		left_children: [
			icon({
				name: theme.icons.code_editor.window,
			}),
		],
		right_children: [
			Button(
				{
					size: "icon",
					title: "Show assistant",
					onclick: showAssistant,
				},
				icon({
					name: theme.icons.code_editor.assistant,
				}),
			),
			Button(
				{
					size: "icon",
					title: "Save",
					onclick: saveContents,
				},
				icon({
					name: theme.icons.code_editor.save,
				}),
			),
		],
		content_children: [
			div(
				{
					class: tw("w-full h-full flex flex-col items-start justify-start select-none"),
				},
				editor_el,
				div(
					{
						class: tw(
							"bg-windows-statusbar-bg text-windows-statusbar-fg w-full h-5 absolute z-90 bottom-0 left-0 border-t border-hover flex items-center justify-start gap-1",
						),
					},
					div({
						class: tw("grow"),
					}),
					div(
						{
							class: tw("px-1 pr-4 flex items-center gap-1 h-full"),
						},
						() => {
							const position = editor.getPosition();
							if (!position) return "";
							const selection = editor.getSelection();
							if (!selection) return `${position.lineNumber}:${position.column}`;

							const selection_length = selection.isEmpty() ? 0 : editor.getModel()?.getValueInRange(selection)?.length || 0;

							if (selection_length > 0) {
								return `${position.lineNumber}:${position.column} (${selection_length} characters)`;
							} else {
								return `${position.lineNumber}:${position.column}`;
							}
						},
					),
				),
			),
		],
	});

	mountWindow(editor_window);

	active_editors.set(window_name, {
		win: editor_window,
		editor,
		relative_path: file_data.relative_path,
		filename: file_data.filename,
		fullpath: file_data.fullpath,
	});
}

export function getActiveEditors() {
	return active_editors;
}
