const { app } = require("electron");
const { createWindow } = require("./api/modules/win.js");
// const { createOverlay } = require("./api/modules/overlay.js");

const { WASI } = require("node:wasi");

require("./api/modules/shell.js");
require("./api/modules/file.js");
require("./api/modules/process.js");
require("./api/modules/dialog.js");
require("./api/modules/menu.js");
require("./api/modules/browser.js");
require("./api/modules/appstream.js");
require("./api/modules/shortcuts.js");

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
	// createOverlay("default", win);
});

app.on("window-all-closed", () => {
	app.quit();
});
