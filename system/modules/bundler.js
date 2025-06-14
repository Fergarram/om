import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function bundleAll() {
	// Get all directories directly under user/spaces and user/overlays
	const spaces_dir = path.join(__dirname, "../../user/spaces");
	const overlays_dir = path.join(__dirname, "../../user/overlays");

	// Bundle spaces
	if (fs.existsSync(spaces_dir)) {
		const space_dirs = fs
			.readdirSync(spaces_dir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		space_dirs.forEach((space) => {
			const entry_file = path.join(__dirname, `../../user/spaces/${space}/src/main.ts`);
			const outdir = path.join(__dirname, `../../user/spaces/${space}`);
			bundle(entry_file, outdir, `Space ${space}`);
		});
	}

	// Bundle overlays
	if (fs.existsSync(overlays_dir)) {
		const overlay_dirs = fs
			.readdirSync(overlays_dir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		overlay_dirs.forEach((overlay) => {
			const entry_file = path.join(__dirname, `../../user/overlays/${overlay}/src/main.ts`);
			const outdir = path.join(__dirname, `../../user/overlays/${overlay}`);
			bundle(entry_file, outdir, `Overlay ${overlay}`);
		});
	}
}

export function bundle(entry_file, outdir, name) {
	if (!fs.existsSync(entry_file)) return;

	try {
		const command_output = execSync(
			`./bin/bun build ${entry_file} --target browser --format esm --sourcemap=inline --outdir ${outdir}`,
			{
				encoding: "utf8",
			},
		);
		console.log(`${name} bundle output:`, command_output);
	} catch (error) {
		console.error(`${name} bundling execution error:`, error.message);
		if (error.stdout) console.log("stdout:", error.stdout);
		if (error.stderr) console.error("stderr:", error.stderr);
	}
}
