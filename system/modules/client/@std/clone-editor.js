import { parseTagArgs } from "ima";
import { useStyledTags } from "ima-utils";
import { css, finish } from "utils";

const $ = useStyledTags();
const CodeEditor = await importCodeEditor();
const parser = new DOMParser();

//
// State
//

let initial_modules = [];
let current_module_tab = null;
let doc_url = "";
let doc_clone = null;
let preview_ref = { current: null };
let preview_html = null;
let preview_html_blob_url = null;

//
// Main Component
//

export async function CloneEditor(document_url) {
	doc_url = document_url;

	//
	// Process incoming url prop
	//

	if (!doc_url) {
		return FileDropArea();
	} else {
		const res = await fetch(doc_url);
		if (!res.ok) console.error("Unable to fetch doc_url", doc_url, res);

		doc_clone = parser.parseFromString(await res.text(), "text/html");

		initial_modules =
			doc_url === location.href
				? BlobLoader.getAllModules()
				: await extractModulesFromDocument(doc_clone);

		updatePreviewHtml();

		current_module_tab = "preview";
	}

	return $.div(
		{
			id: "the-clone-editor",
			"no-export": "", // Makes BlobLoader.saveAsHTMLFile() skip this element.
			styles: css`
				& {
					position: fixed;
					z-index: 9999;
					left: 0;
					top: 0;
					width: 100vw;
					height: 100vh;
					display: flex;
					background: black;
					color: rgba(255, 255, 255, 0.9);
					font-size: var(--code-editor-font-size);
					font-family: var(--code-editor-font-family);
				}
			`,
		},
		$.div(
			{
				style: `max-width: 240px;`,
				styles: css`
					& {
						width: fit-content;
						padding-right: 24px;
						height: 100%;
						display: flex;
						overflow: auto;
					}
				`,
			},
			$.div(
				{
					styles: css`
						& {
							width: fit-content;
							height: fit-content;
							display: flex;
							flex-direction: column;
							overflow: auto;
							padding-left: 4px;
						}
					`,
				},
				$.div(
					{
						styles: css`
							& {
								height: 32px;
								display: flex;
								align-items: center;
								opacity: 0.3;
								padding: 0 8px;
								text-transform: uppercase;
							}
						`,
					},
					"clone editor v0.0.0",
				),
				PreviewTabButton(),
				DocumentTabButton(),
				// SyncTabButton(),
				...ModuleSection("scripts", "scripts"),
				...ModuleSection("styles", "styles"),
				...ModuleSection("media", "media"),
			),
		),
		$.div({
			styles: css`
				& {
					position: relative;
					width: 4px;
					height: 100%;
				}
			`,
		}),
		PreviewPanel(),
		DocumentPanel(),
		// SyncPanel(),
		...initial_modules.scripts.map((mod) => EditorPanel("scripts", mod)),
		...initial_modules.styles.map((mod) => EditorPanel("styles", mod)),
		...initial_modules.media.map((mod) => EditorPanel("media", mod)),
	);
}

//
// Components
//

function FileDropArea() {
	return $.div(
		{
			tabindex: "0",
			styles: css`
				& {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100vh;
					background: black;
					color: white;
					font-size: var(--code-editor-font-size);
					font-family: var(--code-editor-font-family);
					transition: background 0.2s;
					outline: none;
					gap: 8px;
					user-select: none;
				}

				&[dragging="true"] {
					background: #101010;
				}
			`,
			ondragover(event) {
				console.log("test");
				event.preventDefault();
				this.setAttribute("dragging", "true");
			},
			ondragleave(event) {
				event.preventDefault();
				this.removeAttribute("dragging");
			},
			ondrop(event) {
				event.preventDefault();
				this.removeAttribute("dragging");

				const files = event.dataTransfer.files;
				if (files.length === 0) return;

				const file = files[0];
				if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
					console.error("Only HTML files are supported");
					return;
				}

				const reader = new FileReader();

				reader.onload = async (event) => {
					const html_content = event.target.result;

					// Create blob URL for the file
					const blob = new Blob([html_content], { type: "text/html" });
					const url = URL.createObjectURL(blob);
					document.body.replaceChildren(await CloneEditor(url));
				};

				reader.readAsText(file);
			},
			async onpaste(event) {
				event.preventDefault();
				const pasted_url = event.clipboardData.getData("text").trim();
				if (pasted_url) {
					document.body.replaceChildren(await CloneEditor(pasted_url));
				}
			},
		},
		"Drop HTML file",
		Button(
			{
				onclick() {
					let file_input = $.input({
						type: "file",
						accept: ".html,.htm",
						async onchange(event) {
							const files = event.target.files;
							if (files.length === 0) return;

							const file = files[0];
							if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
								console.error("Only HTML files are supported");
								return;
							}

							const reader = new FileReader();

							reader.onload = async (event) => {
								const html_content = event.target.result;

								const blob = new Blob([html_content], { type: "text/html" });
								const url = URL.createObjectURL(blob);
								document.body.replaceChildren(await CloneEditor(url));
							};

							reader.readAsText(file);
							file_input.remove();
						},
					});

					file_input.click();
				},
			},
			"or select file",
		),
	);
}

