import { useTags } from "ima";
import { css, finish, useShadowStyles, tryCatch, useCustomElement } from "utils";

import acorn from "acorn";
import astring from "astring";
import hljs from "hljs";
import astravel from "astravel";
import formatter from "formatter";

const t = useTags();

useCustomElement("codepad-editor", function ({ $listen }) {
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
			if (line_count === 20) {
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

	return chunks;
}

export async function Codepad({ root, module, ...props }) {
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
									height: `${chunk.offsetHeight}px`,
								});
							}

							const { height } = chunk_data.get(chunk);
							chunk.innerHTML = "";
							chunk.style.minHeight = height;
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

	return t["codepad-editor"](
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
					formatted_code = formatter.js(updated_source);
					chunk_elements = highlightSource(formatted_code);
					content_ref.current.replaceChildren(...chunk_elements);

					observeChunkElements();
				},
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
	}

	codepad-editor .wrapper {
		position: relative;
		padding: 11px;
		border: 1px solid var(--color-highlight);
	}

	codepad-editor .content {
		position: relative;
		overflow-x: scroll;
		user-select: none;
		pointer-events: none;
	}

	codepad-editor textarea {
		position: absolute;
		padding: 11px;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		white-space: nowrap;
		overflow-x: auto;
		overflow-y: auto;
		word-wrap: normal;
		resize: none;
		color: transparent;
		caret-color: var(--color-highlight);
		background: transparent;
	}

	codepad-editor textarea::selection {
		background-color: var(--color-highlight);
		color: black;
	}

	codepad-editor textarea:focus {
		outline: none;
	}

	codepad-editor .module-name {
		margin-bottom: 4px;
	}

	/*
	// Color scheme
	*/

	.hljs-number,
	.hljs-string,
	.hljs-attribute,
	.hljs-link {
		color: #e0e0e0;
	}

	.hljs-template-variable {
		color: #ffffff;
	}

	.hljs-comment,
	.hljs-quote,
	.hljs-meta,
	.hljs-deletion {
		color: var(--color-highlight);
	}

	.hljs-keyword,
	.hljs-selector-tag,
	.hljs-section,
	.hljs-name,
	.hljs-type,
	.hljs-strong {
		color: #a0a0a0;
	}

	.hljs-emphasis {
		color: #ffffff;
	}

	.hljs-literal {
		color: #ffffff;
	}

	.hljs-tag,
	.hljs-title {
		color: #ffffff;
	}

	.hljs-function {
		color: #ffffff;
	}

	.hljs-operator,
	.hljs-punctuation {
		color: #ffffff;
	}
`;
