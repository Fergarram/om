import { useStyledTags } from "ima-utils";
import { css } from "utils";

const $ = useStyledTags();
const CodeEditor = await importCodeEditor();

//
// State
//

let current_module_tab = null;
let modules = BlobLoader.getAllModules();
let preview_html = await BlobLoader.getDocumentOuterHtml(true);
let preview_url = URL.createObjectURL(new Blob([preview_html], { type: "text/html" }));

console.log(modules);

//
// Main Component
//

export function openModuleEditor() {
	if (document.getElementById("the-module-editor")) return;

	const root_el = $.div(
		{
			id: "the-module-editor",
			"no-export": "", // Removes from outer HTML when BlobLoader.saveAsHTMLFile is called.
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
				style: `width: 240px;`,
				styles: css`
					& {
						height: 100%;
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
							opacity: 0.3;
							padding: 8px 4px;
							margin-top: 12px;
						}
					`,
				},
				"menu",
			),
			PreviewTabButton(),
			$.div(
				{
					styles: css`
						& {
							opacity: 0.3;
							padding: 8px 4px;
							margin-top: 12px;
						}
					`,
				},
				"scripts",
			),
			modules.scripts.length === 0
				? $.div(
						{
							styles: css`
								& {
									opacity: 0.2;
									padding: 8px 4px;
								}
							`,
						},
						"No scripts found",
					)
				: "",
			...modules.scripts.map((mod) => ModuleTabButton("scripts", mod)),
			$.div(
				{
					styles: css`
						& {
							opacity: 0.3;
							padding: 8px 4px;
							margin-top: 12px;
						}
					`,
				},
				"styles",
			),
			modules.styles.length === 0
				? $.div(
						{
							styles: css`
								& {
									opacity: 0.2;
									padding: 8px 4px;
								}
							`,
						},
						"No styles found",
					)
				: "",
			...modules.styles.map((mod) => ModuleTabButton("styles", mod)),
			$.div(
				{
					styles: css`
						& {
							opacity: 0.3;
							padding: 8px 4px;
							margin-top: 12px;
						}
					`,
				},
				"media",
			),
			modules.media.length === 0
				? $.div(
						{
							styles: css`
								& {
									opacity: 0.2;
									padding: 8px 4px;
								}
							`,
						},
						"No media found",
					)
				: "",
			...modules.media.map((mod) => ModuleTabButton("media", mod)),
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
		...modules.scripts.map((mod) => EditorPanel("scripts", mod)),
		...modules.styles.map((mod) => EditorPanel("styles", mod)),
		...modules.media.map((mod) => EditorPanel("media", mod)),
	);

	document.body.appendChild(root_el);
}

//
// Components
//

function ModuleTabButton(mod_type, mod) {
	const color = getFileSizeColor(mod.src_bytes);

	return $.button(
		{
			onclick() {
				current_module_tab = `${mod_type}.${mod.name}`;
			},
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
			`,
		},
		$.span(
			{
				title: color !== "inherit" ? `Module size is${formatFileSize(mod.src_bytes)}` : null,
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

function PreviewTabButton() {
	return $.button(
		{
			onclick() {
				window.open(preview_url, "_blank");
			},
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

				&:active {
					background: rgba(255, 255, 255, 0.15);
				}

				& icon {
					font-size: 1.2em;
				}
			`,
		},
		"preview",
		$.icon({
			name: "open_in_new",
		}),
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
					color: ${getFileSizeColor(mod.src_bytes)};
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
			mod.metadata.extension
				? ` [${mod.metadata.extension}]`
				: ` [${mod_type === "scripts" ? "js" : mod_type === "styles" ? "css" : "Unknown"}]`,
			formatFileSize(mod.src_bytes),
		),
		CodeEditor({
			language: getLanguageFromModuleType(mod_type),
			source: mod.blob_url,
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
