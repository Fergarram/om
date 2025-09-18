import { useTags } from "ima";
import { css, finish, useShadowStyles } from "utils";
import { Codepad } from "codepad";

const { div, pre, button } = useTags();

let module_editor_root = null;

export function getModuleEditorRoot() {
	return module_editor_root;
}

export async function showModuleEditor() {
	let host = document.getElementById("module-editor-host");

	if (!host) {
		host = div({
			id: "module-editor-host",
		});

		document.body.appendChild(host);
	}

	await finish();

	// Create shadow DOM
	module_editor_root = host.attachShadow({ mode: "open" });

	// Load styles to shadow DOM
	const base_styles = document.querySelector('style[name="base"]')?.textContent || "";
	useShadowStyles(module_editor_root, base_styles, "base");
	useShadowStyles(module_editor_root, theme, "theme");

	// Mount the module editor
	module_editor_root.appendChild(await ModuleEditor());
}

async function ModuleEditor() {
	const blob_module_loader_script = document.getElementById("blob-module-loader");
	const loader_blob = new Blob([blob_module_loader_script.textContent], { type: "text/javascript" });
	const modules = [
		{
			name: "blob-module-loader",
			module_name: "blob-module-loader",
			blob_url: blob_module_loader_script ? URL.createObjectURL(loader_blob) : "",
			remote_url: null,
			src_bytes: blob_module_loader_script ? loader_blob.size : 0,
			is_disabled: false,
			is_visible: true,
		},
		...Array.from(window.__blob_module_map__.entries())
			.map(([name, module], index) => {
				return {
					name,
					...module,
					is_visible: true,
				};
			})
			.filter((module) => !module.is_disabled),
	];

	console.log(modules);

	let active_tab = "main";
	let code_panels = [];

	for (let module of modules) {
		code_panels.push(await Codepad({ module, style: () => `display: ${active_tab === module.name ? "block" : "none"}` }));
	}

	return div(
		{
			id: "module-editor",
		},
		div(
			{
				id: "sidebar",
			},
			...modules.map((module) => {
				return button(
					{
						class: "sidebar-item",
						"data-active": () => active_tab === module.name,
						onclick() {
							active_tab = module.name;
						},
					},
					module.name,
				);
			}),
		),
		div(
			{
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
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 22px;
		-webkit-font-smoothing: none;
	}

	#sidebar {
		width: 200px
		resize: horizontal;
		will-change: width;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-family: var(--font-monospace);
		font-size: 11px;
		line-height: 1.25;
		padding: 11px;
	}

	#sidebar .sidebar-item {
		color: white;
	}

	#sidebar .sidebar-item:hover {
		background: white;
		color: black;
	}

	#sidebar .sidebar-item[panel-hovered="true"] {
		background: var(--color-highlight);
		color: black;
	}

	#sidebar .sidebar-item[data-active="true"] {
		background: var(--color-highlight);
		color: black;
	}

	#main-panel {
		width: 100%;
		height: 100%;
		font-family: var(--font-monospace);
		font-size: 11px;
		line-height: 1.25;
		overflow: scroll;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
`;
