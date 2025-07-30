import { useTags, type Props, type Ref } from "@/lib/ima";
import { tw } from "@/lib/tw";

const { input, div } = useTags();

export type TextfieldVariant = "default";

export type TextfieldProps = {
	variant?: TextfieldVariant;
};

export function Textfield(args: TextfieldProps & Props) {
	let { variant = "default", ...props } = args;

	return input({
		...props,
		component: "textfield",
		class: tw(`component-textfield-base component-textfield-variant-${variant}`, props.class),
	});
}
