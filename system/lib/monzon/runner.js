import { readdir, stat, writeFile, watch } from "fs/promises";
import path, { join } from "path";
import fs from "fs";
import http from "http";
import ts from "../tsc.js";

let current_directory = null;
let project_type = null;

async function get_js_files(dir_path) {
	const files = [];

	async function scan_directory(current_path) {
		const entries = await readdir(current_path);

		for (const entry of entries) {
			const full_path = join(current_path, entry);
			const stats = await stat(full_path);

			if (stats.isDirectory()) {
				await scan_directory(full_path);
			} else if (entry.endsWith(".js")) {
				files.push(full_path);
			}
		}
	}

	await scan_directory(dir_path);
	return files;
}

async function watch_template() {
	if (!current_directory) return;

	try {
		const template_path = join(get_serve_directory(), "template.html");
		const watcher = watch(path.dirname(template_path), { recursive: false });

		for await (const event of watcher) {
			if (event.filename === "template.html") {
				console.log("Detected change in template.html");
				const js_files = await get_js_files(join(get_serve_directory(), "code"));
				await update_html_imports(js_files);
			}
		}
	} catch (error) {
		console.error("Error watching template:", error);
	}
}

async function update_html_imports(js_files) {
	if (!current_directory) return;

	const serve_directory = get_serve_directory();
	const template_path = join(serve_directory, "template.html");
	const index_path = join(serve_directory, "index.html");
	const html_content = await fs.promises.readFile(template_path, "utf-8");

	const import_strings = js_files
		.map((file) => path.relative(serve_directory, file))
		.map((file, i) => `${i === 0 ? "" : "\t"}\t<script type="module" src="${file}"></script>`);

	const updated_content = html_content.replace("</body>", `${import_strings.join("\n")}\n</body>`);

	await writeFile(index_path, updated_content);
	console.log("Updated index.html with new imports");
}

async function watch_code_directory() {
	if (!current_directory) return;

	const code_path = join(get_serve_directory(), "code");

	try {
		const watcher = watch(code_path, { recursive: true });

		for await (const event of watcher) {
			console.log(`Detected ${event.eventType} in code directory`);
			const js_files = await get_js_files(code_path);
			await update_html_imports(js_files);
		}
	} catch (error) {
		console.error("Error watching directory:", error);
	}
}

async function build_stormborn_lib() {
	if (!current_directory || project_type !== "legacy") return;

	try {
		const serve_directory = get_serve_directory();
		const file_path = path.join(serve_directory, "stormborn.ts");

		// Check if the file exists before trying to read it
		if (!fs.existsSync(file_path)) {
			console.log("stormborn.ts not found, skipping build");
			return;
		}

		const code = fs.readFileSync(file_path, "utf8");

		const transpiled = ts.transpileModule(code, {
			compilerOptions: {
				module: ts.ModuleKind.ESNext,
				target: ts.ScriptTarget.ES2017,
				strict: true,
				moduleResolution: ts.ModuleResolutionKind.NodeNext,
				esModuleInterop: true,
			},
		});

		const out_path = path.join(serve_directory, "stormborn.js");
		await fs.promises.writeFile(out_path, transpiled.outputText);

		console.log("Successfully built stormborn.js");
	} catch (error) {
		console.error("Error building stormborn library:", error);
	}
}

async function watch_stormborn_lib() {
	if (!current_directory || project_type !== "legacy") return;

	const serve_directory = get_serve_directory();
	const watcher = watch(serve_directory, { recursive: true });

	for await (const event of watcher) {
		if (event.filename === "stormborn.ts") {
			console.log("Detected change in stormborn.ts, rebuilding...");
			await build_stormborn_lib();
		}
	}
}

function get_serve_directory() {
	if (!current_directory) return null;

	if (project_type === "project") {
		return join(current_directory, "public");
	}

	return current_directory;
}

async function change_directory(new_directory, new_project_type) {
	try {
		// If new_directory is null, clear the current directory
		if (new_directory === null) {
			current_directory = null;
			project_type = null;
			return;
		}

		const stats = await stat(new_directory);
		if (!stats.isDirectory()) {
			throw new Error("Provided path is not a directory");
		}

		// Validate project_type
		if (!["prototype", "project", "legacy"].includes(new_project_type)) {
			throw new Error("Invalid project_type. Must be 'prototype', 'project', or 'legacy'");
		}

		// Check if public directory exists for project type
		if (new_project_type === "project") {
			const public_dir = join(new_directory, "public");
			try {
				const public_stats = await stat(public_dir);
				if (!public_stats.isDirectory()) {
					throw new Error("Project type 'project' requires a 'public' subdirectory");
				}
			} catch (error) {
				throw new Error("Project type 'project' requires a 'public' subdirectory");
			}
		}

		current_directory = new_directory;
		project_type = new_project_type;
		console.log(`Changed working directory to: ${new_directory} (${project_type})`);

		// Build stormborn lib only for legacy projects
		if (project_type === "legacy") {
			await build_stormborn_lib();

			const js_files = await get_js_files(join(get_serve_directory(), "code"));
			await update_html_imports(js_files);

			// Restart watchers
			watch_code_directory().catch((error) => {
				console.error("Watcher error:", error);
			});

			watch_template().catch((error) => {
				console.error("Template watcher error:", error);
			});

			watch_stormborn_lib().catch((error) => {
				console.error("Stormborn watcher error:", error);
			});
		}
	} catch (error) {
		console.error("Error changing directory:", error);
		throw error;
	}
}

function get_no_directory_html() {
	return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Stormborn Pro</title>
        </head>
        <body>
            No game is running.
        </body>
        </html>
    `;
}

async function start_server() {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			const url = new URL(req.url, `http://${req.headers.host}`);

			if (url.pathname === "/change-directory" && req.method === "POST") {
				let body = "";
				req.on("data", (chunk) => {
					body += chunk.toString();
				});
				req.on("end", async () => {
					try {
						const { directory, project_type: new_project_type = "legacy" } = JSON.parse(body);
						// Allow null directory to clear the current directory
						await change_directory(directory, new_project_type);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								success: true,
								current_directory: current_directory,
								project_type: project_type,
							}),
						);
					} catch (error) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: error.message }));
					}
				});
				return;
			}

			if (!current_directory) {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(get_no_directory_html());
				return;
			}

			const serve_directory = get_serve_directory();
			const file_path = url.pathname === "/" ? join(serve_directory, "index.html") : join(serve_directory, url.pathname);

			fs.readFile(file_path, (err, data) => {
				if (err) {
					res.writeHead(404);
					res.end("File not found");
					return;
				}

				const ext = file_path.split(".").pop().toLowerCase();
				const content_type =
					{
						html: "text/html",
						js: "text/javascript",
						css: "text/css",
						svg: "image/svg+xml",
						png: "image/png",
						jpg: "image/jpeg",
						jpeg: "image/jpeg",
						gif: "image/gif",
						json: "application/json",
						woff: "font/woff",
						woff2: "font/woff2",
						ttf: "font/ttf",
						eot: "application/vnd.ms-fontobject",
						otf: "font/otf",
						ico: "image/x-icon",
					}[ext] || "text/plain";

				res.writeHead(200, { "Content-Type": content_type });
				res.end(data);
			});
		});

		const port = 1961;

		server.on("error", (error) => {
			reject(error);
		});

		server.listen(port, () => {
			console.log(`Server running at http://localhost:${port}`);
			resolve(server);
		});
	});
}

async function start_runner() {
	try {
		await start_server();
	} catch (error) {
		console.error("Error:", error);
	}
}

export { start_runner };
