//
// Imports
//

const { exec } = require("child_process");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

//
// Config
//

const args = process.argv.slice(2);
const IS_PROD = !args.includes("--dev");

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const BASE_PATH = IS_PROD ? "/home/fernando" : "/Users/fernando/repos";
const OM_DIR = BASE_PATH + "/om";
const SPACES_DIR = IS_PROD ? BASE_PATH + "/public" : "/Users/fernando/fernando.computer/public";
const MEDIA_DIR = BASE_PATH + "/media";
const MODULES_DIR = OM_DIR + "/system/modules/client";

const options = IS_PROD
	? {
			key: fs.readFileSync(BASE_PATH + "/privkey.pem"),
			cert: fs.readFileSync(BASE_PATH + "/fullchain.pem"),
		}
	: null;

const MIME_TYPES = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".txt": "text/plain",
	".pdf": "application/pdf",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
};

//
// Server
//

const https_server = IS_PROD ? runHttpsServer() : null;
const http_server = runHttpServer();

function handleRequest(req, res) {
	const url_path = req.url.split("?")[0];

	//
	// API route
	//

	if (url_path.startsWith("/api/")) {
		if (req.method !== "POST") {
			res.writeHead(405, { "Content-Type": "text/plain" });
			res.end("405 Method Not Allowed");
			return;
		}
		const endpoint = url_path.slice(5);
		handleApiRoute(req, res, endpoint);
		return;
	}

	//
	// Media route
	//

	if (url_path.startsWith("/media/")) {
		const media_path = url_path.slice(7);
		handleStaticRoute(req, res, MEDIA_DIR, media_path);
		return;
	}

	//
	// Modules route
	//

	if (url_path.startsWith("/modules/")) {
		const module_path = url_path.slice(9);
		handleStaticRoute(req, res, MODULES_DIR, module_path);
		return;
	}

	//
	// Index route
	//

	if (url_path === "/") {
		const home_path = path.join(SPACES_DIR, "welcome.html");

		fs.stat(home_path, (err, stats) => {
			if (err || !stats.isFile()) {
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("no entrance");
				return;
			}

			serveFile(res, home_path);
		});
		return;
	}

	//
	// Space route
	//

	const space_slug = url_path.slice(1);
	if (space_slug && !space_slug.includes("/")) {
		handleSpaceRoute(req, res, space_slug);
		return;
	}

	//
	// 404 route
	//

	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end("404 Not Found");
}

function runHttpsServer() {
	return https.createServer(options, handleRequest).listen(HTTPS_PORT, () => {
		console.log(`HTTPS server running at https://fernando.computer/`);
	});
}

function runHttpServer() {
	return http
		.createServer((req, res) => {
			if (IS_PROD) {
				if (!req.headers.host) {
					console.error("Request without Host header:", req.socket.remoteAddress);
					res.writeHead(400);
					res.end();
					return;
				}

				const host = req.headers.host.replace(/:\d+$/, "");
				const redirect_url = `https://${host}${req.url}`;

				res.writeHead(301, { Location: redirect_url });
				res.end();
			} else {
				handleRequest(req, res);
			}
		})
		.listen(HTTP_PORT, () => {
			console.log(`HTTP server running at http://localhost:${HTTP_PORT}/`);
		});
}

//
// Route Handlers
//

function handleApiRoute(req, res, endpoint) {
	if (endpoint === "pull-om") {
		API_pullFromGit(req, res);
		return;
	}

	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end("404 API endpoint not found");
}

function handleStaticRoute(req, res, base_dir, url_path) {
	const safe_path = path.normalize(url_path).replace(/^(\.\.[\/\\])+/, "");
	const file_path = path.join(base_dir, safe_path);

	const resolved_base = path.resolve(base_dir);
	const resolved_file = path.resolve(file_path);

	if (!resolved_file.startsWith(resolved_base)) {
		res.writeHead(403, { "Content-Type": "text/plain" });
		res.end("403 Forbidden");
		return;
	}

	fs.stat(file_path, (err, stats) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			console.log(err);
			return;
		}

		if (stats.isDirectory()) {
			res.writeHead(403, { "Content-Type": "text/plain" });
			res.end("403 Forbidden");
		} else {
			// Check if this is the modules directory
			const is_modules = base_dir === MODULES_DIR;
			console.log("Serving module", url_path, is_modules);
			serveFile(res, file_path, is_modules);
		}
	});
}

function handleSpaceRoute(req, res, space_slug) {
	function resolveSpacePath(space_slug) {
		const safe_slug = path.basename(space_slug);
		const space_path = path.join(SPACES_DIR, `${safe_slug}.html`);
		return space_path;
	}

	const space_path = resolveSpacePath(space_slug);

	fs.stat(space_path, (err, stats) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Space not found");
			console.log(err);
			return;
		}

		if (!stats.isFile()) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Space not found");
			console.log("Not a file", err);
			return;
		}

		serveFile(res, space_path);
	});
}

//
// APIs
//

function API_pullFromGit(req, res) {
	console.log("Pulling latest changes in om...");
	exec(
		`cd ${OM_DIR} && git fetch origin main && git reset --hard origin/main`,
		(err, stdout, stderr) => {
			if (err) {
				console.error("Pull failed:", err);
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Pull failed");
				return;
			}
			console.log(stdout || stderr);
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("OK");
		},
	);
}

//
// Utilities
//

function getContentType(file_path) {
	const ext = path.extname(file_path).toLowerCase();
	return MIME_TYPES[ext] || "application/octet-stream";
}

function serveFile(res, file_path, no_cache = false) {
	fs.readFile(file_path, (err, data) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			return;
		}

		const content_type = getContentType(file_path);
		const headers = { "Content-Type": content_type };

		if (no_cache && !IS_PROD) {
			headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
			headers["Pragma"] = "no-cache";
			headers["Expires"] = "0";
		}

		res.writeHead(200, headers);
		res.end(data);
	});
}

//
// Exports
//

module.exports = {
	httpsServer: https_server,
	httpServer: http_server,
};
