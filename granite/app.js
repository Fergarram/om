const { app, BrowserWindow, screen } = require("electron");
const path = require("path");

//
// Constants
//

const APP_LABEL = "granite-v1";

//
// Args
//

const args = process.argv.slice(2);
const arg_target = args.find((a) => !a.startsWith("--"));
const arg_show_frame = args.includes("--show-frame");
const arg_is_url = arg_target ? /^[a-z][a-z0-9+.-]*:/i.test(arg_target) : false;

//
// Boot
//

console.log({
	electron: process.versions.electron,
	chrome: process.versions.chrome,
	node: process.versions.node,
	v8: process.versions.v8,
});

app.whenReady().then(() => {
	const primary_display = screen.getPrimaryDisplay();
	const { width, height } = primary_display.workAreaSize;

	const win = new BrowserWindow({
		width: width / 2,
		height: height / 2,
		backgroundColor: "#000000",
		frame: arg_show_frame,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			webviewTag: true,
			partition: `persist:${APP_LABEL}`,
		},
	});

	if (!arg_target) {
		win.loadURL("about:blank");
	} else if (arg_is_url) {
		win.loadURL(arg_target);
	} else {
		win.loadFile(arg_target);
	}
});

app.on("window-all-closed", () => {
	app.quit();
});
