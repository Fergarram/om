import { useStyledTags } from "ima-utils";
import { css } from "utils";

const $ = useStyledTags();
const CodeEditor = await importCodeEditor();

//
// State
//

let modules = BlobLoader.getAllModules();
let preview_html = await BlobLoader.getDocumentOuterHtml(true);
let preview_url = URL.createObjectURL(new Blob([preview_html], { type: "text/html" }));
let current_module_tab = `scripts.${modules.scripts[0].name}`;

console.log(modules);

//
// Main Component
//

export function openCloneEditor() {
	if (document.getElementById("the-clone-editor")) return;

	const root_el = $.div(
		{
			id: "the-clone-editor",
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
				SyncTabButton(),
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
								text-transform: uppercase;
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
								text-transform: uppercase;
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
		SyncPanel(),
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

function PreviewTabButton() {
	return $.button(
		{
			onclick() {
				current_module_tab = "preview";
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
		$.a(
			{
				href: preview_url,
				target: "_blank",
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

					&:hover {
						text-decoration: underline;
					}

					& icon {
						font-size: 16px;
					}
				`,
			},
			preview_url,
			$.icon({
				name: "open_in_new",
			}),
		),
		$.iframe({
			src: preview_url,
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
