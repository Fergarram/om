"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFile = exports.loadURL = void 0;

const Common = require("electron/common");
const Main = require("electron/main");

const path = require("path");
const url = require("url");

let main_window = null;

// Quit when all windows are closed.
Main.app.on("window-all-closed", () => {
	Main.app.quit();
});

function decorateURL(url) {
	// safely add `?utm_source=default_app
	const parsed_url = new URL(url);
	parsed_url.searchParams.append("utm_source", "default_app");
	return parsed_url.toString();
}

async function createWindow() {
	await Main.app.whenReady();
	const options = {
		width: 960,
		height: 620,
		autoHideMenuBar: true,
		backgroundColor: "#000000",
		webPreferences: {
			preload: path.resolve(__dirname, "preload.js"),
			contextIsolation: true,
			sandbox: true,
		},
		useContentSize: true,
		show: false,
	};

	if (process.platform === "linux") {
		options.icon = path.join(__dirname, "icon.png");
	}

	main_window = new Main.BrowserWindow(options);
	main_window.on("ready-to-show", () => main_window.show());

	main_window.webContents.setWindowOpenHandler((details) => {
		Common.shell.openExternal(decorateURL(details.url));
		return { action: "deny" };
	});

	main_window.webContents.session.setPermissionRequestHandler((web_contents, permission, done) => {
		const parsed_url = new URL(web_contents.getURL());
		const dialog_options = {
			title: "Permission Request",
			message: `Allow '${parsed_url.origin}' to access '${permission}'?`,
			buttons: ["OK", "Cancel"],
			cancelId: 1,
		};
		Main.dialog.showMessageBox(main_window, dialog_options).then(({ response }) => {
			done(response === 0);
		});
	});

	return main_window;
}

async function loadURL(app_url) {
	main_window = await createWindow();
	main_window.loadURL(app_url);
	main_window.focus();
}

async function loadFile(app_path) {
	main_window = await createWindow();
	main_window.loadFile(app_path);
	main_window.focus();
}

exports.loadURL = loadURL;
exports.loadFile = loadFile;

//# sourceMappingURL=default_app.js.map
