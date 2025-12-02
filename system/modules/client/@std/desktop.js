// destkop.js
const registered_applets = new Map();
const unhydrated_applets = new Map();

Array.from(document.querySelectorAll("desktop-applet")).forEach((el) => {
	const name = el.getAttribute("name");
	if (!unhydrated_applets.has(name)) {
		unhydrated_applets.set(name, []);
	}
	unhydrated_applets.get(name).push(el);
});

export function registerAppletTag(applet_definition) {
	// This runs we'll be already "booted" meaning page has loaded.

	// registration-id is not an attribute.
	const applet_registration = { ...applet_definition, "registration-id": "generate-uuid" };

	if (registered_applets.has(applet_registration.id)) {
		// We might have to pass an el arg so we'll need a query.
		applet_registration.onhotreload(); // Still need to try to see which data I'll need to pass
		// I think most ideally you trigger onConnect by remounting via
		// const parent = el.parentNode;
		// parent.removeChild(el);
		// parent.appendChild(el);
		// or if this dont work just shift them around
		// or we just remount the whole desktop parent instead of looping.
	}

	registered_applets.set(applet_registration.id, applet_registration);

	const applets_to_hydrate = unhydrated_applets.get(applet_registration.name);
	if (applets_to_hydrate) {
		unhydrated_applets.delete(applet_registration.name);
		// Can we delete first and hydrate after?
		applets_to_hydrate.forEach((applet_el) => {
			applet_registration.onhydrate(applet_el);
		});
	}
}

//
// in ima-utils.js
//
export function replaceEl(...args) {
	// just wrapper that takes args and returns proper format or whatever.
}

// This is where iframes are interesting.
// How much better performance and safety can you get just by using iframes?
// But also, iframes are limited in their interactions with the current DOM.

/// EXAMPLE
// we'd need to import registerAppletTag, replaceEl, and useTags.

// This registration process should run before page load.
// But this is not possible if running via blob-module.
// So we'll have some bad renders if we leverage the connected thng.
registerAppletTag({
	name: "your-applet-name",
	"some-initial-attribute": "stored in html",
	onhydrate(self_el) {
		const { div } = useTags();
		// This runs from onConnected in the custom element
		// so self_el is "this" at this point in time.

		const bg_color = self_el.style.backgroundColor;
		console.log(bg_color);

		// or

		const attrs = extractAttrs(self_el);
		console.log(attrs.style); // would print CSS string

		const where_is_our_data_stored = "here";
		let what_about_local_data = "here too";

		setInterval(() => {
			what_about_local_data = Math.random().toString(36).substring(2, 15);
		}, 1000);

		replaceEl(
			self_el,
			{
				...attrs,
				// optional attrs like ima
				"attributes-replaced": "",
			},
			div(where_is_our_data_stored),
			div(() => what_about_local_data),
			div("ima-style children"),
			div("like so"),
		);
	},
	onremove() {
		// after .remove() is called, using onDisconnected
	},
	onlift() {},
	ondrop() {},
	onresize() {},
});
