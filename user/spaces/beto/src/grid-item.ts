import { useTags, type Ref } from "@/lib/ima";
import { tw } from "@/lib/tw";

const { div, button, dialog, p, form, input } = useTags();

export function GridItem(squares: number) {
	const dialog_ref: Ref<HTMLDialogElement> = { current: null };

	const modal = dialog(
		{
			ref: dialog_ref,
			class: tw("p-6 rounded-lg shadow-lg backdrop:bg-opacity-50"),
		},
		form(
			{
				method: "dialog",
				class: tw("space-y-4"),
			},
			p(
				{
					class: tw("text-lg font-semibold"),
				},
				`Square value: ${squares}`,
			),
			div(
				{
					class: tw("flex gap-2 justify-end"),
				},
				button(
					{
						type: "submit",
						class: tw("px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"),
					},
					"Close",
				),
				button(
					{
						type: "button",
						class: tw("px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"),
						onclick() {
							console.log("Action clicked for square:", squares);
							dialog_ref.current?.close();
						},
					},
					"Action",
				),
			),
		),
	);

	return div(
		div(
			{
				class: tw(
					"bg-blue-500 w-full h-full flex items-center justify-center text-black cursor-pointer hover:bg-blue-600 transition-colors",
				),
				onclick() {
					dialog_ref.current?.showModal();
				},
			},
			() => squares,
		),
		modal,
	);
}
