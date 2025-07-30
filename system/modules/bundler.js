import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function bundle(entry_file, outdir) {
	console.log("bundling", entry_file)
	if (!fs.existsSync(entry_file)) return;

	try {
		let command = `./bin/bun build ${entry_file} --target browser --format esm --sourcemap=inline --outdir ${outdir}`;
		if (process.platform === "win32") {
			command = `bin\\bun.exe build ${entry_file} --target browser --format esm --sourcemap=inline --outdir ${outdir}`;
		}
		const command_output = execSync(command, {
			encoding: "utf8",
		});
		console.log("Command output:", command_output);

	} catch (error) {
		console.error("Execution error:", error.message);
		if (error.stdout) console.log("stdout:", error.stdout);
		if (error.stderr) console.error("stderr:", error.stderr);
	}
}
