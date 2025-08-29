import { useTags } from "@/lib/ima";
import { SelectItem, useSelect } from "./select";

const { div, input, icon } = useTags();

export type ComboBoxProps = {
	classes?: string;
	dropdown_icon?: string;
	value?: string;
	variant?: "default";
	list: Record<string, string>[] | (() => Record<string, string>[]);
	onselect?: (value: string) => void;
};

export function ComboBox({
	variant = "default",
	classes = "",
	dropdown_icon = "arrow_drop_down",
	list,
	value,
	onselect,
}: ComboBoxProps) {
	let text = "";

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
			class: classes,
		},
		input_el,
		icon({
			name: dropdown_icon,
		}),
	);
}
