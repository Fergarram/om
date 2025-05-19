import { useTags } from "../../lib/ima.js";
import { css, finish, GlobalStyleSheet } from "../../lib/utils.js";
import sys from "../../lib/bridge.js";

// Global state ???
window.is_trackpad = false;
window.is_devtools_open = await sys.win.isDevtoolsOpen();

// sys.win.devtoolsOpened(() => {
// 	window.is_devtools_open = true;
// });

// sys.win.devtoolsClosed(() => {
// 	window.is_devtools_open = false;
// });

// @TODO: This prevents reloads and other accidental navigation events but this also disables space navigation. I have to find a way to properly fix this. We have to hijack navigation from main process
// window.addEventListener("beforeunload", (e) => {
// 	if (!window.is_devtools_open) {
// 		e.preventDefault();
// 	}
// });

// Om Modules
import { initializeDesktop } from "../../modules/om/desktop.js";
import "../../modules/om/superkey.js";

// Applets
import "../../modules/om/applets/test.js";
import "../../modules/om/applets/sticky.js";
import "../../modules/om/applets/appview.js";
import "../../modules/om/applets/webview/webview.js";

// DOM Setup
const { main } = useTags();

const OmSpace = main({
	id: "om-space",
});

document.body.appendChild(OmSpace);
await finish();

// Initalizations
await initializeDesktop(OmSpace);

GlobalStyleSheet(css`
	#om-space {
		display: flex;
		flex-direction: column;
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		color: white;
		background: transparent;
	}

	#om-desktop::-webkit-scrollbar {
		width: 10px;
		height: 10px;
	}

	#om-desktop::-webkit-scrollbar-track {
		background: #e8dfd8;
	}

	#om-desktop::-webkit-scrollbar-thumb {
		background: #cd2430;
		border-radius: var(--size-2);
	}

	#om-desktop::-webkit-scrollbar-thumb:hover {
		background: #454545;
	}

	#om-desktop::-webkit-scrollbar-corner {
		background: #e8dfd8;
	}
`);
