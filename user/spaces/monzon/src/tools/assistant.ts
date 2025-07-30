import { useTags, type Ref } from "@/lib/ima";
import { convertToWindowsPath, finish, finishFrame, getFileLanguage, getImageMediaType, isImageFile, shortcut } from "@/monzon/src/lib/utils";
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
import Anthropic from "@/lib/anthropic";
import { openSettingsWindow } from "./settings";
import { AppSettings, AppState } from "@/monzon/src/lib/state";
import { useTheme } from "@/monzon/src/main";
import type { CodeEditorProps } from "./code-editor";

const { div, icon, input, span, button } = useTags();

export type AssistantProps = {
	filename: string;
	fullpath: string;
	relative_path: string;
};

export type StreamConfig = {
	model: string;
	max_tokens?: number;
	temperature?: number;
	system?: string;
	messages: {
		role: string;
		content: ({ type: string; source: { type: string; media_type: string; data: string } } | { type: string; text: string })[];
	}[];
};

const active_assistants = new Map<
	string,
	{
		win: HTMLElement;
		editor: monaco.editor.IStandaloneCodeEditor;
		filename: string;
		relative_path: string;
		fullpath: string;
		anthropic: InstanceType<typeof Anthropic>;
		stream_controller?: AbortController;
	}
>();

