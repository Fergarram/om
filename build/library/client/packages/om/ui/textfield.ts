import { useTags, type Props, type Ref } from "@/lib/ima";

const { input } = useTags();

export type TextfieldProps = {
	variant?: "default";
	size?: "default";
};

export function Textfield(args: TextfieldProps & Props) {
	let { variant = "default", size = "default", disabled, ...props } = args;

	return input({
		...props,
		variant,
		size,
		component: "textfield",
		disabled: disabled ? "" : undefined,
	});
}
