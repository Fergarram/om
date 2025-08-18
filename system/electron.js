import { app } from "electron";

import { createWindow } from "./modules/win.js";
import { createOverlay } from "./modules/overlay.js";

import "./modules/shell.js";
import "./modules/file.js";
import "./modules/process.js";
import "./modules/dialog.js";
import "./modules/menu.js";
import "./modules/browser.js";
import "./modules/appstream.js";
import "./modules/shortcuts.js";

import "./modules/monzon.js";

// I need to recompile to same version of nodejs
// Meanwhile I'd have to set it up as an external node server
// const robot = require("./lib/robotjs/index.js");

console.log({
	electron: process.versions.electron,
	chrome: process.versions.chrome,
	node: process.versions.node,
	v8: process.versions.v8,
});

app.whenReady().then(() => {
	const win = createWindow("blank");
	createOverlay("default", win);
});

app.on("window-all-closed", () => {
	app.quit();
});
