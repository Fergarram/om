import { Desktop, mountApplet, translateCameraCenterSmooth } from "desktop";
import { Ticket } from "ticket";
import { isUserTyping, finish } from "utils";

//
// Mount new destkop element if not found
//

if (!document.querySelector("desktop-view")) {
	// DEV: Clear module cache
	await BlobLoader.clearAllCache();

	document.body.appendChild(Desktop());
	await finish();
	mountApplet(Ticket());

	// mountApplet(Ticket());
	// mountApplet(Ticket());
	// mountApplet(Ticket());
}

window.addEventListener("keydown", (e) => {
	if (e.key === " " && !isUserTyping()) {
		translateCameraCenterSmooth(50000, 50000, 1, 1000);
	}
});

// this is the main entry point module. this is where we load all the wanted applet modules and everything else.
//
// we would potentially have an index of imports of modules including an applet loader module
//
// this module would be in charge of providing the wheel with applet functions that add html.
