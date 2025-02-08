const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("E", {
	syscall: (type, args) => {
		return ipcRenderer.invoke(type, args);
	},
});
