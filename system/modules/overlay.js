import { WebContentsView, Menu, ipcMain } from "electron";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { bundle } from "./bundler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map to track overlay views by their webContents id
const overlay_views_map = new Map();

export function createOverlay(overlay_id, electron_window) {
	// Create a WebContentsView to serve as the overlay
	const overlay_view = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "../preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
		},
	});

	// Add the overlay view as a child view to the window's content view
	electron_window.contentView.addChildView(overlay_view);

	// Get the bounds of the window to size the overlay appropriately
	const bounds = electron_window.getBounds();

	// Set the overlay view bounds - here covering the full window
	overlay_view.setBounds({
		x: 0,
		y: 0,
		width: bounds.width,
		height: 0,
	});

	// Important: Set the background color of the WebContentsView to be transparent
	overlay_view.setBackgroundColor("#00000000");

	// Store the overlay view in our map using its webContents id as key
	overlay_views_map.set(overlay_view.webContents.id, overlay_view);

	// Clean up the map when the overlay is destroyed
	overlay_view.webContents.on("destroyed", () => {
		overlay_views_map.delete(overlay_view.webContents.id);
	});

	overlay_view.webContents.on("did-start-loading", async (event, url) => {
		const entry_file = path.join(__dirname, `../../user/overlays/${overlay_id}/src/main.ts`);
		const outdir = path.join(__dirname, `../../user/overlays/${overlay_id}`);

		bundle(entry_file, outdir);
	});

	// Load overlay content
	overlay_view.webContents.loadFile(`../user/overlays/${overlay_id}/index.html`);

	// Update overlay size when window size changes
	electron_window.on("resize", () => {
		const [width, _] = electron_window.getSize();
		const { height } = overlay_view.getBounds();
		overlay_view.setBounds({
			x: 0,
			y: 0,
			width,
			height,
		});
	});

	// Clean up overlay when window is closed
	electron_window.on("closed", () => {
		// Close devtools if open
		if (overlay_view.webContents.isDevToolsOpened()) {
			overlay_view.webContents.closeDevTools();
		}

		// Remove from map
		overlay_views_map.delete(overlay_view.webContents.id);

		// Destroy the overlay view
		overlay_view.webContents.close();
	});

	return overlay_view;
}

function getOverlayFromEvent(event) {
	// The event sender is the webContents that sent the IPC message
	const sender_id = event.sender.id;
	return overlay_views_map.get(sender_id);
}

ipcMain.handle("overlay.set_height", (event, height) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for set_height request");
		return;
	}

	const { x, y, width } = overlay_view.getBounds();
	overlay_view.setBounds({
		x,
		y,
		width,
		height,
	});
});

ipcMain.handle("overlay.focus", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for focus request");
		return;
	}

	overlay_view.webContents.focus();
});

ipcMain.handle("overlay.open_devtools", (event) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for open_devtools request");
		return;
	}

	overlay_view.webContents.openDevTools({ mode: "detach" });
});

ipcMain.handle("overlay.load", (event, overlay_id) => {
	const overlay_view = getOverlayFromEvent(event);
	if (!overlay_view) {
		console.warn("Could not find overlay view for load request");
		return;
	}

	const entry_file = path.join(__dirname, `../../user/overlays/${overlay_id}/src/main.ts`);
	const outdir = path.join(__dirname, `../../user/overlays/${overlay_id}`);

	bundle(entry_file, outdir);

	const overlay_path = path.join(__dirname, `../../user/overlays/${overlay_id}/index.html`);
	overlay_view.webContents.loadFile(overlay_path);
});
