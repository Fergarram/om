const { default: asar } = require("./default_app/asar.js");
const path = require("path");

const source_dir = path.join(__dirname, "default_app");
const output_path = path.join(__dirname, "default_app.asar");

async function packDefaultApp() {
	try {
		console.log(`Packing ${source_dir} to ${output_path}...`);
		await asar.createPackage(source_dir, output_path);
		console.log("Packaging completed successfully.");
		process.exit(0);
	} catch (error) {
		console.error(`Failed to create asar archive: ${error.message}`);
		process.exit(1);
	}
}

packDefaultApp();
