import { useTags, useCustomTag } from "ima";
import { css, finish, useShadowStyles, tryCatch } from "utils";

import acorn from "acorn";
import formatter from "formatter";
import { getModuleEditorRoot } from "module-editor";

const FONT_SIZE = 11;
const LINE_HEIGHT = 1.25;
const CHUNK_SIZE = 20;

const t = useTags();

const CodepadEditor = useCustomTag("codepad-editor", function ({ $listen }) {
	return {
		connected() {
			this.dispatchEvent(new CustomEvent("mount"));
		},

		disconnected() {
			this.dispatchEvent(new CustomEvent("unmount"));
		},
	};
});

function highlightSource(formatted_code) {
	const start_time = performance.now();
	const chunks = [];
	let current_chunk_content = [];
	let line_count = 0;
	let parsing_failed = false;
	let error_pos = null;

	// Create a mapping of character positions to highlight classes
	const highlights = new Map();

	try {
		// Parse the code and collect token information
		const tokens = [];
		const comments = [];

		acorn.parse(formatted_code, {
			ecmaVersion: "2022",
			sourceType: "module",
			onToken: tokens,
			onComment: comments,
		});

		// Map comments
		comments.forEach((comment) => {
			for (let i = comment.start; i < comment.end; i++) {
				highlights.set(i, "hl-comment");
			}
		});

		// Define keywords manually to be safe
		const keywords = new Set([
			"const",
			"let",
			"var",
			"function",
			"async",
			"await",
			"return",
			"if",
			"else",
			"for",
			"while",
			"do",
			"switch",
			"case",
			"default",
			"try",
			"catch",
			"finally",
			"throw",
			"new",
			"delete",
			"typeof",
			"instanceof",
			"in",
			"of",
			"class",
			"extends",
			"super",
			"static",
			"import",
			"export",
			"from",
			"as",
			"default",
			"this",
			"break",
			"continue",
			"debugger",
			"with",
			"yield",
		]);

		// Map tokens
		tokens.forEach((token) => {
			const start = token.start;
			const end = token.end;

			if (token.type.keyword || keywords.has(token.value)) {
				// Keywords
				for (let i = start; i < end; i++) {
					highlights.set(i, "hl-keyword");
				}
			} else if (token.type.label === "string") {
				// String literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hl-string");
				}
			} else if (token.type.label === "num") {
				// Number literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hl-number");
				}
			} else if (
				token.value === "true" ||
				token.value === "false" ||
				token.value === "null" ||
				token.value === "undefined"
			) {
				// Boolean and null literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hl-literal");
				}
			}
		});
	} catch (error) {
		// If parsing fails, mark the entire code as error
		error_pos = error.loc;
		parsing_failed = true;
		for (let i = 0; i < formatted_code.length; i++) {
			highlights.set(i, "hl-error");
		}
	}

	// Build content array
	let current_text = "";
	let current_class = null;

	function flushCurrentText() {
		if (current_text) {
			if (current_class) {
				current_chunk_content.push(
					t.span(
						{
							class: current_class,
						},
						current_text,
					),
				);
			} else {
				current_chunk_content.push(current_text);
			}
			current_text = "";
		}
	}

	function flushChunk() {
		flushCurrentText();
		chunks.push(
			t.pre(
				{
					class: parsing_failed ? "code-chunk hl-error-chunk" : "code-chunk",
				},
				...current_chunk_content,
			),
		);
		current_chunk_content = [];
		line_count = 0;
	}

	for (let i = 0; i < formatted_code.length; i++) {
		const char = formatted_code[i];
		const highlight_class = highlights.get(i);

		// If class changes, flush current text
		if (highlight_class !== current_class) {
			flushCurrentText();
			current_class = highlight_class;
		}

		current_text += char;

		// Handle chunking
		if (char === "\n") {
			line_count++;
			if (line_count === CHUNK_SIZE) {
				flushChunk();
			}
		}
	}

	// Add remaining chunk if any
	if (current_chunk_content.length > 0 || current_text) {
		// Handle trailing newline before flushing
		if (formatted_code.endsWith("\n") && !current_text.endsWith("\n")) {
			current_text += "\n";
		}
		flushChunk();
	}

	// After all chunks are created, check if we need to add br to the last chunk
	if (chunks.length > 0 && formatted_code.endsWith("\n")) {
		const last_chunk = chunks[chunks.length - 1];
		last_chunk.appendChild(t.br());
	}

	const end_time = performance.now();
	// console.log(`Chunk generation took ${end_time - start_time} milliseconds for ${chunks.length} chunks`);

	return [chunks, error_pos];
}

