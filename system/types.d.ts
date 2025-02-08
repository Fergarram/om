import * as Electron from "electron/main";

declare global {
	var electron: typeof Electron;
}

// This export is needed to make this a module
export {};
