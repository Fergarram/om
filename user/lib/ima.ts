//
// IMA (今) 0.3.0
// by fergarram
//

// A tiny immediate-mode inspired UI rendering engine.

//
// Index:
//

// — Core Types
// — DOM Element Generation
// — Reactive System

//
// Core Types
//

export type Child = HTMLElement | Node | null | undefined | string | boolean | number | (() => any);

export type Ref<T = HTMLElement> = {
	current: T | null;
};

export type Props = {
	is?: string;
	key?: any;
	ref?: Ref<HTMLElement>;
	[key: string]: any;
};

// Define TagArgs to properly handle the overloaded parameter patterns
export type TagArgs =
	| [] // No arguments
	| [Props] // Just props
	| [Child, ...Child[]] // First child followed by more children
	| [Props, ...Child[]]; // Props followed by children

export type TagFunction = (...args: TagArgs) => HTMLElement;

export type TagsProxy = {
	[key: string]: TagFunction;
};

//
// Use Tags
//

export function useTags(namespace?: string): TagsProxy {
	const is_static = typeof window === "undefined";

	if (is_static) {
		return new Proxy({}, { get: staticTagGenerator });
	} else {
		return new Proxy(
			{},
			{
				get: (target, name) => tagGenerator(target, String(name), namespace),
			},
		);
	}
}

//
// DOM Element Generation
//

if (typeof window === "undefined") {
	// In environments without DOM (like Bun/Node server-side), provide no-op versions
	// of the reactive functions to prevent errors
	(global as any).document = {
		createElement: () => ({}),
		createTextNode: () => ({}),
		createComment: () => ({}),
		createElementNS: () => ({}),
	};

	console.warn("Trying to use client-side tags on server.");
}

function tagGenerator(_: any, name: string, namespace?: string): TagFunction {
	return (...args: any[]): HTMLElement => {
		let props_obj: Props = {};
		let el_ref: Ref<HTMLElement> | undefined;
		let children: (HTMLElement | Node | null | undefined | string | boolean | number | (() => any))[] = args;

		if (args.length > 0) {
			const first_arg = args[0];

			// If first argument is a string, number, or HTMLElement, all args are children
			if (
				typeof first_arg === "string" ||
				typeof first_arg === "number" ||
				first_arg instanceof HTMLElement ||
				typeof first_arg === "function"
			) {
				children = args;
			}
			// If first argument is a plain object, treat it as props
			else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
				const [props_arg, ...rest_args] = args;
				const { is, ref, ...rest_props } = props_arg;
				props_obj = rest_props;
				children = rest_args;

				// Handle ref assignment
				if (ref && typeof ref === "object" && "current" in ref) {
					// We'll assign the element to ref.current after creation
					el_ref = ref;
				}
			}
		}

		// Create the element
		const element = namespace ? document.createElementNS(namespace, name) : document.createElement(name);

		// Handle ref assignment - do this early so ref.current is available
		if (el_ref) {
			el_ref.current = element as HTMLElement;
		}

		// Handle props/attributes (rest of the function remains the same)
		for (const [attr_key, value] of Object.entries(props_obj)) {
			// Event handlers
			if (attr_key.startsWith("on") && typeof value === "function") {
				const event_name = attr_key.substring(2).toLowerCase(); // e.g., "onClick" -> "click"
				element.addEventListener(event_name, value as EventListener);
				continue;
			}

			// Reactive attributes (functions that don't start with "on")
			if (typeof value === "function" && !attr_key.startsWith("on")) {
				setupReactiveAttr(element as HTMLElement, attr_key, value);
				continue;
			}

			// Regular attributes
			if (value === true) {
				element.setAttribute(attr_key, "");
			} else if (value !== false && value != null) {
				element.setAttribute(attr_key, String(value));
			}
		}

		// Process children and append to element
		for (const child of children.flat(Infinity)) {
			if (child != null) {
				if (child instanceof Node) {
					element.appendChild(child);
				} else if (typeof child === "function") {
					// Handle reactive child
					const reactive_node = setupReactiveNode(child);
					element.appendChild(reactive_node);
				} else {
					element.appendChild(document.createTextNode(String(child)));
				}
			}
		}

		return element as HTMLElement;
	};
}

export const tags: TagsProxy = new Proxy(
	{},
	{
		get: (target, name) => tagGenerator(target, String(name)),
	},
);

//
// Reactive System
//

// Reactive nodes
const reactive_markers: (Comment | null)[] = [];
const reactive_callbacks: ((() => any) | null)[] = [];
const reactive_prev_values: (Node | string | null)[] = [];
let reactive_count = 0;

