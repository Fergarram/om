import { Desktop, mountApplet } from "desktop";
import IsolatedApplet from "applets/isolate";
import { finish, useGlobalStyles } from "utils";

import { openModuleEditor } from "module-editor";

//
// Mount new destkop element if not found
//

if (!document.querySelector("desktop-view")) {
	// DEV: Clear module cache
	await BlobLoader.clearAllCache();

	document.body.appendChild(Desktop());
	await finish();

	window.openModuleEditor = openModuleEditor;

	// mountApplet(IsolatedApplet({
	// 	x: 50_000,
	// 	y: 50_000,
	// }));

	// mountApplet(IsolatedApplet());
	// mountApplet(IsolatedApplet());
	// mountApplet(IsolatedApplet());
}

useGlobalStyles(`
	:root {
		--code-editor-font-size: 12px;
		--code-editor-font-family: "Google Sans Code";
	}

	#banner {
		display: flex;
		justify-content: center;
		align-items: center;
		background: black;
		color: white;
	}
`)

// this is the main entry point module. this is where we load all the wanted applet modules and everything else.
//
// we would potentially have an index of imports of modules including an applet loader module
//
// this module would be in charge of providing the wheel with applet functions that add html.
