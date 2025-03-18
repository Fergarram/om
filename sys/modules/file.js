import { ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import { convert_from_windows_path } from "../lib/utils.js";

//
// Bridge Exports
//

ipcMain.handle("file.dirname", (event, filepath) => {
	return path.dirname(filepath);
});

ipcMain.handle("file.exists", async (event, filepath) => {
	try {
		await fs.access(filepath);
		return true;
	} catch {
		// Return the absolute path when the file doesn't exist
		return path.resolve(filepath);
	}
});

ipcMain.handle("file.resolve", async (event, filepath) => {
	return path.resolve(filepath);
});

ipcMain.handle("file.is_dir", async (event, filepath) => {
	return (await fs.stat(filepath)).isDirectory();
});

ipcMain.handle("file.parse_path", (event, filepath) => {
	return path.parse(filepath);
});

ipcMain.handle("file.relative", (event, basepath, filepath) => {
	return path.relative(basepath, filepath);
});

ipcMain.handle("file.rename", async (event, old_path, new_name) => {
	const directory = path.dirname(old_path);
	const new_path = path.join(directory, new_name);
	return await fs.rename(old_path, new_path);
});

ipcMain.handle("file.read", async (event, filepath, opt) => {
	return await fs.readFile(filepath, opt);
});

ipcMain.handle("file.write", async (event, filepath, content, opt) => {
	const directory = path.dirname(filepath);
	await fs.mkdir(directory, { recursive: true });
	return await fs.writeFile(filepath, content, opt);
});

ipcMain.handle("file.get_info", async (event, fullpath, basepath) => {
	return await get_file_info(fullpath, basepath);
});

ipcMain.handle("file.directory_tree", async (event, dirpath) => {
	return await directory_tree(dirpath);
});

//
// Internal Functions
//

async function directory_tree(dirpath, basepath = dirpath) {
	const items = await fs.readdir(dirpath);
	const directory_content = [];

	for (const item of items) {
		// Skip files/directories that start with a dot
		if (item.startsWith(".") || item.startsWith("node_modules")) continue;

		const full_path = path.join(dirpath, item);
		const file_info = await get_file_info(full_path, basepath);

		if (!file_info) continue;

		if (file_info.is_directory) {
			const children = await directory_tree(full_path, basepath);
			file_info.children = children;
		}

		directory_content.push(file_info);
	}

	return directory_content;
}

async function get_file_info(filepath, basepath = "") {
	const stats = await fs.stat(filepath);
	const parsed_path = path.parse(filepath);

	return {
		full_path: convert_from_windows_path(filepath),
		file_name: parsed_path.name,
		relative_path: basepath ? convert_from_windows_path(path.relative(basepath, filepath)) : "",
		extension: parsed_path.ext.slice(1),
		size: stats.size,
		is_directory: stats.isDirectory(),
	};
}
