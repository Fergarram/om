import { registerAppletTag } from "desktop";
import { useGlobalStyles } from "utils";
import { useStyledTags, uuid } from "ima-utils";

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
		// Local state via "this"
		// But! this state is publicly accessed. You may want this or may not.
		// We can extract data here before hydrating so it's cleaner
	},
	hydrate() {
		// render can happen here via replacing or appending.
		// at this point we can have clean data to make replacing easier.
		// For example, we can just replace the whole thing.
		// this.style.whatever in case you need to do something there but usually not the case.
		const applet_el = $.div("this is the content");
		this.replaceChildren(applet_el);
		// if you want you could use a shadow dom here too
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
