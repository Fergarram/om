const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { convert_from_windows_path } = require("./utils.js");

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
		return false;
	}
});

ipcMain.handle("file.resolve", async (event, filepath) => {
	return path.resolve(filepath);
});

ipcMain.handle("file.is_dir", async (event, filepath, create_if_not_exists = false) => {
	try {
		const stats = await fs.stat(filepath);
		return stats.isDirectory();
	} catch (error) {
		if (error.code === "ENOENT") {
			// Directory doesn't exist
			if (create_if_not_exists) {
				try {
					await fs.mkdir(filepath, { recursive: true });
					return true;
				} catch (createError) {
					console.error(`Failed to create directory ${filepath}:`, createError);
					return false;
				}
			}
			return false;
		}
		// Other errors (permission denied, etc.)
		throw error;
	}
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
	return await getFileInfo(fullpath, basepath);
});

ipcMain.handle("file.directory_tree", async (event, dirpath) => {
	return await directoryTree(dirpath);
});

ipcMain.handle("file.get_content_type", async (event, filepath) => {
	return await getContentType(filepath);
});

//
// Internal Functions
//

async function directoryTree(dirpath, basepath = dirpath) {
	try {
		const items = await fs.readdir(dirpath, { withFileTypes: true });
		const directory_content = [];

		// Process files in parallel batches to avoid overwhelming the system
		const batch_size = 10;
		for (let i = 0; i < items.length; i += batch_size) {
			const batch = items.slice(i, i + batch_size);
			const batch_promises = batch.map(async (item) => {
				// Skip files/directories that start with a dot
				if (item.name.startsWith(".") || item.name.startsWith("node_modules")) {
					return null;
				}

				const full_path = path.join(dirpath, item.name);
				const file_info = await getFileInfoFromDirent(full_path, basepath, item);

				if (!file_info) return null;

				if (file_info.is_directory) {
					const children = await directoryTree(full_path, basepath);
					file_info.children = children;
				}

				return file_info;
			});

			const batch_results = await Promise.all(batch_promises);
			directory_content.push(...batch_results.filter(Boolean));
		}

		// Sort once at the end
		return directory_content.sort((a, b) => {
			if (a.is_directory === b.is_directory) {
				return a.file_name.localeCompare(b.file_name);
			}
			return a.is_directory ? -1 : 1;
		});
	} catch (error) {
		console.error(`Error reading directory ${dirpath}:`, error);
		return [];
	}
}

async function getFileInfo(filepath, basepath = "") {
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

async function getFileInfoFromDirent(filepath, basepath = "", dirent) {
	try {
		const stats = dirent.isDirectory() ? null : await fs.stat(filepath); // Only stat files, not dirs
		const parsed_path = path.parse(filepath);

		return {
			full_path: convert_from_windows_path(filepath),
			file_name: parsed_path.name,
			relative_path: basepath ? convert_from_windows_path(path.relative(basepath, filepath)) : "",
			extension: parsed_path.ext.slice(1),
			size: stats ? stats.size : 0,
			is_directory: dirent.isDirectory(),
		};
	} catch (error) {
		console.error(`Error getting file info for ${filepath}:`, error);
		return null;
	}
}

async function getContentType(filepath) {
	try {
		const stats = await fs.stat(filepath);

		// If it's a directory, return unknown
		if (stats.isDirectory()) {
			return "unknown";
		}

		const parsed_path = path.parse(filepath);
		const extension = parsed_path.ext.toLowerCase();

		// Known text file extensions
		const text_extensions = [
			".txt",
			".md",
			".json",
			".js",
			".ts",
			".jsx",
			".tsx",
			".html",
			".htm",
			".css",
			".scss",
			".sass",
			".less",
			".xml",
			".yaml",
			".yml",
			".toml",
			".ini",
			".cfg",
			".conf",
			".log",
			".sql",
			".py",
			".rb",
			".php",
			".java",
			".c",
			".cpp",
			".h",
			".hpp",
			".cs",
			".go",
			".rs",
			".sh",
			".bat",
			".ps1",
			".dockerfile",
			".gitignore",
			".gitattributes",
			".env",
			".properties",
			".vue",
			".svelte",
			".astro",
			".r",
			".swift",
			".kt",
			".scala",
			".clj",
			".pl",
			".lua",
			".vim",
			".emacs",
			".bashrc",
			".zshrc",
			".profile",
		];

		// Known binary file extensions
		const binary_extensions = [
			".exe",
			".dll",
			".so",
			".dylib",
			".bin",
			".dmg",
			".pkg",
			".msi",
			".deb",
			".rpm",
			".zip",
			".rar",
			".tar",
			".gz",
			".7z",
			".bz2",
			".xz",
			".jpg",
			".jpeg",
			".png",
			".gif",
			".bmp",
			".tiff",
			".webp",
			".svg",
			".ico",
			".mp3",
			".wav",
			".flac",
			".ogg",
			".aac",
			".m4a",
			".wma",
			".mp4",
			".avi",
			".mkv",
			".mov",
			".wmv",
			".flv",
			".webm",
			".m4v",
			".pdf",
			".doc",
			".docx",
			".xls",
			".xlsx",
			".ppt",
			".pptx",
			".odt",
			".ods",
			".odp",
			".ttf",
			".otf",
			".woff",
			".woff2",
			".eot",
			".db",
			".sqlite",
			".sqlite3",
		];

		if (text_extensions.includes(extension)) {
			return "text";
		}

		if (binary_extensions.includes(extension)) {
			return "binary";
		}

		// For files without extension or unknown extensions, sample the content
		try {
			// Read first 1024 bytes to check for binary content
			const sample_size = Math.min(1024, stats.size);
			const file_handle = await fs.open(filepath, "r");
			const buffer = Buffer.alloc(sample_size);
			await file_handle.read(buffer, 0, sample_size, 0);
			await file_handle.close();

			// Check for null bytes (common indicator of binary files)
			for (let i = 0; i < buffer.length; i++) {
				if (buffer[i] === 0) {
					return "binary";
				}
			}

			// Check if the content is mostly printable ASCII/UTF-8
			const text_content = buffer.toString("utf8");
			const printable_chars = text_content.match(/[\x20-\x7E\t\n\r]/g);
			const printable_ratio = printable_chars ? printable_chars.length / text_content.length : 0;

			// If more than 90% of characters are printable, consider it text
			if (printable_ratio > 0.9) {
				return "text";
			} else {
				return "binary";
			}
		} catch {
			// If we can't read the file content, return unknown
			return "unknown";
		}
	} catch {
		return "unknown";
	}
}
