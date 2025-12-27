import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";
import { createEditor } from "codemirror";

const $ = useTags();

export const CodeEditor = registerCustomTag("code-editor", {
	async onconnected() {
		let source = this.getAttribute("source") || "";

		// @TODO: find better way to detect if it's encoded source or url
		const initial_source_type = source && source.includes("://") ? "url" : "encoded";
		if (initial_source_type === "url") {
			const res = await fetch(source);
			source = res.ok ? await res.text() : "failed to fetch url: " + source;
		} else if (source) {
			source = btoa(source);
		}

		this.editor = createEditor({
			host: this,
			language: "javascript",
			source,
			theme: "dark",
			onInput: (new_value) => {
				this.dispatchEvent(new CustomEvent("input"));
				this.value = new_value;
			},
		});
	},
});
