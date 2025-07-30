import sys from "@/monzon/src/lib/bridge";
import { initializeCompiler } from "@/lib/tw";
import { css, finish, useGlobalStyles } from "@/monzon/src/lib/utils";
import { setupMonacoTheme, type BasicColors } from "./monaco";
import type { StormbornCompatibleTheme, Theme } from "@/monzon/src/lib/types";

// Global CSS Vars
import "./vars.js";

export async function initializeThemeSettings(theme_name: string) {
	const basepath = await sys.process.cwd();
	const theme_dir = `${basepath}/user/spaces/monzon/config/themes/${theme_name}`;
	const theme_config = await sys.file.read(theme_dir + "/theme.json");
	const theme_raw = JSON.parse(theme_config) as Theme;

	// Validate needed theme json keys
	if (!validateThemeConfiguration(theme_raw)) {
		throw new Error("Invalid theme configuration");
	}

	// Now TypeScript knows theme is validated
	const theme = theme_raw as StormbornCompatibleTheme;

	window.MonacoEnvironment = {
		getWorkerUrl: () => "vs/base/worker/workerMain.js",
	};

	// @ts-expect-error
	require.config({ paths: { vs: "./vs" } });

	// Wait for Monaco to load
	await new Promise<void>((resolve) => {
		// @ts-expect-error
		require(["vs/editor/editor.main"], async () => {
			await finish();
			setupMonacoTheme(theme_name, theme.editor.base, theme.editor.basic_colors, theme.editor.overrides);
			resolve();
		});
	});

	// Now continue with the rest after Monaco is loaded
	useGlobalStyles(await sys.file.read(theme_dir + "/icon.css"));

	await initializeCompiler(css`
		@import "tailwindcss";

		@theme {
			/* Colors */
			${generateColorVariables(theme.colors)}

			/* Typography */
			--font-weight-100: var(--font-100);
			--font-weight-200: var(--font-200);
			--font-weight-300: var(--font-300);
			--font-weight-400: var(--font-400);
			--font-weight-500: var(--font-500);
			--font-weight-600: var(--font-600);
			--font-weight-700: var(--font-700);
			--font-weight-800: var(--font-800);
			--font-weight-900: var(--font-900);

			/* Base font sizes */
			--text-1: var(--size-1);
			--text-2: var(--size-2);
			--text-3: var(--size-3);
			--text-3_5: var(--size-3_5);
			--text-4: var(--size-4);
			--text-4_5: var(--size-4_5);
			--text-5: var(--size-5);
			--text-6: var(--size-6);
			--text-7: var(--size-7);
			--text-8: var(--size-8);
			--text-9: var(--size-9);
			--text-10: var(--size-10);
			--text-11: var(--size-11);
			--text-12: var(--size-12);
			--text-14: var(--size-14);
			--text-16: var(--size-16);
			--text-20: var(--size-20);
			--text-24: var(--size-24);
			--text-28: var(--size-28);
			--text-32: var(--size-32);
			--text-36: var(--size-36);
			--text-40: var(--size-40);
			--text-44: var(--size-44);
			--text-48: var(--size-48);
			--text-52: var(--size-52);
			--text-56: var(--size-56);
			--text-60: var(--size-60);
			--text-64: var(--size-64);
			--text-72: var(--size-72);
			--text-80: var(--size-80);
			--text-96: var(--size-96);
			--text-104: var(--size-104);
			--text-112: var(--size-112);
			--text-120: var(--size-120);
			--text-128: var(--size-128);

			/* Theme font sizes */
			${generateFontSizeVariables(theme.font_sizes)}
		}

		@layer utilities {
			.app-drag {
				-webkit-app-region: drag;
			}

			.pixelated {
				image-rendering: -moz-crisp-edges;
				image-rendering: -webkit-crisp-edges;
				image-rendering: pixelated;
				image-rendering: crisp-edges;
			}
		}

		${generateComponentVariables(theme.components)}

		html {
			font-size: ${theme.base_size};
			font-family: "${theme.font_family}";
		}

		${await sys.file.read(theme_dir + "/overrides.css")}
	`);

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

export function validateThemeConfiguration(theme: any): theme is StormbornCompatibleTheme {
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
