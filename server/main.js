const { exec } = require("child_process");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const PUBLIC_DIR = "/home/fernando/public";
const OM_DIR = "/home/fernando/om"; // path to your repo

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
	fs.readFile(file_path, (err, data) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			return;
		}

		res.writeHead(200, { "Content-Type": getContentType(file_path) });
		res.end(data);
	});
}

function handleRequest(req, res) {
	let url_path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
	const safe_path = path.normalize(url_path).replace(/^(\.\.[\/\\])+/, "");
	const file_path = path.join(PUBLIC_DIR, safe_path);

	const resolved_public = path.resolve(PUBLIC_DIR);
	const resolved_file = path.resolve(file_path);

	// --- Auto-pull endpoint ---
	if (req.method === "POST" && req.url === "/api/pull-om") {
		console.log("Pulling latest changes in om...");
		exec(`cd ${OM_DIR} && git fetch origin main && git reset --hard origin/main`, (err, stdout, stderr) => {
			if (err) {
				console.error("Pull failed:", err);
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Pull failed");
				return;
			}
			console.log(stdout || stderr);
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("OK");
		});
		return;
	}

	if (!resolved_file.startsWith(resolved_public)) {
		res.writeHead(403, { "Content-Type": "text/plain" });
		res.end("403 Forbidden");
		return;
	}

	fs.stat(file_path, (err, stats) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("404 Not Found");
			return;
		}

		if (stats.isDirectory()) {
			serveFile(res, path.join(file_path, "index.html"));
		} else {
			serveFile(res, file_path);
		}
	});
}

// HTTPS options (after running certbot)
const options = {
	key: fs.readFileSync("/home/fernando/privkey.pem"),
	cert: fs.readFileSync("/home/fernando/fullchain.pem"),
};

// HTTPS server
https.createServer(options, handleRequest).listen(HTTPS_PORT, () => {
	console.log(`HTTPS server running at https://fernando.computer/`);
});

// HTTP → HTTPS redirect
http
	.createServer((req, res) => {
		const host = req.headers.host.replace(/:\d+$/, "");
		res.writeHead(301, { Location: `https://${host}${req.url}` });
		res.end();
	})
	.listen(HTTP_PORT, () => {
		console.log(`Redirecting all HTTP traffic to HTTPS`);
	});
