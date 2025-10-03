const { ipcMain } = require("electron");

ipcMain.handle("process.env", (event) => {
	return process.env;
});

ipcMain.handle("process.platform", (event) => {
	return process.platform;
});

ipcMain.handle("process.cwd", (event) => {
	return process.cwd();
});
