import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { autocompletion } from "@codemirror/autocomplete";
import { search, searchKeymap } from "@codemirror/search";
import { foldKeymap } from "@codemirror/language";
import { defaultKeymap, historyKeymap, insertTab } from "@codemirror/commands";
import { keymap, ViewUpdate } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting, indentUnit } from "@codemirror/language";
import type { Extension } from "@codemirror/state";

function createTheme(config: {
	theme: "light" | "dark";
	settings: {
		background: string;
		backgroundImage: string;
		foreground: string;
		caret: string;
		lineHighlight: string;
		gutterBackground: string;
		gutterForeground: string;
		fontFamily: string;
		fontSize: string;
	};
	styles: Array<{ tag: any; color: string }>;
}) {
	const theme = EditorView.theme(
		{
			"&": {
				backgroundColor: config.settings.background,
				color: config.settings.foreground,
				fontSize: config.settings.fontSize,
				fontFamily: config.settings.fontFamily,
				height: "100%",
				width: "100%",
			},
			".cm-scroller": {
				overflow: "auto",
				height: "100%",
			},
			".cm-content": {
				caretColor: config.settings.caret,
				fontSize: config.settings.fontSize,
				fontFamily: config.settings.fontFamily,
			},
			".cm-cursor, .cm-dropCursor": {
				borderLeftColor: config.settings.caret,
			},
			"&.cm-focused .cm-selectionBackground, ::selection": {
				backgroundColor: config.settings.lineHighlight,
			},
			".cm-activeLine": {
				backgroundColor: config.settings.lineHighlight,
			},
			".cm-gutters": {
				backgroundColor: config.settings.gutterBackground,
				color: config.settings.gutterForeground,
				border: "none",
				fontSize: config.settings.fontSize,
				fontFamily: config.settings.fontFamily,
			},
			".cm-activeLineGutter": {
				backgroundColor: config.settings.lineHighlight,
			},
		},
		{ dark: config.theme === "dark" },
	);

	const highlighting = HighlightStyle.define(config.styles);

	return [theme, syntaxHighlighting(highlighting)];
}

export const minimalDark = createTheme({
	theme: "dark",
	settings: {
		background: "#101010",
		backgroundImage: "",
		foreground: "#ffffff",
		caret: "#cacaca",
		lineHighlight: "#aafee717",
		gutterBackground: "#101010",
		gutterForeground: "#444444",
		fontFamily: "'Jetbrains Mono', 'Geist Mono', monospace",
		fontSize: "12px",
	},
	styles: [
		{ tag: t.comment, color: "#aafee7" },
		{ tag: t.variableName, color: "#ffffff" },
		{ tag: [t.string, t.special(t.brace)], color: "#d0d0d0" },
		{ tag: t.number, color: "#d0d0d0" },
		{ tag: t.bool, color: "#d0d0d0" },
		{ tag: t.null, color: "#d0d0d0" },
		{ tag: t.keyword, color: "#a0a0a0" },
		{ tag: t.operator, color: "#ffffff" },
		{ tag: t.className, color: "#ffffff" },
		{ tag: t.definition(t.typeName), color: "#ffffff" },
		{ tag: t.typeName, color: "#ffffff" },
		{ tag: t.angleBracket, color: "#ffffff" },
		{ tag: t.tagName, color: "#ffffff" },
		{ tag: t.attributeName, color: "#ffffff" },
	],
});

export const minimalLight = createTheme({
	theme: "light",
	settings: {
		background: "#ffffff",
		backgroundImage: "",
		foreground: "#1a1a1a",
		caret: "#1a1a1a",
		lineHighlight: "#0066ff0a",
		gutterBackground: "#ffffff",
		gutterForeground: "#999999",
		fontFamily: "'Jetbrains Mono', 'Geist Mono', monospace",
		fontSize: "12px",
	},
	styles: [
		{ tag: t.comment, color: "#008080" },
		{ tag: t.variableName, color: "#1a1a1a" },
		{ tag: [t.string, t.special(t.brace)], color: "#505050" },
		{ tag: t.number, color: "#505050" },
		{ tag: t.bool, color: "#505050" },
		{ tag: t.null, color: "#505050" },
		{ tag: t.keyword, color: "#707070" },
		{ tag: t.operator, color: "#1a1a1a" },
		{ tag: t.className, color: "#1a1a1a" },
		{ tag: t.definition(t.typeName), color: "#1a1a1a" },
		{ tag: t.typeName, color: "#1a1a1a" },
		{ tag: t.angleBracket, color: "#1a1a1a" },
		{ tag: t.tagName, color: "#1a1a1a" },
		{ tag: t.attributeName, color: "#1a1a1a" },
	],
});

export const fontOverride = EditorView.theme({
	"&": {
		fontSize: "12px",
		fontFamily: "'Jetbrains Mono', 'Geist Mono', monospace",
	},
	".cm-content": {
		fontSize: "12px",
		fontFamily: "'Jetbrains Mono', 'Geist Mono', monospace",
	},
	".cm-gutters": {
		fontSize: "12px",
		fontFamily: "'Jetbrains Mono', 'Geist Mono', monospace",
	},
});

const language_map = {
	javascript: () => javascript(),
	typescript: () => javascript({ typescript: true }),
	jsx: () => javascript({ jsx: true }),
	tsx: () => javascript({ jsx: true, typescript: true }),
	css: () => css(),
	html: () => html(),
	json: () => json(),
	markdown: () => markdown(),
	xml: () => xml(),
	bash: () => null,
};

type LanguageType = keyof typeof language_map;
type ThemeType = "dark" | "light";

export type EditorConfig = {
	host: HTMLElement;
	language: LanguageType;
	source: string;
	theme: ThemeType;
	onInput?: (value: string) => void;
};

export function createEditor(config: EditorConfig, extensions: Extension[] = []): EditorView {
	const { host, language, source, theme, onInput } = config;

	const language_extension = language_map[language]();
	const theme_extension = theme === "dark" ? minimalDark : minimalLight;

	const default_extensions: Extension[] = [
		basicSetup,
		keymap.of([
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...foldKeymap,
			{ key: "Tab", run: insertTab },
		]),
		...theme_extension,
		fontOverride,
		autocompletion(),
		search({ top: true }),
		EditorView.lineWrapping,
		EditorState.tabSize.of(4),
		indentUnit.of("\t"),
		...extensions,
	];

	if (onInput) {
		default_extensions.push(
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (update.docChanged) {
					const new_value = update.state.doc.toString();
					onInput(new_value);
				}
			}),
		);
	}

	if (language_extension) {
		default_extensions.push(language_extension);
	}

	const state = EditorState.create({
		doc: source,
		extensions: default_extensions,
	});

	const view = new EditorView({
		state,
		parent: host,
	});

	return view;
}
