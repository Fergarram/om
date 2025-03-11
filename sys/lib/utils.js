export function convert_from_windows_path(path) {
	return path.replace(/\\/g, "/");
}

export function convert_to_windows_path(path) {
	return path.replace(/\//g, "\\");
}
