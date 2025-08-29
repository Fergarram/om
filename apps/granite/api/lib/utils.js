function convert_from_windows_path(path) {
	return path.replace(/\\/g, "/");
}

function convert_to_windows_path(path) {
	return path.replace(/\//g, "\\");
}

module.exports = {
	convert_from_windows_path,
	convert_to_windows_path
};
