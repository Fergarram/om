import van from "../../src/lib/van.js";
import { finish } from "../../src/lib/utils.js";

import { StatusBar } from "../../src/modules/om/ui/statusbar.js";
import { initialize_desktop } from "../../src/modules/om/desktop.js";

const { main, div } = van.tags;

const OmSpace = main(
	{
		id: "om-space",
	},
	await StatusBar(),
);

van.add(document.body, OmSpace);

await finish();

await initialize_desktop(OmSpace);
