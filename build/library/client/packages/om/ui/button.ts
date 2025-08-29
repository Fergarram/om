import { type Child, type Props, useTags } from "@/lib/ima";

const tags = useTags();

export type ButtonVariant = "default" | "text" | "outline";
export type ButtonSize = "default" | "icon";

export interface ButtonProps extends Props {
	variant?: ButtonVariant;
	size?: ButtonSize;
	disabled?: boolean;
	href?: string;
}

export type ButtonTagArgs =
	| [] // No args
	| [ButtonProps] // Just props
	| [Child, ...Child[]] // First child followed by more children
	| [ButtonProps, ...Child[]]; // Props followed by children

export function Button(...args: ButtonTagArgs): HTMLElement {
	// Parse arguments with proper typing
	let props: ButtonProps = {};
	let children: Child[] = [];

	if (args.length > 0) {
		const first_arg = args[0];

		// Check if first arg is props object
		if (
			first_arg &&
			typeof first_arg === "object" &&
			!Array.isArray(first_arg) &&
			typeof (first_arg as any).nodeType !== "number" &&
			typeof first_arg !== "function"
		) {
			// The first argument is a props object
			props = first_arg as ButtonProps;
			children = args.slice(1) as Child[];
		} else {
			// The first argument is a child
			children = args as Child[];
		}
	}

	// Extract variant and size from props with defaults
	const { variant = "default", size = "default", disabled = false, href = "", ...rest_props } = props;

	// Create the button element with variant and size attributes
	return tags[href ? "a" : "button"](
		{
			component: "button",
			variant,
			size,
			href,
			disabled: disabled ? "" : undefined,
			...rest_props,
		},
		...children,
	);
}
