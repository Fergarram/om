import { watch } from "fs";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";

// Default values
const DEFAULT_SRC_FILE = "./src/index.ts";
const DEFAULT_OUT_DIR = "./public/dist";
const DEFAULT_PUBLIC_DIR = "./public";
const DEFAULT_PORT = 1961;

// Parse command line arguments
const args = process.argv.slice(2);
let srcFile = DEFAULT_SRC_FILE;
let outDir = DEFAULT_OUT_DIR;
let publicDir = DEFAULT_PUBLIC_DIR;
let port = DEFAULT_PORT;
let watchMode = false;

// Process arguments
for (let i = 0; i < args.length; i++) {
	const arg = args[i];

	if (arg === "--src" && i + 1 < args.length) {
		srcFile = args[++i];
	} else if (arg === "--outdir" && i + 1 < args.length) {
		outDir = args[++i];
	} else if (arg === "--public" && i + 1 < args.length) {
		publicDir = args[++i];
	} else if (arg === "--port" && i + 1 < args.length) {
		port = parseInt(args[++i], 10);
	} else if (arg === "--watch") {
		watchMode = true;
	} else if (arg === "--help") {
		console.log(`
Usage: bun build.ts [options]

Options:
  --src <file>      Source file (default: ${DEFAULT_SRC_FILE})
  --outdir <dir>    Output directory (default: ${DEFAULT_OUT_DIR})
  --public <dir>    Public directory to serve (default: ${DEFAULT_PUBLIC_DIR})
  --port <number>   Server port (default: ${DEFAULT_PORT})
  --watch           Enable watch mode
  --help            Show this help message
    `);
		process.exit(0);
	}
}

async function build() {
	console.log("🔨 Building...");

	// Ensure output directory exists
	try {
		await mkdir(outDir, { recursive: true });
	} catch (error) {
		// Directory might already exist, continue
	}

	try {
		const result = await Bun.build({
			entrypoints: [srcFile],
			outdir: outDir,
			target: "browser",
			format: "esm",
			minify: !watchMode,
			sourcemap: watchMode ? "linked" : "none", // Only include sourcemap in watch mode
		});

		if (result.success) {
			console.log("✅ Build successful!");
		} else {
			console.error("❌ Build failed:", result.logs);
		}
	} catch (error) {
		console.error("❌ Build error:", error);
	}
}

// Start the server to serve the public directory
async function startServer() {
	console.log(`🚀 Starting server on http://localhost:${port}`);

	const server = Bun.serve({
		port: port,
		fetch(req) {
			const url = new URL(req.url);
			let path = url.pathname;

			// Default to index.html for root path
			if (path === "/") {
				path = "/index.html";
			}

			// Try to serve from public directory
			const filePath = join(publicDir, path);
			const file = Bun.file(filePath);

			return new Response(file);
		},
		error(error) {
			return new Response(`Error: ${error.message}`, { status: 500 });
		},
	});

	console.log(`🌐 Server running at http://localhost:${server.port}`);
	return server;
}

// Run initial build
await build();

// If watch mode is enabled, start server and watch for changes
if (watchMode) {
	const server = await startServer();

	// Set up watch
	console.log(`👀 Watching for changes in ${dirname(srcFile)}...`);
	const srcDir = dirname(srcFile);
	const watcher = watch(srcDir, { recursive: true }, async (eventType, filename) => {
		if (filename && filename.endsWith(".ts")) {
			console.log(`📝 Change detected in ${filename}`);
			await build();
		}
	});

	// Handle process termination
	process.on("SIGINT", () => {
		console.log("\n🛑 Stopping watch mode and server...");
		watcher.close();
		server.stop();
		process.exit(0);
	});

	console.log(`\nPress Ctrl+C to stop watching and server`);
} else {
	// Just build and exit if not in watch mode
	console.log("Build completed. Exiting...");
}
