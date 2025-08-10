import { useTags } from "@/lib/ima";
import { SelectItem, useSelect } from "./select";
import { useTheme } from "@/config/theme";
import { tw } from "@/lib/tw";

const { div, input, icon } = useTags();

export type ComboBoxProps = {
	classes?: string;
	value?: string;
	variant?: "default";
	list: Record<string, string>[] | (() => Record<string, string>[]);
	onselect?: (value: string) => void;
};

export function ComboBox({ classes = "", list, value, onselect, variant = "default" }: ComboBoxProps) {
	let text = "";

	const { icons } = useTheme();

	const input_el = input({
		oninput: (e) => {
			text = (e.target as HTMLInputElement).value;
		},
		async onfocus(e) {
			let list_items: Record<string, string>[] = [];
			if (typeof list === "function") {
				list_items = list();
			} else {
				list_items = list;
			}
			const selection = await useSelect(
				{
					click: e as MouseEvent,
					input_el,
					onselect,
				},
				...list_items.map(
					({ value, label }) =>
						() =>
							label.toLowerCase().includes(text.toLowerCase()) ? SelectItem({ value }, label) : null,
				),
			);
			input_el.value = list_items.find(({ value }) => value === selection)?.label || "";
		},
		value,
	}) as HTMLInputElement;

	return div(
		{
			component: "combobox",
			variant,
			class: tw(classes),
		},
		input_el,
		icon({
			name: icons.combobox.arrow || "arrow_drop_down",
		}),
	);
}
