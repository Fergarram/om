//
// BLOB LOADER v1.0
// by fergarram
//

// Extends existing html functionality with:
// - Support for inlined ES modules
// - Support for inlined CSS modules
// - Support for inlined media modules (images, videos, fonts, etc)
// - Multiple sources of truth for all module types (remote, inline, cache)
// - API for editable exports and self-rewriting
//

(async () => {
	//
	// Constants
	//

	const SCRIPT_MODULE_TYPE = "script";
	const STYLE_MODULE_TYPE = "style";
	const MEDIA_MODULE_TYPE = "media";
	const MODULE_TYPES = [SCRIPT_MODULE_TYPE, STYLE_MODULE_TYPE, MEDIA_MODULE_TYPE];

	//
	// Global BlobLoader object
	//

	window.BlobLoader = {
		lib: {}, // The place for IIFEs to self attach before running the loader.
		transformers: (window.BlobLoader && window.BlobLoader.transformers) || [], // It's where scripts can hook so they can transform a module or media blob before it's processed by the blob loader.

		// API
		getCachedModule,
		setCachedModule,
		removeModuleCache,
		updateModuleFromRemote,
		clearAllCache,
		openCache,
		addStyleModule,
		runModuleScript,
		getAllModules,
		getScriptModules,
		getStyleModules,
		getMediaModules,
		saveAsHtmlFile,
		getDocumentOuterHtml,
	};

	//
	// State
	//

	const importmap = {};
	const import_map = document.createElement("script");
	import_map.type = "importmap";

	const blob_media_urls = new Map();
	const blob_module_urls = new Map();
	const blob_style_urls = new Map();

	const remote_media_hrefs = new Map();
	const remote_modules_hrefs = new Map();
	const remote_styles_hrefs = new Map();

	const blob_media_sources = new Map();
	const blob_style_sources = new Map();
	const blob_modules_sources = new Map();

	const blob_media_map = new Map();
	const blob_style_map = new Map();
	const blob_module_map = new Map();

	const blob_media_blobs = new Map();
	const blob_adopted_sheets = new Map();

	let blob_media_tags = null;
	let blob_image_tags = null;
	let blob_font_tags = null;
	let blob_style_tags = null;
	let blob_script_tags = null;

	//
	// Process found modules after page load
	//

	window.addEventListener("load", async () => {
		const load_start_time = performance.now();

		// Query head tags
		blob_media_tags = document.querySelectorAll(`link[type="blob-module"]`);
		blob_image_tags = document.querySelectorAll(`style[blob-module="image"]`);
		blob_font_tags = document.querySelectorAll(`style[blob-module="font"]`);
		blob_style_tags = document.querySelectorAll(`style[blob-module="css"]`);
		blob_script_tags = document.querySelectorAll('script[type="blob-module"]');

		//
		// Process blob image tags (CSS-based, no-JS compatible)
		//

		for (const style of blob_image_tags) {
			const image_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote");
			const is_disabled = style.hasAttribute("disabled");

			if (!image_name) {
				console.warn("blob-module image missing name attribute");
				continue;
			}

			// Skip disabled images
			if (is_disabled) {
				console.log(`Skipping disabled image: "${image_name}"`);
				continue;
			}

			// Check for name collisions
			if (blob_style_sources.has(image_name) || remote_styles_hrefs.has(image_name)) {
				console.warn(
					`Image name collision detected: "${image_name}" already exists. Skipping duplicate.`,
				);
				continue;
			}

			const inline_css = style.textContent.trim();
			let final_css = null;
			let data_url = null;

			if (inline_css) {
				// Has inline CSS with data URL
				console.log(`Using inline CSS for image "${image_name}"`);
				blob_style_sources.set(image_name, inline_css);
				if (remote_url) {
					remote_styles_hrefs.set(image_name, remote_url);
				}
				final_css = inline_css;

				// Extract data URL from CSS for blob creation
				const data_url_match = inline_css.match(/url\(['"]?(data:[^'")]+)['"]?\)/);
				if (data_url_match) {
					data_url = data_url_match[1];
				}
			} else {
				// Try cache
				const cached_image = await getCachedModule(image_name, MEDIA_MODULE_TYPE);
				if (cached_image) {
					console.log(`Using cached image "${image_name}"`);

					// Convert blob to data URL
					const reader = new FileReader();
					data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(cached_image.blob);
					});

					// Create CSS with the data URL
					final_css = `:root {\n\t--BM-${image_name.replaceAll(" ", "-")}: url('${data_url}');\n}`;
					blob_style_sources.set(image_name, final_css);

					if (remote_url) {
						remote_styles_hrefs.set(image_name, remote_url);
					}
				} else if (remote_url) {
					// Fetch from remote
					console.log(
						`Fetching remote image "${image_name}" from ${remote_url} (no local/cached version)`,
					);
					const response = await fetch(remote_url);

					if (!response.ok) {
						console.warn(`Failed to fetch remote image "${image_name}": ${response.status}`);
						style.setAttribute("disabled", "");
						continue;
					}

					const blob = await response.blob();

					// Cache it
					await setCachedModule(image_name, blob, MEDIA_MODULE_TYPE);
					console.log(`Cached remote image "${image_name}"`);

					// Convert to data URL
					const reader = new FileReader();
					data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(blob);
					});

					// Create CSS
					final_css = `:root {\n\t--BM-${image_name.replaceAll(" ", "-")}: url('${data_url}');\n}`;
					blob_style_sources.set(image_name, final_css);
					remote_styles_hrefs.set(image_name, remote_url);
				}
			}

			if (!final_css) {
				continue;
			}

			// Update style tag with CSS (for no-JS compatibility)
			style.textContent = final_css;

			// If we have a data URL, create blob for programmatic access
			if (data_url) {
				const res = await fetch(data_url);
				const blob = await res.blob();
				blob_media_blobs.set(image_name, blob);

				const blob_url = URL.createObjectURL(blob);
				blob_style_urls.set(image_name, blob_url);
				style.setAttribute("blob", blob_url);
			}

			// Detect extension
			let extension = null;
			if (remote_url) {
				const url_path = new URL(remote_url, window.location.href).pathname;
				const ext_match = url_path.match(/\.([^./?#]+)(?:[?#]|$)/);
				if (ext_match) {
					extension = ext_match[1];
				}
			}
			// Try to infer from data URL if no extension from remote URL
			if (!extension && data_url) {
				const mime_match = data_url.match(/^data:image\/([^;,]+)/);
				if (mime_match) {
					const mime_to_ext = {
						jpeg: "jpg",
						png: "png",
						gif: "gif",
						"svg+xml": "svg",
						webp: "webp",
					};
					extension = mime_to_ext[mime_match[1]] || mime_match[1];
				}
			}

			// Populate metadata map
			const known_attrs = new Set([
				"name",
				"remote",
				"disabled",
				"blob",
				"blob-module",
				"nodownload",
			]);
			const metadata = {};

			Array.from(style.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			// Add extension to metadata if found
			if (extension) {
				metadata.extension = extension;
			}

			blob_style_map.set(image_name, {
				name: image_name,
				remote_url: remote_url || null,
				size_bytes: final_css.length,
				blob_url: blob_style_urls.get(image_name) || null,
				metadata,
			});

			console.log(`Processed image module "${image_name}" (no-JS compatible)`);
		}

		//
		// Process blob font tags (CSS-based, no-JS compatible)
		//

		for (const style of blob_font_tags) {
			const font_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote");
			const is_disabled = style.hasAttribute("disabled");

			if (!font_name) {
				console.warn("blob-module font missing name attribute");
				continue;
			}

			// Skip disabled fonts
			if (is_disabled) {
				console.log(`Skipping disabled font: "${font_name}"`);
				continue;
			}

			// Check for name collisions
			if (blob_style_sources.has(font_name) || remote_styles_hrefs.has(font_name)) {
				console.warn(
					`Font name collision detected: "${font_name}" already exists. Skipping duplicate.`,
				);
				continue;
			}

			const inline_css = style.textContent.trim();
			let final_css = null;
			let data_url = null;

			if (inline_css) {
				// Has inline CSS with data URL
				console.log(`Using inline CSS for font "${font_name}"`);
				blob_style_sources.set(font_name, inline_css);
				if (remote_url) {
					remote_styles_hrefs.set(font_name, remote_url);
				}
				final_css = inline_css;

				// Extract data URL from CSS for blob creation
				const data_url_match = inline_css.match(/url\(['"]?(data:[^'")]+)['"]?\)/);
				if (data_url_match) {
					data_url = data_url_match[1];
				}
			} else {
				// Try cache
				const cached_font = await getCachedModule(font_name, MEDIA_MODULE_TYPE);
				if (cached_font) {
					console.log(`Using cached font "${font_name}"`);

					// Convert blob to data URL
					const reader = new FileReader();
					data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(cached_font.blob);
					});

					// Create @font-face CSS with the data URL
					final_css = `@font-face {\n\tfont-family: '${font_name}';\n\tsrc: url('${data_url}');\n\tfont-weight: 100 700;\n}`;
					blob_style_sources.set(font_name, final_css);

					if (remote_url) {
						remote_styles_hrefs.set(font_name, remote_url);
					}
				} else if (remote_url) {
					// Fetch from remote
					console.log(
						`Fetching remote font "${font_name}" from ${remote_url} (no local/cached version)`,
					);
					const response = await fetch(remote_url);

					if (!response.ok) {
						console.warn(`Failed to fetch remote font "${font_name}": ${response.status}`);
						style.setAttribute("disabled", "");
						continue;
					}

					const blob = await response.blob();

					// Cache it
					await setCachedModule(font_name, blob, MEDIA_MODULE_TYPE);
					console.log(`Cached remote font "${font_name}"`);

					// Convert to data URL
					const reader = new FileReader();
					data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(blob);
					});

					// Create @font-face CSS
					final_css = `@font-face {\n\tfont-family: '${font_name}';\n\tsrc: url('${data_url}');\n\tfont-weight: 100 700;\n}`;
					blob_style_sources.set(font_name, final_css);
					remote_styles_hrefs.set(font_name, remote_url);
				}
			}

			if (!final_css) {
				continue;
			}

			// Update style tag with CSS (for no-JS compatibility)
			style.textContent = final_css;

			// If we have a data URL, create blob for programmatic access
			if (data_url) {
				const res = await fetch(data_url);
				const blob = await res.blob();
				blob_media_blobs.set(font_name, blob);

				const blob_url = URL.createObjectURL(blob);
				blob_style_urls.set(font_name, blob_url);
				style.setAttribute("blob", blob_url);
			}

			let extension = null;
			if (remote_url) {
				const url_path = new URL(remote_url, window.location.href).pathname;
				const ext_match = url_path.match(/\.([^./?#]+)(?:[?#]|$)/);
				if (ext_match) {
					extension = ext_match[1];
				}
			}
			// Try to infer from data URL if no extension from remote URL
			if (!extension && data_url) {
				const mime_match = data_url.match(/^data:font\/([^;,]+)/);
				if (mime_match) {
					extension = mime_match[1];
				} else {
					// Check for common font formats in data URL
					const format_match = data_url.match(/^data:application\/(?:x-)?font-([^;,]+)/);
					if (format_match) {
						const mime_to_ext = {
							woff: "woff",
							woff2: "woff2",
							ttf: "ttf",
							otf: "otf",
						};
						extension = mime_to_ext[format_match[1]] || format_match[1];
					}
				}
			}

			// Populate metadata map
			const known_attrs = new Set([
				"name",
				"remote",
				"disabled",
				"blob",
				"blob-module",
				"nodownload",
			]);
			const metadata = {};

			Array.from(style.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			// Add extension to metadata if found
			if (extension) {
				metadata.extension = extension;
			}

			blob_style_map.set(font_name, {
				name: font_name,
				remote_url: remote_url || null,
				size_bytes: final_css.length,
				blob_url: blob_style_urls.get(font_name) || null,
				metadata,
			});

			console.log(`Processed font module "${font_name}" (no-JS compatible)`);
		}

		//
		// Process blob media tags (videos and other non-CSS media)
		//

		for (const link of blob_media_tags) {
			const media_name = link.getAttribute("name");
			const remote_url = link.getAttribute("remote");
			const inline_src = link.getAttribute("source");
			const is_disabled = link.hasAttribute("disabled");

			if (!media_name) {
				console.warn("blob-module link missing name attribute");
				continue;
			}

			// Skip disabled media
			if (is_disabled) {
				console.log(`Skipping disabled media: "${media_name}"`);
				continue;
			}

			// Check for name collisions
			if (blob_media_sources.has(media_name) || remote_media_hrefs.has(media_name)) {
				console.warn(
					`Media name collision detected: "${media_name}" already exists. Skipping duplicate.`,
				);
				continue;
			}

			let blob = null;

			if (inline_src) {
				// Check if it's a data URL or plain text
				const is_data_url = inline_src.startsWith("data:");

				if (is_data_url) {
					// Has inline data URL source
					console.log(`Using inline data URL for media "${media_name}"`);
					blob_media_sources.set(media_name, inline_src);
					if (remote_url) {
						remote_media_hrefs.set(media_name, remote_url);
					}

					// Convert data URL to blob
					const res = await fetch(inline_src);
					blob = await res.blob();
				} else {
					// Has inline text content
					console.log(`Using inline text content for media "${media_name}"`);

					// Treat as plain text and create a blob from it
					blob = new Blob([inline_src], { type: "text/plain" });

					// Convert to data URL for storage
					const reader = new FileReader();
					const data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(blob);
					});
					blob_media_sources.set(media_name, data_url);

					if (remote_url) {
						remote_media_hrefs.set(media_name, remote_url);
					}
				}
			} else {
				// Try cache
				const cached_media = await getCachedModule(media_name, MEDIA_MODULE_TYPE);
				if (cached_media) {
					console.log(`Using cached media "${media_name}"`);
					blob = cached_media.blob;

					// Convert to data URL for storage
					const reader = new FileReader();
					const data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(cached_media.blob);
					});
					blob_media_sources.set(media_name, data_url);

					if (remote_url) {
						remote_media_hrefs.set(media_name, remote_url);
					}
				} else if (remote_url) {
					// Fetch from remote
					console.log(
						`Fetching remote media "${media_name}" from ${remote_url} (no local/cached version)`,
					);
					const response = await fetch(remote_url);

					if (!response.ok) {
						console.warn(`Failed to fetch remote media "${media_name}": ${response.status}`);
						link.setAttribute("disabled", "");
						continue;
					}

					blob = await response.blob();

					// Cache it for next time
					await setCachedModule(media_name, blob, MEDIA_MODULE_TYPE);
					console.log(`Cached remote media "${media_name}"`);

					// Convert to data URL
					const reader = new FileReader();
					const data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(blob);
					});
					blob_media_sources.set(media_name, data_url);
					remote_media_hrefs.set(media_name, remote_url);
				}
			}

			if (!blob) {
				continue;
			}

			// Store blob
			blob_media_blobs.set(media_name, blob);

			// Create blob URL
			const blob_url = URL.createObjectURL(blob);
			blob_media_urls.set(media_name, blob_url);

			// Update link tag
			link.removeAttribute("src");
			link.setAttribute("href", blob_url);
			link.setAttribute("blob", blob_url);

			// Detect and store extension
			let extension = null;
			if (remote_url) {
				// Extract extension from remote URL
				const url_path = new URL(remote_url, window.location.href).pathname;
				const ext_match = url_path.match(/\.([^./?#]+)(?:[?#]|$)/);
				if (ext_match) {
					extension = ext_match[1];
				}
			}

			// Try to infer from blob type if no extension from URL
			if (!extension && blob.type) {
				const mime_to_ext = {
					"video/mp4": "mp4",
					"video/webm": "webm",
					"video/ogg": "ogv",
					"audio/mpeg": "mp3",
					"audio/wav": "wav",
					"audio/ogg": "oga",
				};
				extension = mime_to_ext[blob.type] || null;
			}

			// Populate metadata map
			const known_attrs = new Set([
				"name",
				"remote",
				"disabled",
				"blob",
				"href",
				"type",
				"source",
				"nodownload",
			]);
			const metadata = {};

			Array.from(link.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			// Add extension to metadata if found
			if (extension) {
				metadata.extension = extension;
			}

			blob_media_map.set(media_name, {
				name: media_name,
				remote_url: remote_url || null,
				size_bytes: blob.size,
				blob_url,
				metadata,
			});

			console.log(`Created blob URL for media "${media_name}"`);
		}

		//
		// Process blob style tags
		//

		for (const style of blob_style_tags) {
			const remote_url = style.getAttribute("remote");
			const style_module_name = style.getAttribute("name");
			const is_disabled = style.hasAttribute("disabled");

			// Skip disabled styles
			if (is_disabled) {
				console.log(`Skipping disabled style: "${style_module_name}"`);
				continue;
			}

			// Check for name collisions
			if (
				blob_style_sources.has(style_module_name) ||
				remote_styles_hrefs.has(style_module_name)
			) {
				console.warn(
					`Style URL collision detected: "${style_module_name}" already exists. Skipping duplicate.`,
				);
				continue;
			}

			const content = style.textContent.trim();

			let final_content = null;

			if (content) {
				// Has inline content
				console.log(`Using inline content for style "${style_module_name}"`);
				blob_style_sources.set(style_module_name, content);
				if (remote_url) {
					remote_styles_hrefs.set(style_module_name, remote_url);
				}
				final_content = content;
			} else {
				// Try cache
				const cached_style = await getCachedModule(style_module_name, STYLE_MODULE_TYPE);
				if (cached_style) {
					console.log(`Using cached style "${style_module_name}"`);
					final_content = cached_style.content;
					blob_style_sources.set(style_module_name, final_content);

					if (remote_url) {
						remote_styles_hrefs.set(style_module_name, remote_url);
					}
				} else if (remote_url) {
					// Fetch from remote
					console.log(
						`Fetching remote style "${style_module_name}" from ${remote_url} (no local/cached version)`,
					);
					const response = await fetch(remote_url);

					if (!response.ok) {
						console.warn(
							`Failed to fetch remote style "${style_module_name}" from "${remote_url}": ${response.status}`,
						);
						style.setAttribute("disabled", "");
						continue;
					}

					final_content = await response.text();

					// Cache it
					await setCachedModule(style_module_name, final_content, STYLE_MODULE_TYPE);
					console.log(`Cached remote style "${style_module_name}"`);

					blob_style_sources.set(style_module_name, final_content);
					remote_styles_hrefs.set(style_module_name, remote_url);
				}
			}

			if (!final_content) {
				continue;
			}

			// Apply source transformations if any
			window.BlobLoader.transformers.forEach((transformer) => {
				final_content =
					typeof transformer.style === "function"
						? transformer.style(final_content)
						: final_content;
			});

			// Add source URL comment for better debugging
			final_content = `${final_content}\n/*# sourceURL=${style_module_name}*/`;

			// Create blob URL
			const style_blob = new Blob([final_content], {
				type: "text/css",
			});
			const blob_url = URL.createObjectURL(style_blob);
			blob_style_urls.set(style_module_name, blob_url);

			// Update style tag
			const had_inline_content = content.length > 0;

			if (!had_inline_content && !blob_adopted_sheets.has(style_module_name)) {
				// This was fetched from cache or remote, use adopted stylesheet
				const sheet = new CSSStyleSheet();
				sheet.replaceSync(final_content);
				document.adoptedStyleSheets.push(sheet);
				blob_adopted_sheets.set(style_module_name, sheet);

				style.textContent = "";
				style.setAttribute("blob", blob_url);

				console.log(`Adopted stylesheet for ${style_module_name} (fetched from cache/remote)`);
			} else {
				// Keep inline content in the style tag
				style.textContent = final_content;
				style.setAttribute("blob", blob_url);

				console.log(`Kept inline stylesheet for ${style_module_name}`);
			}

			// Populate metadata map
			const known_attrs = new Set([
				"name",
				"remote",
				"disabled",
				"blob",
				"blob-module",
				"nodownload",
			]);
			const metadata = {};

			Array.from(style.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			blob_style_map.set(style_module_name, {
				name: style_module_name,
				remote_url: remote_url || null,
				size_bytes: style_blob.size,
				blob_url,
				metadata,
			});
		}

		//
		// Process blob script tags
		//

		for (const script of blob_script_tags) {
			const module_name = script.getAttribute("name");
			const remote_url = script.getAttribute("remote");
			const is_disabled = script.hasAttribute("disabled");
			const encoded = script.hasAttribute("encode");

			if (!module_name) {
				console.warn("blob-module script missing name attribute");
				continue;
			}

			// Skip disabled modules
			if (is_disabled) {
				console.log(`Skipping disabled module: "${module_name}"`);
				continue;
			}

			// Check for name collisions
			if (blob_modules_sources.has(module_name) || remote_modules_hrefs.has(module_name)) {
				console.warn(
					`Module name collision detected: "${module_name}" already exists. Skipping duplicate.`,
				);
				continue;
			}

			const content = script.textContent.trim();

			let final_content = null;

			if (content) {
				// Check if content is base64 encoded
				if (encoded && content.length > 0) {
					// Try to decode it
					try {
						final_content = decodeFromBase64(content);
						console.log(`Decoded base64 content for module "${module_name}"`);
					} catch (error) {
						console.warn(`Failed to decode base64 for module "${module_name}", using as-is`);
						final_content = content;
					}
				} else {
					final_content = content;
				}

				console.log(`Using inline content for module "${module_name}"`);
				blob_modules_sources.set(module_name, final_content);
				if (remote_url) {
					remote_modules_hrefs.set(module_name, remote_url);
				}
			} else {
				// Try cache
				const cached_module = await getCachedModule(module_name, SCRIPT_MODULE_TYPE);
				if (cached_module) {
					console.log(`Using cached module "${module_name}"`);
					final_content = cached_module.content;
					blob_modules_sources.set(module_name, final_content);

					if (remote_url) {
						remote_modules_hrefs.set(module_name, remote_url);
					}
				} else if (remote_url) {
					// Fetch from remote
					console.log(
						`Fetching remote module "${module_name}" from ${remote_url} (no local/cached version)`,
					);
					const response = await fetch(remote_url);

					if (!response.ok) {
						console.warn(
							`Failed to fetch remote module "${module_name}": ${response.status}`,
						);
						// Use remote URL directly in importmap as last fallback
						blob_module_urls.set(module_name, remote_url);
						console.log(`Will use remote URL directly for module "${module_name}"`);

						// Still populate metadata for disabled/failed modules
						const known_attrs = new Set([
							"name",
							"remote",
							"disabled",
							"blob",
							"type",
							"nodownload",
							"encode",
						]);
						const metadata = {};

						Array.from(script.attributes).forEach((attr) => {
							if (!known_attrs.has(attr.name)) {
								metadata[attr.name] = attr.value;
							}
						});

						blob_module_map.set(module_name, {
							name: module_name,
							size_bytes: 0,
							remote_url: remote_url || null,
							blob_url: remote_url,
							is_disabled: false,
							encoded,
							metadata,
						});

						continue;
					}

					final_content = await response.text();

					// Cache it
					await setCachedModule(module_name, final_content, SCRIPT_MODULE_TYPE);
					console.log(`Cached remote module "${module_name}"`);

					blob_modules_sources.set(module_name, final_content);
					remote_modules_hrefs.set(module_name, remote_url);
				}
			}

			if (!final_content) {
				continue;
			}

			// Apply source transformations if any
			window.BlobLoader.transformers.forEach((transformer) => {
				final_content =
					typeof transformer.script === "function"
						? transformer.script(final_content)
						: final_content;
			});

			// Add source URL comment for better debugging
			final_content = `${final_content}\n//# sourceURL=${module_name}`;

			// Create blob URL
			const module_blob = new Blob([final_content], {
				type: "text/javascript",
			});
			const blob_url = URL.createObjectURL(module_blob);
			blob_module_urls.set(module_name, blob_url);

			// Clear script tag content and add blob URL attribute
			script.textContent = "";
			script.setAttribute("blob", blob_url);

			// Populate metadata map
			const known_attrs = new Set([
				"name",
				"remote",
				"disabled",
				"blob",
				"type",
				"nodownload",
				"encode",
			]);
			const metadata = {};

			Array.from(script.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			blob_module_map.set(module_name, {
				name: module_name,
				size_bytes: module_blob.size,
				remote_url: remote_url || null,
				blob_url,
				is_disabled: false,
				encoded,
				metadata,
			});
		}

		// Create import map with all blob URLs
		blob_module_urls.forEach((url, name) => (importmap[name] = url));
		import_map.textContent = JSON.stringify({ imports: importmap }, null, 2);
		document.head.appendChild(import_map);

		// Run the main module if it exists and is not disabled
		if (blob_modules_sources.has("main")) {
			await finish();

			const main_script = document.createElement("script");
			main_script.type = "module";
			main_script.setAttribute("entrypoint", "");

			// Stop performance timer and inject main script
			main_script.textContent = `
				const main_start_time = performance.now();
				const load_duration = main_start_time - ${load_start_time};
				console.log(\`Main module started \${load_duration.toFixed(2)}ms after page load\`);

				import("main");
			`;
			document.head.appendChild(main_script);
		}
	});

	//
	// Module cache management
	//

	async function getCachedModule(name, module_type) {
		try {
			const db = await openCache();

			// Validate module type
			if (!MODULE_TYPES.includes(module_type)) {
				console.warn(`Invalid module type: ${module_type}`);
				return null;
			}

			const transaction = db.transaction([module_type], "readonly");
			const store = transaction.objectStore(module_type);

			return new Promise((resolve, reject) => {
				const request = store.get(name);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			});
		} catch (error) {
			console.warn(`Failed to get cached ${module_type} module:`, error);
			return null;
		}
	}

	async function setCachedModule(name, content, module_type) {
		try {
			const db = await openCache();

			// Validate module type
			if (!MODULE_TYPES.includes(module_type)) {
				console.warn(`Invalid module type: ${module_type}`);
				return;
			}

			const transaction = db.transaction([module_type], "readwrite");
			const store = transaction.objectStore(module_type);

			const cache_entry = {
				name: name,
				timestamp: Date.now(),
			};

			// Store content differently based on type
			if (module_type === MEDIA_MODULE_TYPE) {
				cache_entry.blob = content;
			} else {
				cache_entry.content = content;
			}

			return new Promise((resolve, reject) => {
				const request = store.put(cache_entry);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve();
			});
		} catch (error) {
			console.warn(`Failed to cache ${module_type} module:`, error);
		}
	}

	async function removeModuleCache(name, module_type) {
		try {
			const db = await openCache();

			// Validate module type
			if (!MODULE_TYPES.includes(module_type)) {
				console.warn(`Invalid module type: ${module_type}`);
				return false;
			}

			const transaction = db.transaction([module_type], "readwrite");
			const store = transaction.objectStore(module_type);

			return new Promise((resolve, reject) => {
				const request = store.delete(name);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					console.log(`Removed ${module_type} module "${name}" from cache`);
					resolve(true);
				};
			});
		} catch (error) {
			console.warn(`Failed to remove cached ${module_type} module "${name}":`, error);
			return false;
		}
	}

	async function clearAllCache() {
		try {
			const db = await openCache();
			const transaction = db.transaction(MODULE_TYPES, "readwrite");
			const clear_promises = MODULE_TYPES.map((store_name) => {
				return new Promise((resolve, reject) => {
					const store = transaction.objectStore(store_name);
					const request = store.clear();
					request.onerror = () => reject(request.error);
					request.onsuccess = () => {
						console.log(`Cleared ${store_name} cache`);
						resolve();
					};
				});
			});

			await Promise.all(clear_promises);
			console.log("All caches cleared successfully");
			return true;
		} catch (error) {
			console.warn("Failed to clear caches:", error);
			return false;
		}
	}

	function openCache() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(
				"blob_module_cache",
				8, // version
			);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Modules store
				if (db.objectStoreNames.contains(SCRIPT_MODULE_TYPE)) {
					db.deleteObjectStore(SCRIPT_MODULE_TYPE);
				}
				const modules_store = db.createObjectStore(SCRIPT_MODULE_TYPE, {
					keyPath: "name",
				});
				modules_store.createIndex("timestamp", "timestamp", {
					unique: false,
				});

				// Styles store
				if (db.objectStoreNames.contains(STYLE_MODULE_TYPE)) {
					db.deleteObjectStore(STYLE_MODULE_TYPE);
				}
				const styles_store = db.createObjectStore(STYLE_MODULE_TYPE, {
					keyPath: "name",
				});
				styles_store.createIndex("timestamp", "timestamp", {
					unique: false,
				});

				// Media store
				if (db.objectStoreNames.contains(MEDIA_MODULE_TYPE)) {
					db.deleteObjectStore(MEDIA_MODULE_TYPE);
				}
				const media_store = db.createObjectStore(MEDIA_MODULE_TYPE, {
					keyPath: "name",
				});
				media_store.createIndex("timestamp", "timestamp", {
					unique: false,
				});
			};
		});
	}

	//
	// Runtime module management
	//

	function getAllModules() {
		return {
			scripts: Array.from(blob_module_map.values()),
			styles: Array.from(blob_style_map.values()),
			media: Array.from(blob_media_map.values()),
		};
	}

	function getScriptModules() {
		return Array.from(blob_module_map.values());
	}

	function getStyleModules() {
		return Array.from(blob_style_map.values());
	}

	function getMediaModules() {
		return Array.from(blob_media_map.values());
	}

	function addStyleModule(style_name, style_content, metadata = {}, options = {}) {
		const { override = false } = options;

		// Check if style already exists
		if (blob_style_sources.has(style_name)) {
			if (!override) {
				console.warn(
					`Style module "${style_name}" already exists. Use override option to replace it.`,
				);
				return false;
			}

			console.log(`Overriding existing style module "${style_name}"`);

			// Remove existing style tag
			const existing_style_tag = document.querySelector(
				`style[blob-module="css"][name="${style_name}"]`,
			);
			if (existing_style_tag) {
				existing_style_tag.remove();
			}

			// Remove from adopted sheets if it exists there
			if (blob_adopted_sheets.has(style_name)) {
				const sheet = blob_adopted_sheets.get(style_name);
				const sheet_index = document.adoptedStyleSheets.indexOf(sheet);
				if (sheet_index !== -1) {
					document.adoptedStyleSheets.splice(sheet_index, 1);
				}
				blob_adopted_sheets.delete(style_name);
			}

			// Revoke old blob URL
			const old_blob_url = blob_style_urls.get(style_name);
			if (old_blob_url) {
				URL.revokeObjectURL(old_blob_url);
			}
		}

		// Add to sources map
		blob_style_sources.set(style_name, style_content);

		// Create blob URL
		const style_blob = new Blob([style_content], {
			type: "text/css",
		});
		const blob_url = URL.createObjectURL(style_blob);
		blob_style_urls.set(style_name, blob_url);

		// Create style tag
		const style_tag = document.createElement("style");
		style_tag.setAttribute("blob-module", "css");
		style_tag.setAttribute("name", style_name);
		style_tag.setAttribute("blob", blob_url);
		style_tag.textContent = style_content;

		// Add metadata attributes
		Object.entries(metadata).forEach(([key, value]) => {
			style_tag.setAttribute(key, value);
		});

		// Add to document head
		document.head.appendChild(style_tag);

		// Update metadata map
		blob_style_map.set(style_name, {
			name: style_name,
			remote_url: null,
			size_bytes: style_blob.size,
			blob_url: blob_url,
			metadata: metadata,
		});

		console.log(`Added new style module "${style_name}"`);
		return true;
	}

	async function runModuleScript(source) {
		// Create a blob from the source code
		const module_blob = new Blob([source], {
			type: "text/javascript",
		});

		// Create a blob URL
		const blob_url = URL.createObjectURL(module_blob);

		return import(blob_url)
			.then((exports) => {
				console.log("Module script executed successfully");
				return exports;
			})
			.catch((error) => {
				console.warn("Failed to execute module script:", error);
				throw error;
			})
			.finally(() => {
				URL.revokeObjectURL(blob_url);
			});
	}

	async function updateModuleFromRemote(name, remote_url, module_type) {
		try {
			// Validate module type
			if (!MODULE_TYPES.includes(module_type)) {
				console.warn(`Invalid module type: ${module_type}`);
				return false;
			}

			console.log(`Fetching ${module_type} module "${name}" from ${remote_url}...`);

			// Fetch from remote
			const response = await fetch(remote_url);

			if (!response.ok) {
				console.warn(
					`Failed to fetch remote ${module_type} module "${name}" from "${remote_url}": ${response.status}`,
				);
				return false;
			}

			let content;

			// Handle different content types
			if (module_type === MEDIA_MODULE_TYPE) {
				content = await response.blob();
			} else {
				content = await response.text();
			}

			// Cache the updated content
			await setCachedModule(name, content, module_type);
			console.log(`Successfully updated cached ${module_type} module "${name}" from remote`);

			return true;
		} catch (error) {
			console.warn(
				`Failed to update cached ${module_type} module "${name}" from remote:`,
				error,
			);
			return false;
		}
	}

	//
	// Utils
	//

	async function getDocumentOuterHtml(force_inline = false) {
		// Clone the current document
		const doc_clone = document.cloneNode(true);

		// Remove the importmap script we added
		const import_map_script = doc_clone.querySelector('script[type="importmap"]');
		if (import_map_script) {
			import_map_script.remove();
		}

		// Remove the main execution script we added
		const main_execution_script = doc_clone.querySelector("script[entrypoint]");
		if (main_execution_script) {
			main_execution_script.remove();
		}

		// Remove all elements with no-export attribute
		const no_export_elements = doc_clone.querySelectorAll("[no-export]");
		no_export_elements.forEach((element) => {
			element.remove();
		});

		// Process module loader script
		const module_loader_script = doc_clone.querySelector('script[id="blob-loader"]');
		if (module_loader_script) {
			const src = module_loader_script.getAttribute("src");
			const has_content = module_loader_script.textContent.trim().length > 0;

			if (src && !has_content) {
				try {
					const response = await fetch(src);
					const content = await response.text();
					module_loader_script.textContent = content;
					module_loader_script.removeAttribute("src");
					module_loader_script.removeAttribute("type");
				} catch (error) {
					console.warn("Failed to fetch and inline blob-loader script:", error);
				}
			}
		}

		// Process blob-loader-lib scripts
		const blob_loader_lib_scripts = doc_clone.querySelectorAll("script[blob-loader-lib]");
		for (const lib_script of blob_loader_lib_scripts) {
			const src = lib_script.getAttribute("src");
			const has_content = lib_script.textContent.trim().length > 0;

			// Only fetch and inline if src exists and textContent is empty
			if (src && !has_content) {
				try {
					const response = await fetch(src);
					const content = await response.text();
					lib_script.textContent = content;
					lib_script.removeAttribute("src");
					lib_script.removeAttribute("type");
					console.log(`Inlined blob-loader-lib script: ${src}`);
				} catch (error) {
					console.warn(`Failed to fetch and inline blob-loader-lib script ${src}:`, error);
				}
			}
		}

		// Process blob image style tags
		const cloned_image_tags = doc_clone.querySelectorAll(`style[blob-module="image"]`);
		cloned_image_tags.forEach((style) => {
			const image_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote");
			const no_download = style.hasAttribute("nodownload");
			const is_disabled = style.hasAttribute("disabled");

			// Remove blob attribute
			if (style.hasAttribute("blob")) {
				style.removeAttribute("blob");
			}

			// Skip processing for disabled images
			if (is_disabled) {
				return;
			}

			const image_css = blob_style_sources.get(image_name);

			if (no_download && !force_inline) {
				style.textContent = "";
			} else if (image_css) {
				style.textContent = image_css;
			} else if (remote_url) {
				style.textContent = "";
			}
		});

		// Process blob font style tags
		const cloned_font_tags = doc_clone.querySelectorAll(`style[blob-module="font"]`);
		cloned_font_tags.forEach((style) => {
			const font_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote");
			const no_download = style.hasAttribute("nodownload");
			const is_disabled = style.hasAttribute("disabled");

			// Remove blob attribute
			if (style.hasAttribute("blob")) {
				style.removeAttribute("blob");
			}

			// Skip processing for disabled fonts
			if (is_disabled) {
				return;
			}

			const font_css = blob_style_sources.get(font_name);

			if (no_download && !force_inline) {
				style.textContent = "";
			} else if (font_css) {
				style.textContent = font_css;
			} else if (remote_url) {
				style.textContent = "";
			}
		});

		// Process blob media links (videos, etc)
		const cloned_media_links = doc_clone.querySelectorAll('link[type="blob-module"]');
		cloned_media_links.forEach((link) => {
			const media_name = link.getAttribute("name");
			const remote_url = link.getAttribute("remote");
			const no_download = link.hasAttribute("nodownload");
			const is_disabled = link.hasAttribute("disabled");

			// Remove blob and href attributes
			if (link.hasAttribute("blob")) {
				link.removeAttribute("blob");
			}
			if (link.hasAttribute("href")) {
				link.removeAttribute("href");
			}

			// Skip processing for disabled media
			if (is_disabled) {
				return;
			}

			const data_url = blob_media_sources.get(media_name);

			if (no_download && !force_inline) {
				// Keep empty with just the remote attribute
				link.removeAttribute("source");
			} else if (data_url) {
				// Inline the data URL
				link.setAttribute("source", data_url);
			} else if (remote_url) {
				// Fallback: keep remote reference if no local content
				link.removeAttribute("source");
			}
		});

		// Process blob-module scripts
		const cloned_blob_scripts = doc_clone.querySelectorAll('script[type="blob-module"]');
		cloned_blob_scripts.forEach((script) => {
			const module_name = script.getAttribute("name");
			const remote_url = script.getAttribute("remote");
			const no_download = script.hasAttribute("nodownload");
			const is_disabled = script.hasAttribute("disabled");
			const should_encode = script.hasAttribute("encode");

			if (script.hasAttribute("blob")) {
				script.removeAttribute("blob");
			}

			if (is_disabled) {
				return;
			}

			const module_content = blob_modules_sources.get(module_name);

			if ((module_content && !no_download) || force_inline) {
				// If encode attribute is present, encode the content as base64
				if (should_encode) {
					try {
						const encoded_content = encodeToBase64(module_content);
						script.textContent = encoded_content;
						console.log(`Encoded module "${module_name}" as base64`);
					} catch (error) {
						console.warn(`Failed to encode module "${module_name}" as base64:`, error);
						script.textContent = module_content; // Fallback to plain text
					}
				} else {
					script.textContent = module_content;
				}
			} else if (no_download) {
				script.textContent = "";
			}
		});

		// Process CSS style tags
		const cloned_style_tags = doc_clone.querySelectorAll(`style[blob-module="css"]`);
		cloned_style_tags.forEach((style) => {
			const style_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote");
			const no_download = style.hasAttribute("nodownload");
			const is_disabled = style.hasAttribute("disabled");

			if (style.hasAttribute("blob")) {
				style.removeAttribute("blob");
			}

			// Skip processing for disabled styles
			if (is_disabled) {
				return;
			}

			const style_content = blob_style_sources.get(style_name);

			if (no_download && !force_inline) {
				style.textContent = "";
			} else if (style_content) {
				style.textContent = style_content;
			} else if (remote_url) {
				style.textContent = "";
			}
		});

		// Remove the blob link elements we created
		const blob_links = doc_clone.querySelectorAll('link[href^="blob:"]');
		blob_links.forEach((link) => link.remove());

		return `<!DOCTYPE html>\n${doc_clone.documentElement.outerHTML}`;
	}

	async function saveAsHtmlFile(force_inline = false) {
		const html_content = await getDocumentOuterHtml(force_inline);

		if (window.showSaveFilePicker) {
			try {
				const file_handle = await window.showSaveFilePicker({
					suggestedName: `${document.title || Date.now()}.html`,
					types: [
						{
							description: "HTML files",
							accept: {
								"text/html": [".html", ".htm"],
							},
						},
					],
				});

				const writable = await file_handle.createWritable();
				await writable.write(html_content);
				await writable.close();

				console.log("HTML file saved successfully");
				return;
			} catch (error) {
				if (error.name === "AbortError") {
					console.log("Save operation was cancelled by user");
					return;
				} else {
					console.warn(
						"Failed to save file using File System Access API, falling back to download:",
						error,
					);
				}
			}
		}

		alert("File System Access API not available, falling back to download");
		console.log("File System Access API not available, falling back to download");

		const blob = new Blob([html_content], {
			type: "text/html",
		});
		const url = URL.createObjectURL(blob);

		const download_link = document.createElement("a");
		download_link.href = url;
		download_link.download = "index.html";
		download_link.click();

		URL.revokeObjectURL(url);

		console.log("HTML file download initiated");
	}

	function finish(t = 0) {
		return new Promise((resolve) => setTimeout(resolve, t));
	}

	function encodeToBase64(content) {
		const bytes = new TextEncoder().encode(content);
		const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
		return btoa(binString);
	}

	function decodeFromBase64(encoded) {
		const binString = atob(encoded);
		const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0));
		return new TextDecoder().decode(bytes);
	}
})();