function ModuleSection(type, label) {
	const modules = initial_modules[type];

	return [
		$.div(
			{
				styles: css`
					& {
						opacity: 0.3;
						text-transform: uppercase;
						padding: 8px 4px;
						margin-top: 12px;
					}
				`,
			},
			label,
		),
		modules.length === 0
			? $.div(
					{
						styles: css`
							& {
								opacity: 0.2;
								padding: 8px 4px;
							}
						`,
					},
					`No ${label} found`,
				)
			: null,
		...modules.map((mod) => ModuleTabButton(type, mod)),
	];
}

function ModuleTabButton(mod_type, mod) {
	const color = getFileSizeColor(mod.size_bytes);

	return $.button(
		{
			onclick() {
				current_module_tab = `${mod_type}.${mod.name}`;
			},
			generated: mod.metadata && mod.metadata.generated ? true : false,
			selected: () => current_module_tab === `${mod_type}.${mod.name}`,
			styles: css`
				& {
					width: 100%;
					white-space: nowrap;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 4px 8px;
					gap: 4px;
				}

				&:hover {
					background: rgba(255, 255, 255, 0.1);
				}

				&[selected="true"] {
					background: rgba(255, 255, 255, 0.15);
				}

				&[generated="true"] {
					opacity: 0.5;
					font-style: italic;
				}
			`,
		},
		$.span(
			{
				title: color !== "inherit" ? `Module size is${formatFileSize(mod.size_bytes)}` : null,
			},
			mod.name,
		),
		color !== "inherit"
			? $.icon({
					name: "warning",
					style: css`
						color: ${color};
					`,
				})
			: null,
	);
}

function Button(...args) {
	const { props, children, ref } = parseTagArgs(args);
	return $.button(
		{
			ref,
			styles: css`
				& {
					width: fit-content;
					white-space: nowrap;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 4px 8px;
					gap: 4px;
					background: rgba(255, 255, 255, 0.15);
				}

				&:hover {
					background: rgba(255, 255, 255, 0.125);
				}

				&:active {
					background: rgba(255, 255, 255, 0.1);
				}

				& icon {
					font-size: 1.2em;
				}
			`,
			...props,
		},
		...children,
	);
}

function PreviewTabButton() {
	return $.button(
		{
			onclick() {
				current_module_tab = "preview";

				if (doc_clone && preview_ref.current) {
					updatePreviewHtml();
					preview_ref.current.removeAttribute("src");
					preview_ref.current.srcdoc = preview_html;
				}
			},
			selected: () => current_module_tab === "preview",
			styles: css`
				& {
					width: 100%;
					white-space: nowrap;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 4px 8px;
					gap: 4px;
				}

				&:hover {
					background: rgba(255, 255, 255, 0.1);
				}

				&[selected="true"] {
					background: rgba(255, 255, 255, 0.15);
				}

				& icon {
					font-size: 1.2em;
				}
			`,
		},
		"preview",
	);
}

