import { Desktop, mountApplet } from "desktop";
import { Ticket } from "ticket";

//
// Mount new destkop element if not found
//

if (!document.querySelector("desktop-view")) {
	document.body.appendChild(Desktop());
	await finish();
	mountApplet(Ticket());
	// mountApplet(Ticket());
	// mountApplet(Ticket());
	// mountApplet(Ticket());
}

// this is the main entry point module. this is where we load all the wanted applet modules and everything else.
//
// we would potentially have an index of imports of modules including an applet loader module
//
// this module would be in charge of providing the wheel with applet functions that add html.
