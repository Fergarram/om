import { useTags } from "ima";
import { registerCustomTag } from "ima-utils";
import { createEditor } from "codemirror";

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

const CodeEditor = registerCustomTag("code-editor", {
	async onconnected() {
		let source = this.getAttribute("source") || "";
		const source_type = this.getAttribute("source-type") || detectSourceType(source);

		if (source_type === "url") {
			const res = await fetch(source);
			source = res.ok ? await res.text() : "// Failed to fetch: " + source;
		} else if (source_type === "base64") {
			try {
				source = decodeBase64(source);
			} catch (error) {
				// Failed to decode, treat as raw
				console.warn("Base64 decode failed, treating as raw source");
			}
		}
		// else: raw source, use as-is

		const language = this.getAttribute("language") || "plaintext";
		const theme = this.getAttribute("theme") || "dark";

		this.editor = createEditor({
			host: this,
			language,
			source,
			theme,
			onInput: (new_value) => {
				this.dispatchEvent(new CustomEvent("input"));
				this.value = new_value;
			},
		});
	},
});

export default CodeEditor;