function DocumentTabButton() {
	return $.button(
		{
			onclick() {
				current_module_tab = "document";

				if (doc_clone) {
					// Revoke existing blob URL if it exists
					if (preview_html_blob_url) {
						URL.revokeObjectURL(preview_html_blob_url);
					}

					// Generate new HTML content
					preview_html = "<!DOCTYPE html>\n" + doc_clone.documentElement.outerHTML;

					// Create new blob URL
					const blob = new Blob([preview_html], { type: "text/html" });
					preview_html_blob_url = URL.createObjectURL(blob);
				}
			},
			selected: () => current_module_tab === "document",
			styles: css`
				& {
					width: 100%;
					white-space: nowrap;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 4px 8px;
					gap: 4px;
				}

				&:hover {
					background: rgba(255, 255, 255, 0.1);
				}

				&[selected="true"] {
					background: rgba(255, 255, 255, 0.15);
				}

				& icon {
					font-size: 1.2em;
				}
			`,
		},
		"document",
	);
}

function SyncTabButton() {
	return $.button(
		{
			onclick() {
				current_module_tab = "sync";
			},
			selected: () => current_module_tab === "sync",
			styles: css`
				& {
					width: 100%;
					white-space: nowrap;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 4px 8px;
					gap: 4px;
				}

				&:hover {
					background: rgba(255, 255, 255, 0.1);
				}

				&[selected="true"] {
					background: rgba(255, 255, 255, 0.15);
				}

				& icon {
					font-size: 1.2em;
				}
			`,
		},
		"sync",
	);
}

function EditorPanel(mod_type, mod) {
	return $.div(
		{
			style: () => css`
				display: ${current_module_tab === `${mod_type}.${mod.name}` ? "block" : "none"};

				--titlebar-height: 32px;
			`,
			styles: css`
				& {
					position: relative;
					width: 100%;
					height: 100%;
					flex: 1;
					overflow: hidden;
					background: black;
					display: flex;
					flex-direction: column;
				}
			`,
		},
		$.div(
			{
				style: css`
					color: ${getFileSizeColor(mod.size_bytes)};
				`,
				styles: css`
					& {
						position: relative;
						width: 100%;
						height: var(--titlebar-height);
						background: black;
						z-index: 1;
						display: flex;
						align-items: center;
					}
				`,
			},
			mod.name,
			getExtensionDisplay(mod, mod_type),
			formatFileSize(mod.size_bytes),
		),
		CodeEditor({
			language: getLanguageFromModuleType(mod_type),
			source: mod.untransformed_source || mod.blob_url,
			onchange() {
				if (mod.metadata && mod.metadata.generated) return;
				updateDocCloneModule(mod_type, mod.name, this.value);
			},
			style: css`
				position: absolute;
				left: 0;
				top: var(--titlebar-height);
				width: 100%;
				height: calc(100% - var(--titlebar-height));
				border-radius: 6px;
				overflow: hidden;
				border: 1px solid rgba(255, 255, 255, 0.1);
			`,
		}),
	);
}

function PreviewPanel() {
	return $.div(
		{
			style: () => css`
				display: ${current_module_tab === "preview" ? "block" : "none"};

				--titlebar-height: 32px;
			`,
			styles: css`
				& {
					position: relative;
					width: 100%;
					height: 100%;
					flex: 1;
					overflow: hidden;
					background: black;
					display: flex;
					flex-direction: column;
				}
			`,
		},
		$.div(
			{
				styles: css`
					& {
						position: relative;
						width: 100%;
						height: var(--titlebar-height);
						background: black;
						z-index: 1;
						display: flex;
						align-items: center;
						gap: 2px;
						padding-right: 2px;
					}

					& a {
						display: flex;
						align-items: center;
						gap: 4px;
					}

					& a:hover {
						text-decoration: underline;
					}

					& icon {
						font-size: 16px;
					}
				`,
			},
			Button(
				{
					onclick() {
						const new_window = window.open("", "_blank");
						new_window.document.open();
						new_window.document.write(preview_html);
						new_window.document.close();
					},
				},
				"preview in window",
			),
			Button(
				{
					onclick() {
						if (preview_ref.current)
							preview_ref.current.contentWindow.BlobLoader.saveAsHtmlFile(true);
					},
				},
				"download clone",
			),
			$.div({
				style: "width: 100%; flex-grow: 1;",
			}),
			Button(
				{
					onclick() {},
				},
				"split view",
			),
		),
		$.iframe({
			ref: preview_ref,
			src: doc_url,
			style: css`
				position: absolute;
				left: 0;
				top: var(--titlebar-height);
				width: 100%;
				height: calc(100% - var(--titlebar-height));
				border-radius: 6px;
				overflow: hidden;
				border: 1px solid rgba(255, 255, 255, 0.1);
			`,
		}),
	);
}

