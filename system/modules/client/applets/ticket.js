import { registerAppletTag } from "desktop";
import { css } from "utils";
import { useTags } from "ima";

const $ = useTags();

const APPLET_NAME = "ticket";

//
// Shared state
//

// let some_variable = 0;
// const active_applets = new Map();

//
// Applet
//

export const Ticket = registerAppletTag(APPLET_NAME, {
	setup() {
		this.start_x = 50_000;
		this.start_y = 50_000;
		this.start_w = 300;
	},
	hydrate() {

		const previous_content_el = this.querySelector("[contenteditable]");

		if (previous_content_el) {
			// we could attach some event listeners here if needed.
		} else {
			this.style.height = "fit-content"; // only initialize height if new
			this.replaceChildren(
				$.div({
					// same event listeners here
					contenteditable: true,
					innerHTML: "blank content editable",
				}),
			);
		}
	},
	onlift() {
		console.log("lifted");
	},
	onplace() {
		console.log("placed");
	},
	onresize(entry) {
		// We get the entry, but we also get "this"
		console.log(entry);
	},
	onremove() {
		// clean up or whatever
	},
});

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
			background: white;
			border-radius: 0px;
			padding: 1rem;
			font-family: var(--font-monospace);
			font-size: 11px;
			overflow: scroll;
		}
	`,
	{},
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

*/