export async function Codepad({ module, ...props }) {
	const root = getModuleEditorRoot();
	useShadowStyles(root, theme, "codepad-editor");

	const [source, error] = await tryCatch(async () => {
		const response = await fetch(module.blob_url);
		const source = await response.text();
		return source;
	});

	const editor_ref = {
		current: null,
	};
	const textarea_ref = {
		current: null,
	};
	const content_ref = {
		current: null,
	};

	const chunk_data = new Map();

	let formatted_code = formatter.js(source, {
		indent_char: "\t",
		wrap_line_length: "128",
	});

	let original_source = formatted_code;

	let [chunk_elements, error_pos] = highlightSource(formatted_code);
	let intersection_observer = null;

	let has_changes = false;

	let last_save_mode = null;

	function observeChunkElements() {
		const chunk_els = editor_ref.current.querySelectorAll(".code-chunk");

		if (chunk_els.length > 0) {
			intersection_observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						const chunk = entry.target;

						if (entry.isIntersecting) {
							// Code chunk is visible - restore content
							if (chunk_data.has(chunk)) {
								const { children } = chunk_data.get(chunk);
								chunk.replaceChildren(...children);
								chunk.style.removeProperty("min-height");
								chunk.style.removeProperty("min-width");
							}
						} else {
							// Code chunk is not visible - store content and set fixed height
							if (!chunk_data.has(chunk)) {
								// Store the actual DOM children
								chunk_data.set(chunk, {
									children: Array.from(chunk.childNodes).map((node) => node.cloneNode(true)),
								});
							}

							chunk.style.minHeight = `${chunk.offsetHeight}px`;
							chunk.style.minWidth = `${chunk.offsetWidth}px`;
							chunk.replaceChildren(); // Clear all children
						}
					});
				},
				{
					threshold: 0,
				},
			);

			chunk_els.forEach((chunk) => {
				intersection_observer.observe(chunk);
			});
		}
	}

	return CodepadEditor(
		{
			...props,
			ref: editor_ref,
			onmount() {
				if (textarea_ref.current) {
					textarea_ref.current.value = formatted_code;
				}
				observeChunkElements();
			},
			onunmount() {
				if (intersection_observer) {
					intersection_observer.disconnect();
					intersection_observer = null;
				}
			},
		},
		t.div(
			{
				class: "wrapper",
			},
			t.div(
				{
					class: "header",
				},
				t.div(
					{
						class: "bar",
					},
					t.div(
						module.name,
						() => (has_changes ? "*" : ""),
						() =>
							window.__blob_module_loader_settings__.prefers_remote_modules && module.remote_url !== null
								? last_save_mode
									? ` (${last_save_mode})`
									: " (remote)"
								: " (local)",
					),
					t.button(
						{
							style: () => `display: ${has_changes ? "block" : "none"};`,
							async onclick() {
								const updated_source = textarea_ref.current.value;

								// Update the blob_modules Map in the blob module loader
								if (window.__blob_modules__ && window.__blob_modules__.has(module.module_name)) {
									window.__blob_modules__.set(module.module_name, updated_source);
								}

								// Check if we can save individual module files
								if (
									window.__blob_module_loader_settings__.prefers_remote_modules &&
									location.origin === "file://" &&
									globalThis.__sys &&
									module.remote_url
								) {
									// Check if the URL is not hosted externally
									const is_external =
										module.remote_url.startsWith("https://") || module.remote_url.startsWith("http://");

									if (!is_external) {
										let module_full_path;

										if (module.remote_url.startsWith("file://")) {
											// Absolute file:// URL - extract the path
											module_full_path = module.remote_url.replace("file://", "");
										} else if (module.remote_url.startsWith("/")) {
											// Absolute path from root
											console.warn(
												"Served from server so we can't save it — an API for this server needs to be provided.",
											);
										} else {
											// Relative path
											try {
												module_full_path = await __sys.invoke("file.resolve", module.remote_url);
											} catch (error) {
												console.error(`Failed to resolve module path ${module.remote_url}:`, error);
											}
										}

										if (module_full_path) {
											try {
												await __sys.invoke("file.write", module_full_path, updated_source);
												last_save_mode = "remote";
												console.log(`Saved module file: ${module_full_path}`);

												// Reset the has_changes flag
												has_changes = false;
												original_source = updated_source;
												return;
											} catch (error) {
												console.error(`Failed to save module file ${module_full_path}:`, error);
												// Fall back to saving the whole HTML file
											}
										}
									}
								}

								// If not, update the script tag content
								const script_tags = document.querySelectorAll('script[type="blob-module"]');
								const target_script = Array.from(script_tags).find(
									(script) => script.getAttribute("name") === module.module_name,
								);

								if (target_script) {
									target_script.textContent = updated_source;
								}

								// Handle special case for blob-module-loader
								if (module.module_name === "blob-module-loader") {
									const loader_script = document.getElementById("blob-module-loader");
									if (loader_script) {
										loader_script.textContent = updated_source;
									}
								}

								// Fallback: Save the HTML file
								try {
									window.saveHtmlFile();
									last_save_mode = "local";
									console.log(`Saved full html from module: ${module.module_name}`);
								} catch (error) {
									console.error(`Failed to save html from module: ${module.module_name}:`, error);
								}

								// Reset the has_changes flag
								has_changes = false;
								original_source = updated_source;
							},
						},
						"save",
					),
				),
			),
			t.div(
				{
					ref: content_ref,
					class: "content",
				},
				...chunk_elements,
			),
			t.textarea({
				ref: textarea_ref,
				spellcheck: "false",
				oninput() {
					const updated_source = textarea_ref.current.value;
					[chunk_elements, error_pos] = highlightSource(updated_source);
					content_ref.current.replaceChildren(...chunk_elements);

					has_changes = updated_source !== original_source;

					observeChunkElements();
				},
				onkeydown(e) {
					if (e.key === "Tab") {
						e.preventDefault();
						e.stopPropagation();

						const textarea = textarea_ref.current;

						// Use execCommand to insert tab while preserving undo history
						if (document.execCommand) {
							document.execCommand("insertText", false, "\t");
						} else {
							// Fallback for browsers that don't support execCommand
							const start = textarea.selectionStart;
							const end = textarea.selectionEnd;
							const value = textarea.value;
							textarea.value = value.substring(0, start) + "\t" + value.substring(end);
							textarea.selectionStart = textarea.selectionEnd = start + 1;
						}

						// Trigger the input event to update syntax highlighting
						textarea.dispatchEvent(
							new Event("input", {
								bubbles: true,
							}),
						);
					}
				},
			}),
			t.div({
				class: "hl-error-indicator",
				style: () => `
					display: ${error_pos ? "block" : "none"};
					height: ${LINE_HEIGHT * FONT_SIZE + 2}px;
					top: ${error_pos && error_pos.line * LINE_HEIGHT * FONT_SIZE - 4}px;
				`,
			}),
		),
	);
}

