import { BrowserWindow, ipcMain, webContents } from "electron";

ipcMain.handle("browser.new_window", (event, url) => {
	// const parent_window = BrowserWindow.fromWebContents(event.sender);
	const new_window = new BrowserWindow({
		width: 1024,
		height: 600,
	});
	new_window.loadFile(url);
});

ipcMain.handle("browser.capture_page", async (event, webcontents_id) => {
	// Get the WebContents instance by ID
	const contents = webContents.fromId(webcontents_id);
	if (!contents) {
		console.error("WebContents not found");
		return null;
	}

	// Capture the page
	const image = await contents.capturePage();
	return image.toDataURL();
});

ipcMain.handle("browser.open_webview_devtools", async (event, target_webview_wcid, devtools_webview_wcid) => {
	const target = webContents.fromId(target_webview_wcid);
	const devtools = webContents.fromId(devtools_webview_wcid);
	target.setDevToolsWebContents(devtools);
});