function DocumentPanel() {
	return $.div(
		{
			style: () => css`
				display: ${current_module_tab === "document" ? "block" : "none"};

				--titlebar-height: 32px;
			`,
			styles: css`
				& {
					position: relative;
					width: 100%;
					height: 100%;
					flex: 1;
					overflow: hidden;
					background: black;
					display: flex;
					flex-direction: column;
				}
			`,
		},
		$.div(
			{
				styles: css`
					& {
						position: relative;
						width: 100%;
						height: var(--titlebar-height);
						background: black;
						z-index: 1;
						display: flex;
						align-items: center;
						gap: 4px;
					}
				`,
			},
			"document",
		),
		CodeEditor({
			language: "html",
			source: () => preview_html_blob_url,
			style: css`
				position: absolute;
				left: 0;
				top: var(--titlebar-height);
				width: 100%;
				height: calc(100% - var(--titlebar-height));
				border-radius: 6px;
				overflow: hidden;
				border: 1px solid rgba(255, 255, 255, 0.1);
			`,
		}),
	);
}

function SyncPanel() {
	return $.div(
		{
			style: () => css`
				display: ${current_module_tab === "sync" ? "block" : "none"};

				--titlebar-height: 32px;
			`,
			styles: css`
				& {
					position: relative;
					width: 100%;
					height: 100%;
					flex: 1;
					overflow: hidden;
					background: black;
					display: flex;
					flex-direction: column;
				}
			`,
		},
		$.div(
			{
				styles: css`
					& {
						position: relative;
						width: 100%;
						height: var(--titlebar-height);
						background: black;
						z-index: 1;
						display: flex;
						align-items: center;
						gap: 4px;
					}
				`,
			},
			"sync",
		),
		$.div({
			style: css`
				position: absolute;
				left: 0;
				top: var(--titlebar-height);
				width: 100%;
				height: calc(100% - var(--titlebar-height));
				border-radius: 6px;
				overflow: hidden;
				border: 1px solid rgba(255, 255, 255, 0.1);
			`,
		}),
	);
}

//
// Utils
//

async function importCodeEditor() {
	try {
		const module = await import("ui/code-editor");
		return module.default;
	} catch (error) {
		console.warn(`Failed to import "ui/code-editor"`, error);
		return $.textarea;
	}
}

function getLanguageFromModuleType(type) {
	switch (type) {
		case "scripts":
			return "javascript";
		case "styles":
			return "css";
		default:
			return "plaintext";
	}
}

function getFileSizeColor(bytes) {
	const kb = bytes / 1024;

	if (kb > 1023) return "red";
	if (kb > 200) return "yellow";
	return "inherit";
}

function formatFileSize(bytes) {
	const kb = bytes / 1024;

	if (kb < 1024) {
		return ` ${kb.toFixed(2)} kb`;
	}

	const mb = kb / 1024;
	return ` ${mb.toFixed(2)} mb`;
}

function getExtensionDisplay(mod, mod_type) {
	const generated = mod.metadata && mod.metadata.generated ? "generated " : "";

	if (mod_type === "scripts") {
		return ` [${generated}script]`;
	}

	if (mod_type === "styles") {
		return ` [${generated}styles]`;
	}

	if (mod_type === "media" && mod.metadata.extension) {
		return ` [${generated}${mod.metadata.extension}]`;
	}

	return ` [${generated}data]`;
}

