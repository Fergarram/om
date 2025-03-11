export function setup_monaco_theme() {
	// Define custom theme
	monaco.editor.defineTheme("stormborn", {
		base: "vs-dark",
		inherit: false,
		rules: [
			// Reset ALL tokens to default white first
			{ token: "", foreground: "#FFFFFF" },

			// Only override specific syntax elements
			{ token: "comment", foreground: "#FF00FF84" },
			{ token: "comment.doc", foreground: "#0000FF84" },
			{ token: "variable.special", foreground: "#A0A0A0" },
			{ token: "keyword", foreground: "#A0A0A0" },
			{ token: "string", foreground: "#E0E0E0" },
			{ token: "attribute", foreground: "#A0A0A0" },

			// Target all the specific delimiter scopes Monaco uses
			{ token: "delimiter", foreground: "#FFFFFF" },
			{ token: "delimiter.bracket", foreground: "#FFFFFF" },
			{ token: "delimiter.bracket.square", foreground: "#FFFFFF" },
			{ token: "delimiter.bracket.curly", foreground: "#FFFFFF" },
			{ token: "delimiter.parenthesis", foreground: "#FFFFFF" },
			{ token: "delimiter.angle", foreground: "#FFFFFF" },
			// And their variants
			{ token: "brackets", foreground: "#FFFFFF" },
			{ token: "bracket", foreground: "#FFFFFF" },
			{ token: "parenthesis", foreground: "#FFFFFF" },
			// JSON-specific ones
			{ token: "delimiter.square", foreground: "#FFFFFF" },
			{ token: "delimiter.curly", foreground: "#FFFFFF" },

			// Then specify your custom colors
			{ token: "comment", foreground: "#FF00FF84" },
			{ token: "comment.doc", foreground: "#0000FF84" },
			{ token: "variable", foreground: "#FFFFFF" },
			{ token: "variable.special", foreground: "#A0A0A0" },
			{ token: "keyword", foreground: "#A0A0A0" },
			{ token: "string", foreground: "#E0E0E0" },
			{ token: "string.escape", foreground: "#FFFFFF" },
			{ token: "string.regex", foreground: "#E0E0E0" },
			{ token: "string.special", foreground: "#E0E0E0" },
			{ token: "string.special.symbol", foreground: "#E0E0E0" },
			{ token: "number", foreground: "#FFFFFF" },
			{ token: "operator", foreground: "#FFFFFF" },
			{ token: "function", foreground: "#FFFFFF" },
			{ token: "function.call", foreground: "#FFFFFF" },
			{ token: "constant", foreground: "#FFFFFF" },
			{ token: "type", foreground: "#FFFFFF" },
			{ token: "type.identifier", foreground: "#FFFFFF" },
			{ token: "tag", foreground: "#FFFFFF" },
			{ token: "attribute", foreground: "#A0A0A0" },
			{ token: "constructor", foreground: "#FFFFFF" },
			{ token: "punctuation", foreground: "#FFFFFF" },
			{ token: "punctuation.bracket", foreground: "#FFFFFF" },
			{ token: "punctuation.delimiter", foreground: "#FFFFFF" },
			{ token: "identifier", foreground: "#FFFFFF" },
			{ token: "support", foreground: "#FFFFFF" },
			{ token: "meta", foreground: "#FFFFFF" },
			{ token: "storage", foreground: "#FFFFFF" },
			{ token: "entity", foreground: "#FFFFFF" },
			{ token: "delimiter", foreground: "#FFFFFF" },
			{ token: "delimiter.bracket", foreground: "#FFFFFF" },
			{ token: "delimiter.parenthesis", foreground: "#FFFFFF" },
		],
		colors: {
			"editor.background": "#151515",
			"editor.foreground": "#FFFFFF",
			"editor.lineHighlightBackground": "#101010",
			"editorCursor.foreground": "#FFFFFF",
			"editor.selectionBackground": "#282828",
			"editorLineNumber.foreground": "#505050",
			"editorLineNumber.activeForeground": "#FFFFFF",
			"editor.inactiveSelectionBackground": "#282828",
		},
	});

	// Set the theme
	monaco.editor.setTheme("stormborn");
}
