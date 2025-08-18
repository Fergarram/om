let writer: any;

function getWriter() {
	if (!writer) {
		// @ts-expect-error we're running this in build-time so bun runtime is there
		const file = Bun.file("./classes.txt");
		writer = file.writer();

		// Clean up on process exit
		process.on("exit", () => {
			if (writer) {
				writer.flush();
				writer.end();
			}
		});
	}
	return writer;
}

export function tw(...class_groups: string[]) {
	const classes = class_groups.join(" ");

	try {
		const file_writer = getWriter();
		file_writer.write(classes + "\n");
		file_writer.flush();
	} catch {
		// Silently handle any write errors to avoid breaking the macro
		console.warn("An error occured when running tw macro for classes:", classes);
	}

	return classes;
}
