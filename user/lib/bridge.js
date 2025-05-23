const __sys = window.__sys;

const shell = {
	async exec(command) {
		return await __sys.invoke("shell.exec", command);
	},
};

const process = {
	async env() {
		return await __sys.invoke("process.env");
	},
	async platform() {
		return await __sys.invoke("process.platform");
	},
	async isWin32() {
		return (await __sys.invoke("process.platform")) === "win32";
	},
	async cwd() {
		return await __sys.invoke("process.cwd");
	},
};

const file = {
	async dirname(filepath) {
		return await __sys.invoke("file.dirname", filepath);
	},
	async resolve(filepath) {
		return await __sys.invoke("file.resolve", filepath);
	},
	async exists(filepath) {
		return await __sys.invoke("file.exists", filepath);
	},
	async isDir(filepath) {
		return await __sys.invoke("file.is_dir", filepath);
	},
	async relative(basepath, filepath) {
		return await __sys.invoke("file.relative", basepath, filepath);
	},
	async parsePath(filepath) {
		return await __sys.invoke("file.parse_path", filepath);
	},
	async rename(old_path, new_name) {
		return await __sys.invoke("file.rename", old_path, new_name);
	},
	async read(filepath, opt = "utf8") {
		return await __sys.invoke("file.read", filepath, opt);
	},
	async write(filepath, content, opt = "utf8") {
		return await __sys.invoke("file.write", filepath, content, opt);
	},
	async getInfo(filepath, basepath) {
		return await __sys.invoke("file.get_info", filepath, basepath);
	},
	async directoryTree(dirpath) {
		return await __sys.invoke("file.directory_tree", dirpath);
	},
};

const dialog = {
	async showOpen(opts) {
		return await __sys.invoke("dialog.show_open", opts);
	},
};

const menu = {
	async show(id, items, x, y) {
		return await __sys.invoke("menu.show", id, items, x, y);
	},
	async onClick(callback) {
		return await __sys.on("menu.on_click", callback);
	},
};

const win = {
	async close() {
		return await __sys.invoke("win.close");
	},
	async minimize() {
		return await __sys.invoke("win.minimize");
	},
	async maximize() {
		return await __sys.invoke("win.maximize");
	},
	async unmaximize() {
		return await __sys.invoke("win.unmaximize");
	},
	async isMaximized() {
		return await __sys.invoke("win.is_maximized");
	},
	async onMaximize(callback) {
		return await __sys.on("win.on_maximize", callback);
	},
	async onUnmaximize(callback) {
		return await __sys.on("win.on_unmaximize", callback);
	},
	async onMinimize(callback) {
		return await __sys.on("win.on_minimize", callback);
	},
	async openInBrowser(url) {
		return await __sys.invoke("win.open_in_browser", url);
	},
	async devtoolsOpened(callback) {
		return await __sys.on("win.devtools_opened", callback);
	},
	async devtoolsClosed(callback) {
		return await __sys.on("win.devtools_closed", callback);
	},
	async isDevtoolsOpen() {
		return await __sys.invoke("win.is_devtools_open");
	},
	async getBounds() {
		return await __sys.invoke("win.get_bounds");
	},
	async focus() {
		return await __sys.invoke("win.focus");
	},
	async openSpace(space) {
		return await __sys.invoke("win.open_space", space);
	},
};

const appstream = {
	async select(opts) {
		return await __sys.invoke("appstream.select", opts);
	},
	async getCapturedWindows() {
		return await __sys.invoke("appstream.get_captured_windows");
	},
	async getWindowCapture(id) {
		return await __sys.invoke("appstream.get_window_capture", id);
	},
	async windowCaptureUpdated(callback) {
		__sys.on("appstream.window_capture_updated", (e, id) => {
			callback(id);
		});
	},
	async focusWindow(window_id) {
		return await __sys.invoke("appstream.focus_window", window_id);
	},
	async closeWindow(window_id) {
		return await __sys.invoke("appstream.close_window", window_id);
	},
	async onWindowClosed(callback) {
		return await __sys.on("appstream.window_closed", (e, id) => {
			callback(id);
		});
	},
	async resizeWindow(window_id, dimensions) {
		return await __sys.invoke("appstream.resize_window", window_id, dimensions);
	},
	async setWindowPosition(window_id, x, y) {
		return await __sys.invoke("appstream.set_window_position", window_id, x, y);
	},
};

const browser = {
	async newWindow(url) {
		return await __sys.invoke("browser.new_window", url);
	},
	async capturePage(webcontents_id) {
		return await __sys.invoke("browser.capture_page", webcontents_id);
	},
	async openWebviewDevtools(target_webview_wcid, devtools_webview_wcid) {
		return await __sys.invoke("browser.open_webview_devtools", target_webview_wcid, devtools_webview_wcid);
	},
};

const overlay = {
	async focus() {
		return await __sys.invoke("overlay.focus");
	},
	async setHeight(height) {
		return await __sys.invoke("overlay.set_height", height);
	},
	async openDevTools() {
		return await __sys.invoke("overlay.open_devtools");
	},
	// async hideOverlay() {
	// 	return await __sys.invoke("overlay.hide_overlay");
	// }
};

const shortcuts = {
	async register(options) {
		const { accelerator, name, description, callback } = options;

		__sys.on("shortcuts.triggered", (event, triggered_name) => {
			if (triggered_name === name && typeof callback === "function") {
				callback();
			}
		});

		return await __sys.invoke("shortcuts.register", {
			accelerator,
			name,
			description,
		});
	},

	async unregister(name) {
		return await __sys.invoke("shortcuts.unregister", name);
	},

	async getAll() {
		return await __sys.invoke("shortcuts.get_all");
	},

	async onTrigger(callback) {
		return await __sys.on("shortcuts.triggered", (event, name) => {
			callback(name);
		});
	},
};

// Export the updated sys object with shortcuts included
const sys = {
	shell,
	process,
	file,
	dialog,
	menu,
	win,
	appstream,
	browser,
	shortcuts,
	overlay
};

export default sys;
