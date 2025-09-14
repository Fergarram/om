import typescript from "typescript";

// @ts-ignore
if (typeof globalThis.std === "undefined") {
	// @ts-ignore
	globalThis.std = {
		typescript,
	};
} else {
	// @ts-ignore
	globalThis.std.typescript = typescript;
}
