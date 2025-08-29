import type { ShortcutKey, ShortcutModifier } from "./types";

export function shortcut(...parts: (ShortcutModifier | ShortcutKey)[]): string {
	return parts.join("+");
}

export function uniqueId(): string {
	// Check if crypto API is available
	if (typeof crypto === "undefined") {
		throw new Error("Crypto API is not available in this environment");
	}

	// Generate random values
	const random_values = new Uint8Array(16);
	crypto.getRandomValues(random_values);

	// Set version (4) and variant bits according to RFC4122
	random_values[6] = (random_values[6] & 0x0f) | 0x40; // version 4
	random_values[8] = (random_values[8] & 0x3f) | 0x80; // variant 1

	// Convert to hex string and format as UUID
	const hex_values = Array.from(random_values).map((byte) => byte.toString(16).padStart(2, "0"));

	return [
		hex_values.slice(0, 4).join(""),
		hex_values.slice(4, 6).join(""),
		hex_values.slice(6, 8).join(""),
		hex_values.slice(8, 10).join(""),
		hex_values.slice(10, 16).join(""),
	].join("-");
}

export function isUserTyping(): boolean {
	// Check if the active element is an input (excluding buttons, checkboxes, radio, etc.)
	if (document.activeElement?.tagName === "INPUT") {
		const input_type = (document.activeElement as HTMLInputElement).type.toLowerCase();
		const non_text_types = ["button", "checkbox", "radio", "submit", "reset", "file", "image", "range", "color", "hidden"];
		if (!non_text_types.includes(input_type)) {
			return true;
		}
	}

	// Check if the active element is a textarea
	if (document.activeElement?.tagName === "TEXTAREA") {
		return true;
	}

	// Check if the active element has contenteditable attribute
	if (document.activeElement?.getAttribute("contenteditable") === "true") {
		return true;
	}

	return false;
}

export function fade(color: string, opacity: number): string {
	return `color-mix(in oklch, var(${color}), transparent ${100 - opacity}%)`;
}

export function docMain(): HTMLElement | null {
	return document.body.querySelector("main");
}

type DebouncedFunction<T extends (...args: any[]) => any> = {
	(...args: Parameters<T>): Promise<ReturnType<T>>;
	callback: Promise<ReturnType<T>>;
	cancel: () => void;
};

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): DebouncedFunction<T> {
	let timeout_id: number | null = null;
	let resolve_callback: ((value: ReturnType<T>) => void) | null = null;

	// Create a promise that we'll resolve when the debounced function actually executes
	const debounced = (...args: Parameters<T>) => {
		if (timeout_id) {
			clearTimeout(timeout_id);
		}

		// Create new promise for this call
		debounced.callback = new Promise<ReturnType<T>>((resolve) => {
			resolve_callback = resolve;
		});

		timeout_id = window.setTimeout(() => {
			const result = fn.apply(null, args);
			if (resolve_callback) {
				resolve_callback(result);
			}
			timeout_id = null;
		}, delay);

		return debounced.callback;
	};

	// Attach the promise as a property of the function
	debounced.callback = Promise.resolve() as Promise<ReturnType<T>>;

	// Add cancel method
	debounced.cancel = () => {
		if (timeout_id) {
			clearTimeout(timeout_id);
			timeout_id = null;
		}
	};

	return debounced;
}

export async function tryCatch<T>(func: () => T | Promise<T>): Promise<[T, null] | [null, Error]> {
	try {
		const result = func();
		// Check if the result is a promise
		if (result instanceof Promise) {
			return [await result, null];
		}
		return [result, null];
	} catch (error) {
		return [null, error instanceof Error ? error : new Error(String(error))];
	}
}

export function isScrollable(element: HTMLElement | null): boolean {
	if (!element) return false;
	const style = window.getComputedStyle(element);
	const overflow_y = style.getPropertyValue("overflow-y");
	const overflow_x = style.getPropertyValue("overflow-x");
	return (
		(overflow_y === "scroll" || overflow_y === "auto" || overflow_x === "scroll" || overflow_x === "auto") &&
		(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
	);
}

export function useGlobalStyles(styles: string): void {
	const sheet = createStylesheet("global_styles");

	// Remove comments and normalize whitespace
	const cleaned_css = styles
		.replace(/\/\*[\s\S]*?\*\//g, "") // Remove CSS comments
		.replace(/\s+/g, " ")
		.trim();

	// Parse the CSS into individual rules
	let rules: string[] = [];
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

export function createStylesheet(id: string): CSSStyleSheet {
	let sheet = (document.adoptedStyleSheets as any[]).find((sheet) => sheet.id === id);
	if (!sheet) {
		sheet = new CSSStyleSheet();
		(sheet as any).id = id;
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
	return sheet;
}

export function repeat<T>(length: number, val: T): T[] {
	return Array.from({ length }, () => val);
}

export function throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
	let waiting = false;
	return function (...args: Parameters<T>): void {
		if (!waiting) {
			func(...args);
			waiting = true;
			setTimeout(() => (waiting = false), wait);
		}
	};
}

export function finish(time = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, time));
}

export function finishFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function css(strings: TemplateStringsArray, ...values: any[]): string {
	return strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ""), "");
}

export function convertFromWindowsPath(path: string): string {
	return path.replace(/\\/g, "/");
}

export function convertToWindowsPath(path: string): string {
	return path.replace(/\//g, "\\");
}

export function isImageFile(ext: string): boolean {
	const exts = ["jpg", "jpeg", "png", "gif", "webp"];
	return exts.includes(ext.toLowerCase());
}

export function getImageMediaType(filepath: string): string | null {
	const ext = filepath.toLowerCase();
	if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
	if (ext.endsWith(".png")) return "image/png";
	if (ext.endsWith(".gif")) return "image/gif";
	if (ext.endsWith(".webp")) return "image/webp";
	return null;
}

export function isSoundFile(ext: string): boolean {
	const exts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "aiff", "mid", "midi"];
	return exts.includes(ext.toLowerCase());
}

export function getFileLanguage(filename: string): string {
	const extension = filename.split(".").pop()?.toLowerCase() || "";

	const language_map: Record<string, string> = {
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

export function cn(...classes: (string | undefined | Record<string, boolean> | (string | undefined)[])[]): string {
	return classes
		.flatMap((cls) => {
			if (typeof cls === "string" || cls === undefined) {
				return cls;
			}
			if (Array.isArray(cls)) {
				return cls;
			}
			if (typeof cls === "object" && cls !== null) {
				return Object.entries(cls)
					.filter(([_, value]) => value)
					.map(([key, _]) => key);
			}
			return undefined;
		})
		.filter(Boolean)
		.join(" ");
}
