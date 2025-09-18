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

	// Create a mapping of character positions to highlight classes
	const highlights = new Map();

	try {
		// Parse the code and collect token information
		const tokens = [];
		const comments = [];

		acorn.parse(formatted_code, {
			ecmaVersion: "latest",
			sourceType: "module",
			onToken: tokens,
			onComment: comments,
		});

		// Map comments
		comments.forEach((comment) => {
			for (let i = comment.start; i < comment.end; i++) {
				highlights.set(i, "hljs-comment");
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
					highlights.set(i, "hljs-keyword");
				}
			} else if (token.type.label === "string") {
				// String literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hljs-string");
				}
			} else if (token.type.label === "num") {
				// Number literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hljs-number");
				}
			} else if (
				token.value === "true" ||
				token.value === "false" ||
				token.value === "null" ||
				token.value === "undefined"
			) {
				// Boolean and null literals
				for (let i = start; i < end; i++) {
					highlights.set(i, "hljs-literal");
				}
			}
		});
	} catch (error) {
		// If parsing fails, we'll just return unhighlighted chunks
		console.warn("Acorn parsing failed:", error);
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
			t.div(
				{
					class: "code-chunk",
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
		flushChunk();
	}

	// Handle trailing newline
	if (formatted_code.endsWith("\n")) {
		if (chunks.length === 0) {
			chunks.push(
				t.div(
					{
						class: "code-chunk",
					},
					"\n",
				),
			);
		} else {
			const last_chunk = chunks[chunks.length - 1];
			// Add newline as the last child
			if (typeof last_chunk.children[last_chunk.children.length - 1] === "string") {
				last_chunk.children[last_chunk.children.length - 1] += "\n";
			} else {
				last_chunk.children.push("\n");
			}
		}
	}

	return chunks;
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

	let formatted_code = formatter.js(source);
	let chunk_elements = highlightSource(formatted_code);
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
				class: "module-name",
			},
			module.name,
		),
		t.div(
			{
				class: "wrapper",
			},
			t.pre(
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
					chunk_elements = highlightSource(updated_source);
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
		),
		t.div({
			class: "bottom-spacer",
		}),
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
		padding: 11px;
		position: relative;
		border: 1px solid var(--color-highlight);
	}

	codepad-editor .content {
		position: relative;
		overflow-x: scroll;
		user-select: none;
		pointer-events: none;
		font-size: ${FONT_SIZE}px;
		line-height: ${LINE_HEIGHT};
	}

	codepad-editor textarea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 11px;
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

	codepad-editor .module-name {
		margin-bottom: 4px;
	}

	codepad-editor .bottom-spacer {
		height: 80vh;
	}

	/*
	// Color scheme
	*/

	codepad-editor .code-chunk {
		color: #ffffff;
	}

	.hljs-literal,
	.hljs-number,
	.hljs-string {
		color: #d0d0d0;
	}

	.hljs-string .hljs-subst {
		color: #ffffff;
	}

	.hljs-comment {
		color: var(--color-highlight);
	}

	.hljs-keyword {
		color: #a0a0a0;
	}
`;
