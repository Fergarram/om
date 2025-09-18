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
				current_chunk_content.push(t.span({ class: current_class }, current_text));
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

	const editor_ref = { current: null };
	const textarea_ref = { current: null };
	const content_ref = { current: null };

	const chunk_data = new Map();

	let formatted_code = formatter.js(source, {
		indent_char: "\t",
		wrap_line_length: "128",
	});
	let [chunk_elements, error_pos] = highlightSource(formatted_code);
	let intersection_observer = null;

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
						textarea.dispatchEvent(new Event("input", { bubbles: true }));
					}
				},
			}),
			t.div({
				class: "hl-error-indicator",
				style: () => `
					display: ${error_pos ? "block" : "none"};
					height: ${LINE_HEIGHT * FONT_SIZE + 2}px;
					top: ${error_pos && error_pos.line * LINE_HEIGHT * FONT_SIZE}px;
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
	}

	codepad-editor .wrapper {
		position: relative;
		width: 100%;
		height: fit-content;
		border: 1px solid var(--color-highlight);
	}

	codepad-editor .content {
		position: relative;
		user-select: none;
		pointer-events: none;
		font-size: ${FONT_SIZE}px;
		line-height: ${LINE_HEIGHT};
		height: fit-content;
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
	}

	codepad-editor textarea::selection {
		background-color: #cacaca;
		color: black;
	}

	codepad-editor textarea:focus {
		outline: none;
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

	.hl-error {
		/*color: #ff6b6b;*/
	}

	.hl-error-indicator {
		position: absolute;
		width: 100%;
		background-color: red;
		mix-blend-mode: exclusion;
		left: 0;
		transform: translateY(-100%);
		pointer-events: none;
	}
`;
