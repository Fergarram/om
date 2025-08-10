import { initializeThemeSystem } from "@/config/theme";
import sys from "@/lib/bridge";
import { css, finish, useGlobalStyles } from "@/lib/utils";
import type { MonzonTheme, Theme } from "@/monzon/types";
import { AppSettings } from "@/monzon/state";

let theme: MonzonTheme | null = null;

export function useMonzonTheme() {
	if (!theme) {
		throw new Error("Theme not initialized yet");
	}

	return theme;
}

export type BasicColors = {
	background: string;
	selection: string;
	linenumber: string;
	inactive_selection: string;
	line_highlight: string;
	foreground: string;
	comment: string;
	foreground_dim: string;
	foreground_dimmer: string;
};

export async function initializeMonzonThemeSystem(theme_name: string) {
	const basepath = await sys.process.cwd();
	let theme_dir = `${basepath}/user/config/themes/monzon/bianco`;

	const customized_theme = await initializeThemeSystem(
		theme_dir,
		(theme) => css`
			@theme {
				${generateFontSizeVariables((theme as MonzonTheme).font_sizes)}
			}

			${generateComponentVariables((theme as MonzonTheme).components)}

			html {
				font-size: ${(theme as MonzonTheme).base_size};
				font-family: "${(theme as MonzonTheme).font_family}";
			}
		`,
	);

	// Validate needed theme json keys
	if (!validateThemeConfiguration(customized_theme)) {
		throw new Error("Invalid theme configuration");
	}

	// Now TypeScript knows theme is validated
	theme = customized_theme as MonzonTheme;

	window.MonacoEnvironment = {
		getWorkerUrl: () => "../../modules/monaco/vs/base/worker/workerMain.js",
	};

	// @ts-expect-error
	require.config({ paths: { vs: "../../modules/monaco/vs" } });

	// Wait for Monaco to load
	await new Promise<void>((resolve) => {
		// @ts-expect-error
		require(["./vs/editor/editor.main"], async () => {
			await finish();
			if (!theme) {
				throw new Error("Theme not initialized yet");
			}
			setupMonacoTheme(theme_name, theme.editor.base, theme.editor.basic_colors, theme.editor.overrides);
			resolve();
		});
	});

	return theme;
}

function generateComponentVariables(components: Record<string, Record<string, string>>): string {
	return Object.entries(components).reduce((acc, [component_name, stylesets]) => {
		return (
			acc +
			Object.entries(stylesets)
				.map(([styleset, classes]) =>
					classes
						? `
        .component-${component_name.replaceAll("_", "-")}-${styleset.replaceAll("_", "-")} {
            @apply ${classes};
        }`
						: "",
				)
				.join("")
		);
	}, "");
}

function generateFontSizeVariables(font_sizes?: Record<string, string>): string {
	if (!font_sizes) {
		return "";
	}

	let font_size_variables = "";

	for (const [size_alias, size_value] of Object.entries(font_sizes)) {
		// Convert snake_case or camelCase to CSS variable format
		const variable_name = size_alias
			.replace(/([A-Z])/g, "_$1") // Convert camelCase to snake_case if needed
			.toLowerCase()
			.replace(/_/g, "-"); // Convert snake_case to kebab-case for CSS

		font_size_variables += `--text-${variable_name}: ${size_value};\n\t\t\t`;
	}

	return font_size_variables;
}

function generateColorVariables(colors: Record<string, string>): string {
	let color_variables = "";

	for (const [key, value] of Object.entries(colors)) {
		// Convert snake_case or camelCase to CSS variable format
		const variable_name = key
			.replace(/([A-Z])/g, "_$1") // Convert camelCase to snake_case if needed
			.toLowerCase()
			.replace(/_/g, "-"); // Convert snake_case to kebab-case for CSS

		color_variables += `--color-${variable_name}: ${value};\n\t\t\t`;
	}

	return color_variables;
}

export function validateThemeConfiguration(theme: any): theme is MonzonTheme {
	// Check if theme is an object
	if (!theme || typeof theme !== "object") {
		return false;
	}

	// Required top-level properties
	const required_properties = ["base_size", "colors", "editor"];
	for (const prop of required_properties) {
		if (!(prop in theme)) {
			console.error(`Missing required theme property: ${prop}`);
			return false;
		}
	}

	// Validate base_size (should be a CSS size value)
	if (typeof theme.base_size !== "string" || !theme.base_size.match(/^\d+(\.\d+)?(px|em|rem|%)$/)) {
		console.error('base_size must be a valid CSS size string (e.g., "16px", "1rem")');
		return false;
	}

	// Validate colors object
	if (!theme.colors || typeof theme.colors !== "object") {
		console.error("colors must be an object");
		return false;
	}

	// Validate that all color values are strings (basic validation)
	for (const [key, value] of Object.entries(theme.colors)) {
		if (typeof value !== "string") {
			console.error(`Color value for "${key}" must be a string`);
			return false;
		}
	}

	// Validate editor configuration
	if (!theme.editor || typeof theme.editor !== "object") {
		console.error("editor must be an object");
		return false;
	}

	// Required editor properties
	const required_editor_properties = ["base", "basic_colors", "overrides"];
	for (const prop of required_editor_properties) {
		if (!(prop in theme.editor)) {
			console.error(`Missing required editor property: ${prop}`);
			return false;
		}
	}

	// Validate editor.base
	if (typeof theme.editor.base !== "string") {
		console.error("editor.base must be a string");
		return false;
	}

	// Validate editor.basic_colors
	if (!theme.editor.basic_colors || typeof theme.editor.basic_colors !== "object") {
		console.error("editor.basic_colors must be an object");
		return false;
	}

	// Validate that all basic_colors values are strings
	for (const [key, value] of Object.entries(theme.editor.basic_colors)) {
		if (typeof value !== "string") {
			console.error(`Editor basic color "${key}" must be a string`);
			return false;
		}
	}

	// Validate editor.overrides
	if (!theme.editor.overrides || typeof theme.editor.overrides !== "object") {
		console.error("editor.overrides must be an object");
		return false;
	}

	return true;
}

