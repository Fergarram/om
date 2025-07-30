import { useTags } from "@/lib/ima";

const { input } = useTags();

type NumberInputProps = {
	class?: string;
	value: () => number;
	suffix: string;
	min?: number;
	max?: number;
	step?: number;
	shift_step?: number;
	onchange?: (new_value: number) => void;
	placeholder?: string;
};

export function NumberInput(props: NumberInputProps) {
	const {
		class: classes = "",
		value,
		suffix,
		min = 0,
		max = Infinity,
		step = 1,
		shift_step = 10,
		onchange,
		placeholder = "",
	} = props;

	return input({
		class: classes,
		type: "text",
		placeholder,
		value: () => `${value()}${suffix}`,
		onkeydown(e) {
			const el = e.target as HTMLInputElement;
			const offset = e.shiftKey ? shift_step : step;

			if (e.key === "Enter") {
				el.blur();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				const current_value = parseInt(el.value);
				const new_value = Math.max(min, Math.min(max, current_value + offset));
				if (onchange) onchange(new_value);
				el.value = `${new_value}${suffix}`;
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				const current_value = parseInt(el.value);
				const new_value = Math.max(min, Math.min(max, current_value - offset));
				if (onchange) onchange(new_value);
				el.value = `${new_value}${suffix}`;
			}
		},
		onwheel(e) {
			const el = e.target as HTMLInputElement;
			const offset = e.shiftKey ? shift_step : step;

			e.preventDefault();
			const current_value = parseInt(el.value);
			const delta = e.deltaY > 0 ? -offset : offset;
			const new_value = Math.max(min, Math.min(max, current_value + delta));

			if (onchange) onchange(new_value);
			el.value = `${new_value}${suffix}`;
		},
		onchange(e) {
			const el = e.target as HTMLInputElement;
			const new_value = parseInt(el.value);
			if (!isNaN(new_value)) {
				const clamped_value = Math.max(min, Math.min(max, new_value));
				if (onchange) onchange(clamped_value);
			}
			el.value = `${value()}${suffix}`;
		},
		onblur(e) {
			const el = e.target as HTMLInputElement;
			el.value = `${value()}${suffix}`;
		},
	});
}
