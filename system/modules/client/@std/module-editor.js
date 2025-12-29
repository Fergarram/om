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

function getLanguageFromModuleType() {
	switch (mod_type) {
		case "scripts":
			return "javascript";
		case "styles":
			return "css";
		default:
			return "plaintext";
	}
}

//
// State
//

let current_module_tab = null;
let mod_type = "scripts";
let modules = BlobLoader.getAllModules();
console.log(modules);

//
// Components
//

function ModuleTabButton(mod_type, mod) {
	return $.button(
		{
			onclick() {
				current_module_tab = `${mod_type}.${mod.module_name}`;
			},
			selected: () => current_module_tab === `${mod_type}.${mod.module_name}`,
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
		mod.module_name,
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
					}
				`,
			},
			...modules[mod_type].map((mod) => ModuleTabButton(mod_type, mod)),
		),
		$.div({
			styles: css`
				& {
					position: relative;
					width: 1px;
					height: 100%;
					background: rgba(255, 255, 255, 0.1);
				}
			`,
		}),
		$.div(
			{
				styles: css`
					& {
						width: 100%;
						height: 100%;
						flex: 1;
						overflow: hidden;
						background: black;
					}
				`,
			},
			...modules[mod_type].map((mod) =>
				CodeEditor({
					language: getLanguageFromModuleType(),
					source: mod.blob_url,
					style: () => `
						display: ${current_module_tab === `${mod_type}.${mod.module_name}` ? "block" : "none"};
						width: 100%;
						height: 100%;
					`,
				}),
			),
		),
	);

	document.body.appendChild(root_el);
}
