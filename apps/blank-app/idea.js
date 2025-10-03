//
// How to add scoped styles during element creation
//

div({
	styles: css`
		/* & will be replaced with the element selector */
		& {
			/* ... */
		}

		@media (max-width: 600px) {
			& {
				/* ... */
			}
		}
	`
	},
});


// The way this will work is by adding the provided styles to the DOM when processing the TagFunction attributes at generation time. This means we can run some code before the element is created.

// By design ima allows to do this via the attribute hook.


useTags({
	attr(name, value) {
		// Process custom style attributes
		if (name === "styles") {
			const element_selector = `[ima-uuid="${uuidv4()}"]`;
			const processed_css = value.replaceAll("&", element_selector);
			useGlobalStyles(processed_css);

			return {
				name: "ima-uuid",
				value: element_selector
			};
		}

		// Return default for other attributes
		return { name, value };
	}
})
