import type { FileInfo } from "./types";

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
	async is_win32() {
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
	async getInfo(filepath: string, basepath: string): Promise<FileInfo> {
		return await __sys.invoke("file.get_info", filepath, basepath);
	},
	async directoryTree(dirpath: string): Promise<FileInfo[]> {
		return await __sys.invoke("file.directory_tree", dirpath);
	},
	async getContentType(filepath: string): Promise<"text" | "binary" | "unknown"> {
		return await __sys.invoke("file.get_content_type", filepath);
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
};

const monzon = {
	async start_runner() {
		return await __sys.invoke("monzon.start_runner");
	},
	async create_window(opts) {
		return await __sys.invoke("monzon.create_window", opts);
	},
	async close_window(opts) {
		return await __sys.invoke("monzon.close_window", opts);
	},
	async on_close(callback) {
		return await __sys.on("monzon.window_close", callback);
	},
	async on_update(callback) {
		return await __sys.on("monzon.state_update", callback);
	},
};

const sys = { shell, process, file, dialog, menu, win, monzon };

export default sys;
