import { useTags } from "@/lib/ima";
import { css, finish, useGlobalStyles } from "@/lib/utils";
import sys from "@/lib/bridge";

// Global state ???

// @ts-expect-error
window.is_trackpad = false;
// @ts-expect-error
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
import { initializeDesktop } from "@/om/desktop";
import "@/om/superkey";

// Applets
import "@/om/applets/test";
import "@/om/applets/sticky";
import "@/om/applets/appview";
import "@/om/applets/webview";

// DOM Setup
const { main } = useTags();

const OmSpace = main({
	id: "om-space",
});

document.body.appendChild(OmSpace);
await finish();

// Initalizations
await initializeDesktop(OmSpace);

useGlobalStyles(css`
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
