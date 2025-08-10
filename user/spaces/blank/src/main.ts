import { initializeThemeSystem } from "@/config/theme";
import sys from "@/lib/bridge";
import { useTags } from "@/lib/ima";
import { tw } from "@/lib/tw";
import { Button } from "@/om/ui/button";
import { ComboBox } from "@/om/ui/combobox";
import { useDialog } from "@/om/ui/dialog";
import { NumberInput } from "@/om/ui/number-input";
import { SelectItem, SelectSeparator, useSelect } from "@/om/ui/select";
import { Textfield } from "@/om/ui/textfield";

const basepath = await sys.process.cwd();
const theme_dir = `${basepath}/user/config/themes/om/default`;

await initializeThemeSystem(theme_dir);

const { div, span, h1 } = useTags();

let count = 0; // just regular JavaScript variables

const app = div(
	{
		class: tw("flex flex-col gap-4 items-center justify-center h-screen bg-gray-100"),
	},
	h1(
		{
			// Reactive attribute
			style: () => `
				transition: font-size 100ms;
				font-size: ${count + 1}rem;
			`,
		},
		// Reactive element
		() => span(count + 1, "x"),
	),
	Button(
		{
			variant: "outline",
			onclick: () => count++,
			oncontextmenu(e) {
				useSelect(
					{
						click: e,
						follow_cursor: true,
					},
					SelectItem("Option 1"),
					SelectSeparator(),
					SelectItem("Option 2"),
					SelectItem("Option 3"),
				);
			},
		},
		// Reactive text child
		() => `Get to ${count + 2}x`,
	),
	NumberInput({
		value: () => 0,
		suffix: " PUTOS",
	}),
	Textfield({}),
	ComboBox({
		value: "Option 1",
		onselect(value) {
			useDialog({}, div(value));
		},
		list: [
			{
				value: "Option 1",
				label: "Option 1",
			},
			{
				value: "Option 2",
				label: "Option 2",
			},
			{
				value: "Option 3",
				label: "Option 3",
			},
		],
	}),
);

// Add to DOM
document.body.appendChild(app);
