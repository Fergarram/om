const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__sys", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	send: (channel, ...args) => ipcRenderer.send(channel, ...args),
	on: (channel, callback) => {
		const listener = (event, ...args) => callback(...args);
		ipcRenderer.on(channel, listener);
		return () => ipcRenderer.removeListener(channel, listener);
	},
});
