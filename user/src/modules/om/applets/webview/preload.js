const { ipcRenderer } = require("electron");

function handle_webview_keydown(e) {
	if ((e.ctrlKey || e.metaKey) && e.key === "r") {
		e.preventDefault();
		location.reload();
	}

	if ((e.ctrlKey || e.metaKey) && e.key === "w") {
		e.preventDefault();
	}

	if ((e.ctrlKey || e.metaKey) && e.key === "t") {
		e.preventDefault();
		ipcRenderer.sendToHost("new-tab", "");
	}

	if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
		e.preventDefault();
		history.back();
	}

	if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
		e.preventDefault();
		history.forward();
	}

	ipcRenderer.sendToHost("keydown", e.key, {
		ctrlKey: e.ctrlKey,
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		metaKey: e.metaKey,
	});
}

function handle_webview_keyup(e) {
	ipcRenderer.sendToHost("keyup", e.key, {
		ctrlKey: e.ctrlKey,
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		metaKey: e.metaKey,
	});
}

function handle_window_blur() {
	ipcRenderer.sendToHost("blur");
}

function handle_window_focus() {
	ipcRenderer.sendToHost("focus");
}

function handle_visibility_change() {
	ipcRenderer.sendToHost("visibilitychange", document.hidden);
}

function handle_mousedown(e) {
	ipcRenderer.sendToHost("mousedown", e.button);

	// Check if this is a click on a link
	const link_el = find_parent_link(e.target);

	// Send new-tab event for ctrl/cmd + left click or middle mouse button click on links
	if (link_el) {
		if ((e.ctrlKey || e.metaKey) && e.button === 0) {
			// Ctrl/Cmd + left click
			ipcRenderer.sendToHost("new-tab", link_el.href);
			e.preventDefault();
		} else if (e.button === 1) {
			// Middle mouse button
			ipcRenderer.sendToHost("new-tab", link_el.href);
			e.preventDefault();
		} else if (e.shiftKey && e.button === 0) {
			// Open new window
			// ipcRenderer.sendToHost("new-window", link_el.href);
			e.preventDefault();
		}
	}

	function find_parent_link(element) {
		while (element !== null) {
			if (element.tagName && element.tagName.toLowerCase() === "a" && element.href) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}
}

function handle_mouseup(e) {
	ipcRenderer.sendToHost("mouseup", e.button);
}

window.addEventListener("keydown", handle_webview_keydown);
window.addEventListener("keyup", handle_webview_keyup);
window.addEventListener("mousedown", handle_mousedown);
window.addEventListener("mouseup", handle_mouseup);

window.addEventListener("blur", handle_window_blur);
window.addEventListener("focus", handle_window_focus);
document.addEventListener("visibilitychange", handle_visibility_change);
