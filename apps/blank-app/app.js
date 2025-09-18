const { app } = require("electron");
const { createWindow } = require("./api/modules/win.js");
// const { createOverlay } = require("./api/modules/overlay.js");
require("./api/modules/file.js");

console.log({
	electron: process.versions.electron,
	chrome: process.versions.chrome,
	node: process.versions.node,
	v8: process.versions.v8,
});

app.whenReady().then(() => {
	const win = createWindow("blank");
	win.loadFile("base.html");
	// createOverlay("default", win);
});

app.on("window-all-closed", () => {
	app.quit();
});
