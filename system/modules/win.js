import { shell, BrowserWindow, ipcMain, screen } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "./bundler.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function createWindow(initial_space) {
	const primary_display = screen.getPrimaryDisplay();
	const { width, height } = primary_display.workAreaSize;
	let current_space = initial_space;

	const new_window = new BrowserWindow({
		width,
		height,
		show: false,
		backgroundColor: "#000000",
		frame: false,
		autoHideMenuBar: true,
		webPreferences: {
			zoomFactor: 1.0,
			preload: path.join(__dirname, "../preload.js"),
			webviewTag: true,
			enableHardwareAcceleration: true,
		},
	});

	const originalReload = new_window.webContents.reload;
	const originalReloadIgnoringCache = new_window.webContents.reloadIgnoringCache;

	new_window.webContents.reload = function () {
		console.log("Reload called, bundling first...");
		const entry_file = path.join(__dirname, `../../user/spaces/${current_space}/src/main.ts`);
		const outdir = path.join(__dirname, `../../user/spaces/${current_space}`);

		bundle(entry_file, outdir);
		return originalReload.call(this);
	};

	new_window.webContents.reloadIgnoringCache = function () {
		console.log("Hard reload called, bundling first...");
		const entry_file = path.join(__dirname, `../../user/spaces/${current_space}/src/main.ts`);
		const outdir = path.join(__dirname, `../../user/spaces/${current_space}`);

		bundle(entry_file, outdir);
		return originalReloadIgnoringCache.call(this);
	};

	new_window.on("close", (event) => {
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

			const url_parts = url.split("/");
			const spaces_index = url_parts.indexOf("spaces");
			const next_space = spaces_index !== -1 && spaces_index + 1 < url_parts.length ? url_parts[spaces_index + 1] : "";

			const entry_file = path.join(__dirname, `../../user/spaces/${next_space}/src/main.ts`);
			const outdir = path.join(__dirname, `../../user/spaces/${next_space}`);

			bundle(entry_file, outdir);

			current_space = next_space;

			console.log(`Will navigate to ${url}`);
			new_window.loadURL(url);
		}
	});

	new_window.webContents.on("will-redirect", (event, url) => {
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

	const entry_file = path.join(__dirname, `../../user/spaces/${initial_space}/src/main.ts`);
	const outdir = path.join(__dirname, `../../user/spaces/${initial_space}`);

	bundle(entry_file, outdir);

	new_window.loadFile(`../user/spaces/${initial_space}/index.html`);

	return new_window;
}
