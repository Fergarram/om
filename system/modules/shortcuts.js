import { webContents, globalShortcut, ipcMain } from "electron";

// Store registered shortcuts to handle cleanup
const registered_shortcuts = new Map();

//
// Handles
//

ipcMain.handle("shortcuts.register", (event, { accelerator, name }) => {
	return register_shortcut(accelerator, name);
});

ipcMain.handle("shortcuts.unregister", (event, id) => {
	return unregister_shortcut(id);
});

ipcMain.handle("shortcuts.get_all", () => {
	return Array.from(registered_shortcuts.entries()).map(([id, accelerator]) => ({
		id,
		accelerator,
	}));
});

/**
 * Register a global shortcut
 * @param {string} accelerator - Keyboard shortcut (e.g., "CmdOrCtrl+T")
 * @param {string} id - Unique identifier for this shortcut
 * @returns {boolean} Success status
 */
function register_shortcut(accelerator, id) {
	try {
		// Unregister if exists
		if (registered_shortcuts.has(id)) {
			unregister_shortcut(id);
		}

		const success = globalShortcut.register(accelerator, () => {
			// Emit event to all renderer processes
			emit_shortcut_triggered(id);
		});

		if (success) {
			registered_shortcuts.set(id, accelerator);
		}

		return success;
	} catch (error) {
		console.error(`Failed to register shortcut: ${accelerator}`, error);
		return false;
	}
}

/**
 * Unregister a global shortcut by id
 * @param {string} id - Unique identifier for the shortcut
 * @returns {boolean} Success status
 */
function unregister_shortcut(id) {
	if (registered_shortcuts.has(id)) {
		const accelerator = registered_shortcuts.get(id);
		globalShortcut.unregister(accelerator);
		registered_shortcuts.delete(id);
		return true;
	}
	return false;
}

/**
 * Emit shortcut triggered event to all renderer processes
 * @param {string} id - Shortcut identifier
 */
function emit_shortcut_triggered(id) {
	// Get all webContents from BrowserWindow instances
	webContents.getAllWebContents().forEach((contents) => {
		contents.send("shortcuts.triggered", id);
	});
}

function unregister_all_shortcuts() {
	globalShortcut.unregisterAll();
	registered_shortcuts.clear();
}
