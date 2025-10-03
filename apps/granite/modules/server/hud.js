const { WebContentsView, BrowserView, Menu, ipcMain, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");
const { bundle } = require("./bundler.js");

// Map to track HUD overlays by their window id
const hud_overlays = new Map();

// Map to track shortcuts registered per window
const window_shortcuts = new Map();

function createHud(app_label, electron_window, opts = {}) {
	const hasWindowContentViewAPI = typeof electron_window.contentView !== "undefined";

	const view_opts = {
		webPreferences: {
			preload: path.join(__dirname, "../../preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			enableHardwareAcceleration: true,
			partition: `persist:${app_label}__hud`,
		},
	};

	const overlay_view = hasWindowContentViewAPI ? new WebContentsView(view_opts) : new BrowserView(view_opts);

	if (!hasWindowContentViewAPI) {
		console.log("Warning: Electron window does not have contentView API. HUD will use experimental BrowserView API.");
		electron_window.addBrowserView(overlay_view);
	} else {
		electron_window.contentView.addChildView(overlay_view);
	}

	const bounds = electron_window.getBounds();

	overlay_view.setBounds({
		x: 0,
		y: 0,
		width: bounds.width,
		height: bounds.height,
	});

	// Transparent by default
	overlay_view.setBackgroundColor("#00000000");

	// Store the overlay view using window id as key
	const window_id = electron_window.id;
	hud_overlays.set(window_id, overlay_view);

	// Clean up the map when the overlay is destroyed
	overlay_view.webContents.on("destroyed", () => {
		hud_overlays.delete(window_id);
	});

	overlay_view.webContents.on("did-start-loading", async (event, url) => {
		// @NOTE: Bundling possible here, it blocks.
	});

	// Update overlay size when window size changes
	if (opts && opts.disable_auto_resize) {
		if (hasWindowContentViewAPI) {
			electron_window.on("resize", () => {
				const [width, height] = electron_window.getSize();
				overlay_view.setBounds({
					x: 0,
					y: 0,
					width,
					height,
				});
			});
		} else {
			overlay_view.setAutoResize({
				width: false,
				height: false,
				horizontal: false,
				vertical: false,
			});
		}
	} else if (!hasWindowContentViewAPI) {
		overlay_view.setAutoResize({
			width: true,
			height: true,
		});
	}

	// Notify renderer about overlay bounds change
	// @NOTE: Have to test with latest version
	if (hasWindowContentViewAPI) {
		overlay_view.on("bounds-changed", (event) => {
			electron_window.webContents.send("hud.bounds_changed", overlay_view.getBounds());
		});
	}

	// Register keyboard shortcut if provided
	if (opts.shortcut) {
		const shortcut_registered = globalShortcut.register(opts.shortcut, () => {
			// Only toggle if this window is focused
			const focused_window = BrowserWindow.getFocusedWindow();
			if (focused_window && focused_window.id === window_id) {
				const visible = toggleHudVisibility(overlay_view);
				if (visible) {
					overlay_view.webContents.focus();
				} else {
					focused_window.webContents.focus();
				}
			}
		});

		if (shortcut_registered) {
			// Store the shortcut so we can unregister it later
			if (!window_shortcuts.has(window_id)) {
				window_shortcuts.set(window_id, []);
			}
			window_shortcuts.get(window_id).push(opts.shortcut);
		} else {
			console.warn(`Failed to register shortcut: ${opts.shortcut}`);
		}
	}

	// Clean up overlay when window is closed
	electron_window.on("closed", () => {
		// Close devtools if open
		if (overlay_view.webContents.isDevToolsOpened()) {
			overlay_view.webContents.closeDevTools();
		}

		// Unregister shortcuts for this window
		const shortcuts = window_shortcuts.get(window_id);
		if (shortcuts) {
			shortcuts.forEach((shortcut) => {
				globalShortcut.unregister(shortcut);
			});
			window_shortcuts.delete(window_id);
		}

		// Remove from map
		hud_overlays.delete(window_id);

		// Destroy the overlay view
		overlay_view.webContents.close();
	});

	toggleHudVisibility(overlay_view);

	return overlay_view;
}

function toggleHudVisibility(overlay_view) {
	let final_visibility;
	// Check if setVisible is available (WebContentsView API)
	if (typeof overlay_view.setVisible === "function") {
		const is_visible = overlay_view.getVisible();
		overlay_view.setVisible(!is_visible);
		final_visibility = !is_visible;
	} else {
		// Fallback for BrowserView: check if y position is negative
		const current_bounds = overlay_view.getBounds();
		const is_visible = current_bounds.y >= 0;

		if (is_visible) {
			// Hide by moving off-screen
			overlay_view.setBounds({
				x: current_bounds.x,
				y: -current_bounds.height,
				width: current_bounds.width,
				height: current_bounds.height,
			});
		} else {
			// Show by moving back to visible position
			overlay_view.setBounds({
				x: current_bounds.x,
				y: 0,
				width: current_bounds.width,
				height: current_bounds.height,
			});
		}
		final_visibility = !is_visible;
	}

	return final_visibility;
}

function getOverlayFromEvent(event) {
	// Get the window from the event sender
	const window = BrowserWindow.fromWebContents(event.sender);
	if (!window) {
		return null;
	}

	return hud_overlays.get(window.id);
}

ipcMain.handle("hud.focus", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for focus request");
		return;
	}

	overlay_view.webContents.focus();
});

