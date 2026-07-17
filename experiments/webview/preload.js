const { contextBridge, ipcRenderer, sharedTexture } = require("electron");

contextBridge.exposeInMainWorld("__sys", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	send: (channel, ...args) => ipcRenderer.send(channel, ...args),
	on: (channel, callback) => {
		const listener = (event, ...args) => callback(...args);
		ipcRenderer.on(channel, listener);
		return () => ipcRenderer.removeListener(channel, listener);
	},
	// false on Electron versions without the sharedTexture module
	shared_texture_supported: Boolean(sharedTexture),
	// The imported texture object crosses the bridge as a proxy, same
	// pattern as Electron's shared texture test fixtures. The page
	// draws from it; release happens here once the page is done.
	setSharedTextureReceiver: (callback) => {
		if (!sharedTexture) return;
		sharedTexture.setSharedTextureReceiver(async (data, meta) => {
			const imported = data.importedSharedTexture;
			try {
				await callback(imported, meta);
			} finally {
				imported.release();
			}
		});
	},
});
