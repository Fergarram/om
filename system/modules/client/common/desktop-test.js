import { Desktop } from "desktop";

//
// Mount new destkop element if not found
//

if (!document.querySelector("applet-desktop")) {
	document.body.appendChild(Desktop());
}
