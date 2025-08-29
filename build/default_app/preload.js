const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__sys", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	on: (channel, callback) => {
		ipcRenderer.on(channel, callback);
		return () => ipcRenderer.removeListener(channel, callback);
	},
});
