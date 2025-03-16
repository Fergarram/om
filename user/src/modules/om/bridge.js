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
	async is_win32() {
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
	async exists(filepath) {
		return await __sys.invoke("file.exists", filepath);
	},
	async is_dir(filepath) {
		return await __sys.invoke("file.is_dir", filepath);
	},
	async relative(basepath, filepath) {
		return await __sys.invoke("file.relative", basepath, filepath);
	},
	async parse_path(filepath) {
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
	async get_info(filepath, basepath) {
		return await __sys.invoke("file.get_info", filepath, basepath);
	},
	async directory_tree(dirpath) {
		return await __sys.invoke("file.directory_tree", dirpath);
	},
};

const dialog = {
	async show_open(opts) {
		return await __sys.invoke("dialog.show_open", opts);
	},
};

const menu = {
	async show(id, items, x, y) {
		return await __sys.invoke("menu.show", id, items, x, y);
	},
	async on_click(callback) {
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
	async is_maximized() {
		return await __sys.invoke("win.is_maximized");
	},
	async on_maximize(callback) {
		return await __sys.on("win.on_maximize", callback);
	},
	async on_unmaximize(callback) {
		return await __sys.on("win.on_unmaximize", callback);
	},
	async on_minimize(callback) {
		return await __sys.on("win.on_minimize", callback);
	},
	async open_in_browser(url) {
		return await __sys.invoke("win.open_in_browser", url);
	},
	async devtools_opened(callback) {
		return await __sys.on("win.devtools_opened", callback);
	},
	async devtools_closed(callback) {
		return await __sys.on("win.devtools_closed", callback);
	},
	async is_devtools_open() {
		return await __sys.invoke("win.is_devtools_open");
	},
};

const appstream = {
	async select(opts) {
		return await __sys.invoke("appstream.select", opts);
	},
};

const browser = {
	async new_window(url) {
		return await __sys.invoke("browser.new_window", url);
	},
	async capture_page(webcontents_id) {
		return await __sys.invoke("browser.capture_page", webcontents_id);
	},
	async open_webview_devtools(target_webview_wcid, devtools_webview_wcid) {
		return await __sys.invoke("browser.open_webview_devtools", target_webview_wcid, devtools_webview_wcid);
	},
};

const sys = { shell, process, file, dialog, menu, win, appstream, browser };

export default sys;
