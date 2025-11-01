"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const electron = require("electron/main");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { app, dialog } = electron;
const Module = require("module");

const { default: asar } = require("./asar.js");

//
// Parse command line options
//

const argv = process.argv.slice(1);

const option = {
	file: null,
	no_help: Boolean(process.env.OM_NO_HELP),
	version: false,
	webdriver: false,
	interactive: false,
	abi: false,
	help: false,
	modules: [],
	unpack_asar: null,
	pack_asar: null,
};

let next_arg_is_require = false;
let next_arg_is_unpack_asar = false;
let next_arg_is_pack_asar = false;

for (const arg of argv) {
	if (next_arg_is_require) {
		option.modules.push(arg);
		next_arg_is_require = false;
		continue;
	} else if (next_arg_is_unpack_asar) {
		option.unpack_asar = arg;
		next_arg_is_unpack_asar = false;
		continue;
	} else if (next_arg_is_pack_asar) {
		option.pack_asar = arg;
		next_arg_is_pack_asar = false;
		continue;
	} else if (arg === "--version" || arg === "-v") {
		option.version = true;
		break;
	} else if (arg === "--help" || arg === "-h") {
		// Add this condition
		option.help = true;
		break;
	} else if (arg.match(/^--app=/)) {
		option.file = arg.split("=")[1];
		break;
	} else if (arg === "--interactive" || arg === "-i" || arg === "-repl") {
		option.interactive = true;
	} else if (arg === "--test-type=webdriver") {
		option.webdriver = true;
	} else if (arg === "--require" || arg === "-r") {
		next_arg_is_require = true;
		continue;
	} else if (arg === "--unpack-asar") {
		next_arg_is_unpack_asar = true;
		continue;
	} else if (arg === "--pack-asar") {
		next_arg_is_pack_asar = true;
		continue;
	} else if (arg === "--abi" || arg === "-a") {
		option.abi = true;
		continue;
	} else if (arg === "--no-help") {
		option.no_help = true;
		continue;
	} else if (arg[0] === "-") {
		continue;
	} else {
		option.file = arg;
		break;
	}
}

if (next_arg_is_require) {
	console.error('Invalid Usage: --require [file]\n\n"file" is required');
	process.exit(1);
}

if (next_arg_is_unpack_asar) {
	console.error('Invalid Usage: --unpack-asar [archive_path]\n\n"archive_path" is required');
	process.exit(1);
}

if (next_arg_is_pack_asar) {
	console.error('Invalid Usage: --pack-asar [directory_path]\n\n"directory_path" is required');
	process.exit(1);
}

if (option.modules.length > 0) {
	Module._preloadModules(option.modules);
}

// First, check for asar commands
if (option.unpack_asar) {
	unpackAsar(option.unpack_asar);
} else if (option.pack_asar) {
	packAsar(option.pack_asar);

	// Start the specified app if there is one specified in command line, otherwise
	// start the default app.
} else if (option.file && !option.webdriver) {
	const file = option.file;
	const protocol = url.parse(file).protocol;
	const extension = path.extname(file);
	if (protocol === "http:" || protocol === "https:" || protocol === "file:" || protocol === "chrome:") {
		loadApplicationByURL(file);
	} else if (extension === ".html" || extension === ".htm") {
		loadApplicationByFile(path.resolve(file));
	} else {
		loadApplicationPackage(file);
	}
} else if (option.version) {
	console.log(process.versions);
	process.exit(0);
} else if (option.abi) {
	console.log(process.versions.modules);
	process.exit(0);
} else if (option.interactive) {
	startRepl();
} else {
	if (!option.no_help) {
		const welcome_message = `
Usage: om [options] [path]

A path to an Om app may be specified. It must be one of the following:
  - Entry JavaScript file
  - Folder containing a package.json file
  - Folder containing an index.js file
  - Any html/htm file.
  - http://, https://, or file:// URL.

Options:
  -i, --interactive       Open a REPL to the main process.
  -r, --require           Module to preload (option can be repeated).
  -v, --version           Print the version.
  -a, --abi               Print the Node ABI version.
  --pack-asar             Create an asar archive from a directory.
  --unpack-asar           Extract an asar archive to a directory.`;
		console.log(welcome_message);
		process.exit(0);
	}
}

async function unpackAsar(archive_path) {
	try {
		const resolved_path = path.resolve(archive_path);
		if (!fs.existsSync(resolved_path)) {
			console.error(`Archive not found: ${resolved_path}`);
			process.exit(1);
		}

		const output_dir = path.join(path.dirname(resolved_path), path.basename(resolved_path, ".asar"));
		console.log(`Extracting ${resolved_path} to ${output_dir}...`);

		await asar.extractAll(resolved_path, output_dir);
		console.log("Extraction completed successfully.");
		process.exit(0);
	} catch (error) {
		console.error(`Failed to extract asar archive: ${error.message}`);
		process.exit(1);
	}
}

async function packAsar(directory_path) {
	try {
		const resolved_path = path.resolve(directory_path);
		if (!fs.existsSync(resolved_path)) {
			console.error(`Directory not found: ${resolved_path}`);
			process.exit(1);
		}

		const archive_path = `${resolved_path}.asar`;
		console.log(`Packing ${resolved_path} to ${archive_path}...`);

		await asar.createPackage(resolved_path, archive_path);
		console.log("Packaging completed successfully.");
		process.exit(0);
	} catch (error) {
		console.error(`Failed to create asar archive: ${error.message}`);
		process.exit(1);
	}
}

