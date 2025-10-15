//
// IMA Utils
//

// Extra utils for working with IMA
// by fergarram
//

import { useTags } from "@std/ima";
import { stringToBase64, createStyleSheet, getAdoptedStyleSheet, createShadowStyleSheet } from "@std/utils";

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
					const sheet_exists = getAdoptedStyleSheet(key);
					if (!sheet_exists) {
						const sheet = createStyleSheet(key);
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

export function useCustomStyledTag(tag_name, definition, opts) {
	return useCustomTag(tag_name, definition, {
		...opts,
		use_styles: true,
	});
}

export function useCustomTag(tag_name, definition, opts) {
	if (!customElements.get(tag_name)) {
		customElements.define(
			tag_name,
			class extends HTMLElement {
				static observedAttributes = definition.attrs ?? [];
				#connected;
				#disconnected;
				#adopted;
				#attributeChanged;

				constructor() {
					super();

					const ac = new AbortController();
					const $listen = (evt, handler, options = true) => {
						let defaultOptions = { signal: ac.signal };
						if (typeof options === "boolean") {
							defaultOptions.capture = options;
						} else {
							defaultOptions = Object.assign(options, defaultOptions);
						}
						this.addEventListener(evt, handler, defaultOptions);
					};

					this.ac = ac;

					const { connected, disconnected, adopted, attributeChanged } = definition.apply(this, [{ $listen }]) ?? {};

					this.#connected = connected?.bind(this);
					this.#disconnected = disconnected?.bind(this);
					this.#adopted = adopted?.bind(this);
					this.#attributeChanged = attributeChanged?.bind(this);
				}

				connectedCallback() {
					this.#connected?.();
				}

				disconnectedCallback() {
					this.#disconnected?.();
					this.ac.abort();
				}

				adoptedCallback() {
					this.#adopted?.();
				}

				attributeChangedCallback(...args) {
					this.#attributeChanged?.(...args);
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
