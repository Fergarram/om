import { app } from "electron";

import { create_window } from "./modules/win.js";

import "./modules/shell.js";
import "./modules/file.js";
import "./modules/process.js";
import "./modules/dialog.js";
import "./modules/menu.js";

app.whenReady().then(() => {
	create_window("home");
});

app.on("window-all-closed", () => {
	app.quit();
});
