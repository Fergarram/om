"use strict";

//
// Om webview prototype, phase 1: CPU offscreen rendering path.
//
// A hidden offscreen BrowserWindow (the guest) paints frames which are
// cropped to the dirty rect and shipped to the host renderer over IPC,
// where they land in a canvas. Input events flow the other way via
// sendInputEvent. The frame source is isolated behind the "paint"
// handler so it can be swapped for the shared texture path later
// without touching the IPC shape or the host page.
//

const { app, BrowserWindow, ipcMain, screen, sharedTexture } = require("electron/main");
const fs = require("fs");
const path = require("path");

//
// Constants
//

const FRAME_RATE = 120;
const INITIAL_GUEST_WIDTH = 1024;
const INITIAL_GUEST_HEIGHT = 640;
const INITIAL_URL = `file://${path.join(__dirname, "guest_test_page.html")}`;

// Frame source, best first. Override with OM_WEBVIEW_MODE=cpu.
//
//   shared-texture  Electron 43+ sharedTexture module. The texture is
//                   imported and transferred to the host renderer as a
//                   GPU resource, pixels never touch the CPU.
//   cpu             Plain offscreen paint bitmaps (works everywhere).
//
const mode = sharedTexture && process.env.OM_WEBVIEW_MODE !== "cpu" ? "shared-texture" : "cpu";
const use_shared_texture = mode === "shared-texture";

// Keep frames 8 bit rgba/bgra. On wide gamut displays Chromium may
// otherwise produce rgbaf16 textures which we do not handle.
app.commandLine.appendSwitch("force-color-profile", "srgb");

//
// State
//

let host_window = null;
let guest_window = null;
let host_receiver_ready = false;

//
// Code execution
//

app.whenReady().then(async () => {
	createHostWindow();
	createGuestWindow();
	wireIpc();

	await host_window.loadFile(path.join(__dirname, "host.html"));
	sendToHost("webview:mode", mode);
	guest_window.loadURL(INITIAL_URL);

	// Screenshot mode for automated verification
	const screenshot_path = process.env.OM_DEMO_SCREENSHOT;
	if (screenshot_path) {
		setTimeout(async () => {
			const image = await host_window.webContents.capturePage();
			fs.writeFileSync(screenshot_path, image.toPNG());
			app.quit();
		}, 4000);
	}
});

app.on("window-all-closed", () => {
	app.quit();
});

//
// Functions
//

function createHostWindow() {
	host_window = new BrowserWindow({
		width: INITIAL_GUEST_WIDTH,
		height: INITIAL_GUEST_HEIGHT + 40,
		useContentSize: true,
		backgroundColor: "#1a1a1a",
		// Default sandboxed renderer with contextBridge, the exact
		// configuration Electron's shared texture tests run under.
		// WebGPU canvas contexts come back null with sandbox disabled.
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});
}

