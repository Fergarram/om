function set_superkey_state(state) {
	if (state) {
		window.superkeydown = true;
		const ev = new CustomEvent("superkeydown");
		window.dispatchEvent(ev);
		document.body.classList.add("super-key-down");
	} else {
		window.superkeydown = false;
		const ev = new CustomEvent("superkeyup");
		window.dispatchEvent(ev);
		document.body.classList.remove("super-key-down");
	}
}

function handle_superkey_down(e) {
	if (e.key === "Alt" || e.detail.key === "Alt") {
		set_superkey_state(true);
	}
}

function handle_superkey_up(e) {
	if (!e.key || e.key === "Alt") {
		set_superkey_state(false);
	}
}

// Handle window blur event to catch cases where window loses focus
function handle_window_blur() {
	// When window loses focus, assume Alt key is released
	set_superkey_state(false);
}

// Handle visibility change for tab switching or minimizing
function handle_visibility_change() {
	if (document.hidden) {
		// When tab becomes hidden, assume Alt key is released
		set_superkey_state(false);
	}
}

function handle_webview_visibility_change(e) {
	if (e.detail.hidden && document.hidden) {
		// When tab becomes hidden, assume Alt key is released
		set_superkey_state(false);
	}
}

function handle_webview_blur() {
	// check if window is focused
	if (!document.hasFocus()) {
		// When window loses focus, assume Alt key is released
		set_superkey_state(false);
	}
}

window.addEventListener("keydown", handle_superkey_down);
window.addEventListener("keyup", handle_superkey_up);
window.addEventListener("webview-keydown", handle_superkey_down);
window.addEventListener("webview-keyup", handle_superkey_up);
window.addEventListener("blur", handle_window_blur);
document.addEventListener("visibilitychange", handle_visibility_change);
window.addEventListener("webview-blur", handle_webview_blur);
window.addEventListener("webview-visibilitychange", handle_webview_visibility_change);
