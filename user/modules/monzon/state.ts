import sys from "@/lib/bridge";
import type { DirectoryEntry, UserSettings, FileInfo, GlobalState, GlobalStateKey, Project } from "./types";
import { isValidProjectFolder } from "./utils";

const STATE: GlobalState = {
	running_game: false,
	last_running_mode: "debug",
	active_project: null,
	recent_projects: [],
	projects_directory_tree: [],
	opened_windows: [],
	working_directory_path: "",
	working_directory_name: "",
};

export const AppState = new Proxy(STATE, {
	get(target, prop) {
		// Handle special methods
		if (prop === "save") {
			return () => {
				localStorage.setItem("AppState", JSON.stringify(target));
			};
		}

		if (prop === "load") {
			return async () => {
				const state_str = localStorage.getItem("AppState");
				if (state_str) {
					const loaded_state = JSON.parse(state_str) as GlobalState;
					// Update the target object with loaded values
					Object.assign(target, { ...loaded_state, running_game: false });
					await syncWorkingDirectory();
				}
				return target;
			};
		}

		if (prop === "clean") {
			return () => {
				const clean_state: GlobalState = {
					running_game: false,
					last_running_mode: "debug",
					active_project: null,
					recent_projects: [],
					projects_directory_tree: [],
					opened_windows: [],
					working_directory_path: "",
					working_directory_name: "",
				};
				Object.assign(target, clean_state);
				localStorage.setItem("AppState", JSON.stringify(target));
			};
		}

		return target[prop as GlobalStateKey];
	},

	set(target, prop, value) {
		// Only allow setting valid GlobalState keys
		if (typeof prop === "string" && prop in target) {
			(target as any)[prop] = value;
			// Automatically persist to localStorage on every change
			localStorage.setItem("AppState", JSON.stringify(target));
			return true;
		}
		return false;
	},
}) as GlobalState & {
	save(): void;
	load(): GlobalState;
	clean(): void;
};

let SETTINGS: UserSettings | null = null;

export const AppSettings = new Proxy({} as UserSettings, {
	get(target, prop) {
		if (prop === "load") {
			return async () => {
				const basepath = await sys.process.cwd();
				const settings_path = basepath + "/user/spaces/monzon/preferences.json";
				const user_settings_str = await sys.file.read(settings_path);
				SETTINGS = JSON.parse(user_settings_str) as UserSettings;
				// Update the proxy target with loaded values
				Object.assign(target, SETTINGS);
				return SETTINGS;
			};
		}

		if (prop === "replace") {
			return (new_settings: UserSettings) => {
				if (!SETTINGS) {
					throw new Error("Settings not loaded yet. Call AppSettings.load() first.");
				}

				// Replace the SETTINGS object
				SETTINGS = new_settings;

				// Clear the proxy target and update with new values
				Object.keys(target).forEach((key) => delete (target as any)[key]);
				Object.assign(target, SETTINGS);

				// Automatically save to file
				(async () => {
					try {
						const basepath = await sys.process.cwd();
						const settings_path = basepath + "/user/spaces/monzon/preferences.json";
						await sys.file.write(settings_path, JSON.stringify(SETTINGS, null, 2));
					} catch (error) {
						console.error("Failed to save settings:", error);
					}
				})();
			};
		}

		if (prop === "clone") {
			return () => {
				if (!SETTINGS) {
					throw new Error("Settings not loaded yet. Call AppSettings.load() first.");
				}
				return JSON.parse(JSON.stringify(SETTINGS)) as UserSettings;
			};
		}

		// Handle special methods
		if (prop === "save") {
			return async () => {
				if (!SETTINGS) return;
				const basepath = await sys.process.cwd();
				const settings_path = basepath + "/user/spaces/monzon/preferences.json";
				await sys.file.write(settings_path, JSON.stringify(SETTINGS, null, 2));
			};
		}

		if (!SETTINGS) {
			const stack = new Error().stack;
			console.error("Settings access attempted before loading. Stack trace:", stack);
			throw new Error("Settings not loaded yet. Call AppSettings.load() first.");
		}

		return SETTINGS[prop as keyof UserSettings];
	},

	set(target, prop, value) {
		if (!SETTINGS) {
			throw new Error("Settings not loaded yet. Call AppSettings.load() first.");
		}

		// Only allow setting valid UserSettings keys
		if (typeof prop === "string" && prop in SETTINGS) {
			(SETTINGS as any)[prop] = value;
			(target as any)[prop] = value;

			// Automatically save to file on every change
			(async () => {
				try {
					const basepath = await sys.process.cwd();
					const settings_path = basepath + "/user/spaces/monzon/preferences.json";
					await sys.file.write(settings_path, JSON.stringify(SETTINGS, null, 2));
				} catch (error) {
					console.error("Failed to save settings:", error);
				}
			})();

			return true;
		}
		return false;
	},
}) as UserSettings & {
	save(): Promise<void>;
	load(): Promise<UserSettings>;
	clone(): UserSettings;
	replace(new_settings: UserSettings): Promise<void>;
};