function createGuestWindow() {
	guest_window = new BrowserWindow({
		width: INITIAL_GUEST_WIDTH,
		height: INITIAL_GUEST_HEIGHT,
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

	guest_window.webContents.setFrameRate(FRAME_RATE);

	// Frame source. Both paths emit the same message shape: a band of
	// rows covering the dirty rect, plus stride and format info.
	guest_window.webContents.on("paint", (event, dirty, image) => {
		if (!host_window || host_window.isDestroyed()) {
			if (event.texture) event.texture.release();
			return;
		}
		if (mode === "shared-texture") {
			// Early paints can arrive without a texture while the GPU
			// pipeline spins up. Never route them to the pixel path:
			// the first getContext claims the host canvas forever and
			// would break WebGPU. Drop them, a texture paint follows.
			if (event.texture) handleSharedTextureFrame(event.texture);
			return;
		}
		if (event.texture) {
			event.texture.release();
			return;
		}
		handleBitmapFrame(dirty, image);
	});

	guest_window.webContents.on("cursor-changed", (event, type) => {
		sendToHost("webview:cursor", type);
	});

	guest_window.webContents.on("did-navigate", (event, url) => {
		sendToHost("webview:url", url);
	});

	guest_window.webContents.on("did-navigate-in-page", (event, url, is_main_frame) => {
		if (is_main_frame) sendToHost("webview:url", url);
	});

	guest_window.webContents.on("page-title-updated", (event, title) => {
		sendToHost("webview:title", title);
	});

	guest_window.webContents.on("did-finish-load", () => {
		guest_window.webContents.invalidate();
	});

	// Keep navigation inside the guest instead of spawning windows
	guest_window.webContents.setWindowOpenHandler((details) => {
		guest_window.webContents.loadURL(details.url);
		return { action: "deny" };
	});
}

function handleBitmapFrame(dirty, image) {
	const size = image.getSize();
	const cropped = dirty.width === size.width && dirty.height === size.height
		? image
		: image.crop(dirty);
	sendToHost("webview:frame", {
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

// Set OM_WEBVIEW_DEBUG=1 to log per frame geometry, mainly to catch
// frames arriving at unexpected sizes.
const debug_frames = Boolean(process.env.OM_WEBVIEW_DEBUG);

// Zero copy path. The texture is imported as a Chromium SharedImage
// reference and transferred to the host renderer, which draws it as a
// VideoFrame. Pixels never leave the GPU. The source texture is
// released via allReferencesReleased once main and the renderer have
// both released their imports and the GPU is done.
async function handleSharedTextureFrame(texture) {
	const info = texture.textureInfo;

	if (debug_frames) {
		const r = (rect) => rect ? `${rect.x},${rect.y} ${rect.width}x${rect.height}` : "none";
		console.log(
			`frame widget=${info.widgetType} fmt=${info.pixelFormat}`
			+ ` coded=${info.codedSize.width}x${info.codedSize.height}`
			+ ` visible=${r(info.visibleRect)} update=${r(info.metadata && info.metadata.captureUpdateRect)}`,
		);
	}

	// Popup widgets (select dropdowns etc) arrive as separate
	// textures. Not composited yet. The receiver must be registered
	// before sendSharedTexture or it times out.
	if (info.widgetType !== "frame" || !host_receiver_ready) {
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
		const [content_width, content_height] = guest_window.getContentSize();
		await sharedTexture.sendSharedTexture(
			{ frame: host_window.webContents.mainFrame, importedSharedTexture: imported },
			{
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

function sendToHost(channel, ...args) {
	if (!host_window || host_window.isDestroyed()) return;
	host_window.webContents.send(channel, ...args);
}

function wireIpc() {
	ipcMain.on("webview:log", (event, message) => {
		console.log(message);
	});

	ipcMain.on("webview:ready", () => {
		host_receiver_ready = true;
		// Frames painted before the receiver existed were dropped
		if (guest_window && !guest_window.isDestroyed()) {
			guest_window.webContents.invalidate();
		}
	});

	ipcMain.on("webview:input", (event, input_event) => {
		if (!guest_window || guest_window.isDestroyed()) return;
		guest_window.webContents.sendInputEvent(input_event);
	});

	ipcMain.on("webview:resize", (event, size) => {
		if (!guest_window || guest_window.isDestroyed()) return;
		if (size.width < 1 || size.height < 1) return;
		guest_window.setSize(Math.floor(size.width), Math.floor(size.height));
	});

	ipcMain.on("webview:focus", () => {
		if (!guest_window || guest_window.isDestroyed()) return;
		guest_window.webContents.focus();
	});

	ipcMain.handle("webview:navigate", (event, url) => {
		if (!guest_window || guest_window.isDestroyed()) return;
		let target = url.trim();
		if (!/^[a-z]+:/i.test(target)) {
			target = `https://${target}`;
		}
		guest_window.webContents.loadURL(target);
	});

	ipcMain.handle("webview:back", () => {
		if (guest_window && guest_window.webContents.navigationHistory.canGoBack()) {
			guest_window.webContents.navigationHistory.goBack();
		}
	});

	ipcMain.handle("webview:forward", () => {
		if (guest_window && guest_window.webContents.navigationHistory.canGoForward()) {
			guest_window.webContents.navigationHistory.goForward();
		}
	});

	ipcMain.handle("webview:reload", () => {
		if (guest_window) guest_window.webContents.reload();
	});
}
