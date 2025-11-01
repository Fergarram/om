//
// Blob Module Editor
// by fergarram
// 

// Provides an interface to edit available blob modules.

import {
	useTags
} from "@std/ima";
import {
	css,
	finish,
	useShadowStyles
} from "@std/utils";
import {
	Codepad
} from "codepad";

const {
	div,
	pre,
	button
} = useTags();

let module_editor_root = null;
let show_module_editor = false;

export function getModuleEditorRoot() {
	return module_editor_root;
}

export async function showModuleEditor() {
	if (module_editor_root !== null) {
		show_module_editor = !show_module_editor;
		return;
	}

	show_module_editor = true;

	let host = document.getElementById("module-editor-host");

	if (!host) {
		host = div({
			id: "module-editor-host",
		});

		document.body.appendChild(host);
	}

	await finish();

	// Create shadow DOM
	module_editor_root = host.attachShadow({
		mode: "open",
	});

	// Load styles to shadow DOM
	const base_styles = document.querySelector('style[name="base"]')?.textContent || "";
	useShadowStyles(module_editor_root, base_styles, "base");
	useShadowStyles(module_editor_root, theme, "theme");

	// Mount the module editor
	module_editor_root.appendChild(await ModuleEditor());
}

function sortModules(modules) {
	return modules.sort((a, b) => {
		// Disabled modules always last
		if (a.is_disabled && !b.is_disabled) return 1;
		if (!a.is_disabled && b.is_disabled) return -1;

		// module-loader always first (among enabled modules)
		if (a.name === "module-loader") return -1;
		if (b.name === "module-loader") return 1;

		// main always second (among enabled modules)
		if (a.name === "main") return -1;
		if (b.name === "main") return 1;

		// @std/ modules always last (among enabled modules)
		const a_is_std = a.name.startsWith("@std/");
		const b_is_std = b.name.startsWith("@std/");

		if (a_is_std && !b_is_std) return 1;
		if (!a_is_std && b_is_std) return -1;

		// If both are @std/ or both are regular modules, sort alphabetically
		return a.name.localeCompare(b.name);
	});
}

async function ModuleEditor() {
	const blob_module_loader_script = document.getElementById("module-loader");
	const loader_blob = new Blob([blob_module_loader_script.textContent], {
		type: "text/javascript",
	});
	const modules = [{
			name: "module-loader",
			module_name: "module-loader",
			blob_url: blob_module_loader_script ? URL.createObjectURL(loader_blob) : "",
			remote_url: null,
			src_bytes: blob_module_loader_script ? loader_blob.size : 0,
			is_disabled: false,
			is_visible: true,
		},
		...Array.from(window.__blob_module_map__.entries()).map(([name, module], index) => {
			return {
				name,
				...module,
				is_visible: true,
			};
		}),
		// .filter((module) => !module.is_disabled),
	];

	console.log(modules);

	let active_tab = "main";
	let code_panels = [];

	for (let module of modules.filter((module) => !module.is_disabled)) {
		code_panels.push(
			await Codepad({
				module,
				style: () => `display: ${active_tab === module.name ? "block" : "none"}`,
			}),
		);
	}

	return div({
			id: "module-editor",
			style: () => `display: ${show_module_editor ? "flex" : "none"}`,
		},
		div({
				id: "sidebar",
			},
			div({
					id: "corner",
				},
				"modules",
			),
			...sortModules(modules).map((module) => {
				return button({
						class: "sidebar-item",
						disabled: module.is_disabled ? true : null,
						"data-active": () => active_tab === module.name,
						onclick() {
							active_tab = module.name;
						},
					},
					module.name,
				);
			}),
		),
		div({
				id: "main-panel",
			},
			code_panels,
		),
	);
}

const theme = css`
	:host {
		--color-highlight: #aafee7;
	}

	#module-editor {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: #333;
		color: white;
		display: flex;
		-webkit-font-smoothing: ${window.devicePixelRatio > 1 ? "antialiased" : "none"};
		z-index: 99999;
		padding: 10px;
	}

	#corner {
		display: none;
		color: transparent;
		background: transparent;
	}

	#sidebar {
		width: fit-content;
		max-width: 200px;
		flex-shrink: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 4px;
		font-family: var(--font-monospace);
		font-size: 11px;
		line-height: 1.25;
		background: #333;
		overflow: scroll;
	}

	#sidebar::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	#sidebar::-webkit-scrollbar-track {
		background: #333;
	}

	#sidebar::-webkit-scrollbar-thumb {
		background: #444444;
	}

	#sidebar::-webkit-scrollbar-thumb:hover {
		background: #505050;
	}

	#sidebar::-webkit-scrollbar-corner {
		background: #333;
	}

	#sidebar .sidebar-item {
		color: white;
	}

	#sidebar .sidebar-item[disabled] {
		opacity: 0.25;
	}

	#sidebar .sidebar-item:hover {
		background: #cacaca;
		color: black;
	}

	#sidebar .sidebar-item[data-active="true"] {
		background: #cacaca;
		color: black;
	}

	#main-panel {
		position: relative;
		width: 100%;
		flex-grow: 1;
		height: 100%;
		font-family: var(--font-monospace);
		font-size: 11px;
		line-height: 1.25;
		display: flex;
		flex-direction: column;
		gap: 22px;
		overflow: hidden;
	}
`;