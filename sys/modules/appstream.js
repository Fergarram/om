const { desktopCapturer, ipcMain } = require("electron");

ipcMain.handle("appstream.select", async (event, options) => {
	return await desktopCapturer.getSources(options);
});
