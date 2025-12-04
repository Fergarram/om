import { Desktop } from "desktop";

//
// Mount new destkop element if not found
//

if (!document.querySelector("desktop-view")) {
	document.body.appendChild(Desktop());
}