export async function openAssistant(props?: AssistantProps, editor_file?: CodeEditorProps) {
	let file_data: AssistantProps;
	if (props) {
		file_data = { ...props };
	} else {
		const temp_id = crypto.randomUUID();

		file_data = {
			filename: "untitled.chat",
			fullpath: `temp-id-${temp_id}`,
			relative_path: "untitled.chat",
		};
	}

	let window_name = `assistant---${file_data.fullpath}`;
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

	const content = props ? await sys.file.read(file_data.fullpath) : "\n> You\n";

	const rename_input_ref: Ref<HTMLInputElement> = {
		current: null,
	};

	const { editor, container: editor_el } = Editor({
		class: tw("grow w-full h-full"),
		language: "markdown",
		content,
		settings: {
			lineNumbers: "off",
		},
	});

	const editor_mModel = editor.getModel();
	if (!editor_mModel) {
		console.error("Could not get edtior model.");
		return;
	}

	let has_unsaved_changes = false;
	let is_editing_title = false;
	let is_streaming = false;
	let selected_assistant = AppSettings.default_assistant;
	let stream: ReturnType<typeof anthropic.messages.stream> | null = null;
	let estimated_tokens = 0;
	let token_display_mode: "tokens" | "usd" | "none" = "tokens";
	let anthropic = new Anthropic({
		// @ts-ignore
		dangerouslyAllowBrowser: true,
		apiKey: AppSettings.assistants[selected_assistant].key,
	});

	editor_mModel.onDidChangeContent(() => {
		has_unsaved_changes = true;

		if (!is_streaming) {
			callAssistant(true);
		}
	});

	if (!is_streaming) {
		callAssistant(true);
	}

	if (editor_file) {
		// Create a position at the end of the document
		const last_line_number = editor_mModel.getLineCount();
		const last_line_column = editor_mModel.getLineLength(last_line_number);

		// Format the file content as a code block with file reference
		const formatted_file_ref = `>>> file: ${editor_file.relative_path}\n`;

		// Insert at the current cursor position
		editor.executeEdits("initial-file", [
			{
				range: new monaco.Range(last_line_number, last_line_column + 1, last_line_number, last_line_column + 1),
				text: formatted_file_ref,
			},
		]);
	}

	editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
		callAssistant();
	});

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

	async function getFileContent(filepath: string, basepath?: string) {
		const fullpath = basepath ? `${basepath}/${filepath}` : filepath;
		try {
			const content = await sys.file.read(fullpath);
			return {
				content,
				language: getFileLanguage(fullpath),
				success: true,
			};
		} catch (error: any) {
			console.warn(`Could not load file content for ${fullpath}:`, error);
			return {
				content: `Error loading ${filepath}: ${error.message}`,
				success: false,
			};
		}
	}

	async function callAssistant(just_estimate: boolean = false) {
		let conversation_text = editor.getValue();
		if (!just_estimate) {
			is_streaming = true;
		}

		try {
			// Parse conversation into messages
			const sections = conversation_text.split(/\n*>\s*(Assistant|You)\s*\n*/);
			if (sections[0] === "") sections.shift();

			const messages = [];
			for (let i = 0; i < sections.length; i += 2) {
				const role = sections[i].toLowerCase();
				const content = sections[i + 1].trim();

				let message_content = content;
				const message_contents = [];

				if (role === "you") {
					// Process file shortcodes
					const file_pattern = />>> file: ([^\n]+)/g;
					const file_matches = [...content.matchAll(file_pattern)];

					// Process each file reference
					for (const match of file_matches) {
						const filepath = match[1];
						const file = await getFileContent(filepath, AppState.working_directory_path);

						// Replace the shortcode with proper markdown in the message
						if (file.success) {
							message_content = message_content.replace(match[0], `\`\`\`${file.language} ${filepath}\n${file.content}\n\`\`\``);
						} else {
							message_content = message_content.replace(match[0], `\`\`\`\n${file.content}\n\`\`\``);
						}
					}

					// Process image shortcodes
					const image_pattern = />>> image: ([^\n]+)/g;
					const image_matches = [...content.matchAll(image_pattern)];

					// Remove image shortcodes from text content
					message_content = message_content.replace(image_pattern, "").trim();

					// Process each image
					for (const match of image_matches) {
						const filepath = match[1];
						const fullpath = `${AppState.working_directory_path}/${filepath}`;

						try {
							const ext = filepath.split(".").pop();
							if (ext && !isImageFile(ext.toLowerCase())) {
								throw new Error(`Unsupported image format`);
							}

							const media_type = getImageMediaType(filepath);
							if (!media_type) {
								throw new Error(`Invalid image media type`);
							}

							const image_data = await sys.file.read(fullpath, "base64");

							message_contents.push({
								type: "image",
								source: {
									type: "base64",
									media_type: media_type,
									data: image_data,
								},
							});
						} catch (error: any) {
							console.warn(`Could not load image ${filepath}:`, error);
							message_content += `\nError loading image ${filepath}: ${error.message}`;
						}
					}
				}

				// Add text content if present
				if (message_content.trim()) {
					message_contents.push({
						type: "text",
						text: message_content,
					});
				}

				// Only add message if we have contents
				if (message_contents.length > 0) {
					messages.push({
						role: role === "you" ? "user" : "assistant",
						content: message_contents,
					});
				}
			}

			// Update editor with just the conversation history (keeping shortcodes)
			const conversation_history = sections
				.map((section, index) => {
					if (index % 2 === 0) {
						const role = section;
						const content = sections[index + 1]?.trim() || "";
						return `> ${role}\n${content}`;
					}
					return null;
				})
				.filter(Boolean)
				.join("\n\n");

			if (!editor_mModel) {
				console.error("Editor model is not defined");
				return;
			}

			if (!just_estimate) {
				editor.executeEdits("assistant", [
					{
						range: editor_mModel.getFullModelRange(),
						text: "\n" + conversation_history + "\n\n> Assistant\n",
					},
				]);
			}

			if (just_estimate && messages.length === 0) {
				return;
			}

			// Start the stream
			const stream_config: StreamConfig = {
				model: AppSettings.assistants[selected_assistant].model,
				messages: messages,
			};

			if (!just_estimate) {
				stream_config.max_tokens = 8192;
				stream_config.temperature = 0;
			}

			if (AppSettings.assistants[selected_assistant].instructions) {
				const basepath = await sys.process.cwd();
				let stormborn_source = await sys.file.read(`${basepath}/user/spaces/monzon/config/versions/${AppSettings.default_version}/stormborn.ts`);
				const instructions_fullpath = `${basepath}/user/spaces/monzon/config/versions/${AppSettings.default_version}/${AppSettings.assistants[selected_assistant].instructions}`;
				let llm_instructions = await sys.file.read(instructions_fullpath);
				llm_instructions = llm_instructions.replace("@@@STORMBORNSOURCE@@@", stormborn_source);
				stream_config.system = llm_instructions;
			}

			if (just_estimate) {
				const response = await anthropic.messages.countTokens(stream_config);
				estimated_tokens = response.input_tokens;
				return;
			} else {
				stream = anthropic.messages.stream(stream_config);
				console.log("Starting stream...");
			}

			let accumulated_text = "";

			// Handle the stream
			stream.on("text", (text: string) => {
				accumulated_text += text;
				const last_line_number = editor_mModel.getLineCount();
				const last_line_column = editor_mModel.getLineLength(last_line_number);

				editor.executeEdits("assistant", [
					{
						range: new monaco.Range(last_line_number, last_line_column + 1, last_line_number, last_line_column + 1),
						text: text,
					},
				]);
			});

			await new Promise<void>((resolve, reject) => {
				if (stream === null) {
					reject(new Error("Failed to start stream"));
					return;
				}

				stream.on("end", () => {
					if (accumulated_text && accumulated_text.trim()) {
						const last_line_number = editor_mModel.getLineCount();
						const last_line_column = editor_mModel.getLineLength(last_line_number);

						editor.executeEdits("assistant", [
							{
								range: new monaco.Range(last_line_number, last_line_column + 1, last_line_number, last_line_column + 1),
								text: "\n\n> You\n",
							},
						]);
					}
					resolve();
				});

				stream.on("error", (error: any) => {
					reject(error);
				});
			});
		} catch (error: any) {
			console.error("Error sending message to assistant:", error);
			if (!editor_mModel) return;

			editor.executeEdits("assistant", [
				{
					range: editor_mModel.getFullModelRange(),
					text: conversation_text + "\n\nError: " + error.message + "\n\n> You\n",
				},
			]);
		} finally {
			is_streaming = false;
		}
	}

	function closeWindow(window_name: string) {
		const active_assistant = active_assistants.get(window_name);
		if (!active_assistant) return;
		active_assistant.win.remove();
		active_assistants.delete(window_name);
	}

	async function saveContents() {
		if (!has_unsaved_changes && file_data.fullpath && !file_data.fullpath.startsWith("temp-id-")) return;
		if (!file_data.fullpath) return;

		const content = editor.getValue();

		// If it's a temp file (new chat), handle project-aware saving
		if (file_data.fullpath.startsWith("temp-id-")) {
			// Check if we have an active project
			if (AppState.active_project) {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const filename = `${timestamp}.chat`;
				const chats_dir = `${AppState.active_project.full_path}/chats`;
				const full_path = `${chats_dir}/${filename}`;

				try {
					// Ensure chats directory exists using shell commands
					const chats_dir_exists = await sys.file.isDir(chats_dir);
					if (!chats_dir_exists) {
						if (await sys.process.is_win32()) {
							await sys.shell.exec(`mkdir "${convertToWindowsPath(chats_dir)}"`);
						} else {
							await sys.shell.exec(`mkdir -p "${chats_dir}"`);
						}
					}

					// Save the file
					await sys.file.write(full_path, content);

					// Update file_data to reflect the saved file
					file_data.filename = filename;
					file_data.fullpath = full_path;
					file_data.relative_path = `chats/${filename}`;

					// Update the active_assistants map key
					active_assistants.delete(window_name);
					window_name = `assistant---${file_data.fullpath}`;
					active_assistants.set(window_name, {
						win: assistant_window,
						editor,
						relative_path: file_data.relative_path,
						filename: file_data.filename,
						fullpath: file_data.fullpath,
						anthropic,
					});

					has_unsaved_changes = false;
					await refreshWorkingDirectory();
				} catch (error) {
					console.error("Error saving new chat to project:", error);
					// Fallback to browser download
					fallbackToRootChatsFolder(content, filename);
				}
			} else {
				// No active project, fallback to browser download
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const filename = `${timestamp}.chat`;
				fallbackToRootChatsFolder(content, filename);
			}
			return;
		}

		// Existing file save
		if (!file_data.fullpath) return;
		sys.file.write(file_data.fullpath, content);
		has_unsaved_changes = false;
	}

	function fallbackToRootChatsFolder(content: string, filename: string) {
		// Try to save to working directory chats folder first
		if (AppState.working_directory_path) {
			const chats_dir = `${AppState.working_directory_path}/Chats`;
			const full_path = `${chats_dir}/${filename}`;

			sys.file
				.isDir(chats_dir)
				.then(async (exists) => {
					if (!exists) {
						// Create chats directory
						if (await sys.process.is_win32()) {
							await sys.shell.exec(`mkdir "${convertToWindowsPath(chats_dir)}"`);
						} else {
							await sys.shell.exec(`mkdir -p "${chats_dir}"`);
						}
					}

					// Save the file
					await sys.file.write(full_path, content);

					// Update file_data to reflect the saved file
					file_data.filename = filename;
					file_data.fullpath = full_path;
					file_data.relative_path = `chats/${filename}`;

					// Update the active_assistants map key
					active_assistants.delete(window_name);
					window_name = `assistant---${file_data.fullpath}`;
					active_assistants.set(window_name, {
						win: assistant_window,
						editor,
						relative_path: file_data.relative_path,
						filename: file_data.filename,
						fullpath: file_data.fullpath,
						anthropic,
					});

					has_unsaved_changes = false;
					await refreshWorkingDirectory();
				})
				.catch((error) => {
					console.error("Error saving to working directory chats folder:", error);
					// Fallback to browser download if file system save fails
					const blob = new Blob([content], { type: "text/markdown" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = filename;
					a.click();
					URL.revokeObjectURL(url);
				});
		} else {
			// No working directory available, use browser download
			const blob = new Blob([content], { type: "text/markdown" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	function openCommandPalette() {
		if (!editor.hasTextFocus()) return;
		const action = editor.getAction("editor.action.quickCommand");
		if (!action) return;
		action.run();
	}

	async function renameFile(new_name: string) {
		if (!file_data.fullpath) return;

		// If it's a temp file, we need to save it first instead of renaming
		if (file_data.fullpath.startsWith("temp-id-")) {
			// Handle saving a new temp file with the desired name
			const content = editor.getValue();

			if (AppState.active_project) {
				const chats_dir = `${AppState.active_project.full_path}/chats`;
				const full_path = `${chats_dir}/${new_name}`;

				try {
					// Ensure chats directory exists (create if it doesn't)
					await sys.file.isDir(chats_dir, true);

					// Save with new name
					await sys.file.write(full_path, content);

					// Update file_data
					file_data.filename = new_name;
					file_data.fullpath = full_path;
					file_data.relative_path = `chats/${new_name}`;

					// Update the active_assistants map key
					active_assistants.delete(window_name);
					window_name = `assistant---${file_data.fullpath}`;
					active_assistants.set(window_name, {
						win: assistant_window,
						editor,
						relative_path: file_data.relative_path,
						filename: file_data.filename,
						fullpath: file_data.fullpath,
						anthropic,
					});

					has_unsaved_changes = false;
					await refreshWorkingDirectory();
				} catch (error) {
					console.error("Error saving new chat:", error);
					return;
				}
			} else {
				// No active project, use browser download
				fallbackToRootChatsFolder(content, new_name);
				// Update the filename for display purposes
				file_data.filename = new_name;
			}
			return;
		}

		// Existing file rename logic remains the same
		try {
			if (!file_data.relative_path) return;
			await sys.file.rename(file_data.fullpath, new_name);
			file_data.filename = new_name;
			file_data.fullpath = file_data.fullpath.split("/").slice(0, -1).join("/") + "/" + new_name;
			file_data.relative_path = file_data.relative_path.split("/").slice(0, -1).join("/") + "/" + new_name;

			active_assistants.delete(window_name);
			window_name = `assistant---${file_data.fullpath}`;
			active_assistants.set(window_name, {
				win: assistant_window,
				editor,
				relative_path: file_data.relative_path,
				filename: file_data.filename,
				fullpath: file_data.fullpath,
				anthropic,
			});

			await refreshWorkingDirectory();
		} catch (error) {
			console.error("Error renaming file:", error);
		}
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
		const relative_path = active_assistants.get(window_name)?.relative_path;
		if (!relative_path) return;

		useDialog(
			{},
			div(
				{ class: tw("flex flex-col items-center gap-2") },
				icon({
					name: theme.icons.assistant.unsaved_warning,
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

	const assistant_window = WindowFrame({
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
				: (() => {
						// For temp files, show "New chat"
						if (file_data.fullpath && file_data.fullpath.startsWith("temp-id-")) {
							return `New chat${has_unsaved_changes ? "*" : ""}`;
						}
						// For saved files, show relative path
						return `${file_data.relative_path}${has_unsaved_changes ? "*" : ""}`;
					})(),
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
							case "open-settings":
								openSettingsWindow();
								break;
							case "save":
								saveContents();
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
				SelectItem({ value: "open-settings" }, "Open settings"),
				SelectItem({ value: "save" }, "Save"),
				SeparatorItem(),
				SelectItem({ value: "close" }, "Close"),
			);
		},
		shortcuts,
		left_children: [
			icon({
				name: theme.icons.assistant.window,
			}),
		],
		right_children: [
			Button(
				{
					size: "icon",
					title: () => (is_streaming ? "Stop" : "Send messages"),
					onclick() {
						if (is_streaming && stream) {
							stream.abort();
						} else {
							callAssistant();
						}
					},
				},
				icon({
					name: () => (is_streaming ? theme.icons.assistant.stop : theme.icons.assistant.send),
				}),
			),
			Button(
				{
					size: "icon",
					title: "Save",
					onclick: saveContents,
				},
				icon({
					name: theme.icons.assistant.save,
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
							"bg-windows-statusbar-bg text-windows-statusbar-fg w-full h-5 absolute z-90 bottom-0 left-0 border-t border-hover flex items-center justify-end gap-1",
						),
					},
					button(
						{
							class: tw("px-1 hover:bg-hover flex items-center gap-1 h-full"),
							onclick() {
								if (token_display_mode === "none") {
									token_display_mode = "usd";
								} else if (token_display_mode === "usd") {
									token_display_mode = "tokens";
								} else if (token_display_mode === "tokens") {
									token_display_mode = "none";
								}
							},
						},
						() => {
							if (token_display_mode === "tokens") return `${estimated_tokens} tokens`;
							else if (token_display_mode === "usd") return `${(3 * (estimated_tokens / 1000000)).toFixed(2)} USD`;
							else if (token_display_mode === "none") return `${editor_mModel.getValueLength()} chars`;
						},
					),
					div({
						class: tw("grow"),
					}),
					button(
						{
							class: tw("px-1 hover:bg-hover flex items-center gap-1 h-full"),
							title: "Change assistant",
							onclick(e) {
								useSelect(
									{
										click: e,
										side: "top",
										align: "center",
										width: "fit",
										follow_cursor: false,
										onselect: (selection: string) => {
											if (selection === "settings") {
												openSettingsWindow();
												return;
											}

											selected_assistant = selection;
											anthropic = new Anthropic({
												// @ts-ignore
												dangerouslyAllowBrowser: true,
												apiKey: AppSettings.assistants[selected_assistant].key,
											});
										},
									},
									...Object.entries(AppSettings.assistants).map(([id]) =>
										SelectItem(
											{
												value: id,
												class: tw("overflow-hidden whitespace-nowrap !justify-start !gap-1 max-w-full relative"),
											},
											span({ class: tw("max-w-full overflow-hidden text-ellipsis") }, id),
											icon({
												class: tw("shrink-0", {
													"opacity-0": id !== selected_assistant,
												}),
												name: theme.icons.select.check,
											}),
										),
									),

									SeparatorItem(),
									SelectItem(
										{
											value: "settings",
										},
										"Configure presets",
									),
								);
							},
						},
						() => selected_assistant,
						icon({
							name: theme.icons.assistant.dropdown,
						}),
					),
				),
			),
		],
	});

	editor_el.addEventListener("drop", async (e) => {
		e.preventDefault();
		e.stopPropagation();

		if (!e.dataTransfer) return;

		// Get the drop data
		const drop_data = e.dataTransfer.getData("text/plain");

		try {
			// Parse the drop data as JSON
			const data = JSON.parse(drop_data);

			// Check if it's a file (not a directory)
			if (!data.is_directory) {
				await finish();

				const relative_path = data.path.replace(AppState.working_directory_path + "/", "");

				// Get the current cursor position
				const selection = editor.getSelection();
				const position = selection ? selection.getStartPosition() : editor.getPosition();
				if (!position) return;

				const is_image = isImageFile(data.path.split(".").pop().toLowerCase());

				// Create the file reference text
				const file_reference = `>>> ${is_image ? "image" : "file"}: ${relative_path}\n`;

				// Insert at cursor position
				editor.executeEdits("drop", [
					{
						range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
						text: file_reference,
					},
				]);

				await finish();

				// Remove the raw drop data that Monaco inserted
				const content = editor.getValue();
				const cleaned_content = content.replace(drop_data.replace("}", "\\}$0"), "");
				editor.setValue(cleaned_content);

				// Set cursor position after the inserted text
				editor.setPosition({
					lineNumber: position.lineNumber,
					column: position.column + file_reference.length,
				});

				// Focus the editor after drop
				editor.focus();
			}
		} catch (error) {
			console.log("Invalid drop data or not a file drop", error);
		}
	});

	// Mount to desktop
	mountWindow(assistant_window);

	// Store assistant window data
	active_assistants.set(window_name, {
		win: assistant_window,
		editor,
		relative_path: file_data.relative_path,
		filename: file_data.filename,
		fullpath: file_data.fullpath,
		anthropic,
	});

	// Focus on editor at mount
	const last_line_number = editor_mModel.getLineCount();
	const last_line_length = editor_mModel.getLineLength(last_line_number);
	editor.setPosition({
		lineNumber: last_line_number,
		column: last_line_length,
	});
	editor.focus();
}

export function getActiveAssistants() {
	return active_assistants;
}
