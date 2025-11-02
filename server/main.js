const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 1996;
const PUBLIC_DIR = "/home/fernando/public";

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

function getContentType(file_path) {
	const ext = path.extname(file_path).toLowerCase();
	return MIME_TYPES[ext] || "application/octet-stream";
}

function serveFile(res, file_path) {
	console.log(`Attempting to serve: ${file_path}`);

	fs.readFile(file_path, (err, data) => {
		if (err) {
			console.error(`Error reading file: ${err.message}`);
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			return;
		}

		const content_type = getContentType(file_path);
		res.writeHead(200, { "Content-Type": content_type });
		res.end(data);
	});
}

function handleRequest(req, res) {
	console.log(`Request: ${req.url}`);

	let url_path = req.url === "/" ? "/index.html" : req.url;

	// Remove query string
	url_path = url_path.split("?")[0];

	// Sanitize path to prevent directory traversal
	const safe_path = path.normalize(url_path).replace(/^(\.\.[\/\\])+/, "");
	const file_path = path.join(PUBLIC_DIR, safe_path);

	console.log(`Resolved path: ${file_path}`);

	// Ensure the resolved path is within PUBLIC_DIR
	const resolved_public = path.resolve(PUBLIC_DIR);
	const resolved_file = path.resolve(file_path);

	if (!resolved_file.startsWith(resolved_public)) {
		console.error(`Forbidden: ${resolved_file} is outside ${resolved_public}`);
		res.writeHead(403, { "Content-Type": "text/plain" });
		res.end("403 Forbidden");
		return;
	}

	fs.stat(file_path, (err, stats) => {
		if (err) {
			console.error(`Stat error: ${err.message}`);
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			return;
		}

		if (stats.isDirectory()) {
			const index_path = path.join(file_path, "index.html");
			serveFile(res, index_path);
		} else {
			serveFile(res, file_path);
		}
	});
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
	console.log(`Serving files from: ${PUBLIC_DIR}`);
	console.log(`Resolved PUBLIC_DIR: ${path.resolve(PUBLIC_DIR)}`);

	// Check if directory exists
	if (!fs.existsSync(PUBLIC_DIR)) {
		console.error(`ERROR: PUBLIC_DIR does not exist: ${PUBLIC_DIR}`);
		console.error(`Create it with: mkdir -p ${PUBLIC_DIR}`);
		return;
	}

	console.log(`Directory exists: YES`);

	// List contents
	try {
		const files = fs.readdirSync(PUBLIC_DIR);
		console.log(`Files in PUBLIC_DIR: ${files.join(", ")}`);
	} catch (err) {
		console.error(`Cannot read directory: ${err.message}`);
		console.error(`Check permissions with: ls -la ${PUBLIC_DIR}`);
	}
});
