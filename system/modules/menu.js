import { ipcMain, BrowserWindow, Menu } from "electron";

ipcMain.handle("menu.show", async (event, id, items, x, y) => {
	const window = BrowserWindow.fromWebContents(event.sender);

	const menu_template = items.map((item) => {
		if (item.type === "separator") {
			return { type: "separator" };
		}

		return {
			...item,
			click: () => {
				window.webContents.send("menu.on_click", {
					id,
					item,
				});
			},
		};
	});

	const context_menu = Menu.buildFromTemplate(menu_template);
	context_menu.popup({ window, x, y });
});
