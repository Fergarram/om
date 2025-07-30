import { BrowserWindow, ipcMain } from "electron";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { start_runner } from "../lib/monzon/runner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track the active game window
let active_game_window = null;
let state_update_listener = null;

ipcMain.handle("monzon.create_window", async (event, props) => {
	const parent_window = BrowserWindow.fromWebContents(event.sender);

	// Close existing game window if one exists
	if (active_game_window && !active_game_window.isDestroyed()) {
		active_game_window.close();
	}

	const game_window = new BrowserWindow({
		width: props.width || 800,
		height: props.height || 600,
		frame: props.debug,
		fullscreen: !props.debug,
		alwaysOnTop: props.top || false,
		icon: props.icon || undefined,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false,
			enableRemoteModule: true,
			nodeIntegrationInWorker: true,
			enableHardwareAcceleration: true,
		},
	});

	active_game_window = game_window;

	// Inject monitoring code when the page loads
	game_window.webContents.on("did-finish-load", async () => {
		const code = await fs.readFile(path.join(__dirname, "../injections/monzon-monitor.js"), "utf8");
		game_window.webContents.executeJavaScript(code);
	});

	// Store the listener function
	state_update_listener = (event, data) => {
		const sender = BrowserWindow.fromWebContents(event.sender);
		if (sender && sender.id === game_window.id) {
			// Pass down to client
			parent_window.webContents.send("monzon.state_update", data);
		}
	};

	ipcMain.on("monzon.state_update", state_update_listener);

	game_window.on("close", () => {
		// Remove only this specific listener
		ipcMain.removeListener("monzon.state_update", state_update_listener);
		state_update_listener = null;
		active_game_window = null;

		// Tell client window is closed
		parent_window.webContents.send("monzon.window_close");
	});

	game_window.loadURL("http://localhost:1961/");

	if (props.debug) {
		game_window.webContents.toggleDevTools();
	}

	return game_window.id;
});

// Separate handler for closing the game window
ipcMain.handle("monzon.close_window", async (event) => {
	if (active_game_window && !active_game_window.isDestroyed()) {
		active_game_window.close();
		return true;
	}
	return false;
});

ipcMain.handle("monzon.start_runner", async (event) => {
	await start_runner();
});
