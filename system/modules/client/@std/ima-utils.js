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

const tags = useStyledTags();

export const main = tags.main;
export const div = tags.div;
export const span = tags.span;
export const pre = tags.pre;
export const icon = tags.icon;
export const canvas = tags.canvas;
export const input = tags.input;
export const textarea = tags.textarea;
export const select = tags.select;
export const option = tags.option;
export const iframe = tags.iframe;
export const button = tags.button;
export const webview = tags.webview;
export const label = tags.label;
export const form = tags.form;
export const fieldset = tags.fieldset;
export const legend = tags.legend;
export const a = tags.a;
export const img = tags.img;
export const video = tags.video;
export const audio = tags.audio;
export const header = tags.header;
export const footer = tags.footer;
export const ul = tags.ul;
export const ol = tags.ol;
export const li = tags.li;
export const code = tags.code;
export const dialog = tags.dialog;
export const details = tags.details;
export const summary = tags.summary;
