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

const { app, BrowserWindow, ipcMain } = require("electron/main");
const fs = require("fs");
const path = require("path");

//
// Constants
//

const FRAME_RATE = 60;
const INITIAL_GUEST_WIDTH = 1024;
const INITIAL_GUEST_HEIGHT = 640;
const INITIAL_URL = `file://${path.join(__dirname, "guest_test_page.html")}`;

//
// State
//

let host_window = null;
let guest_window = null;

//
// Code execution
//

app.whenReady().then(async () => {
	createHostWindow();
	createGuestWindow();
	wireIpc();

	await host_window.loadFile(path.join(__dirname, "host.html"));
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
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			sandbox: true,
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
			offscreen: true,
		},
	});

	guest_window.webContents.setFrameRate(FRAME_RATE);

	// Frame source. This is the only part that changes for the
	// shared texture path.
	guest_window.webContents.on("paint", (event, dirty, image) => {
		if (!host_window || host_window.isDestroyed()) return;
		const size = image.getSize();
		const cropped = dirty.width === size.width && dirty.height === size.height
			? image
			: image.crop(dirty);
		host_window.webContents.send("webview:frame", {
			width: size.width,
			height: size.height,
			dirty,
			pixels: cropped.getBitmap(),
		});
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

function sendToHost(channel, ...args) {
	if (!host_window || host_window.isDestroyed()) return;
	host_window.webContents.send(channel, ...args);
}

function wireIpc() {
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
