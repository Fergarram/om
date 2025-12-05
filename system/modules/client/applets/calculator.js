import { registerAppletTag } from "desktop";
import { useGlobalStyles, css } from "utils";
import { useStyledTags } from "ima-utils";

const $ = useStyledTags();

//
// Shared state
//

let some_variable = 0;
const active_calculators = new Map();

//
// Applet
//

export const CalculatorApplet = registerAppletTag("calculator", {
	setup() {
		// Not really needed in most cases. This will always run.
		// The hydrate() fn might run only for those in view
		// to prevent performance problems
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
					styles: css`
						& {
							position: absolute;
							width: 100%;
							height: 100%;
							background: white;
							border-radius: 1rem;
							padding: 1rem;
						}
					`,
				},
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
	onresize(entry) {
		// We get the entry, but we also get "this"
	},
	onremove() {
		// clean up or whatever
	},
});

useGlobalStyles(css`
	applet-calculator {
		/* This scopes your styles to this applet */
	}
`);
