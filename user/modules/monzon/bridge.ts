// @ts-expect-error
const __sys = window.__sys;

export const monzon = {
	async startRunner() {
		return await __sys.invoke("monzon.start_runner");
	},
	async createWindow(opts: any) {
		return await __sys.invoke("monzon.create_window", opts);
	},
	async closeWindow(opts: any) {
		return await __sys.invoke("monzon.close_window", opts);
	},
	async onClose(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("monzon.window_close", callback);
	},
	async onUpdate(callback: (event: any, ...args: any[]) => void) {
		return await __sys.on("monzon.state_update", callback);
	},
};
