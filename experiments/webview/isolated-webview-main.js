"use strict";

//
// isolated-webview, main process side.
//
// Companion to isolated-webview.js (the renderer custom element) and
// preload.js (the __sys bridge). A host app creates its BrowserWindow
// with preload.js as the preload, then calls attachHost(window) once.
// From then on every <isolated-webview> in that window spawns and drives
// its own hidden offscreen guest BrowserWindow, keyed by an id carried
// on every IPC message, so one host can run many independent guests.
//
// Frames reach the host zero copy via the Electron 43 sharedTexture
// module when available, cpu paint bitmaps otherwise. Input flows back
// via sendInputEvent.
//

const { app, BrowserWindow, ipcMain, screen, sharedTexture } = require("electron/main");

//
// Constants
//

// With shared texture the frame rate is uncapped (no 240 limit) and
// frames never leave the GPU, so a high rate mainly buys input to paint
// latency: the guest repaints sooner after a forwarded event.
const FRAME_RATE = 240;

// Frame source, best first. Override with OM_WEBVIEW_MODE=cpu.
//
//   shared-texture  Electron 43+ sharedTexture module. The texture is
//                   imported and transferred to the host renderer as a
//                   GPU resource, pixels never touch the CPU.
//   cpu             Plain offscreen paint bitmaps (works everywhere).
//
const mode = sharedTexture && process.env.OM_WEBVIEW_MODE !== "cpu" ? "shared-texture" : "cpu";
const use_shared_texture = mode === "shared-texture";
const debug_frames = Boolean(process.env.OM_WEBVIEW_DEBUG);

const EDIT_COMMANDS = new Set([
	"copy",
	"cut",
	"paste",
	"pasteAndMatchStyle",
	"selectAll",
	"undo",
	"redo",
]);

//
// State
//

let host_window = null;
let host_receiver_ready = false;
let wired = false;
const guests = new Map();

//
// Setup
//

// Keep frames 8 bit rgba/bgra. On wide gamut displays Chromium may
// otherwise produce rgbaf16 textures which we do not handle. Runs at
// require time so it lands before app ready, as the switch requires.
app.commandLine.appendSwitch("force-color-profile", "srgb");

// Bind the guest machinery to a host window. Call once after creating
// the window (built with preload_path) and before or after loading its
// page. The window's renderer must load isolated-webview.js.
function attachHost(window) {
	host_window = window;
	host_receiver_ready = false;

	if (!wired) {
		wireIpc();
		wired = true;
	}

	host_window.on("closed", () => {
		for (const guest of guests.values()) {
			if (!guest.isDestroyed()) guest.destroy();
		}
		guests.clear();
		host_window = null;
		host_receiver_ready = false;
	});
}

//
// Guest lifecycle
//

function createGuest({ id, url, width, height }) {
	if (guests.has(id)) return;

	const guest = new BrowserWindow({
		width: Math.max(1, Math.floor(width || 800)),
		height: Math.max(1, Math.floor(height || 600)),
		show: false,
		frame: false,
		webPreferences: {
			// Electron 43 pins offscreen output to 1x unless
			// deviceScaleFactor is set (39 followed the display scale
			// implicitly). Match the display so text stays retina sharp.
			offscreen: {
				useSharedTexture: use_shared_texture,
				deviceScaleFactor: screen.getPrimaryDisplay().scaleFactor,
			},
		},
	});

	guest.webContents.setFrameRate(FRAME_RATE);

	guest.webContents.on("paint", (event, dirty, image) => {
		if (!host_window || host_window.isDestroyed()) {
			if (event.texture) event.texture.release();
			return;
		}
		if (mode === "shared-texture") {
			// Early paints can arrive without a texture while the GPU
			// pipeline spins up. Never route them to the pixel path: the
			// first getContext claims the host canvas forever and would
			// break WebGPU. Drop them, a texture paint follows.
			if (event.texture) handleSharedTextureFrame(id, guest, event.texture);
			return;
		}
		if (event.texture) {
			event.texture.release();
			return;
		}
		handleBitmapFrame(id, dirty, image);
	});

	guest.webContents.on("cursor-changed", (event, type) => sendToHost("webview:cursor", id, type));
	guest.webContents.on("did-navigate", (event, navigated_url) =>
		sendToHost("webview:url", id, navigated_url),
	);
	guest.webContents.on("did-navigate-in-page", (event, navigated_url, is_main_frame) => {
		if (is_main_frame) sendToHost("webview:url", id, navigated_url);
	});
	guest.webContents.on("page-title-updated", (event, title) =>
		sendToHost("webview:title", id, title),
	);
	guest.webContents.on("did-finish-load", () => guest.webContents.invalidate());

	// Keep navigation inside the guest instead of spawning windows
	guest.webContents.setWindowOpenHandler((details) => {
		guest.webContents.loadURL(details.url);
		return { action: "deny" };
	});

	guests.set(id, guest);
	guest.loadURL(normalizeUrl(url));
}

function destroyGuest(id) {
	const guest = guests.get(id);
	if (guest && !guest.isDestroyed()) guest.destroy();
	guests.delete(id);
}