async function setupMonacoTheme(name: string, base: string, basic_colors: BasicColors, overrides: any) {
	console.log("Setting up Monaco theme:", name);
	useGlobalStyles(css`
		[class*="bracket-highlighting-"] {
			color: ${basic_colors.foreground} !important;
		}
	`);

	monaco.editor.defineTheme(name, {
		base: base as monaco.editor.BuiltinTheme,
		inherit: false,
		rules:
			overrides && overrides.rules
				? overrides.rules
				: [
						// Reset ALL tokens to default white first
						{ token: "", foreground: basic_colors.foreground },

						// Only override specific syntax elements
						{ token: "comment", foreground: basic_colors.comment },
						{ token: "comment.doc", foreground: basic_colors.comment },
						{ token: "variable.special", foreground: basic_colors.foreground_dimmer },
						{ token: "keyword", foreground: basic_colors.foreground_dimmer },
						{ token: "string", foreground: basic_colors.foreground_dim },
						{ token: "attribute", foreground: basic_colors.foreground_dimmer },

						// Target all the specific delimiter scopes Monaco uses
						{ token: "delimiter", foreground: basic_colors.foreground },
						{ token: "delimiter.bracket", foreground: basic_colors.foreground },
						{ token: "delimiter.bracket.square", foreground: basic_colors.foreground },
						{ token: "delimiter.bracket.curly", foreground: basic_colors.foreground },
						{ token: "delimiter.parenthesis", foreground: basic_colors.foreground },
						{ token: "delimiter.angle", foreground: basic_colors.foreground },
						// And their variants
						{ token: "brackets", foreground: basic_colors.foreground },
						{ token: "bracket", foreground: basic_colors.foreground },
						{ token: "parenthesis", foreground: basic_colors.foreground },
						// JSON-specific ones
						{ token: "delimiter.square", foreground: basic_colors.foreground },
						{ token: "delimiter.curly", foreground: basic_colors.foreground },

						// Then specify your custom colors
						{ token: "comment", foreground: basic_colors.comment },
						{ token: "comment.doc", foreground: basic_colors.comment },
						{ token: "variable", foreground: basic_colors.foreground },
						{ token: "variable.special", foreground: basic_colors.foreground_dimmer },
						{ token: "keyword", foreground: basic_colors.foreground_dimmer },
						{ token: "string", foreground: basic_colors.foreground_dim },
						{ token: "string.escape", foreground: basic_colors.foreground },
						{ token: "string.regex", foreground: basic_colors.foreground_dim },
						{ token: "string.special", foreground: basic_colors.foreground_dim },
						{ token: "string.special.symbol", foreground: basic_colors.foreground_dim },
						{ token: "number", foreground: basic_colors.foreground },
						{ token: "operator", foreground: basic_colors.foreground },
						{ token: "function", foreground: basic_colors.foreground },
						{ token: "function.call", foreground: basic_colors.foreground },
						{ token: "constant", foreground: basic_colors.foreground },
						{ token: "type", foreground: basic_colors.foreground },
						{ token: "type.identifier", foreground: basic_colors.foreground },
						{ token: "tag", foreground: basic_colors.foreground },
						{ token: "attribute", foreground: basic_colors.foreground_dimmer },
						{ token: "constructor", foreground: basic_colors.foreground },
						{ token: "punctuation", foreground: basic_colors.foreground },
						{ token: "punctuation.bracket", foreground: basic_colors.foreground },
						{ token: "punctuation.delimiter", foreground: basic_colors.foreground },
						{ token: "identifier", foreground: basic_colors.foreground },
						{ token: "support", foreground: basic_colors.foreground },
						{ token: "meta", foreground: basic_colors.foreground },
						{ token: "storage", foreground: basic_colors.foreground },
						{ token: "entity", foreground: basic_colors.foreground },
						{ token: "delimiter", foreground: basic_colors.foreground },
						{ token: "delimiter.bracket", foreground: basic_colors.foreground },
						{ token: "delimiter.parenthesis", foreground: basic_colors.foreground },
					],
		colors:
			overrides && overrides.colors
				? overrides.colors
				: {
						"editor.background": basic_colors.background,
						"editor.foreground": basic_colors.foreground,
						"editor.lineHighlightBackground": basic_colors.line_highlight,
						"editorCursor.foreground": basic_colors.foreground,
						"editor.selectionBackground": basic_colors.selection,
						"editorLineNumber.foreground": basic_colors.linenumber,
						"editorLineNumber.activeForeground": basic_colors.foreground,
						"editor.inactiveSelectionBackground": basic_colors.inactive_selection,
					},
	});

	monaco.editor.setTheme(name);

	const compilerOptions: monaco.languages.typescript.CompilerOptions = {
		target: monaco.languages.typescript.ScriptTarget.ES2020,
		allowNonTsExtensions: true,
		module: monaco.languages.typescript.ModuleKind.ESNext,
		noEmit: true,
		esModuleInterop: true,
		allowJs: true,
		strict: true,
		skipLibCheck: true,
		noImplicitGlobals: true,
	};

	const basepath = await sys.process.cwd();
	const types_path = `${basepath}/user/spaces/monzon/files/engines/${AppSettings.default_version}/types.d.ts`;
	const stormborn_types = await sys.file.read(types_path);

	monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
	monaco.languages.typescript.javascriptDefaults.addExtraLib(stormborn_types);
}
