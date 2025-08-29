const { ipcMain, dialog } = require("electron");

ipcMain.handle("dialog.show_open", async (event, opt) => {
	return await dialog.showOpenDialog(opt);
});
