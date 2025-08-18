import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function bundle(entry_file, outdir) {
	console.log("bundling", entry_file);
	if (!fs.existsSync(entry_file)) return;

	try {
		const entry_dir = path.dirname(entry_file);
		const entry_filename = path.basename(entry_file);

		// Make paths relative to the entry file's directory
		const relative_outdir = path.relative(entry_dir, outdir);
		const bun_path = path.relative(entry_dir, process.platform === "win32" ? "bin\\bun.exe" : "./bin/bun");

		const command = `${bun_path} build ${entry_filename} --target browser --format esm --sourcemap=inline --outdir ${relative_outdir}`;

		const command_output = execSync(command, {
			encoding: "utf8",
			cwd: entry_dir // Set working directory to where the entry file is
		});
		console.log("Command output:", command_output);

	} catch (error) {
		console.error("Execution error:", error.message);
		if (error.stdout) console.log("stdout:", error.stdout);
		if (error.stderr) console.error("stderr:", error.stderr);
	}
}
