import { css, fade, finish, GlobalStyleSheet, try_catch } from "../../../../lib/utils.js";
import { get_camera_center, surface } from "../../desktop.js";
import van from "../../../../lib/van.js";
import sys from "../../bridge.js";
const { div, header, img, input, webview } = van.tags;

window.addEventListener("keydown", (e) => {
	if (e.metaKey && e.key.toLowerCase() === "6") {
		add_webview();
	}
});

async function add_webview(props) {
	//
	// Props
	//

	let { x: center_x, y: center_y } = get_camera_center();
	if (!props) {
		props = {
			x: center_x - 207,
			y: center_y - 350,
			width: 414,
			height: 700,
		};
	}

	if (!props.width) {
		props.width = 414;
	}

	if (!props.height) {
		props.height = 700;
	}

	if (!props.x) {
		props.x = center_x - 207;
	}

	if (!props.y) {
		props.y = center_y - 350;
	}

	//
	// State
	//

	const is_devtools_webview = van.state(props.devtools_requester ? true : false);
	const query = van.state(props.url || "");
	const src = van.state(
		props.devtools_requester
			? `devtools://devtools/bundled/inspector.html?ws=localhost:0/${props.devtools_requester.getWebContentsId()}`
			: "",
	);
	const last_render = van.state("");
	const focused = van.state(false);
	const loading = van.state(false);
	const load_error = van.state("");

	van.derive(() => {
		if (focused.val) {
			document.body.classList.add("webview-focused");
		} else {
			document.body.classList.remove("webview-focused");
		}
	});

	//
	// Layout
	//

	const webview_config = {
		nodeintegration: false,
		useragent:
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
		preload: "../../src/modules/om/applets/webview/preload.js",
		webpreferences: "contextIsolation=true,sandbox=true,allowRunningInsecureContent=true",
	};

	if (props.devtools_requester) {
		delete webview_config.preload;
		delete webview_config.webpreferences;
		delete webview_config.nodeintegration;
		delete webview_config.useragent;
	}

	const webview_el = webview({
		...webview_config,
		src: () => src.val,
		allowpopups: true,
		"has-error": () => !!load_error.val,
		"is-loading": () => loading.val,
		// CSS Hack to fix Electron bug
		style: css`
			width: 100%;
			height: 100%;
		`,
	});

	const applet = div(
		{
			"om-applet": "webview",
			"om-motion": "idle",
			"is-devtools": () => is_devtools_webview.val,
			focus: () => focused.val,
			style: () => css`
				top: ${props.y}px;
				left: ${props.x}px;
				width: ${props.width}px;
				height: ${props.height}px;
			`,
		},
		header(
			{
				"drag-handle": "",
				"new-tab": () => src.val === "" && !is_devtools_webview.val,
			},
			input({
				variant: "minimal",
				type: "text",
				value: query,
				placeholder: "Search or enter URL...",
				onkeydown(e) {
					if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
						close_webview();
					}

					if (e.key === "Enter") {
						query.val = e.target.value;
						src.val = process_query(query.val);
						e.target.blur();
					}
				},
			}),
		),
		webview_el,
		img({
			empty: () => src.val === "" && !is_devtools_webview.val,
			src: last_render,
			alt: "",
		}),
		div({
			class: "overlay",
		}),
	);

	van.add(surface(), applet);

	await finish();

	//
	// Events
	//

	applet.addEventListener("mousedown", async (e) => {
		if (src.val !== "" && applet.getAttribute("om-motion") === "idle" && window.superkeydown && e.button === 2) {
			const webcontents_id = webview_el.getWebContentsId();
			const url = await sys.browser.capture_page(webcontents_id);

			if (url) {
				last_render.val = url;
			}
		}
	});

	webview_el.addEventListener("dom-ready", async () => {
		if (props.devtools_requester) {
			await sys.browser.open_webview_devtools(props.devtools_requester.getWebContentsId(), webview_el.getWebContentsId());
			props.devtools_requester.openDevTools({
				mode: "detach",
			});
		}
	});

	webview_el.addEventListener("did-start-loading", () => {
		loading.val = true;
	});

	webview_el.addEventListener("did-stop-loading", () => {
		loading.val = false;
	});

	webview_el.addEventListener("did-fail-load", (event) => {
		load_error.val = event.errorDescription;
		loading.val = false;
	});

	webview_el.addEventListener("did-navigate", (event) => {
		query.val = event.url;
	});

	webview_el.addEventListener("did-navigate-in-page", (event) => {
		query.val = event.url;
	});

	webview_el.addEventListener("ipc-message", async (e) => {
		switch (e.channel) {
			case "devtools": {
				const current_width = applet.offsetWidth;
				const current_height = applet.offsetHeight;
				const current_x = applet.offsetLeft;
				const current_y = applet.offsetTop;
				const random_x_offset = Math.floor(Math.random() * 150) - 48;
				const random_y_offset = Math.floor(Math.random() * 150) - 48;

				await add_webview({
					width: current_width,
					height: current_height,
					x: current_x + current_width + random_x_offset,
					y: current_y + random_y_offset,
					devtools_requester: webview_el,
				});

				break;
			}
			case "new-window": {
				const url = e.args[0];
				sys.browser.new_window(url);
				break;
			}
			case "new-tab": {
				const url = e.args[0];
				const current_width = applet.offsetWidth;
				const current_height = applet.offsetHeight;
				const current_x = applet.offsetLeft;
				const current_y = applet.offsetTop;
				const random_x_offset = Math.floor(Math.random() * 150) - 48;
				const random_y_offset = Math.floor(Math.random() * 150) - 48;

				add_webview({
					width: current_width,
					height: current_height,
					x: current_x + (url === "" ? 0 : current_width) + random_x_offset,
					y: current_y + random_y_offset,
					url,
				});
				break;
			}
			case "mousedown": {
				break;
			}
			case "mouseup": {
				break;
			}
			case "keydown": {
				const key = e.args[0];
				const opts = e.args[1];
				const ev = new CustomEvent("webview-keydown", {
					detail: {
						key,
						webview: webview_el,
					},
				});
				window.dispatchEvent(ev);
				if ((opts.ctrlKey || opts.metaKey) && key.toLowerCase() === "w") {
					close_webview();
				}
				break;
			}
			case "keyup": {
				const key = e.args[0];
				const ev = new CustomEvent("webview-keyup", {
					detail: {
						key,
						webview: webview_el,
					},
				});
				window.dispatchEvent(ev);
				break;
			}
			case "visibilitychange": {
				const ev = new CustomEvent("webview-visibilitychange", {
					detail: {
						hidden: e.args[0],
						webview: webview_el,
					},
				});
				window.dispatchEvent(ev);

				if (e.args[0]) {
					focused.val = false;
				} else {
					focused.val = true;
				}
				break;
			}
			case "focus": {
				focused.val = true;
				const ev = new CustomEvent("webview-focus", {
					detail: {
						webview: webview_el,
					},
				});
				window.dispatchEvent(ev);
				break;
			}
			case "blur": {
				focused.val = false;
				const ev = new CustomEvent("webview-blur", {
					detail: {
						webview: webview_el,
					},
				});
				window.dispatchEvent(ev);
				break;
			}
		}
	});

	//
	// Functions
	//

	function close_webview() {
		focused.val = false;
		applet.remove();
	}

	function process_query(query) {
		if (!query) {
			return "";
		}

		// Trim leading and trailing whitespace
		query = query.trim();

		// Handle special protocols (including chrome://)
		const special_protocols = [
			"chrome://",
			"about:",
			"file://",
			"data:",
			"javascript:",
			"mailto:",
			"tel:",
			"sms:",
			"ftp://",
		];
		for (const protocol of special_protocols) {
			if (query.toLowerCase().startsWith(protocol)) {
				return query;
			}
		}

		// If it already starts with http:// or https://, it's a URL
		if (query.startsWith("http://") || query.startsWith("https://")) {
			return query;
		}

		// Check for localhost or IP address patterns (including port numbers)
		const localhost_pattern = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/;
		const ip_pattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/;
		if (localhost_pattern.test(query) || ip_pattern.test(query)) {
			return `http://${query}`;
		}

		// Check for obvious URL patterns (now including subdomains)
		const url_pattern = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/.*)?$/;
		if (url_pattern.test(query)) {
			return `https://${query}`;
		}

		// If it's not an obvious URL, treat it as a search query
		return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
	}

	return applet;
}

