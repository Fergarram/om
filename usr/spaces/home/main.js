import van from "../../src/lib/van.js";
import { finish } from "../../src/lib/utils.js";

// Om Modules
import { StatusBar } from "../../src/modules/om/ui/statusbar.js";
import { initialize_desktop } from "../../src/modules/om/desktop.js";

// Modules
import "../../src/modules/om/applets/test.js";
import "../../src/modules/om/applets/sticky.js";
import "../../src/modules/om/applets/appview.js";

// DOM Setup
const { main } = van.tags;

const OmSpace = main(
	{
		id: "om-space",
	},
	await StatusBar(),
);

van.add(document.body, OmSpace);
await finish();

// Initalizations
await initialize_desktop(OmSpace);
