// ima.ts
function useTags() {
	const is_static = typeof window === "undefined";
	return is_static ? new Proxy({}, { get: static_tag_generator }) : new Proxy({}, { get: tag_generator });
}
if (typeof window === "undefined") {
	global.document = {
		createElement: () => ({}),
		createTextNode: () => ({}),
		createComment: () => ({}),
	};
	console.warn("Trying to use client-side tags on server.");
}
var tag_generator =
	(_, name) =>
	(...args) => {
		let props_obj = {};
		let children = args;
		if (args.length > 0) {
			const first_arg = args[0];
			if (
				typeof first_arg === "string" ||
				typeof first_arg === "number" ||
				first_arg instanceof HTMLElement ||
				typeof first_arg === "function"
			) {
				children = args;
			} else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
				const [props_arg, ...rest_args] = args;
				const { is, ...rest_props } = props_arg;
				props_obj = rest_props;
				children = rest_args;
			}
		}
		const element = document.createElement(name);
		for (const [attr_key, value] of Object.entries(props_obj)) {
			if (attr_key.startsWith("on") && typeof value === "function") {
				const event_name = attr_key.substring(2).toLowerCase();
				element.addEventListener(event_name, value);
				continue;
			}
			if (typeof value === "function" && !attr_key.startsWith("on")) {
				setup_reactive_attr(element, attr_key, value);
				continue;
			}
			if (value === true) {
				element.setAttribute(attr_key, "");
			} else if (value !== false && value != null) {
				element.setAttribute(attr_key, String(value));
			}
		}
		for (const child of children.flat(Infinity)) {
			if (child != null) {
				if (child instanceof Node) {
					element.appendChild(child);
				} else if (typeof child === "function") {
					const reactive_node = setup_reactive_node(child);
					element.appendChild(reactive_node);
				} else {
					element.appendChild(document.createTextNode(String(child)));
				}
			}
		}
		return element;
	};
var tags = new Proxy({}, { get: tag_generator });
var reactive_markers = [];
var reactive_callbacks = [];
var reactive_prev_values = [];
var reactive_count = { value: 0 };
var reactive_attr_elements = [];
var reactive_attr_names = [];
var reactive_attr_callbacks = [];
var reactive_attr_prev_values = [];
var reactive_attr_count = { value: 0 };
var animation_frame_requested = false;
var frame_time = 0;
function update_reactive_components() {
	animation_frame_requested = false;
	const start_time = performance.now();
	for (let i = 0; i < reactive_attr_count.value; i++) {
		const element = reactive_attr_elements[i];
		const attr_name = reactive_attr_names[i];
		const callback = reactive_attr_callbacks[i];
		if (!element.isConnected) continue;
		const new_value = callback();
		if (new_value !== reactive_attr_prev_values[i]) {
			if (new_value === true) {
				element.setAttribute(attr_name, "");
			} else if (new_value === false || new_value == null) {
				element.removeAttribute(attr_name);
			} else {
				element.setAttribute(attr_name, String(new_value));
			}
			reactive_attr_prev_values[i] = new_value;
		}
	}
	for (let i = 0; i < reactive_count.value; i++) {
		const marker = reactive_markers[i];
		const callback = reactive_callbacks[i];
		if (!marker.isConnected) continue;
		const new_value = callback();
		const current_node = marker.previousSibling;
		if (!current_node) continue;
		let needs_update = false;
		if (new_value instanceof Node) {
			if (current_node instanceof HTMLElement && new_value instanceof HTMLElement) {
				if (current_node.outerHTML !== new_value.outerHTML) {
					needs_update = true;
				}
			} else {
				needs_update = true;
			}
		} else {
			const new_text = String(new_value ?? "");
			if (current_node.nodeType === Node.TEXT_NODE) {
				needs_update = current_node.textContent !== new_text;
			} else {
				needs_update = true;
			}
		}
		if (needs_update) {
			let new_node;
			if (new_value instanceof Node) {
				new_node = new_value;
			} else {
				new_node = document.createTextNode(String(new_value ?? ""));
			}
			current_node.replaceWith(new_node);
		}
	}
	frame_time = performance.now() - start_time;
	if (reactive_count.value > 0 || reactive_attr_count.value > 0) {
		animation_frame();
	}
}
function getFrameTime() {
	return frame_time;
}
function animation_frame() {
	if (!animation_frame_requested && (reactive_count.value > 0 || reactive_attr_count.value > 0)) {
		animation_frame_requested = true;
		requestAnimationFrame(update_reactive_components);
	}
}
function setup_reactive_node(callback) {
	const node_index = reactive_count.value++;
	const marker = document.createComment(`reactive-${node_index}`);
	const initial_value = callback();
	let initial_node;
	if (initial_value instanceof Node) {
		initial_node = initial_value;
	} else {
		initial_node = document.createTextNode(String(initial_value ?? ""));
	}
	const fragment = document.createDocumentFragment();
	fragment.appendChild(initial_node);
	fragment.appendChild(marker);
	reactive_markers[node_index] = marker;
	reactive_callbacks[node_index] = callback;
	reactive_prev_values[node_index] = initial_node;
	animation_frame();
	return fragment;
}
function setup_reactive_attr(element, attr_name, callback) {
	const attr_index = reactive_attr_count.value++;
	const initial_value = callback();
	if (initial_value === true) {
		element.setAttribute(attr_name, "");
	} else if (initial_value !== false && initial_value != null) {
		element.setAttribute(attr_name, String(initial_value));
	}
	reactive_attr_elements[attr_index] = element;
	reactive_attr_names[attr_index] = attr_name;
	reactive_attr_callbacks[attr_index] = callback;
	reactive_attr_prev_values[attr_index] = initial_value;
	animation_frame();
}
var static_tag_generator =
	(_, name) =>
	(...args) => {
		let props_obj = {};
		let children = args;
		if (args.length > 0) {
			const first_arg = args[0];
			if (typeof first_arg === "string" || typeof first_arg === "number" || typeof first_arg === "function") {
				children = args;
			} else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
				const [props_arg, ...rest_args] = args;
				const { is, ...rest_props } = props_arg;
				props_obj = rest_props;
				children = rest_args;
			}
		}
		let html = `<${name}`;
		for (const [key, value] of Object.entries(props_obj)) {
			if (key.startsWith("on") || typeof value === "function") {
				continue;
			}
			const attr_key = key === "className" ? "class" : key;
			if (value === true) {
				html += ` ${attr_key}`;
			} else if (value !== false && value != null) {
				const escaped_value = String(value)
					.replace(/&/g, "&amp;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#39;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
				html += ` ${attr_key}="${escaped_value}"`;
			}
		}
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
		for (const child of children.flat(Infinity)) {
			if (child != null) {
				if (typeof child === "function") {
					html += String(child());
				} else {
					html += String(child);
				}
			}
		}
		return html + `</${name}>`;
	};
var staticTags = new Proxy({}, { get: static_tag_generator });
export { useTags, tags, tag_generator, static_tag_generator, staticTags, getFrameTime };
