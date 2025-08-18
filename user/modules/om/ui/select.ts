import { type TagArgs, type Child, type Props, useTags } from "@/lib/ima";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;
import { docMain, finish, isUserTyping } from "@/lib/utils";

const tags = useTags();

const fit_class = tw("w-fit");
const pointer_event_class = tw("pointer-events-none");
const position_offset = 4;

// Updated types for the Select component
export interface SelectProps extends Props {
	click?: MouseEvent; // The click event that triggered the select
	width?: "parent" | "fit" | number | string; // Width options
	max_height?: number | string; // Optional max height
	side?: "top" | "right" | "bottom" | "left"; // Which side to place the dropdown
	align?: "start" | "center" | "end"; // Alignment along the side
	follow_cursor?: boolean; // Whether to position at cursor or element
	onselect?: (value: any) => void; // Callback when an item is selected
	input_el?: HTMLInputElement; // Optional input element for filtering
}

// Types for SelectItem
export interface SelectItemProps extends Props {
	value?: any; // The value to be returned when selected
	disabled?: boolean;
}

export type SelectArgs = [SelectProps, ...Child[]];

// Global references for managing selects
let current_select: HTMLElement | null = null;
let current_input: HTMLInputElement | null = null;
let backdrop_el: HTMLElement | null = null;
let active_item_index = -1;
let keyboard_listener: ((e: KeyboardEvent) => void) | null = null;

// Clean up any existing select dropdown
function cleanupSelects() {
	if (backdrop_el && backdrop_el.parentNode) {
		backdrop_el.parentNode.removeChild(backdrop_el);
		backdrop_el = null;
	}

	if (current_select) {
		current_select.remove();
		current_select = null;
	}

	if (current_input) {
		current_input = null;
		document.removeEventListener("mousedown", cancelInputSelect);
	}

	// Remove keyboard event listener
	if (keyboard_listener) {
		window.removeEventListener("keydown", keyboard_listener);
		keyboard_listener = null;
	}
}

// Helper function to navigate between items using keyboard
function navigateItems(direction: "next" | "prev") {
	if (!current_select) return;

	const items = Array.from(current_select.querySelectorAll('[data-select-item]:not([aria-disabled="true"])'));
	if (items.length === 0) return;

	// Remove focus from current item
	(document.activeElement as HTMLElement).blur();

	if (direction === "next") {
		active_item_index = (active_item_index + 1) % items.length;
	} else {
		active_item_index = (active_item_index - 1 + items.length) % items.length;
	}

	// Focus the new active item
	const active_item = items[active_item_index] as HTMLElement;
	active_item.focus();

	// Ensure the active item is visible
	active_item.scrollIntoView({ block: "nearest" });
}

function cancelInputSelect(e: MouseEvent) {
	if (!current_input || !current_select) return;
	if (!current_input.contains(e.target as Node) && !current_select.contains(e.target as Node)) {
		cleanupSelects();
	}
}