const theme = css`
	:host {
		--color-highlight: #aafee7;
	}

	codepad-editor {
		display: block;
		position: relative;
		height: fit-content;
		min-height: 100%;
		background-color: black;
	}

	codepad-editor .wrapper {
		position: relative;
		width: 100%;
		height: fit-content;
		min-height: 100%;
	}

	codepad-editor .content {
		position: relative;
		user-select: none;
		pointer-events: none;
		font-size: ${FONT_SIZE}px;
		line-height: ${LINE_HEIGHT};
		height: fit-content;
		min-height: 100%;
		padding: ${LINE_HEIGHT * FONT_SIZE * 2}px 11px;
	}

	codepad-editor textarea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		white-space: nowrap;
		overflow: hidden;
		word-wrap: normal;
		resize: none;
		color: transparent;
		caret-color: #cacaca;
		background: transparent;
		font-size: ${FONT_SIZE}px;
		line-height: ${LINE_HEIGHT};
		padding: ${LINE_HEIGHT * FONT_SIZE * 2}px 11px;
	}

	codepad-editor textarea::selection {
		background-color: #cacaca;
		color: black;
	}

	codepad-editor textarea:focus {
		outline: none;
	}

	codepad-editor .header {
		position: sticky;
		height: 0px;
		width: 100%;
		top: 0;
		left: 0;
		z-index: 1;
	}

	codepad-editor .header .bar {
		position: absolute;
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: fit-content;
		width: 100%;
		top: 0;
		left: 0;
		background-color: #333;
	}

	codepad-editor .header .bar button:hover {
		background-color: #666;
	}

	/*
	// Color scheme
	*/

	codepad-editor .code-chunk {
		color: #ffffff;
	}

	.hl-literal,
	.hl-number,
	.hl-string {
		color: #d0d0d0;
	}

	.hl-string .hl-subst {
		color: #ffffff;
	}

	.hl-comment {
		color: var(--color-highlight);
	}

	.hl-keyword {
		color: #a0a0a0;
	}

	.hl-error-indicator {
		position: absolute;
		width: 100%;
		background-color: red;
		mix-blend-mode: exclusion;
		left: 0;
		transform: translateY(100%);
		pointer-events: none;
	}
`;
