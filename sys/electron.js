import { app } from "electron";

import { create_window } from "./modules/win.js";

import "./modules/shell.js";
import "./modules/file.js";
import "./modules/process.js";
import "./modules/dialog.js";
import "./modules/menu.js";

// I need to recompile to same version of nodejs
// Meanwhile I'd have to set it up as an external node server
// const robot = require("./lib/robotjs/index.js");

app.whenReady().then(() => {
	create_window("home");
});

app.on("window-all-closed", () => {
	app.quit();
});
