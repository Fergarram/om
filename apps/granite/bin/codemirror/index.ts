import * as All from "codemirror";
import * as state from "@codemirror/state";
import * as view from "@codemirror/view";
import * as commands from "@codemirror/commands";
import * as lang from "@codemirror/language";
import * as JS from "@codemirror/lang-javascript";

export default {
	All,
	State: state,
	View: view,
	Commands: commands,
	Language: lang,
	Languages: {
		JavaScript: JS,
	},
};
