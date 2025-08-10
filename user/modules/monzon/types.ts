import type { BasicColors } from "@/monzon/theme";

export type Project = {
	name: string;
	type: "prototype" | "pro_project" | "legacy";
	full_path: string;
	relative_path: string;
};

export type DirectoryEntry = {
	type: "file" | "folder" | "project";
	project?: Project;
	full_path: string;
	relative_path: string;
	filename: string;
	children: DirectoryEntry[];
	is_open: boolean;
	is_renaming: boolean;
};

export type WindowState = {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type FileInfo = {
	full_path: string;
	file_name: string;
	relative_path: string;
	extension: string;
	size: number;
	is_directory: boolean;
	children?: FileInfo[];
	content_type: "text" | "binary" | "unknown";
};

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
	[key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

export type Theme = JSONObject;

export type MonzonTheme = {
	base_size: string;
	global_classes: string;
	font_family: string;
	font_sizes: Record<string, string>;
	colors: Record<string, string>;
	icons: Record<string, Record<string, string>>;
	windows: {
		resize_handles: {
			edge_size: number;
			corner_size: number;
			offset: number;
		};
	};
	editor: {
		base: string;
		basic_colors: BasicColors;
		overrides: Record<string, any>;
		settings: monaco.editor.IStandaloneEditorConstructionOptions
	};
	components: Record<string, Record<string, string>>;
};

export type GlobalState = {
	running_game: boolean;
	last_running_mode: "play" | "debug";
	working_directory_path: string;
	working_directory_name: string;
	active_project: null | Project;
	recent_projects: Project[];
	projects_directory_tree: DirectoryEntry[];
	opened_windows: WindowState[];
};

export type GlobalStateKey = keyof GlobalState;

export type GlobalStateValue = GlobalState[GlobalStateKey];

export type AssistantPreset = {
	model: string;
	key: string;
	instructions: string; // path
	examples: string; // path
	use_embeddings_for_examples: boolean;
};

export type UserSettings = {
	default_version: string;
	theme: string;
	invert_colors: boolean;
	wallpaper_path: string;
	wallpaper_size: string;
	wallpaper_rendering: string;
	wallpaper_position: string;
	default_assistant: string;
	windows: {
		menu_button: string;
		snapping_distance: number;
	};
	assistants: Record<string, AssistantPreset>;
};

export type ShortcutCallback = (payload: { event: KeyboardEvent; win: HTMLElement }) => void;

export type ShortcutModifier = "Ctrl" | "Control" | "Alt" | "Shift" | "Meta" | "Command" | "CmdOrCtrl" | "CommandOrControl";

export type ShortcutKey =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z"
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "f1"
	| "f2"
	| "f3"
	| "f4"
	| "f5"
	| "f6"
	| "f7"
	| "f8"
	| "f9"
	| "f10"
	| "f11"
	| "f12"
	| "space"
	| "tab"
	| "capslock"
	| "caps"
	| "escape"
	| "esc"
	| "backspace"
	| "return"
	| "enter"
	| "up"
	| "down"
	| "left"
	| "right"
	| "home"
	| "end"
	| "pageup"
	| "pagedown"
	| "insert"
	| "delete"
	| "plus"
	| "="
	| "minus"
	| "-"
	| "*"
	| "asterisk"
	| "/"
	| "backslash"
	| "\\"
	| "forwardslash"
	| "|"
	| "pipe"
	| "."
	| "period"
	| "comma"
	| ","
	| "["
	| "]"
	| "{"
	| "}"
	| "("
	| ")"
	| "<"
	| ">"
	| "'"
	| '"'
	| "`"
	| "~"
	| "!"
	| "@"
	| "#"
	| "$"
	| "%"
	| "^"
	| "&"
	| ";"
	| ":"
	| "_"
	| "?"
	| "printscreen";
