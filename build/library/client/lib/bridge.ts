// @ts-expect-error
const __sys = window.__sys;

const shell = {
	async exec(command: string) {
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
	async isWin32(): Promise<boolean> {
		return (await __sys.invoke("process.platform")) === "win32";
	},
	async cwd() {
		return await __sys.invoke("process.cwd");
	},
};

const file = {
	async dirname(filepath: string): Promise<string> {
		return await __sys.invoke("file.dirname", filepath);
	},
	async resolve(filepath: string): Promise<string> {
		return await __sys.invoke("file.resolve", filepath);
	},
	async exists(filepath: string): Promise<boolean> {
		return await __sys.invoke("file.exists", filepath);
	},
	async isDir(filepath: string, create_if_not_exists = false): Promise<boolean> {
		return await __sys.invoke("file.is_dir", filepath, create_if_not_exists);
	},
	async relative(basepath: string, filepath: string): Promise<string> {
		return await __sys.invoke("file.relative", basepath, filepath);
	},
	async parsePath(filepath: string): Promise<{
		root: string;
		dir: string;
		base: string;
		ext: string;
		name: string;
	}> {
		return await __sys.invoke("file.parse_path", filepath);
	},
	async rename(old_path: string, new_name: string): Promise<void> {
		return await __sys.invoke("file.rename", old_path, new_name);
	},
	async read(filepath: string, opt = "utf8"): Promise<string> {
		return await __sys.invoke("file.read", filepath, opt);
	},
	async write(filepath: string, content: any, opt = "utf8"): Promise<void> {
		return await __sys.invoke("file.write", filepath, content, opt);
	},
	async getInfo(filepath: string, basepath?: string) {
		return await __sys.invoke("file.get_info", filepath, basepath);
	},
	async directoryTree(dirpath: string) {
		return await __sys.invoke("file.directory_tree", dirpath);
	},
	async getContentType(filepath: string): Promise<"text" | "binary" | "unknown"> {
		return await __sys.invoke("file.get_content_type", filepath);
	},
};

const dialog = {
	async showOpen(opts: any) {
		return await __sys.invoke("dialog.show_open", opts);
	},
};

const menu = {
	async show(id: string, items: any[], x: number, y: number) {
		return await __sys.invoke("menu.show", id, items, x, y);
	},
	async onClick(callback: (event: any, ...args: any[]) => void) {
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
	async isMaximized(): Promise<boolean> {
		return await __sys.invoke("win.is_maximized");
	},
	async onMaximize(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("win.on_maximize", callback);
	},
	async onUnmaximize(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("win.on_unmaximize", callback);
	},
	async onMinimize(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("win.on_minimize", callback);
	},
	async openInBrowser(url: string) {
		return await __sys.invoke("win.open_in_browser", url);
	},
	async devtoolsOpened(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("win.devtools_opened", callback);
	},
	async devtoolsClosed(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("win.devtools_closed", callback);
	},
	async isDevtoolsOpen(): Promise<boolean> {
		return await __sys.invoke("win.is_devtools_open");
	},
	async getBounds() {
		return await __sys.invoke("win.get_bounds");
	},
	async focus() {
		return await __sys.invoke("win.focus");
	},
	async openSpace(space: string) {
		return await __sys.invoke("win.open_space", space);
	},
};

const appstream = {
	async select(opts: any) {
		return await __sys.invoke("appstream.select", opts);
	},
	async getCapturedWindows() {
		return await __sys.invoke("appstream.get_captured_windows");
	},
	async getWindowCapture(id: string) {
		return await __sys.invoke("appstream.get_window_capture", id);
	},
	async windowCaptureUpdated(callback: (id: string) => void) {
		__sys.on("appstream.window_capture_updated", (e: any, id: string) => {
			callback(id);
		});
	},
	async focusWindow(window_id: string) {
		return await __sys.invoke("appstream.focus_window", window_id);
	},
	async closeWindow(window_id: string) {
		return await __sys.invoke("appstream.close_window", window_id);
	},
	async onWindowClosed(callback: (id: string) => void) {
		return await __sys.on("appstream.window_closed", (e: any, id: string) => {
			callback(id);
		});
	},
	async resizeWindow(window_id: string, dimensions: any) {
		return await __sys.invoke("appstream.resize_window", window_id, dimensions);
	},
	async setWindowPosition(window_id: string, x: number, y: number) {
		return await __sys.invoke("appstream.set_window_position", window_id, x, y);
	},
};

const browser = {
	async newWindow(url: string) {
		return await __sys.invoke("browser.new_window", url);
	},
	async capturePage(webcontents_id: string) {
		return await __sys.invoke("browser.capture_page", webcontents_id);
	},
	async openWebviewDevtools(target_webview_wcid: string, devtools_webview_wcid: string) {
		return await __sys.invoke("browser.open_webview_devtools", target_webview_wcid, devtools_webview_wcid);
	},
};

const overlay = {
	async focus() {
		return await __sys.invoke("overlay.focus");
	},
	async setHeight(height: number) {
		return await __sys.invoke("overlay.set_height", height);
	},
	async openDevTools() {
		return await __sys.invoke("overlay.open_devtools");
	},
};

const shortcuts = {
	async register(options: { accelerator: string; name: string; description: string; callback: () => void }) {
		const { accelerator, name, description, callback } = options;

		__sys.on("shortcuts.triggered", (event: any, triggered_name: string) => {
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

	async unregister(name: string) {
		return await __sys.invoke("shortcuts.unregister", name);
	},

	async getAll() {
		return await __sys.invoke("shortcuts.get_all");
	},

	async onTrigger(callback: (name: string) => void) {
		return await __sys.on("shortcuts.triggered", (event: any, name: string) => {
			callback(name);
		});
	},
};

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
	overlay,
};

export default sys;
