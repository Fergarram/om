import { WebContentsView, Menu, ipcMain } from "electron";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { bundle } from "./bundler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

	ipcMain.handle("overlay.set_height", (event, height) => {
		const { x, y, width } = overlay_view.getBounds();
		overlay_view.setBounds({
			x,
			y,
			width,
			height,
		});
	});

	ipcMain.handle("overlay.focus", (event) => {
		overlay_view.webContents.focus();
	});

	ipcMain.handle("overlay.open_devtools", (event) => {
		overlay_view.webContents.openDevTools({ mode: "detach" });
	});

	return overlay_view;
}
