//
// IMA Utils
//

// Extra utils for working with IMA
// by fergarram
//

import { useTags } from "ima";
import { stringToBase64, createStyleSheet, getAdoptedStyleSheet, createShadowStyleSheet } from "utils";

export function useStyledTags(opts) {
	return useTags({
		...opts,
		attr(name, value) {
			if (name === "styles") {
				// Use CSS as key
				const key = stringToBase64(value);
				const processed_css = value.replaceAll("&", `[styles-key="${key}"]`);

				if (opts && opts.shadow_root) {
					const shadow_root = typeof opts.shadow_root === "function" ? opts.shadow_root() : opts.shadow_root;
					const sheet_exists = getAdoptedStyleSheet(key, "shadow");
					if (!sheet_exists) {
						const sheet = createShadowStyleSheet(shadow_root, key);
						sheet.replaceSync(processed_css);
					}
				} else {
					const doc = (opts && opts.iframe_document) || document;
					const sheet_exists = getAdoptedStyleSheet(key);
					if (!sheet_exists) {
						const sheet = createStyleSheet(key, doc);
						sheet.replaceSync(processed_css);
					}
				}

				return {
					name: "styles-key",
					value: key,
				};
			}

			// Return default for other attributes
			return opts && opts.attr ? opts.attr(name, value) : { name, value };
		},
	});
}

export function registerCustomTag(tag_name, definition = {}, opts) {
	if (!customElements.get(tag_name)) {
		customElements.define(
			tag_name,
			class extends HTMLElement {
				static observedAttributes = definition.attrs ?? [];
				#onconnected;
				#ondisconnected;
				#onadopted;
				#onattributechanged;

				constructor() {
					super();

					const ac = new AbortController();

					this.$on = (evt, handler, options = true) => {
						let defaultOptions = { signal: ac.signal };
						if (typeof options === "boolean") {
							defaultOptions.capture = options;
						} else {
							defaultOptions = Object.assign(options, defaultOptions);
						}
						this.addEventListener(evt, handler, defaultOptions);
					};

					this.ac = ac;

					this.#onconnected = definition.onconnected?.bind(this);
					this.#ondisconnected = definition.ondisconnected?.bind(this);
					this.#onadopted = definition.onadopted?.bind(this);
					this.#onattributechanged = definition.onattributechanged?.bind(this);

					// Run setup at end of constructor
					definition.setup?.call(this);
				}

				connectedCallback() {
					this.#onconnected?.();
					this.dispatchEvent(new CustomEvent("connected"));
				}

				disconnectedCallback() {
					this.#ondisconnected?.();
					this.dispatchEvent(new CustomEvent("disconnected"));
					this.ac.abort();
				}

				adoptedCallback() {
					this.#onadopted?.();
					this.dispatchEvent(new CustomEvent("adopted"));
				}

				attributeChangedCallback(...args) {
					this.#onattributechanged?.(...args);
					this.dispatchEvent(
						new CustomEvent("attributechanged", {
							detail: { name: args[0], old_value: args[1], new_value: args[2] },
						}),
					);
				}
			},
		);

		if (opts && opts.use_styles) {
			delete opts.use_styles;
			return useStyledTags(opts)[tag_name];
		} else {
			return useTags(opts)[tag_name];
		}
	}
}

export function registerCustomStyledTag(tag_name, definition = {}, opts) {
	return registerCustomTag(tag_name, definition, {
		...opts,
		use_styles: true,
	});
}