// Reactive attributes
const reactive_attr_elements: (HTMLElement | null)[] = [];
const reactive_attr_names: (string | null)[] = [];
const reactive_attr_callbacks: ((() => any) | null)[] = [];
const reactive_attr_prev_values: any[] = [];
let reactive_attr_count = 0;

let frame_time = 0;
let cleanup_counter = 0;

// Start the frame loop immediately
if (typeof window !== "undefined") {
	requestAnimationFrame(updateReactiveComponents);
}

function updateReactiveComponents() {
	// Start timing the update
	const start_time = performance.now();

	let found_disconnected_attrs = false;
	let found_disconnected_nodes = false;

	// Update reactive attributes
	for (let i = 0; i < reactive_attr_count; i++) {
		const element = reactive_attr_elements[i];

		// Track if we find disconnected elements
		if (!element || !element.isConnected) {
			found_disconnected_attrs = true;
			continue;
		}

		const attr_name = reactive_attr_names[i];
		const callback = reactive_attr_callbacks[i];

		if (!attr_name || !callback) continue;

		const new_value = callback();

		// Only update if value changed
		if (new_value !== reactive_attr_prev_values[i]) {
			if (new_value === true) {
				element.setAttribute(attr_name, "true");
			} else if (new_value === false) {
				element.setAttribute(attr_name, "false");
			} else if (new_value === null || new_value === undefined) {
				element.removeAttribute(attr_name);
			} else {
				element.setAttribute(attr_name, String(new_value));
			}

			reactive_attr_prev_values[i] = new_value;
		}
	}

	// Update reactive nodes
	for (let i = 0; i < reactive_count; i++) {
		const marker = reactive_markers[i];

		// Track if we find disconnected markers
		if (!marker || !marker.isConnected) {
			found_disconnected_nodes = true;
			continue;
		}

		const callback = reactive_callbacks[i];
		if (!callback) continue;

		const new_value = callback();

		// Get the current node (should be right before the marker)
		const current_node = marker.previousSibling;
		if (!current_node) continue;

		// Determine if we need to update based on content
		let needs_update = false;

		if (new_value instanceof Node) {
			if (current_node instanceof HTMLElement && new_value instanceof HTMLElement) {
				// For HTML elements, compare their HTML content
				if (current_node.outerHTML !== new_value.outerHTML) {
					needs_update = true;
				}
			} else {
				// For non-HTMLElements or mixed types, always update
				needs_update = true;
			}
		} else {
			// For text values, compare with current node
			const new_text = String(new_value ?? "");
			if (current_node.nodeType === Node.TEXT_NODE) {
				needs_update = current_node.textContent !== new_text;
			} else {
				needs_update = true; // Different node types
			}
		}

		// Only update DOM if needed
		if (needs_update) {
			let new_node: Node;

			if (new_value instanceof Node) {
				new_node = new_value;
			} else {
				new_node = document.createTextNode(String(new_value ?? ""));
			}

			current_node.replaceWith(new_node);
		}
	}

	// Only perform cleanup if we found disconnected components
	if (found_disconnected_attrs || found_disconnected_nodes) {
		cleanup_counter++;
		// Clean up immediately if we have many disconnected components, otherwise wait for the timer
		if (cleanup_counter >= 60) {
			cleanup_counter = 0;
			cleanupDisconnectedReactives();
		}
	}

	// Calculate and store the time it took to update
	frame_time = performance.now() - start_time;

	// Always schedule the next frame
	requestAnimationFrame(updateReactiveComponents);
}

function cleanupDisconnectedReactives() {
	// Cleanup reactive nodes
	let write_index = 0;
	for (let read_index = 0; read_index < reactive_count; read_index++) {
		const marker = reactive_markers[read_index];
		const callback = reactive_callbacks[read_index];
		const prev_value = reactive_prev_values[read_index];

		// Keep if marker is still connected
		if (marker && marker.isConnected) {
			if (write_index !== read_index) {
				reactive_markers[write_index] = marker;
				reactive_callbacks[write_index] = callback;
				reactive_prev_values[write_index] = prev_value;
			}
			write_index++;
		}
	}

	// Clear the remaining slots and update count
	for (let i = write_index; i < reactive_count; i++) {
		reactive_markers[i] = null;
		reactive_callbacks[i] = null;
		reactive_prev_values[i] = null;
	}
	reactive_count = write_index;

	// Cleanup reactive attributes
	write_index = 0;
	for (let read_index = 0; read_index < reactive_attr_count; read_index++) {
		const element = reactive_attr_elements[read_index];
		const attr_name = reactive_attr_names[read_index];
		const callback = reactive_attr_callbacks[read_index];
		const prev_value = reactive_attr_prev_values[read_index];

		// Keep if element is still connected
		if (element && element.isConnected) {
			if (write_index !== read_index) {
				reactive_attr_elements[write_index] = element;
				reactive_attr_names[write_index] = attr_name;
				reactive_attr_callbacks[write_index] = callback;
				reactive_attr_prev_values[write_index] = prev_value;
			}
			write_index++;
		}
	}

	// Clear the remaining slots and update count
	for (let i = write_index; i < reactive_attr_count; i++) {
		reactive_attr_elements[i] = null;
		reactive_attr_names[i] = null;
		reactive_attr_callbacks[i] = null;
		reactive_attr_prev_values[i] = undefined;
	}
	reactive_attr_count = write_index;
}

