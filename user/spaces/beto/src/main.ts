import { useTags, type Ref } from "@/lib/ima";
import { tw } from "@/lib/tw";
import { GridItem } from "./grid-item";

const { div, button } = useTags();

let squares = 0;
let grid_ref: Ref<HTMLDivElement> = {
	current: null,
};

const app = div(
	{
		class: tw("absolute w-screen h-screen top-0 left-0"),
	},
	div({
		ref: grid_ref,
		class: tw("grid grid-cols-4 w-full h-full absolute"),
	}),
	button(
		{
			class: tw("absolute left-24 top-24 text-white bg-red-500"),
			onclick() {
				squares += 1;
				grid_ref.current?.appendChild(GridItem(squares));
			},
		},
		"Add block",
	),
);

document.body.appendChild(app);