//
// Styles
//

GlobalStyleSheet(css`
	[om-applet="webview"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		color: var(--color-white);
		background-color: var(--color-neutral-800);
		border-radius: var(--size-3);
		overflow: hidden;
		transition-property: outline;
		transition-duration: 0.1s;
		transition-timing-function: var(--ease-in-out);
		outline: 0px solid var(--color-white-70);
		display: flex;
		flex-direction: column;
		padding: var(--size-2);

		header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			height: fit-content;
			padding-bottom: var(--size-1_5);
		}

		header[new-tab="true"] {
			height: 100%;
			input {
				text-align: center;
				height: 100% !important;
			}
		}

		img {
			display: none;
			border-radius: var(--size-2);
			box-shadow: var(--fast-thickness-1);
			width: 100%;
			height: 100%;
			background-color: var(--color-neutral-800);
			filter: blur(5px);
		}

		webview {
			overflow: hidden;
			border-radius: var(--size-2);
			box-shadow: var(--fast-thickness-1);
			width: 100%;
			height: 100%;
		}

		header[new-tab="true"] ~ webview {
			height: 0px !important;
		}

		.overlay {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			opacity: 0;
		}
	}

	[om-applet="webview"][focus="true"] {
		outline: var(--size-2) solid var(--color-white-70);
	}

	[om-applet="webview"][is-devtools="true"] header {
		display: none;
	}

	[om-applet="webview"][om-motion="resizing"] webview {
		display: none;
	}
	[om-applet="webview"][om-motion="resizing"] img[empty="false"] {
		display: block;
	}

	.is-dragging webview,
	.is-panning webview,
	.is-zooming webview,
	.is-resizing webview,
	.super-key-down webview {
		pointer-events: none;
	}

	.super-key-down [om-applet="webview"] overlay {
		pointer-events: auto;
	}
`);