// Main Select function
export function useSelect(...args: SelectArgs): Promise<any> {
	return new Promise((resolve) => {
		// Parse arguments
		let props: SelectProps = {};
		let children: Child[] = [];

		if (args.length > 0) {
			const first_arg = args[0];

			if (
				first_arg &&
				typeof first_arg === "object" &&
				!Array.isArray(first_arg) &&
				typeof (first_arg as any).nodeType !== "number" &&
				typeof first_arg !== "function"
			) {
				props = first_arg as SelectProps;
				children = args.slice(1) as Child[];
			} else {
				children = args as Child[];
			}
		}

		// Extract props
		const {
			click,
			width = "parent",
			max_height = "300px",
			side = "bottom",
			align = "start",
			follow_cursor = false,
			onselect,
			input_el,
			...rest_props
		} = props as SelectProps;

		// Clean up any existing select
		cleanupSelects();

		if (!click) {
			console.error("Select requires a click event to position correctly");
			resolve(undefined);
			return;
		}

		// Track the selected value to resolve with
		let selected_value: any = undefined;

		// Enhanced cleanup function that resolves the promise
		const cleanupAndResolve = () => {
			cleanupSelects();
			resolve(selected_value);
		};

		// Add tracker to input
		if (input_el) {
			current_input = input_el;
			document.addEventListener("mousedown", cancelInputSelect);
		}

		// Create backdrop for closing when clicking outside
		backdrop_el = tags.div({
			component: "select-backdrop",
			class: input_el ? pointer_event_class : "",
			oncontextmenu: (e: MouseEvent) => {
				e.preventDefault();
				cleanupAndResolve();
			},
			onclick: (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				cleanupAndResolve();
			},
		});

		// Determine class based on width
		let width_class = "";
		if (width === "fit") {
			width_class = fit_class;
		}

		// Create the select dropdown
		const select_el = tags.div(
			{
				component: "select",
				style: `max-height: ${max_height}; ${
					typeof width === "number"
						? `width: ${width}px;`
						: width !== "fit" && width !== "parent"
							? `width: ${width};`
							: ""
				}`,
				tabIndex: -1,
				...rest_props,
				class: cn(width_class, rest_props.class),
			},
			tags.div({}, ...children),
		);

		// Add event delegation for item selection
		select_el.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const select_item = target.closest("[data-select-item]");

			if (select_item) {
				const value = select_item.getAttribute("data-value");
				if (value !== null) {
					selected_value = value === "undefined" ? undefined : JSON.parse(value);
					if (onselect) {
						onselect(selected_value);
					}
				}
				cleanupAndResolve();
			}
		});

		// Reset active item index
		active_item_index = -1;

		// Add keyboard navigation
		keyboard_listener = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Escape":
					e.preventDefault();
					cleanupAndResolve();
					break;
				case "ArrowDown":
					e.preventDefault();
					navigateItems("next");
					break;
				case "ArrowUp":
					e.preventDefault();
					navigateItems("prev");
					break;
				case "Enter":
				case " ":
					if (e.key === " " && isUserTyping()) return;
					e.preventDefault();
					if (active_item_index >= 0) {
						const items = Array.from(
							current_select!.querySelectorAll('[data-select-item]:not([aria-disabled="true"])'),
						);
						if (active_item_index < items.length) {
							const select_item = items[active_item_index] as HTMLElement;
							const value = select_item.getAttribute("data-value");
							if (value !== null) {
								selected_value = value === "undefined" ? undefined : JSON.parse(value);
								if (onselect) {
									onselect(selected_value);
								}
							}
							cleanupAndResolve();
						}
					}
					break;
				case "Tab":
					e.preventDefault(); // Prevent tabbing while select is open
					navigateItems(e.shiftKey ? "prev" : "next");
					break;
			}
		};

		window.addEventListener("keydown", keyboard_listener);

		// Position the dropdown
		positionDropdown(select_el, click, side, align, width, follow_cursor);

		// Add elements to the DOM
		const container = docMain() || document.body;
		container.appendChild(backdrop_el);
		container.appendChild(select_el);
		current_select = select_el;

		// Set focus to the select element
		if (!input_el) select_el.focus();
	});
}

