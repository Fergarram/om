import { registerAppletTag } from "desktop";
import { css } from "utils";
import { useTags } from "ima";

const $ = useTags();

//
// Shared state
//

// let some_variable = 0;
// const active_calculators = new Map();

//
// Applet
//

export const CalculatorApplet = registerAppletTag("calculator", {
	setup() {
		// Not really needed in most cases. This will always run.
		// The hydrate() fn might run only for those in view
		// to prevent performance problems

		// Starting position could be set here.
		this.start_x = 50_000;
		this.start_y = 50_000;
		this.start_w = 300;
		this.start_h = 80;
		this.start_z = 1;
	},
	hydrate() {
		// render can happen here via replacing or appending.
		// at this point we can have clean data to make replacing easier.
		// For example, we can just replace the whole thing.
		// this.style.whatever in case you need to do something there but usually not the case.
		// if you want you could use a shadow dom here too

		this.state_id = this.getAttribute("state") || "new";
		this.count = Number(this.querySelector("[key='count']")?.textContent) || 0;

		setInterval(() => {
			this.count++;
		}, 1000);

		if (this.state_id === "new") {
			const applet_el = $.div(
				{
					// Note that styles are JS dependant
					// to fix this we'd need to make it
					// exist as html inline css rather
					// than adopted sheets.
					// Offline inline style
					// styles: css`
					// 	& {
					// 	}
					// `,
				},
				$.icon({
					name: "acute",
					style: "font-size: 1.5rem"
				}),
				"This is a calculator:\n",
				$.span(
					{
						key: "count",
					},
					() => this.count,
				),
			);
			this.replaceChildren(applet_el);
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
		// console.log(entry);
	},
	onremove() {
		// clean up or whatever
	},
});

// This adds a module at runtime so that it may be included in the next build.
// Because it's very likely that this will try to override the existing ones,
// we'll need a way to tell the BlobLoader to override previous ones in this case.
BlobLoader.addStyleModule(
	"applet-calculator",
	css`
		applet-calculator > div {
			position: absolute;
			width: 100%;
			height: 100%;
			background: white;
			border-radius: 1rem;
			padding: 1rem;
			display: flex;
			align-items: center;
			white-space: nowrap;
			gap: 1rem;
		}
	`,
	{
		notes: "Will override module when loaded.",
	},
	{ override: true },
);
