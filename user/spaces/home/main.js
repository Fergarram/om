import van from "../../src/lib/van.js";
import { finish } from "../../src/lib/utils.js";

// Global state ???
window.is_trackpad = van.state(false);
window.is_devtools_open = van.state(await sys.win.is_devtools_open());

sys.win.devtools_opened(() => {
	window.is_devtools_open.val = true;
});

sys.win.devtools_closed(() => {
	window.is_devtools_open.val = false;
});

window.addEventListener("beforeunload", (e) => {
	if (!window.is_devtools_open.val) {
		e.preventDefault();
	}
});

// Om Modules
import { StatusBar } from "../../src/modules/om/ui/statusbar.js";
import { initialize_desktop } from "../../src/modules/om/desktop.js";
import "../../src/modules/om/superkey.js";

// Applets
import "../../src/modules/om/applets/test.js";
import "../../src/modules/om/applets/sticky.js";
import "../../src/modules/om/applets/appview.js";
import "../../src/modules/om/applets/webview/webview.js";
import sys from "../../src/modules/om/bridge.js";

// DOM Setup
const { main } = van.tags;

const OmSpace = main(
	{
		id: "om-space",
	},
	await StatusBar(),
);

van.add(document.body, OmSpace);
await finish();

// Initalizations
await initialize_desktop(OmSpace);
