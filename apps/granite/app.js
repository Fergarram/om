const { app, Menu } = require("electron");

const { createWindow } = require("./modules/server/win.js");
const { createHud } = require("./modules/server/hud.js");

require("./modules/server/file.js");

console.log({
	electron: process.versions.electron,
	chrome: process.versions.chrome,
	node: process.versions.node,
	v8: process.versions.v8,
});

const args = process.argv.slice(2);
const arg_filename = args[0];
const arg_show_frame = args.includes("--show-frame");

app.whenReady().then(() => {
	const app_label = "granite-v1";

	const win = createWindow(app_label, {
		enable_defaults: true,
		show_frame: arg_show_frame
	});
	win.loadFile(arg_filename ? arg_filename : "./documents/index.html");

	const hud = createHud(app_label, win, {
		shortcut: "Alt+Escape",
	});

	// @TODO: This path should be an editable setting
	hud.webContents.loadFile("./hud/tty.html");

	const menu_template = [
		{
			label: "View",
			submenu: [
				{
					label: "Toggle HUD DevTools",
					accelerator: "Alt+Shift+I",
					click: () => {
						if (hud.webContents.isDevToolsOpened()) {
							hud.webContents.closeDevTools();
						} else {
							hud.webContents.openDevTools({ mode: "detach" });
						}
					},
				},
			],
		},
	];

	const default_menu = Menu.getApplicationMenu();
	const default_template = default_menu
		? default_menu.items.map((item) => ({
				label: item.label,
				submenu: item.submenu,
			}))
		: [];

	// Find the View menu in the default template and extend it
	const view_menu_index = default_template.findIndex((item) => item.label === "View");
	if (view_menu_index !== -1) {
		// Add custom items to existing View menu
		default_template[view_menu_index].submenu = [
			...default_template[view_menu_index].submenu.items,
			{ type: "separator" },
			...menu_template[0].submenu,
		];
	} else {
		// If no View menu exists, add our custom one
		default_template.push(menu_template[0]);
	}

	const menu = Menu.buildFromTemplate(default_template);
	Menu.setApplicationMenu(menu);
});

app.on("window-all-closed", () => {
	app.quit();
});