// Updated helper function to position the dropdown
function positionDropdown(
	dropdown: HTMLElement,
	event: MouseEvent,
	side: "top" | "right" | "bottom" | "left",
	align: "start" | "center" | "end",
	width: "parent" | "fit" | number | string,
	follow_cursor: boolean,
) {
	// Get position reference (cursor or target element)
	const target_el = event.target as HTMLElement;
	const target_rect = follow_cursor
		? {
				left: event.clientX,
				right: event.clientX,
				top: event.clientY,
				bottom: event.clientY,
				width: 0,
				height: 0,
			}
		: target_el.getBoundingClientRect();

	const scroll_top = window.scrollY || document.documentElement.scrollTop;
	const scroll_left = window.scrollX || document.documentElement.scrollLeft;

	// Temporarily position off-screen to measure it
	dropdown.style.position = "fixed";
	dropdown.style.top = "-9999px";
	dropdown.style.left = "-9999px";

	// Get dimensions after a small delay to ensure the browser has rendered it
	setTimeout(() => {
		const dropdown_width = dropdown.offsetWidth;
		const dropdown_height = dropdown.offsetHeight;
		const viewport_height = window.innerHeight;
		const viewport_width = window.innerWidth;

		// Set parent width if needed
		if (width === "parent" && !follow_cursor) {
			dropdown.style.width = `${target_rect.width}px`;
		}

		// Calculate position based on side
		let top = 0;
		let left = 0;

		// Determine vertical position based on side
		switch (side) {
			case "top":
				top = target_rect.top + scroll_top - dropdown_height - position_offset;
				break;
			case "bottom":
				top = target_rect.bottom + scroll_top + position_offset;
				break;
			case "left":
			case "right":
				// For left/right we align to the middle vertically by default
				top = target_rect.top + scroll_top + target_rect.height / 2 - dropdown_height / 2;
				break;
		}

		// Determine horizontal position based on side
		switch (side) {
			case "left":
				left = target_rect.left + scroll_left - dropdown_width - position_offset;
				break;
			case "right":
				left = target_rect.right + scroll_left + position_offset;
				break;
			case "top":
			case "bottom":
				// For top/bottom we use the alignment
				if (align === "start") {
					left = target_rect.left + scroll_left;
				} else if (align === "center") {
					left = target_rect.left + scroll_left + target_rect.width / 2 - dropdown_width / 2;
				} else if (align === "end") {
					left = target_rect.right + scroll_left - dropdown_width;
				}
				break;
		}

		// Boundary checks to ensure dropdown stays in viewport
		if (top < scroll_top) top = scroll_top + position_offset;
		if (top + dropdown_height > scroll_top + viewport_height) {
			top = scroll_top + viewport_height - dropdown_height - position_offset;
		}

		if (left < scroll_left) left = scroll_left + position_offset;
		if (left + dropdown_width > scroll_left + viewport_width) {
			left = scroll_left + viewport_width - dropdown_width - position_offset;
		}

		// Set the final position
		dropdown.style.top = `${top}px`;
		dropdown.style.left = `${left}px`;
		dropdown.style.position = "absolute";
	}, 0);

	return target_el;
}

export function SelectSeparator() {
	return tags.div({ component: "select-separator" });
}

// SelectItem component
export function SelectItem(...args: TagArgs): HTMLElement {
	// Parse arguments
	let props: SelectItemProps = {};
	let children: Child[] = [];

	if (args.length > 0) {
		const first_arg = args[0];

		if (
			first_arg &&
			typeof first_arg === "object" &&
			!Array.isArray(first_arg) &&
			typeof (first_arg as any).nodeType !== "number" &&
			typeof first_arg !== "function"
		) {
			props = first_arg as SelectItemProps;
			children = args.slice(1) as Child[];
		} else {
			children = args as Child[];
		}
	}

	// Extract props
	const { value, disabled = false, ...rest_props } = props;

	// If a class was provided in rest_props, merge it with our classes
	if (rest_props.class) {
		const classes = rest_props.class;
		rest_props.class = typeof classes === "function" ? () => classes() : classes;
	}

	// Serialize the value for the data attribute
	const serialized_value = typeof value !== "undefined" ? JSON.stringify(value) : "undefined";

	return tags.button(
		{
			component: "select-item",
			role: "option",
			disabled: disabled ? "" : undefined,
			"data-select-item": "",
			"data-value": serialized_value,
			"aria-disabled": disabled.toString(),
			tabindex: disabled ? -1 : 0,
			...rest_props,
		},
		...children,
	);
}

export function isSelectOpen() {
	return current_select !== null;
}

export function closeActiveSelect() {
	if (current_select) {
		current_select = null;
	}
}

export function cancelSelect() {
	cleanupSelects();
}
