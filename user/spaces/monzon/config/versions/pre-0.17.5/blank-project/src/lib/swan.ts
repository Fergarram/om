//
// Swan 1.0.2-sb
// by fergarram
//

// A lightweight system for generating HTML and JS with a component-like syntax

//
// Index:
//

// — Dependencies
// — Core Types
// — HTML Tag Generation

//
// Core Types
//

export type RenderOptions = {
	out: string;
	slug: string;
	html: string;
	js: string;
	use_html_dirs?: boolean;
};

export type Props = {
	is?: string;
	[key: string]: any;
};

export type TagResult = {
	html: string;
	js: string;
};

export type TagFunction = (
	props?: Props | string | null | undefined | TagResult,
	...children: (TagResult | null | undefined | string)[]
) => TagResult;

export type TagsProxy = {
	[key: string]: TagFunction;
} & ((ns?: string) => TagsProxy);

//
// HTML Tag Generation
//

export const tag_generator =
	(_: any, name: string): TagFunction =>
	(...args: any[]): TagResult => {
		let props: Props = {};
		let children: (TagResult | string)[] = args;

		if (args.length > 0) {
			const first_arg = args[0];

			// If first argument is a string or TagResult, all args are children
			if (typeof first_arg === "string" || (typeof first_arg === "object" && "html" in first_arg)) {
				children = args;
			}

			// If first argument is a plain object, treat it as props
			else if (Object.getPrototypeOf(first_arg ?? 0) === Object.prototype) {
				const [props_arg, ...rest_args] = args;
				const { is, ...rest_props } = props_arg;
				props = rest_props;
				children = rest_args;
			}
		}

		let html = `<${name}`;
		let js = "";
		const element_id = unique_id();

		// Handle props/attributes
		for (const [k, v] of Object.entries(props)) {
			// Evaluate the prop value if it's a function
			const value = typeof v === "function" ? v() : v;

			if (value === true) {
				html += ` ${k}`;
			} else if (value !== false && value != null) {
				if (k.startsWith("on")) {
					html += ` data-swan-id="${element_id}"`;
					const event_name = k.toLowerCase().slice(2);
					js += `document.querySelector('[data-swan-id="${element_id}"]').addEventListener('${event_name}',function(e){${value}});
		            `;
				} else {
					const char_map: { [key: string]: string } = {
						"&": "&amp;",
						"<": "&lt;",
						">": "&gt;",
						'"': "&quot;",
						"'": "&#39;",
					};

					const safe_value = String(value).replace(/[&<>"']/g, (c: string) => char_map[c]);
					html += ` ${k}="${safe_value}"`;
				}
			}
		}

		// Self-closing tags handling
		const void_elements: Set<string> = new Set([
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
			return { html: html + "/>", js };
		}

		html += ">";

		// Add children
		const add_children = (items: (TagResult | string)[]): void => {
			for (const child of items.flat(Infinity)) {
				if (child != null) {
					if (typeof child === "object" && "html" in child && "js" in child) {
						html += child.html;
						js += child.js;
					} else {
						html += String(child);
					}
				}
			}
		};

		add_children(children);

		return {
			html: html + `</${name}>`,
			js,
		};
	};

export const tags: TagsProxy = new Proxy({}, { get: tag_generator });

export function dom(input: string | TagResult): HTMLElement {
	// Extract HTML string from input
	const html_string = typeof input === "string" ? input : input.html;

	const parser = new DOMParser();
	const doc = parser.parseFromString(html_string, "text/html");

	// Handle empty or invalid HTML
	if (!doc.body.firstElementChild) {
		throw new Error("Invalid HTML string provided to domify");
	}

	return doc.body.firstElementChild as HTMLElement;
}

function unique_id() {
	// Use crypto.randomUUID() (modern browsers and Node.js 14+)
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	// Use crypto.getRandomValues() (older modern browsers)
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		// RFC4122 version 4 UUID implementation
		const uuid_template = "10000000-1000-4000-8000-100000000000";
		const generate_random_hex = (c: string): string => {
			const random_byte = crypto.getRandomValues(new Uint8Array(1))[0];
			const c_num = parseInt(c, 10);
			const mask = 15 >> (c_num / 4);
			return (c_num ^ (random_byte & mask)).toString(16);
		};

		return uuid_template.replace(/[018]/g, generate_random_hex);
	}

	// Fallback to Math.random() (least secure, but most compatible)
	const uuid_template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
	const generate_random_hex = (c: string): string => {
		const r = Math.floor(Math.random() * 16);
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	};

	return uuid_template.replace(/[xy]/g, generate_random_hex);
}