export function getFrameTime() {
	return frame_time;
}

function setupReactiveNode(callback: () => any): Node {
	const node_index = reactive_count++;

	// Create a marker comment node
	const marker = document.createComment(`reactive-${node_index}`);

	// Get initial value
	const initial_value = callback();

	// Create the initial node
	let initial_node: Node;

	if (initial_value instanceof Node) {
		initial_node = initial_value;
	} else {
		initial_node = document.createTextNode(String(initial_value ?? ""));
	}

	// Create a fragment to hold both the marker and the content
	const fragment = document.createDocumentFragment();
	fragment.appendChild(initial_node);
	fragment.appendChild(marker);

	// Store reactive data
	reactive_markers[node_index] = marker;
	reactive_callbacks[node_index] = callback;
	reactive_prev_values[node_index] = initial_node;

	return fragment;
}

function setupReactiveAttr(element: HTMLElement, attr_name: string, callback: () => any) {
	const attr_index = reactive_attr_count++;

	// Initialize with current value
	const initial_value = callback();

	// Set the initial attribute value
	if (initial_value === true) {
		element.setAttribute(attr_name, "");
	} else if (initial_value !== false && initial_value != null) {
		element.setAttribute(attr_name, String(initial_value));
	}

	// Store data in our parallel arrays
	reactive_attr_elements[attr_index] = element;
	reactive_attr_names[attr_index] = attr_name;
	reactive_attr_callbacks[attr_index] = callback;
	reactive_attr_prev_values[attr_index] = initial_value;
}

//
// Static Generation
//

function staticTagGenerator(_: any, name: string) {
	return (...args: any[]): string => {
		let props_obj: Props = {};
		let children: (string | null | undefined | boolean | number | (() => any))[] = args;

		if (args.length > 0) {
			const first_arg = args[0];

			// If first argument is a string, number, or function, all args are children
			if (typeof first_arg === "string" || typeof first_arg === "number" || typeof first_arg === "function") {
				children = args;
			}
			// If first argument is a plain object, treat it as props
			else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
				const [props_arg, ...rest_args] = args;
				const { is, ...rest_props } = props_arg;
				props_obj = rest_props;
				children = rest_args;
			}
		}

		// Start building the HTML string
		let html = `<${name}`;

		// Handle props/attributes
		for (const [key, value] of Object.entries(props_obj)) {
			// Skip event handlers and functions
			if (key.startsWith("on") || typeof value === "function") {
				continue;
			}

			// Convert className to class
			const attr_key = key === "className" ? "class" : key;

			// Regular attributes
			if (value === true) {
				html += ` ${attr_key}`;
			} else if (value !== false && value != null) {
				// Escape attribute values
				const escaped_value = String(value)
					.replace(/&/g, "&amp;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#39;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
				html += ` ${attr_key}="${escaped_value}"`;
			}
		}

		// Self-closing tags
		const void_elements = new Set([
			"area",
			"base",
			"br",
			"col",
			"embed",
			"hr",
			"img",
			"input",
			"link",
			"meta",
			"param",
			"source",
			"track",
			"wbr",
		]);

		if (void_elements.has(name)) {
			return html + "/>";
		}

		html += ">";

		// Process children
		for (const child of children.flat(Infinity)) {
			if (child != null) {
				if (typeof child === "function") {
					// Resolve function children
					html += String((child as Function)());
				} else {
					// Don't escape HTML content - treat it as raw HTML
					html += String(child);
				}
			}
		}

		return html + `</${name}>`;
	};
}

export const staticTags: TagsProxy = new Proxy({}, { get: staticTagGenerator });
