import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let windows = new Set();

const window_settings = {
	width: 1024,
	height: 600,
	frame: false,
	icon: path.join(__dirname, "../icons/icon_512x512.png"),
	autoHideMenuBar: true,
	webPreferences: {
		preload: path.join(__dirname, "bridges/index.js"),
		webviewTag: true,
		enableHardwareAcceleration: true,
	},
};

//
// Host App Events
//

async function handle_app_ready() {
	await attach_window(window_settings);
}

function handle_app_window_all_closed() {
	if (process.platform !== "darwin") {
		app.quit();
	}
}

function handle_app_activate() {
	if (windows.size === 0) {
		attach_window(window_settings);
	}
}

app.on("ready", handle_app_ready);
app.on("window-all-closed", handle_app_window_all_closed);
app.on("activate", handle_app_activate);

//
// Internal functions
//

async function attach_window(settings) {
	const new_window = new BrowserWindow(settings);

	const window_path = path.join(__dirname, "../usr/om.html");
	await new_window.loadFile(window_path);

	windows.add(new_window);

	// Remove window from our set when it's closed
	new_window.on("closed", () => {
		windows.delete(new_window);
	});

	return new_window;
}

//
// Om Sys Calls
//

ipcMain.handle("GET_WINDOWS_COUNT", (event) => {
	return windows.size;
});

//
// Module Exports
//

export { attach_window };
