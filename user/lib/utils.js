export function fade(color, opacity) {
	return `color-mix(in oklch, var(${color}), transparent ${100 - opacity}%)`;
}

export async function try_catch(func) {
	try {
		const result = func();
		// Check if the result is a promise
		if (result instanceof Promise) {
			return [await result, null];
		}
		return [result, null];
	} catch (error) {
		return [null, error];
	}
}

export function is_scrollable(element) {
	if (!element) return false;
	const style = window.getComputedStyle(element);
	const overflow_y = style.getPropertyValue("overflow-y");
	const overflow_x = style.getPropertyValue("overflow-x");
	return (
		(overflow_y === "scroll" || overflow_y === "auto" || overflow_x === "scroll" || overflow_x === "auto") &&
		(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
	);
}

export function GlobalStyleSheet(styles) {
	const sheet = create_stylesheet("global_styles");

	// Remove comments and normalize whitespace
	const cleaned_css = styles
		.replace(/\/\*[\s\S]*?\*\//g, "") // Remove CSS comments
		.replace(/\s+/g, " ")
		.trim();

	// Parse the CSS into individual rules
	let rules = [];
	let current_rule = "";
	let brace_count = 0;

	for (let i = 0; i < cleaned_css.length; i++) {
		const char = cleaned_css[i];
		current_rule += char;

		if (char === "{") {
			brace_count++;
		} else if (char === "}") {
			brace_count--;

			// If we've closed a top-level rule
			if (brace_count === 0) {
				rules.push(current_rule.trim());
				current_rule = "";
			}
		}
	}

	// Insert each rule into the stylesheet
	for (const rule of rules) {
		try {
			sheet.insertRule(rule, sheet.cssRules.length);
		} catch (error) {
			console.error(`Failed to insert CSS rule: ${rule}`, error);
		}
	}
}

export function create_stylesheet(id) {
	let sheet = document.adoptedStyleSheets.find((sheet) => sheet.id === id);
	if (!sheet) {
		sheet = new CSSStyleSheet();
		sheet.id = id;
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
	return sheet;
}

export function repeat(length, val) {
	return Array.from({ length }, () => val);
}

export function throttle(func, wait) {
	let waiting = false;
	return function (...args) {
		if (!waiting) {
			func(...args);
			waiting = true;
			setTimeout(() => (waiting = false), wait);
		}
	};
}

export function finish(time = 0) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

export function css(strings, ...values) {
	return strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ""), "");
}

export function convert_from_windows_path(path) {
	return path.replace(/\\/g, "/");
}

export function convert_to_windows_path(path) {
	return path.replace(/\//g, "\\");
}

export function is_image_file(ext) {
	const exts = ["jpg", "jpeg", "png", "gif", "webp"];
	return exts.includes(ext.toLowerCase());
}

export function get_image_media_type(filepath) {
	const ext = filepath.toLowerCase();
	if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
	if (ext.endsWith(".png")) return "image/png";
	if (ext.endsWith(".gif")) return "image/gif";
	if (ext.endsWith(".webp")) return "image/webp";
	return null;
}

export function is_sound_file(ext) {
	const exts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "aiff", "mid", "midi"];
	return exts.includes(ext.toLowerCase());
}

export function is_valid_project_folder(item) {
	if (!item.is_directory || !item.children) return false;

	const required_files = ["template.html", "stormborn.ts", "index.js"];
	const folder_files = item.children.map((child) => child.file_name + (child.extension ? "." + child.extension : ""));

	return required_files.every((file) => folder_files.includes(file));
}

export function get_file_language(filename) {
	const extension = filename.split(".").pop().toLowerCase();

	const language_map = {
		// Programming Languages
		js: "javascript",
		ts: "typescript",
		jsx: "javascript",
		tsx: "typescript",
		py: "python",
		cpp: "cpp",
		c: "c",
		h: "cpp",
		hpp: "cpp",
		cs: "csharp",
		java: "java",
		rb: "ruby",
		php: "php",
		go: "go",
		rs: "rust",
		swift: "swift",

		// Web Technologies
		html: "html",
		htm: "html",
		css: "css",
		scss: "scss",
		less: "less",
		json: "json",
		xml: "xml",
		svg: "xml",

		// Markup/Config
		md: "markdown",
		markdown: "markdown",
		yaml: "yaml",
		yml: "yaml",
		toml: "toml",
		ini: "ini",

		// Shell Scripts
		sh: "shell",
		bash: "shell",
		zsh: "shell",
		bat: "bat",
		cmd: "bat",

		// Game Development
		glsl: "glsl",
		frag: "glsl",
		vert: "glsl",
		shader: "glsl",

		// Data formats
		csv: "plaintext",
		txt: "plaintext",
		log: "plaintext",

		// Chat files
		chat: "markdown",
	};

	return language_map[extension] || "plaintext";
}
