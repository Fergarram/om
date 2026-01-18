import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";
import { createEditor, updateEditorContent } from "codemirror";

const $ = useTags();

function detectSourceType(source) {
	if (!source || typeof source !== "string") return "raw";

	// Check for URL protocols
	if (
		source.startsWith("blob:") ||
		source.startsWith("http://") ||
		source.startsWith("https://") ||
		source.startsWith("file://") ||
		source.startsWith("data:")
	) {
		return "url";
	}

	// If contains newlines or tabs, it's source code
	if (/[\n\r\t]/.test(source)) {
		return "raw";
	}

	// Characters common in code but invalid in base64
	// Base64 alphabet is only: A-Za-z0-9+/=
	if (/[^A-Za-z0-9+/=]/.test(source)) {
		return "raw";
	}

	// Looks like base64 - check valid length (multiple of 4)
	if (source.length > 0 && source.length % 4 === 0) {
		return "base64";
	}

	return "raw";
}

function decodeBase64(encoded) {
	const bin_string = atob(encoded);
	const bytes = Uint8Array.from(bin_string, (char) => char.codePointAt(0));
	return new TextDecoder().decode(bytes);
}

async function processSource(source_attr) {
	let source = source_attr || "";
	const source_type = detectSourceType(source);

	if (source_type === "url") {
		const res = await fetch(source);
		source = res.ok ? await res.text() : "// Failed to fetch: " + source;
	} else if (source_type === "base64") {
		try {
			source = decodeBase64(source);
		} catch (error) {
			console.warn("Base64 decode failed, treating as raw source");
		}
	}

	return source;
}

const CodeEditor = registerCustomTag("code-editor", {
	attrs: ["source"],

	async onconnected() {
		const source_attr = this.getAttribute("source") || "";
		const source = await processSource(source_attr);
		const language = this.getAttribute("language") || "plaintext";
		const theme = this.getAttribute("theme") || "dark";

		this.value = source;

		this.editor = createEditor({
			host: this,
			language,
			source,
			theme,
			onChange: (new_value) => {
				this.value = new_value;
				this.dispatchEvent(new CustomEvent("change"));
			},
		});
	},

	async onattributechanged(name, old_value, new_value) {
		if (name === "source" && this.editor && old_value !== new_value) {
			const source = await processSource(new_value || "");
			this.value = source;
			updateEditorContent(this.editor, source);
		}
	},

	ondisconnected() {
		if (this.editor) {
			this.editor.destroy();
		}
	},
});

export default CodeEditor;