//
// Frame handlers
//

function handleBitmapFrame(id, dirty, image) {
	const size = image.getSize();
	const cropped =
		dirty.width === size.width && dirty.height === size.height ? image : image.crop(dirty);
	sendToHost("webview:frame", id, {
		width: size.width,
		height: size.height,
		dirty,
		band_x: dirty.x,
		band_y: dirty.y,
		bytes_per_row: dirty.width * 4,
		pixel_format: "bgra",
		pixels: cropped.toBitmap(),
	});
}

// Zero copy path. The texture is imported as a Chromium SharedImage
// reference and transferred to the host renderer, which draws it as a
// VideoFrame. Pixels never leave the GPU. The source texture is released
// via allReferencesReleased once main and the renderer have both
// released their imports and the GPU is done.
async function handleSharedTextureFrame(id, guest, texture) {
	const info = texture.textureInfo;

	if (debug_frames) {
		const r = (rect) => (rect ? `${rect.x},${rect.y} ${rect.width}x${rect.height}` : "none");
		console.log(
			`frame id=${id} widget=${info.widgetType} fmt=${info.pixelFormat}` +
				` coded=${info.codedSize.width}x${info.codedSize.height}` +
				` visible=${r(info.visibleRect)} update=${r(info.metadata && info.metadata.captureUpdateRect)}`,
		);
	}

	// Popup widgets (select dropdowns etc) arrive as separate textures.
	// Not composited yet. The receiver must be registered before
	// sendSharedTexture or it times out.
	if (info.widgetType !== "frame" || !host_receiver_ready || guest.isDestroyed()) {
		texture.release();
		return;
	}

	const imported = sharedTexture.importSharedTexture({
		textureInfo: {
			codedSize: info.codedSize,
			colorSpace: info.colorSpace,
			handle: info.handle,
			pixelFormat: info.pixelFormat,
			timestamp: info.timestamp,
			visibleRect: info.visibleRect,
		},
		allReferencesReleased: () => texture.release(),
	});

	try {
		const [content_width, content_height] = guest.getContentSize();
		await sharedTexture.sendSharedTexture(
			{ frame: host_window.webContents.mainFrame, importedSharedTexture: imported },
			{
				id,
				visible_rect: info.visibleRect,
				update_rect: (info.metadata && info.metadata.captureUpdateRect) || null,
				// Guest size in DIP, for the canvas CSS size
				content_size: { width: content_width, height: content_height },
			},
		);
	} catch (error) {
		console.error("shared texture transfer failed:", error.message);
	} finally {
		imported.release();
	}
}

//
// Helpers
//

function sendToHost(channel, ...args) {
	if (!host_window || host_window.isDestroyed()) return;
	host_window.webContents.send(channel, ...args);
}

function withGuest(id, fn) {
	const guest = guests.get(id);
	if (guest && !guest.isDestroyed()) fn(guest);
}

function normalizeUrl(url) {
	const target = String(url || "").trim();
	if (!target) return "about:blank";
	if (/^[a-z]+:/i.test(target)) return target;
	return `https://${target}`;
}

//
// IPC
//

function wireIpc() {
	ipcMain.on("webview:log", (event, message) => console.log(message));

	ipcMain.on("webview:ready", () => {
		host_receiver_ready = true;
		// Frames painted before the receiver existed were dropped
		for (const guest of guests.values()) {
			if (!guest.isDestroyed()) guest.webContents.invalidate();
		}
	});

	ipcMain.handle("webview:create", (event, options) => createGuest(options));

	ipcMain.on("webview:destroy", (event, id) => destroyGuest(id));

	ipcMain.on("webview:input", (event, id, input_event) => {
		withGuest(id, (guest) => guest.webContents.sendInputEvent(input_event));
	});

	ipcMain.on("webview:command", (event, id, command) => {
		if (!EDIT_COMMANDS.has(command)) return;
		withGuest(id, (guest) => guest.webContents[command]());
	});

	ipcMain.on("webview:resize", (event, id, size) => {
		if (size.width < 1 || size.height < 1) return;
		withGuest(id, (guest) => guest.setSize(Math.floor(size.width), Math.floor(size.height)));
	});

	ipcMain.on("webview:focus", (event, id) => {
		withGuest(id, (guest) => guest.webContents.focus());
	});

	ipcMain.on("webview:navigate", (event, id, url) => {
		withGuest(id, (guest) => guest.webContents.loadURL(normalizeUrl(url)));
	});

	ipcMain.on("webview:back", (event, id) => {
		withGuest(id, (guest) => {
			if (guest.webContents.navigationHistory.canGoBack())
				guest.webContents.navigationHistory.goBack();
		});
	});

	ipcMain.on("webview:forward", (event, id) => {
		withGuest(id, (guest) => {
			if (guest.webContents.navigationHistory.canGoForward())
				guest.webContents.navigationHistory.goForward();
		});
	});

	ipcMain.on("webview:reload", (event, id) => {
		withGuest(id, (guest) => guest.webContents.reload());
	});
}

//
// Exports
//

module.exports = {
	attachHost,
};
