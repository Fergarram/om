const { app } = require("electron");
const { createWindow } = require("./modules/win.js");
const { createOverlay } = require("./modules/overlay.js");

require("./modules/shell.js");
require("./modules/file.js");
require("./modules/process.js");
require("./modules/dialog.js");
require("./modules/menu.js");
require("./modules/browser.js");
require("./modules/appstream.js");
require("./modules/shortcuts.js");

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
