function convertFromWindowsPath(path) {
	return path.replace(/\\/g, "/");
}

function convertToWindowsPath(path) {
	return path.replace(/\//g, "\\");
}

module.exports = {
	convertFromWindowsPath,
	convertToWindowsPath,
};
