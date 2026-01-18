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
	// Proxy route
	//

	if (url_path.startsWith("/xxx/")) {
		handleProxyRoute(req, res);
		return;
	}

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
			console.log(`HTTP server running locally at http://localhost:${HTTP_PORT}/`);
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
	const safe_slug = path.basename(space_slug);
	const space_path = path.join(SPACES_DIR, `${safe_slug}.html`);

	console.log("Serving space", space_path);

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
// APIs & utilities
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

function handleProxyRoute(req, res) {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		res.writeHead(200, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});
		res.end();
		return;
	}

	if (req.method !== "GET") {
		res.writeHead(405, { "Content-Type": "text/plain" });
		res.end("405 Method Not Allowed");
		return;
	}

	// Extract target URL from path: /xxx/https://example.com/page
	const target_url = req.url.slice(5); // Remove /xxx/

	if (!target_url) {
		res.writeHead(400, { "Content-Type": "text/plain" });
		res.end("400 Bad Request: Missing target URL");
		return;
	}

	try {
		// Validate URL
		new URL(target_url);
	} catch (error) {
		res.writeHead(400, { "Content-Type": "text/plain" });
		res.end("400 Bad Request: Invalid URL");
		return;
	}

	console.log("Proxying request to:", target_url);

	// Determine protocol
	const protocol = target_url.startsWith("https") ? https : http;

	// Make the request
	const proxy_req = protocol.get(
		target_url,
		{
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; CloneEditor/1.0)",
			},
		},
		(proxy_res) => {
			// Forward status code
			const headers = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			};

			// Copy content-type if available
			if (proxy_res.headers["content-type"]) {
				headers["Content-Type"] = proxy_res.headers["content-type"];
			}

			res.writeHead(proxy_res.statusCode, headers);

			// Pipe the response
			proxy_res.pipe(res);
		},
	);

	proxy_req.on("error", (error) => {
		console.error("Proxy request failed:", error);
		if (!res.headersSent) {
			res.writeHead(500, {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
			});
			res.end(`Proxy Error: ${error.message}`);
		} else {
			res.end();
		}
	});

	proxy_req.end();
}

//
// Utilities
//

function getContentType(file_path) {
	const ext = path.extname(file_path).toLowerCase();
	return MIME_TYPES[ext] || "application/octet-stream";
}

function serveFile(res, file_path, no_cache = false) {
	fs.stat(file_path, (err, stats) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			console.error("Failed to stat file:", err);
			return;
		}

		const headers = {
			"Content-Type": getContentType(file_path),
			"Content-Length": stats.size,
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			Expires: "0",
		};

		res.writeHead(200, headers);

		const read_stream = fs.createReadStream(file_path);

		read_stream.on("error", (err) => {
			console.error("Failed to stream file:", err);
			if (!res.headersSent) {
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("500 Internal Server Error");
			} else {
				res.end();
			}
		});

		read_stream.pipe(res);
	});
}

//
// Exports
//

module.exports = {
	httpsServer: https_server,
	httpServer: http_server,
};
