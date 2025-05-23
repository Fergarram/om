import { useTags } from "../../lib/ima.js";
import { finish } from "../../lib/utils.js";
import sys from "../../lib/bridge.js";
import { tw } from "../../lib/tw.js";

// Om Modules
import { StatusBar } from "../../modules/om/ui/statusbar.js";

// DOM Setup
const { main } = useTags();

const overlay_el = main(
	{
		class: tw("fixed w-full flex flex-col")
	},
	await StatusBar(),
);

document.body.appendChild(overlay_el);
await finish();

const { height: initial_height } = overlay_el.getBoundingClientRect();
sys.overlay.setHeight(initial_height);

const resize_callback = (entries) => {
	for (const entry of entries) {
		const main_height = entry.contentRect.height;
		sys.overlay.setHeight(main_height);
		console.log(main_height)
	}
};

const resize_observer = new ResizeObserver(resize_callback);
resize_observer.observe(overlay_el);