export function convertFileInfoToDirectoryEntry(info: FileInfo): DirectoryEntry {
	// Determine the type and project info
	let entry_type: "file" | "folder" | "project" = info.is_directory ? "folder" : "file";
	let project: Project | undefined;

	if (info.is_directory && isValidProjectFolder(info)) {
		entry_type = "project";

		// Determine project type
		const folder_files = info.children?.map((child) => child.file_name + (child.extension ? "." + child.extension : "")) || [];
		const has_public_dir = info.children?.some((child) => child.is_directory && child.file_name === "public") || false;

		let project_type: "prototype" | "pro_project" | "legacy";
		if (folder_files.includes("package.json") && has_public_dir) {
			project_type = "pro_project";
		} else if (folder_files.includes("template.html") && folder_files.includes("stormborn.ts")) {
			project_type = "legacy";
		} else {
			project_type = "prototype";
		}

		project = {
			name: info.file_name,
			type: project_type,
			full_path: info.full_path,
			relative_path: info.relative_path,
		};
	}

	// Convert children recursively
	const children: DirectoryEntry[] = info.children?.map(convertFileInfoToDirectoryEntry) || [];

	// Sort children with directories first, then alphabetically, but put "Trash" folder last
	children.sort((a, b) => {
		// Handle Trash folder - always put it last
		if (a.filename === "Trash") return 1;
		if (b.filename === "Trash") return -1;

		// Original sorting logic
		if (a.type === "file" && (b.type === "folder" || b.type === "project")) return 1;
		if ((a.type === "folder" || a.type === "project") && b.type === "file") return -1;
		return a.filename.localeCompare(b.filename);
	});

	return {
		type: entry_type,
		project,
		full_path: info.full_path,
		relative_path: info.relative_path,
		filename: info.extension ? `${info.file_name}.${info.extension}` : info.file_name,
		children,
		is_open: false,
		is_renaming: false,
	};
}

export async function readDirectoryEntries(path: string) {
	const start_time = performance.now();
	const files = await sys.file.directoryTree(path);
	let directory_entries: DirectoryEntry[] = [];

	// Sort files: folders first, then alphabetically
	const sorted_files = files.sort((a: any, b: any) => {
		const a_filename = a.extension ? `${a.file_name}.${a.extension}` : a.file_name;
		const b_filename = b.extension ? `${b.file_name}.${b.extension}` : b.file_name;

		// Handle Trash folder - always put it last
		if (a_filename === "Trash") return 1;
		if (b_filename === "Trash") return -1;

		// Original sorting logic
		if (a.is_directory === b.is_directory) {
			return a.file_name.localeCompare(b.file_name);
		}
		return a.is_directory ? -1 : 1;
	});

	directory_entries = sorted_files.map((file_info: any) => {
		return convertFileInfoToDirectoryEntry(file_info);
	});

	const end_time = performance.now();
	console.log(`readDirectoryEntries took ${end_time - start_time}ms`);

	return directory_entries;
}

export async function syncWorkingDirectory() {
	const new_directory_entries = await readDirectoryEntries(AppState.working_directory_path);

	function mergeDirectoryEntries(new_entries: DirectoryEntry[], old_entries: DirectoryEntry[]): DirectoryEntry[] {
		return new_entries.map((new_entry) => {
			// Find corresponding old entry by full_path
			const old_entry = old_entries.find((old) => old.full_path === new_entry.full_path);

			if (old_entry) {
				// Preserve is_open state and recursively merge children
				return {
					...new_entry,
					is_open: old_entry.is_open,
					children: mergeDirectoryEntries(new_entry.children, old_entry.children),
				};
			}

			// New entry, keep default is_open: false
			return new_entry;
		});
	}

	AppState.projects_directory_tree = mergeDirectoryEntries(new_directory_entries, AppState.projects_directory_tree);
}

export function findEntry(full_path: string, entries?: DirectoryEntry[]): DirectoryEntry | undefined {
	const search_entries = entries || AppState.projects_directory_tree;

	for (const entry of search_entries) {
		if (entry.full_path === full_path) {
			return entry;
		}

		if (entry.children.length > 0) {
			const found = findEntry(full_path, entry.children);
			if (found) {
				return found;
			}
		}
	}

	return undefined;
}