function loadApplicationPackage(package_path) {
	// Add a flag indicating app is started from default app.
	Object.defineProperty(process, "defaultApp", {
		configurable: false,
		enumerable: true,
		value: true,
	});
	try {
		// Override app's package.json data.
		package_path = path.resolve(package_path);
		const package_json_path = path.join(package_path, "package.json");
		let app_path;
		if (fs.existsSync(package_json_path)) {
			let package_json;
			try {
				package_json = require(package_json_path);
			} catch (e) {
				showErrorMessage(`Unable to parse ${package_json_path}\n\n${e.message}`);
				return;
			}
			if (package_json.version) {
				app.setVersion(package_json.version);
			}
			if (package_json.productName) {
				app.name = package_json.productName;
			} else if (package_json.name) {
				app.name = package_json.name;
			}
			if (package_json.desktopName) {
				app.setDesktopName(package_json.desktopName);
			} else {
				app.setDesktopName(`${app.name}.desktop`);
			}
			// Set v8 flags, deliberately lazy load so that apps that do not use this
			// feature do not pay the price
			if (package_json.v8Flags) {
				require("v8").setFlagsFromString(package_json.v8Flags);
			}
			app_path = package_path;
		}

		let resolved_app_path;
		try {
			const file_path = Module._resolveFilename(package_path, module, true);
			resolved_app_path = app_path || path.dirname(file_path);
			app.setAppPath(resolved_app_path);
		} catch (e) {
			showErrorMessage(`Unable to find Om app at ${package_path}\n\n${e.message}`);
			return;
		}

		// Set the working directory to the application's root directory
		process.chdir(resolved_app_path);

		// Run the app.
		Module._load(package_path, module, true);
	} catch (e) {
		console.error("App threw an error during load");
		console.error(e.stack || e);
		throw e;
	}
}

function showErrorMessage(message) {
	app.focus();
	dialog.showErrorBox("Error launching app", message);
	process.exit(1);
}

async function loadApplicationByURL(app_url) {
	const { loadURL } = await Promise.resolve().then(() => require("./default_app"));
	loadURL(app_url);
}

async function loadApplicationByFile(app_path) {
	const { loadFile } = await Promise.resolve().then(() => require("./default_app"));
	loadFile(app_path);
}

function startRepl() {
	if (process.platform === "win32") {
		console.error("Electron REPL not currently supported on Windows");
		process.exit(1);
	}
	// Prevent quitting.
	app.on("window-all-closed", () => {});
	const GREEN = "32";
	const colorize = (color, s) => `\x1b[${color}m${s}\x1b[0m`;
	const electron_version = colorize(GREEN, `v${process.versions.electron}`);
	const node_version = colorize(GREEN, `v${process.versions.node}`);
	console.info(`
    Welcome to the Electron.js REPL \\[._.]/

    You can access all Electron.js modules here as well as Node.js modules.
    Using: Node.js ${node_version} and Electron.js ${electron_version}
  `);
	const { REPLServer } = require("repl");
	const repl = new REPLServer({
		prompt: "> ",
	}).on("exit", () => {
		process.exit(0);
	});

	function defineBuiltin(context, name, getter) {
		const setReal = (val) => {
			// Deleting the property before re-assigning it disables the
			// getter/setter mechanism.
			delete context[name];
			context[name] = val;
		};
		Object.defineProperty(context, name, {
			get: () => {
				const lib = getter();
				delete context[name];
				Object.defineProperty(context, name, {
					get: () => lib,
					set: setReal,
					configurable: true,
					enumerable: false,
				});
				return lib;
			},
			set: setReal,
			configurable: true,
			enumerable: false,
		});
	}

	defineBuiltin(repl.context, "electron", () => electron);
	for (const api of Object.keys(electron)) {
		defineBuiltin(repl.context, api, () => electron[api]);
	}
	// Copied from node/lib/repl.js. For better DX, we don't want to
	// show e.g 'contentTracing' at a higher priority than 'const', so
	// we only trigger custom tab-completion when no common words are
	// potentially matches.
	const common_words = [
		"async",
		"await",
		"break",
		"case",
		"catch",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"else",
		"export",
		"false",
		"finally",
		"for",
		"function",
		"if",
		"import",
		"in",
		"instanceof",
		"let",
		"new",
		"null",
		"return",
		"switch",
		"this",
		"throw",
		"true",
		"try",
		"typeof",
		"var",
		"void",
		"while",
		"with",
		"yield",
	];
	const electron_builtins = [...Object.keys(electron), "original-fs", "electron"];
	const default_complete = repl.completer;
	repl.completer = (line, callback) => {
		const last_space = line.lastIndexOf(" ");
		const current_symbol = line.substring(last_space + 1, repl.cursor);
		const filter_fn = (c) => c.startsWith(current_symbol);
		const ignores = common_words.filter(filter_fn);
		const hits = electron_builtins.filter(filter_fn);
		if (!ignores.length && hits.length) {
			callback(null, [hits, current_symbol]);
		} else {
			default_complete.apply(repl, [line, callback]);
		}
	};
}

//# sourceMappingURL=main.js.map
