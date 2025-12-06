import { Desktop, mountApplet } from "desktop";
import { CalculatorApplet } from "calculator";

//
// Mount new destkop element if not found
//

if (!document.querySelector("desktop-view")) {
	document.body.appendChild(Desktop());
	await finish();
	mountApplet(CalculatorApplet());
	mountApplet(CalculatorApplet());
	mountApplet(CalculatorApplet());
	mountApplet(CalculatorApplet());
}

// this is the main entry point module. this is where we load all the wanted applet modules and everything else.
//
// we would potentially have an index of imports of modules including an applet loader module
//
// this module would be in charge of providing the wheel with applet functions that add html.
