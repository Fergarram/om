const { ipcRenderer } = require("electron");

function handle_webview_keydown(e) {
	// Devtools
	if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i") {
		ipcRenderer.sendToHost("devtools");
	}

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
}

function handle_mouseup(e) {
	ipcRenderer.sendToHost("mouseup", e.button);
}

function handle_link_click(e) {
	// Check if this is a click on a link
	const link_el = find_parent_link(e.target);

	function find_parent_link(target) {
		while (target !== null) {
			if (target.tagName && target.tagName.toLowerCase() === "a" && target.href) {
				return target;
			}
			target = target.parentElement;
		}
		return null;
	}

	// Send new-tab event for ctrl/cmd + left click or middle mouse button click on links
	if (link_el) {
		if ((e.ctrlKey || e.metaKey) && e.button === 0) {
			// Ctrl/Cmd + left click
			e.preventDefault();
			e.stopPropagation();
			ipcRenderer.sendToHost("new-tab", link_el.href);
			return false;
		} else if (e.button === 1) {
			// Middle mouse button
			e.preventDefault();
			e.stopPropagation();
			ipcRenderer.sendToHost("new-tab", link_el.href);
			return false;
		} else if (e.shiftKey && e.button === 0) {
			// Open new window
			e.preventDefault();
			e.stopPropagation();
			ipcRenderer.sendToHost("new-window", link_el.href);
			return false;
		}
	}
}

window.addEventListener("keydown", handle_webview_keydown);
window.addEventListener("keyup", handle_webview_keyup);
window.addEventListener("mousedown", handle_mousedown);
window.addEventListener("mouseup", handle_mouseup);
window.addEventListener("click", handle_link_click, true);

window.addEventListener("blur", handle_window_blur);
window.addEventListener("focus", handle_window_focus);
document.addEventListener("visibilitychange", handle_visibility_change);
