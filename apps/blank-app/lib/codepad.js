import { useTags, useCustomTag } from "ima";
import { css, finish, useShadowStyles, tryCatch } from "utils";

import hljs from "hljs";
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
	const highlighted_code = hljs.highlight(formatted_code, { language: "javascript" });
	const chunks = [];

	let current_chunk = "";
	let line_count = 0;

	for (let i = 0; i < highlighted_code.value.length; i++) {
		const char = highlighted_code.value[i];
		current_chunk += char;

		if (char === "\n") {
			line_count++;
			if (line_count === CHUNK_SIZE) {
				chunks.push(
					t.div({
						class: "code-chunk",
						innerHTML: current_chunk,
					}),
				);
				current_chunk = "";
				line_count = 0;
			}
		}
	}

	// Add remaining chunk if any
	if (current_chunk) {
		chunks.push(
			t.div({
				class: "code-chunk",
				innerHTML: current_chunk,
			}),
		);
	}

	// If the original code ends with a newline, add an empty line to match textarea behavior
	if (formatted_code.endsWith("\n")) {
		if (chunks.length === 0) {
			chunks.push(
				t.div({
					class: "code-chunk",
					innerHTML: "\n",
				}),
			);
		} else {
			// Add newline to last chunk
			const last_chunk = chunks[chunks.length - 1];
			last_chunk.innerHTML += "\n";
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
								const { content } = chunk_data.get(chunk);
								chunk.innerHTML = content;
								chunk.style.removeProperty("min-height");
							}
						} else {
							// Code chunk is not visible - store content and set fixed height
							if (!chunk_data.has(chunk)) {
								chunk_data.set(chunk, {
									content: chunk.innerHTML,
								});
							}

							chunk.style.minHeight = `${chunk.offsetHeight}px`;
							chunk.innerHTML = "";
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
			}),
		),
		t.div({
			class: "bottom-spacer"
		})
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
		caret-color: #CACACA;
		background: transparent;
		font-size: ${FONT_SIZE}px;
		line-height: ${LINE_HEIGHT};
	}

	codepad-editor textarea::selection {
		background-color: #CACACA;
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
