// "use strict";
// const { ipcRenderer, contextBridge } = require("electron/renderer");
// const policy = window.trustedTypes.createPolicy("electron-default-app", {
// 	// we trust the SVG contents
// 	createHTML: (input) => input,
// });
// async function initialize() {
// 	const electronPath = await ipcRenderer.invoke("bootstrap");
// 	function replaceText(selector, text) {
// 		const element = document.querySelector(selector);
// 		if (element) {
// 			element.innerText = text;
// 		}
// 	}
// 	replaceText(".electron-version", `Electron v${process.versions.electron}`);
// 	replaceText(".chrome-version", `Chromium v${process.versions.chrome}`);
// 	replaceText(".node-version", `Node v${process.versions.node}`);
// 	replaceText(".v8-version", `v8 v${process.versions.v8}`);
// }
// contextBridge.exposeInMainWorld("electronDefaultApp", {
// 	initialize,
// });
