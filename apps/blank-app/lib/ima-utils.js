//
// IMA Utils
//

// Extra utils for working with IMA
// by Fernando Garcia (fergarram)
//

import { useTags } from "@std/ima";
import { useGlobalStyles, uniqueId, useShadowStyles } from "@std/utils";

export function useStyledTags(opts) {
	return useTags({
		...opts,
		attr(name, value) {
			if (name === "styles") {
				// Only handle object format
				if (typeof value === "object" && value !== null) {
					if (!value.key) {
						console.warn("Styles key can't be empty", value);
						return {
							name: "styles-key",
							value: "",
						};
					}

					const id = value.key;
					const css = value.css || "";

					const processed_css = css.replaceAll("&", `[styles-key="${id}"]`);
					if (opts && opts.shadow_root) {
						useShadowStyles(
							typeof opts.shadow_root === "function" ? opts.shadow_root() : opts.shadow_root,
							processed_css,
							id
						);
					} else {
						useGlobalStyles(processed_css);
					}

					return {
						name: "styles-key",
						value: id,
					};
				}

				// Fallback for non-object types
				console.warn("Styles attribute must be an object with 'key' and 'css' properties. Nothing will be done.", value);
				return {
					name: "styles-key",
					value: "",
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
