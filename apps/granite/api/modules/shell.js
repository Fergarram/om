const { ipcMain } = require("electron");
const { exec } = require("child_process");
const util = require("util");

const exec_promise = util.promisify(exec);

ipcMain.handle("shell.exec", async (event, command) => {
	try {
		return await exec_promise(command);
	} catch (error) {
		console.error("Invoke Error: [shell]::exec", error);
		return error;
	}
});