ipcMain.handle("hud.on_bounds_changed", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for bounds_changed request");
		return;
	}

	overlay_view.once("bounds-changed", () => {
		const window = BrowserWindow.fromWebContents(event.sender);
		window.webContents.send("hud.bounds_changed", overlay_view.getBounds());
	});
});

ipcMain.handle("hud.open_devtools", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for open_devtools request");
		return;
	}

	overlay_view.webContents.openDevTools({ mode: "detach" });
});

ipcMain.handle("hud.load", (event, overlay_path) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for load request");
		return;
	}

	// @NOTE: Bundling possible here.

	overlay_view.webContents.loadFile(overlay_path);
});

ipcMain.handle("hud.set_bounds", (event, bounds) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for set_bounds request");
		return;
	}

	overlay_view.setBounds(bounds);
});

ipcMain.handle("hud.get_bounds", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for get_bounds request");
		return null;
	}

	return overlay_view.getBounds();
});

ipcMain.handle("hud.set_background_color", (event, color) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for set_background_color request");
		return;
	}

	overlay_view.setBackgroundColor(color);
});

ipcMain.handle("hud.set_border_radius", (event, radius) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for set_border_radius request");
		return;
	}

	overlay_view.setBorderRadius(radius);
});

ipcMain.handle("hud.set_visible", (event, visible) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for set_visible request");
		return;
	}

	// Check if setVisible is available (WebContentsView API)
	if (typeof overlay_view.setVisible === "function") {
		overlay_view.setVisible(visible);
	} else {
		// Fallback for BrowserView: move off-screen by shifting y by -height
		const current_bounds = overlay_view.getBounds();

		if (visible) {
			// Move back to visible position (y = 0)
			overlay_view.setBounds({
				x: current_bounds.x,
				y: 0,
				width: current_bounds.width,
				height: current_bounds.height,
			});
		} else {
			// Move off-screen by shifting y by negative height
			overlay_view.setBounds({
				x: current_bounds.x,
				y: -current_bounds.height,
				width: current_bounds.width,
				height: current_bounds.height,
			});
		}
	}
});

ipcMain.handle("hud.get_visible", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for get_visible request");
		return null;
	}

	// Check if getVisible is available (WebContentsView API)
	if (typeof overlay_view.getVisible === "function") {
		return overlay_view.getVisible();
	} else {
		// Fallback for BrowserView: check if y position is negative
		const current_bounds = overlay_view.getBounds();
		return current_bounds.y >= 0;
	}
});

module.exports = {
	createHud,
};
