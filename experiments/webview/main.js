"use strict";

//
// Om webview demo host.
//
// A plain Electron app: it opens one window that loads host.html and
// hands that window to the isolated-webview module. All the guest
// spawning, frame transfer, and input plumbing lives there; from here
// it looks like any normal Electron app that happens to use a webview
// component.
//

const { app, BrowserWindow } = require("electron/main");
const path = require("path");
const IsolatedWebview = require("./isolated-webview-main.js");

//
// Constants
//

const HOST_WIDTH = 1100;
const HOST_HEIGHT = 720;

//
// State
//

let host_window = null;

//
// Code execution
//

app.whenReady().then(async () => {
	host_window = new BrowserWindow({
		width: HOST_WIDTH,
		height: HOST_HEIGHT,
		useContentSize: true,
		backgroundColor: "#1a1a1a",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	IsolatedWebview.attachHost(host_window);

	await host_window.loadFile(path.join(__dirname, "host.html"));
});

app.on("window-all-closed", () => {
	app.quit();
});
