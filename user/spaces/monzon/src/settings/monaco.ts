import sys from "@/monzon/src/lib/bridge";
import { AppSettings } from "@/monzon/src/lib/state";
import { css, useGlobalStyles } from "@/monzon/src/lib/utils";

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

export async function setupMonacoTheme(name: string, base: string, basic_colors: BasicColors, overrides: any) {
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
	const types_path = `${basepath}/user/spaces/monzon/config/versions/${AppSettings.default_version}/stormborn.d.ts`;
	const stormborn_types = await sys.file.read(types_path);

	monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
	monaco.languages.typescript.javascriptDefaults.addExtraLib(stormborn_types);
}