async function extractModulesFromDocument(doc) {
	const scripts = [];
	const styles = [];
	const media = [];

	const known_attrs = {
		shared: ["name", "remote", "disabled", "blob", "nodownload", "nocache"],
		script: ["type", "encode", "autorun"],
		style: ["blob-module"],
		media: ["href", "type", "source"],
	};

	function extractMetadata(element, type) {
		const known = new Set([...known_attrs.shared, ...(known_attrs[type] || [])]);
		const metadata = {};

		Array.from(element.attributes).forEach((attr) => {
			if (!known.has(attr.name)) {
				metadata[attr.name] = attr.value;
			}
		});

		return metadata;
	}

	function decodeFromBase64(encoded) {
		const bin_string = atob(encoded);
		const bytes = Uint8Array.from(bin_string, (char) => char.codePointAt(0));
		return new TextDecoder().decode(bytes);
	}

	async function blobToDataUrl(blob) {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.readAsDataURL(blob);
		});
	}

	//
	// Resolve script content: inline -> cache -> remote
	//
	async function resolveScriptContent(script) {
		const name = script.getAttribute("name");
		const remote_url = script.getAttribute("remote");
		const encoded = script.hasAttribute("encode");
		const no_cache = script.hasAttribute("nocache");
		const inline_content = script.textContent.trim();

		// 1. Check inline content
		if (inline_content) {
			let content = inline_content;
			if (encoded) {
				try {
					content = decodeFromBase64(inline_content);
				} catch (error) {
					console.warn(`Failed to decode base64 for "${name}"`, error);
				}
			}
			return { content, source: "inline" };
		}

		// 2. Check cache
		if (!no_cache) {
			try {
				const cached = await BlobLoader.getCachedModule(name, "script");
				if (cached && cached.content) {
					return { content: cached.content, source: "cache" };
				}
			} catch (error) {
				console.warn(`Cache lookup failed for script "${name}"`, error);
			}
		}

		// 3. Fetch from remote
		if (remote_url) {
			try {
				const response = await fetch(remote_url);
				if (response.ok) {
					const content = await response.text();
					return { content, source: "remote" };
				}
			} catch (error) {
				console.warn(`Failed to fetch remote script "${name}"`, error);
			}
		}

		return { content: null, source: null };
	}

	//
	// Resolve style content: inline -> cache -> remote
	//
	async function resolveStyleContent(style) {
		const name = style.getAttribute("name");
		const remote_url = style.getAttribute("remote");
		const no_cache = style.hasAttribute("nocache");
		const inline_content = style.textContent.trim();

		// 1. Check inline content
		if (inline_content) {
			return { content: inline_content, source: "inline" };
		}

		// 2. Check cache
		if (!no_cache) {
			try {
				const cached = await BlobLoader.getCachedModule(name, "style");
				if (cached && cached.content) {
					return { content: cached.content, source: "cache" };
				}
			} catch (error) {
				console.warn(`Cache lookup failed for style "${name}"`, error);
			}
		}

		// 3. Fetch from remote
		if (remote_url) {
			try {
				const response = await fetch(remote_url);
				if (response.ok) {
					const content = await response.text();
					return { content, source: "remote" };
				}
			} catch (error) {
				console.warn(`Failed to fetch remote style "${name}"`, error);
			}
		}

		return { content: null, source: null };
	}

	//
	// Resolve media content: inline -> cache -> remote
	// Returns blob and data_url
	//
	async function resolveMediaContent(element, is_link = false) {
		const name = element.getAttribute("name");
		const remote_url = element.getAttribute("remote");
		const no_cache = element.hasAttribute("nocache");

		let inline_source = null;
		if (is_link) {
			inline_source = element.getAttribute("source");
		} else {
			// For image/font style tags, extract data URL from CSS
			const inline_css = element.textContent.trim();
			if (inline_css) {
				const data_url_match = inline_css.match(/url\(['"]?(data:[^'")]+)['"]?\)/);
				if (data_url_match) {
					inline_source = data_url_match[1];
				}
			}
		}

		// 1. Check inline content
		if (inline_source) {
			if (inline_source.startsWith("data:")) {
				try {
					const response = await fetch(inline_source);
					const blob = await response.blob();
					return { blob, data_url: inline_source, source: "inline" };
				} catch (error) {
					console.warn(`Failed to parse inline data URL for "${name}"`, error);
				}
			} else {
				// Plain text content (for link source attribute)
				const blob = new Blob([inline_source], { type: "text/plain" });
				const data_url = await blobToDataUrl(blob);
				return { blob, data_url, source: "inline" };
			}
		}

		// 2. Check cache
		if (!no_cache) {
			try {
				const cached = await BlobLoader.getCachedModule(name, "media");
				if (cached && cached.blob) {
					const data_url = await blobToDataUrl(cached.blob);
					return { blob: cached.blob, data_url, source: "cache" };
				}
			} catch (error) {
				console.warn(`Cache lookup failed for media "${name}"`, error);
			}
		}

		// 3. Fetch from remote
		if (remote_url) {
			try {
				const response = await fetch(remote_url);
				if (response.ok) {
					const blob = await response.blob();
					const data_url = await blobToDataUrl(blob);
					return { blob, data_url, source: "remote" };
				}
			} catch (error) {
				console.warn(`Failed to fetch remote media "${name}"`, error);
			}
		}

		return { blob: null, data_url: null, source: null };
	}

	//
	// Process script modules
	//
	const script_tags = doc.querySelectorAll('script[type="blob-module"]');
	for (const script of script_tags) {
		const name = script.getAttribute("name");
		if (!name) continue;

		const is_disabled = script.hasAttribute("disabled");
		if (is_disabled) continue;

		const remote_url = script.getAttribute("remote");
		const encoded = script.hasAttribute("encode");
		const autorun = script.hasAttribute("autorun");
		const metadata = extractMetadata(script, "script");

		const { content, source } = await resolveScriptContent(script);

		if (!content) continue;

		const blob = new Blob([content], { type: "text/javascript" });
		const blob_url = URL.createObjectURL(blob);

		scripts.push({
			name,
			remote_url: remote_url || null,
			size_bytes: blob.size,
			blob_url,
			is_disabled: false,
			encoded,
			autorun,
			metadata,
			untransformed_source: content,
			resolved_from: source,
		});
	}

	//
	// Process CSS style modules
	//
	const css_tags = doc.querySelectorAll('style[blob-module="css"]');
	for (const style of css_tags) {
		const name = style.getAttribute("name");
		if (!name) continue;

		const is_disabled = style.hasAttribute("disabled");
		if (is_disabled) continue;

		const remote_url = style.getAttribute("remote");
		const metadata = extractMetadata(style, "style");

		const { content, source } = await resolveStyleContent(style);

		if (!content) continue;

		const blob = new Blob([content], { type: "text/css" });
		const blob_url = URL.createObjectURL(blob);

		styles.push({
			name,
			remote_url: remote_url || null,
			size_bytes: blob.size,
			blob_url,
			metadata,
			untransformed_source: content,
			resolved_from: source,
		});
	}

	//
	// Process image style modules
	//
	const image_tags = doc.querySelectorAll('style[blob-module="image"]');
	for (const style of image_tags) {
		const name = style.getAttribute("name");
		if (!name) continue;

		const is_disabled = style.hasAttribute("disabled");
		if (is_disabled) continue;

		const remote_url = style.getAttribute("remote");
		const metadata = extractMetadata(style, "style");

		const { blob, data_url, source } = await resolveMediaContent(style, false);

		if (!data_url) continue;

		// Generate CSS content
		const css_content = `:root {\n\t--BM-${name.replaceAll(" ", "-")}: url('${data_url}');\n}`;

		// Detect extension
		let extension = null;
		if (remote_url) {
			const ext_match = remote_url.match(/\.([^./?#]+)(?:[?#]|$)/);
			if (ext_match) extension = ext_match[1];
		}
		if (!extension && data_url) {
			const mime_match = data_url.match(/^data:image\/([^;,]+)/);
			if (mime_match) {
				const mime_to_ext = {
					jpeg: "jpg",
					png: "png",
					gif: "gif",
					"svg+xml": "svg",
					webp: "webp",
				};
				extension = mime_to_ext[mime_match[1]] || mime_match[1];
			}
		}

		if (extension) metadata.extension = extension;
		metadata.generated = name;

		const style_blob = new Blob([css_content], { type: "text/css" });
		const style_blob_url = URL.createObjectURL(style_blob);

		styles.push({
			name,
			remote_url: remote_url || null,
			size_bytes: style_blob.size,
			blob_url: style_blob_url,
			metadata,
			untransformed_source: css_content,
			resolved_from: source,
		});

		// Also register as media
		if (blob) {
			const media_blob_url = URL.createObjectURL(blob);
			const media_metadata = { "parent-module": name };
			if (extension) media_metadata.extension = extension;

			media.push({
				name,
				remote_url: remote_url || null,
				size_bytes: blob.size,
				blob_url: media_blob_url,
				metadata: media_metadata,
				resolved_from: source,
			});
		}
	}

	//
	// Process font style modules
	//
	const font_tags = doc.querySelectorAll('style[blob-module="font"]');
	for (const style of font_tags) {
		const name = style.getAttribute("name");
		if (!name) continue;

		const is_disabled = style.hasAttribute("disabled");
		if (is_disabled) continue;

		const remote_url = style.getAttribute("remote");
		const metadata = extractMetadata(style, "style");

		const { blob, data_url, source } = await resolveMediaContent(style, false);

		if (!data_url) continue;

		// Generate @font-face CSS
		const css_content = `@font-face {\n\tfont-family: '${name}';\n\tsrc: url('${data_url}');\n\tfont-weight: 100 700;\n}`;

		// Detect extension
		let extension = null;
		if (remote_url) {
			const ext_match = remote_url.match(/\.([^./?#]+)(?:[?#]|$)/);
			if (ext_match) extension = ext_match[1];
		}
		if (!extension && data_url) {
			const mime_match = data_url.match(/^data:(?:font|application\/(?:x-)?font)-([^;,]+)/);
			if (mime_match) extension = mime_match[1];
		}

		if (extension) metadata.extension = extension;
		metadata.generated = name;

		const style_blob = new Blob([css_content], { type: "text/css" });
		const style_blob_url = URL.createObjectURL(style_blob);

		styles.push({
			name,
			remote_url: remote_url || null,
			size_bytes: style_blob.size,
			blob_url: style_blob_url,
			metadata,
			untransformed_source: css_content,
			resolved_from: source,
		});

		// Also register as media
		if (blob) {
			const media_blob_url = URL.createObjectURL(blob);
			const media_metadata = { "parent-module": name };
			if (extension) media_metadata.extension = extension;

			media.push({
				name,
				remote_url: remote_url || null,
				size_bytes: blob.size,
				blob_url: media_blob_url,
				metadata: media_metadata,
				resolved_from: source,
			});
		}
	}

	//
	// Process media link modules
	//
	const media_tags = doc.querySelectorAll('link[type="blob-module"]');
	for (const link of media_tags) {
		const name = link.getAttribute("name");
		if (!name) continue;

		const is_disabled = link.hasAttribute("disabled");
		if (is_disabled) continue;

		const remote_url = link.getAttribute("remote");
		const metadata = extractMetadata(link, "media");

		const { blob, data_url, source } = await resolveMediaContent(link, true);

		if (!blob) continue;

		const blob_url = URL.createObjectURL(blob);

		// Detect extension
		let extension = null;
		if (remote_url) {
			const ext_match = remote_url.match(/\.([^./?#]+)(?:[?#]|$)/);
			if (ext_match) extension = ext_match[1];
		}
		if (!extension && blob.type) {
			const mime_to_ext = {
				"video/mp4": "mp4",
				"video/webm": "webm",
				"audio/mpeg": "mp3",
				"audio/wav": "wav",
				"text/plain": "txt",
			};
			extension = mime_to_ext[blob.type] || null;
		}

		if (extension) metadata.extension = extension;

		media.push({
			name,
			remote_url: remote_url || null,
			size_bytes: blob.size,
			blob_url,
			metadata,
			resolved_from: source,
		});
	}

	return { scripts, styles, media };
}

function updateDocCloneModule(mod_type, mod_name, new_content) {
	if (!doc_clone) return;

	let element = null;

	if (mod_type === "scripts") {
		element = doc_clone.querySelector(`script[type="blob-module"][name="${mod_name}"]`);
		if (element) {
			element.textContent = new_content;
		}
	} else if (mod_type === "styles") {
		element = doc_clone.querySelector(`style[blob-module="css"][name="${mod_name}"]`);
		if (element) {
			element.textContent = new_content;
		}
	} else if (mod_type === "media") {
		element = doc_clone.querySelector(`link[type="blob-module"][name="${mod_name}"]`);
		if (element) {
			const bytes = new TextEncoder().encode(new_content);
			const bin_string = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
			element.setAttribute("source", btoa(bin_string));
			element.setAttribute("encode", "");
		}
	}
}

function updatePreviewHtml() {
	if (!doc_clone) return;

	// Revoke existing blob URL if it exists
	if (preview_html_blob_url) {
		URL.revokeObjectURL(preview_html_blob_url);
	}

	// Generate new HTML content
	preview_html = "<!DOCTYPE html>\n" + doc_clone.documentElement.outerHTML;

	// Create new blob URL
	const blob = new Blob([preview_html], { type: "text/html" });

	preview_html_blob_url = URL.createObjectURL(blob);
}
