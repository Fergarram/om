import { useTags } from "ima";
import { css, finish, useShadowStyles } from "utils";
import { Codepad } from "codepad";

const { div, pre, button } = useTags();

export async function showModuleEditor() {
	let host = document.getElementById("module-editor-host");

	if (!host) {
		host = div({
			id: "module-editor-host",
		});
	}

	document.body.appendChild(host);

	await finish();

	const shadow_root = host.attachShadow({ mode: "open" });

	const base_styles = document.querySelector('style[name="base"]')?.textContent || "";

	useShadowStyles(shadow_root, base_styles, "base");
	useShadowStyles(shadow_root, theme, "theme");

	shadow_root.appendChild(await Layout(shadow_root));
}

async function Layout(root) {
	const modules = Array.from(window.__blob_module_map__.entries())
		.map(([name, module], index) => {
			return {
				name,
				...module,
				// is_visible: index === 0,
				is_visible: true,
			};
		})
		.filter((module) => !module.is_disabled);

	let last_hovered_module = null;
	let code_panels = [];

	for (let module of modules) {
		code_panels.push(
			await Codepad({
				root,
				id: `codepad-module-${module.name}`,
				module,
				onmouseenter() {
					last_hovered_module = module.name;
				},
			}),
		);
	}

	const main_panel = {
		current: null,
	};

	const layout_element = div(
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
						"panel-hovered": () => (last_hovered_module === module.name ? "true" : "false"),
						onmousedown() {
							const codepad_el = root.getElementById(`codepad-module-${module.name}`);
							if (codepad_el) {
								codepad_el.scrollIntoView({ behavior: "instant" });
							}
						},
					},
					module.name,
				);
			}),
		),
		div(
			{
				id: "main-panel",
				ref: main_panel,
			},
			code_panels,
		),
	);

	// Setup intersection observer after the layout is created
	await finish();

	// const observer = new IntersectionObserver(
	// 	(entries) => {
	// 		entries.forEach((entry) => {
	// 			const codepad_element = entry.target.querySelector(".content");
	// 			if (entry.isIntersecting) {
	// 				codepad_element.style.display = "block";
	// 			} else {
	// 				codepad_element.style.display = "none";
	// 			}
	// 		});
	// 	},
	// 	{
	// 		root: main_panel.current,
	// 		rootMargin: "100px 0px",
	// 		threshold: 0,
	// 	},
	// );

	// const codepad_elements = main_panel.current.querySelectorAll("codepad-editor");
	// codepad_elements.forEach((element) => {
	// 	observer.observe(element);
	// });

	return layout_element;
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
		padding: 11px;
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
