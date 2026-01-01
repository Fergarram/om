import { registerAppletTag } from "desktop";
import { css } from "utils";
import { useStyledTags } from "ima-utils";
import CodeEditor from "ui/code-editor"

const $ = useStyledTags();

const APPLET_NAME = "isolate";

//
// Shared state
//

// let some_variable = 0;
// const active_applets = new Map();

//
// Applet
//

const IsolatedApplet = registerAppletTag(APPLET_NAME, {
	setup() {
		this.start_x = Number(this.getAttribute("x")) || 0;
		this.start_y = Number(this.getAttribute("y")) || 0;
		this.start_w = 300;
		this.start_h = 300;
	},
	onhydrate() {
		const prev_el = this.firstElementChild;
		const preview_ref = { current: null };

		// TODO: Finish this example so that it can be rehydrated based on its different states
		let source = prev_el ? prev_el.querySelector("source").innerHTML : "";
		let is_editing = prev_el ? false : true;
		let cleanup = null;
		let editor_ref = { current: null };

		this.replaceChildren(
			$.div(
				CodeEditor({
					ref: editor_ref,
					style: () => `display: ${!is_editing ? "none" : "block"};`,
					oninput(e) {
						source = this.value;
					},
				}),
				$.div({
					ref: preview_ref,
					style: () => `display: ${is_editing ? "none" : "block"};`,
					styles: css`
						& {
							position: absolute;
							left: 0;
							top: 0;
							width: 100%;
							height: 100%;
						}
					`,
				}),
				$.button(
					{
						async onclick() {
							is_editing = !is_editing;

							if (!is_editing) {
								try {
									const exports = await BlobLoader.runModuleScript(source);
									preview_ref.current.replaceChildren(exports.default());
									cleanup = exports.cleanup;
								} catch (e) {
									console.log(e);
								}
							} else if (is_editing && cleanup) {
								cleanup();
								preview_ref.current.innerHTML = "";
								cleanup = null;
							}
						},
						styles: css`
							& {
								position: absolute;
								right: 0.5rem;
								bottom: 0.5rem;
								width: 1.5rem;
								height: 1.5rem;
								background: #505050;
								border-radius: 8px;
								display: flex;
								align-items: center;
								justify-content: center;
							}

							& icon {
								font-size: 18px;
							}
						`,
					},
					$.icon({ name: () => (is_editing ? "toggle_off" : "toggle_on") }),
				),
			),
		);
	},
	onlift() {
		// console.log("lifted");
	},
	onplace() {
		// console.log("placed");
	},
	onresize(entry) {
		// We get the entry, but we also get "this"
		// console.log(entry);
	},
	onremove() {
		// clean up or whatever
	},
});

export default IsolatedApplet;

// This adds a module at runtime so that it may be included in the next build.
// Because it's very likely that this will try to override the existing ones,
// we'll need a way to tell the BlobLoader to override previous ones in this case.
BlobLoader.addStyleModule(
	"applet-" + APPLET_NAME,
	css`
		applet-${APPLET_NAME} > div {
			position: relative;
			width: 100%;
			height: 100%;
			/*background: rgb(255 255 255 / 25%);*/
			background: rgb(255 255 255);
			/*backdrop-filter: blur(0.5px);*/
			border-radius: 0px;
			padding: 1rem;
			font-family: var(--font-monospace);
			font-size: 11px;
			overflow: scroll;
			transition: backdrop-filter 150ms ease-in-out;
		}

		applet-${APPLET_NAME} > div > textarea,
		applet-${APPLET_NAME} > div > code-editor {
			display: block;
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			resize: none;
			background: black;
		}

		applet-${APPLET_NAME}[motion="lift"] {
			/*backdrop-filter: blur(2.5px);*/
		}

		@media (prefers-color-scheme: dark) {
			applet-${APPLET_NAME} > div {
				color: #eaeaea;
				background: #303030;
			}
		}
	`,
	{
		generated: "isolate.js"
	},
	{ override: true },
);

/*
TODO:

The next step is to implement an MVP module editor:
- CodeMirror based buffer html component (use a bundler to create this part)
- The IDE part, (sidebar, then desktop view):
	- show files, save state, etc
	- buttons to push/pull, etc
	- visualize modules of all kinds: script, style, media.

The reason why this is the next step is because this solves the problem
with just having a single html file.

Currently, I have two files: shell and export.

I need it to always be an export.

Also, we need the <header></header> banner and skip to main content links.
Essentially for pure non-js renders we want to be able to navigate the site reliably.

*/
