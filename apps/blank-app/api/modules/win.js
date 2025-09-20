const { shell, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { bundle } = require("./bundler.js");
const fs = require("fs");
const { createOverlay } = require("./overlay.js");

ipcMain.handle("win.close", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	window.will_close_manually = true;
	window.close();
});

ipcMain.handle("win.minimize", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	window.minimize();
});

ipcMain.handle("win.maximize", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	window.maximize();
});

ipcMain.handle("win.unmaximize", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	window.unmaximize();
});

ipcMain.handle("win.is_maximized", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	return window.isMaximized();
});

ipcMain.handle("win.is_devtools_open", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	return window.webContents.isDevToolsOpened();
});

ipcMain.handle("win.focus", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	return window.webContents.focus();
});

ipcMain.handle("win.open_in_browser", (event, url) => {
	shell.openExternal(url);
});

ipcMain.handle("win.get_bounds", (event) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	return window.getBounds();
});

ipcMain.handle("win.open_space", async (event, space) => {
	const window = BrowserWindow.fromWebContents(event.sender);
	const target_path = path.resolve(__dirname, `../../user/spaces/${space}/index.html`);
	window.webContents.executeJavaScript(`window.location.href = "file://${target_path}"`);
});

function createWindow(app_name, enable_defaults = false) {
	const primary_display = screen.getPrimaryDisplay();
	const { width, height } = primary_display.workAreaSize;

	const new_window = new BrowserWindow({
		width: width / 2,
		height: height / 2,
		show: false,
		backgroundColor: "#000000",
		// frame: false,
		autoHideMenuBar: true,
		webPreferences: {
			zoomFactor: 1.0,
			preload: path.join(__dirname, "../preload.js"),
			webviewTag: true,
			enableHardwareAcceleration: true,
			partition: `persist:${app_name}`,
		},
	});

	const originalReload = new_window.webContents.reload;
	const originalReloadIgnoringCache = new_window.webContents.reloadIgnoringCache;

	new_window.webContents.reload = function () {
		// console.log("Reload called, bundling first...");
		// const entry_file = path.join(__dirname, `../../user/spaces/${current_space}/src/main.ts`);
		// const outdir = path.join(__dirname, `../../user/spaces/${current_space}`);

		// bundle(entry_file, outdir);
		return originalReload.call(this);
	};

	new_window.webContents.reloadIgnoringCache = function () {
		// console.log("Hard reload called, bundling first...");
		// const entry_file = path.join(__dirname, `../../user/spaces/${current_space}/src/main.ts`);
		// const outdir = path.join(__dirname, `../../user/spaces/${current_space}`);

		// bundle(entry_file, outdir);
		return originalReloadIgnoringCache.call(this);
	};

	new_window.on("close", (event) => {
		if (enable_defaults) return;

		if (!new_window.will_close_manually) {
			event.preventDefault();
		}
	});

	new_window.on("maximize", () => {
		new_window.webContents.send("win.on_maximize");
	});

	new_window.on("unmaximize", () => {
		new_window.webContents.send("win.on_unmaximize");
	});

	new_window.on("minimize", () => {
		new_window.webContents.send("win.minimize");
	});

	new_window.webContents.on("devtools-opened", () => {
		new_window.webContents.send("win.devtools_opened");
	});

	new_window.webContents.on("devtools-closed", () => {
		new_window.webContents.send("win.devtools_closed");
	});

	new_window.webContents.on("will-navigate", (event, url) => {
		if (enable_defaults) return;

		if (!url.startsWith("file://")) {
			event.preventDefault();
			console.log(`Navigation to ${url} blocked: only local file:// URLs are allowed`);
			const bw = new BrowserWindow({
				webPreferences: {
					webSecurity: true,
					allowRunningInsecureContent: false,
					contextIsolation: true,
				},
			});

			bw.loadURL(url);
		} else {
			event.preventDefault();

			// const url_parts = url.split("/");
			// const spaces_index = url_parts.indexOf("spaces");
			// const next_space = spaces_index !== -1 && spaces_index + 1 < url_parts.length ? url_parts[spaces_index + 1] : "";

			// @NOTE: Leaving this for future reference - we used to bundle the space and just do loadURL but that brings problems since the same window is recycled and localStoarge and other things are potentially cached or erased etc. It's not stable so we just delete and create a new window each time.
			// const entry_file = path.join(__dirname, `../../user/spaces/${next_space}/src/main.ts`);
			// const outdir = path.join(__dirname, `../../user/spaces/${next_space}`);
			// bundle(entry_file, outdir);
			// if (current_space === next_space) {
			// 	console.log(`In space navigation?`);
			// 	return;
			// }

			console.log(`Prevented navigation to ${url}`);

			// Get old window position and dimensions
			// @NOTE: This would only be required in non-DE mode (Mac, Windows, Linux with DE)
			// const current_bounds = new_window.getBounds();
			// const is_maximized = new_window.isMaximized();
			// new_window.will_close_manually = true;
			// new_window.close();

			// const win = createWindow(next_space);

			// Restore window position and dimensions
			// if (is_maximized) {
			// 	win.maximize();
			// } else {
			// 	win.setBounds(current_bounds);
			// }

			// createOverlay("default", win);
		}
	});

	new_window.webContents.on("will-redirect", (event, url) => {
		if (enable_defaults) return;

		if (!url.startsWith("file://")) {
			event.preventDefault();
			console.log(`Redirect to ${url} blocked: only local file:// URLs are allowed`);
			const bw = new BrowserWindow({
				webPreferences: {
					webSecurity: true,
					allowRunningInsecureContent: false,
					contextIsolation: true,
				},
			});

			bw.loadURL(url);
		}
	});

	new_window.webContents.on("did-finish-load", async () => {
		new_window.show();
	});

	// const entry_file = path.join(__dirname, `../../user/spaces/${app_name}/src/main.ts`);
	// const outdir = path.join(__dirname, `../../user/spaces/${app_name}`);

	// bundle(entry_file, outdir);

	new_window.loadFile(`./index.html`);

	return new_window;
}

module.exports = {
	createWindow,
};
