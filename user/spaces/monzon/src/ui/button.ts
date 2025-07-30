import { useTags } from "@/lib/ima";
const tags = useTags();

// Define button variants and sizes
export const BUTTON_VARIANT = {
	DEFAULT: "default",
	TEXT: "text",
	OUTLINE: "outline",
} as const;

export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const BUTTON_SIZE = {
	DEFAULT: "default",
	ICON: "icon",
} as const;

export type ButtonSize = (typeof BUTTON_SIZE)[keyof typeof BUTTON_SIZE];

// Define Button props interface
export interface ButtonProps {
	variant?: ButtonVariant;
	size?: ButtonSize;
	disabled?: boolean;
	href?: string;
	class?: string | (() => string);
	[key: string]: any;
}

// Base classes for all button variants
const base_classes = "component-button-base";

// Size-specific classes
const size_classes: Record<ButtonSize, string> = {
	default: "component-button-size-default",
	icon: "component-button-size-icon"
};

// Variant-specific classes
const variant_classes: Record<ButtonVariant, string> = {
	default: "component-button-variant-default",
	outline: "component-button-variant-outline",
	text: "component-button-variant-text",
};

export function Button(...args: any[]): any {
	// Parse arguments
	let props: ButtonProps = {};
	let children: any[] = [];

	if (args.length > 0) {
		const first_arg = args[0];

		// Check if first arg is props object
		if (
			first_arg &&
			typeof first_arg === "object" &&
			!Array.isArray(first_arg) &&
			typeof first_arg.nodeType !== "number" &&
			typeof first_arg !== "function"
		) {
			// The first argument is a props object
			props = first_arg as ButtonProps;
			children = args.slice(1);
		} else {
			// The first argument is a child
			children = args;
		}
	}

	// Extract variant and size from props
	const variant = props.variant || BUTTON_VARIANT.DEFAULT;
	const size = props.size || BUTTON_SIZE.DEFAULT;
	const disabled = props.disabled || false;
	const href = props.href || "";

	// Remove used props
	delete props.variant;
	delete props.size;
	delete props.disabled;
	delete props.href;

	const rest_props = props;

	// Get the appropriate size and variant classes
	const current_size_classes = size_classes[size] || size_classes.default;
	const current_variant_classes = variant_classes[variant] || variant_classes.default;

	// Combine all classes
	const class_list = `${base_classes} ${current_size_classes} ${current_variant_classes}`;

	// If a class was provided in rest_props, merge it with our classes
	if (rest_props.class) {
		const user_class = rest_props.class;
		rest_props.class =
			typeof user_class === "function" ? () => `${class_list} ${user_class()}` : `${class_list} ${user_class}`;
	} else {
		rest_props.class = class_list;
	}

	// Create the button element with merged props and children
	return tags[href ? "a" : "button"](
		{
			component: "button",
			href,
			disabled,
			...rest_props,
		},
		...children,
	);
}
