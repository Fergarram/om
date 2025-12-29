import { useStyledTags } from "ima-utils";
import { css } from "utils";

const $ = useStyledTags();

async function importCodeEditor() {
	try {
		const module = await import("ui/code-editor");
		return module.default;
	} catch (error) {
		console.warn(`Failed to import "ui/code-editor"`, error);
		return $.textarea;
	}
}

const CodeEditor = await importCodeEditor();

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

function formatFileSize(bytes) {
	const kb = bytes / 1024;

	if (kb < 1024) {
		return `${kb.toFixed(2)} kb`;
	}

	const mb = kb / 1024;
	return `${mb.toFixed(2)} mb`;
}

//
// State
//

let current_module_tab = null;
let modules = BlobLoader.getAllModules();
console.log(modules);

//
// Components
//

function ModuleTabButton(mod_type, mod) {
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
					display: flex;
					align-items: center;
					padding: 4px;
				}

				&:hover {
					background: rgba(255, 255, 255, 0.1);
				}

				&[selected="true"] {
					background: rgba(255, 255, 255, 0.15);
				}
			`,
		},
		mod.name,
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
			`${mod.name} [${formatFileSize(mod.src_bytes)}]`,
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
// Main export
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
