import { ipcMain, dialog } from "electron";

ipcMain.handle("dialog.show_open", async (event, opt) => {
	return await dialog.showOpenDialog(opt);
});
