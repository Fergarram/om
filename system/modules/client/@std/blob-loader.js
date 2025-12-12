//
// BLOB LOADER | [80/100] to v1.0
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
	// TODO
	//
	// v1.0 === === === === === === === === === === === === === === === === === === === === ===
	//
	// [ ] Fix the TODOs regarding prefers_remote_modules
	//     The main idea is that we do: inline > cache > remote > stub
	//     This means we don't have a setting. It's just the default.
	//
	// v1.5 === === === === === === === === === === === === === === === === === === === === ===
	//
	//      This version might require some internal refactorings, this is why a CRUD interface is
	//      important over just exposing internals directly.
	//
	// [ ] Hooks for minification and formatting (we already have the lib thing)
	//     - TSC for lang="ts" or even lang="tsx" (actually would go in the same spot as minification)
	// [ ] Implement saveAsZipFile() and saveCloneAsZipFile()
	//     - This is useful for debugging purposes or when using an external IDE
	//     - use fflate

	//
	// Global BlobLoader object
	//

	window.BlobLoader = {
		// Initial settings
		notifications: [], // @TODO: Remove this. I don't think it's good.
		settings: {
			prefers_remote_modules: location.hostname === "localhost" ? true : false,
			// @TODO: prefers_remote_modules should not exist.
			//        it should be: 1. inline, 2. cache, 3. remote
			//        if remote is different from used module source (inline or cache)
			//        	then we add a notification saying there is a mismatch and we can update.
		},
		lib: {}, // The place for IIFEs to self attach before running the loader.
		transformers: [], // It's where scripts can hook so they can transform a module or media blob before it's processed by the blob loader.

		// Module management
		getMediaUrl,
		getCachedModule,
		setCachedModule,
		deleteCachedModule,
		getCachedMedia,
		setCachedMedia,
		deleteCachedMedia,
		addStyleModule,
		runNonExportingModuleScript,
		clearModuleCache,
		updateCachedModuleFromRemote,
		updateCachedStyleFromRemote,
		updateCachedMediaFromRemote,
		getDocumentOuterHtml,
		saveAsHtmlFile,
		saveAsZipFile,

		// Clones
		cloneDocument,
		getCloneOuterHtmlFile,
		saveCloneAsHtmlFile,
		saveCloneAsZipFile,
		saveCloneAsSnapshot,

		addCloneScriptModule,
		getCloneScriptModule,
		updateCloneScriptModule,
		removeCloneScriptModule,

		addCloneStyleModule,
		getCloneStyleModule,
		updateCloneStyleModule,
		removeCloneStyleModule,

		addCloneMediaModule,
		getCloneMediaModule,
		updateCloneMediaModule,
		removeCloneMediaModule,

		// Snapshot management
		openCache,
		saveSnapshotToCache,
		getSnapshotFromCache,
		listSnapshotsInCache,
		deleteSnapshotFromCache,
		saveSnapshotAsHtmlFile,
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

	const media_css_vars = [];
	const blob_media_blobs = new Map();
	const blob_adopted_sheets = new Map();

	let blob_media_tags = null;
	let blob_style_tags = null;
	let blob_script_tags = null;

	//
	// Process found modules after page load
	//

	window.addEventListener("load", async () => {
		const load_start_time = performance.now();

		// Query head tags
		blob_media_tags = document.querySelectorAll(`link[type="blob-module"]`);
		blob_style_tags = document.querySelectorAll(`style[blob-module]`);
		blob_script_tags = document.querySelectorAll('script[type="blob-module"]');

		//
		// Process blob media tags
		//

		// First pass: collect all media contents and remote URLs
		blob_media_tags.forEach((link) => {
			const media_name = link.getAttribute("name");
			const remote_url = link.getAttribute("remote");
			const inline_src = link.getAttribute("source");
			const is_disabled = link.hasAttribute("disabled");

			if (!media_name) {
				console.warn("blob-module link missing name attribute");
				return;
			}

			// Skip disabled media
			if (is_disabled) {
				console.log(`Skipping disabled media: "${media_name}"`);
				return;
			}

			// Check for name collisions
			if (blob_media_sources.has(media_name) || remote_media_hrefs.has(media_name)) {
				console.warn(
					`Media name collision detected: "${media_name}" already exists. Skipping duplicate.`,
				);
				return;
			}

			if (inline_src) {
				// Store inline data URL
				blob_media_sources.set(media_name, inline_src);
				if (remote_url) {
					remote_media_hrefs.set(media_name, remote_url);
				}
			} else if (remote_url) {
				// Just remote URL
				remote_media_hrefs.set(media_name, remote_url);
			}
		});

		// Fetch remote media (with caching) and create local copies before proceeding
		for (const [media_name, remote_url] of remote_media_hrefs) {
			try {
				let media_blob;
				let data_url_for_comparison = null;

				if (BlobLoader.settings.prefers_remote_modules) {
					// Auto-update mode: fetch from remote first, fallback to cache
					try {
						console.log(
							`Fetching remote media "${media_name}" from ${remote_url} (auto-update mode)`,
						);
						const response = await fetch(remote_url);
						media_blob = await response.blob();

						// Update cache with blob
						await setCachedMedia(remote_url, media_blob);
						console.log(`Updated cache for remote media "${media_name}"`);
					} catch (fetch_error) {
						console.warn(
							`Failed to fetch remote media "${media_name}", falling back to cache:`,
							fetch_error,
						);

						// Fallback to cached version
						const cached_media = await getCachedMedia(remote_url);
						if (cached_media) {
							console.log(`Using cached media "${media_name}" as fallback`);
							media_blob = cached_media.blob;
						} else {
							throw new Error("No cached version available");
						}
					}
				} else {
					// Cache-first mode: check cache first, then fetch remote if needed
					const cached_media = await getCachedMedia(remote_url);

					if (cached_media) {
						console.log(`Using cached media "${media_name}" from ${remote_url}`);
						media_blob = cached_media.blob;
					} else {
						console.log(`Fetching remote media "${media_name}" from ${remote_url}`);
						const response = await fetch(remote_url);
						media_blob = await response.blob();

						// Cache the fetched content
						await setCachedMedia(remote_url, media_blob);
						console.log(`Cached remote media "${media_name}"`);
					}
				}

				if (blob_media_sources.has(media_name)) {
					// Compare with existing local content
					const local_data_url = blob_media_sources.get(media_name);

					// Convert fetched blob to data URL for comparison only
					const reader = new FileReader();
					const remote_data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(media_blob);
					});

					if (remote_data_url !== local_data_url) {
						if (BlobLoader.settings.prefers_remote_modules) {
							console.log(
								`Remote and local content differ for media "${media_name}". Using remote content (auto-update mode).`,
							);
							blob_media_blobs.set(media_name, media_blob);
							blob_media_sources.set(media_name, remote_data_url);
						} else {
							const timestamp = new Date().toISOString();
							const notification = `${timestamp} ::: ${media_name} (media) can be updated from remote. To update, run BlobLoader.updateCachedMediaFromRemote("${media_name}").`;
							window.BlobLoader.notifications.push(notification);
							console.warn(
								`Remote and local content are different for media "${media_name}". Using local content.`,
							);
							console.warn(
								`To update, run BlobLoader.updateCachedMediaFromRemote("${media_name}")`,
							);
							const local_response = await fetch(local_data_url);
							const local_blob = await local_response.blob();
							blob_media_blobs.set(media_name, local_blob);
						}
					}
				} else {
					// No local content, use fetched remote blob
					blob_media_blobs.set(media_name, media_blob);

					// Convert to data URL for storage purposes
					const reader = new FileReader();
					const remote_data_url = await new Promise((resolve) => {
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(media_blob);
					});
					blob_media_sources.set(media_name, remote_data_url);
					console.log(`Successfully loaded remote media "${media_name}"`);
				}
			} catch (error) {
				console.warn(`Failed to fetch remote media "${media_name}":`, error);
				if (!blob_media_sources.has(media_name)) {
					// Mark the link tag as disabled since we have no content
					const link_tag = Array.from(blob_media_tags).find(
						(tag) => tag.getAttribute("name") === media_name,
					);
					if (link_tag) {
						link_tag.setAttribute("disabled", "");
						console.log(`Marked media "${media_name}" as disabled (no content available)`);
					}
				} else {
					console.log(`Using local media for "${media_name}"`);
				}
			}
		}

		// Process local media sources (those without remote URLs or already in blob_media_blobs)
		for (const [media_name, data_url] of blob_media_sources) {
			// Skip if we already have a blob from remote fetching
			if (blob_media_blobs.has(media_name)) {
				continue;
			}

			// Find the corresponding link tag
			const link_tag = Array.from(blob_media_tags).find(
				(tag) => tag.getAttribute("name") === media_name,
			);

			// Skip if disabled
			if (link_tag && link_tag.hasAttribute("disabled")) {
				console.log(`Skipping disabled media: "${media_name}"`);
				continue;
			}

			// Convert data URL to blob
			const res = await fetch(data_url);
			const blob = await res.blob();
			blob_media_blobs.set(media_name, blob);
		}

		// Create blob URLs from all blobs
		for (const [media_name, blob] of blob_media_blobs) {
			const blob_url = URL.createObjectURL(blob);
			blob_media_urls.set(media_name, blob_url);

			// Update link tag
			const link_tag = Array.from(blob_media_tags).find(
				(tag) => tag.getAttribute("name") === media_name,
			);
			if (link_tag) {
				link_tag.removeAttribute("src");
				link_tag.setAttribute("href", blob_url);
				link_tag.setAttribute("blob", blob_url);
			}

			// Add CSS variable definition only for images
			if (blob.type.startsWith("image/")) {
				// @TODO: We need to add this to an inline style tag dedicated to assets in order
				// to support NO-JS image assets
				media_css_vars.push(`--BM-${media_name.replaceAll(" ", "-")}: url('${blob_url}');`);
			}

			// Load fonts using FontFace API
			if (
				blob.type.startsWith("font/") ||
				blob.type === "application/font-woff" ||
				blob.type === "application/font-woff2" ||
				blob.type === "application/x-font-ttf" ||
				blob.type === "application/x-font-truetype" ||
				blob.type === "application/x-font-opentype"
			) {
				const font = new FontFace(media_name, `url('${blob_url}')`, {
					weight: "100 700",
				});
				// await font.load(); // We don't really need to block
				document.fonts.add(font);
			}

			console.log(`Created blob URL for media "${media_name}"`);
		}

		// Create and adopt stylesheet with media CSS variables
		if (media_css_vars.length > 0 && !blob_adopted_sheets.has("__media_vars__")) {
			const media_vars_css = `:root {\n\t${media_css_vars.join("\n\t")}\n}`;
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(media_vars_css);
			document.adoptedStyleSheets.push(sheet);
			blob_adopted_sheets.set("__media_vars__", sheet);
			console.log(`Adopted stylesheet for media variables (${media_css_vars.length} variables)`);
		}

		// Populate the media metadata map
		blob_media_blobs.forEach((blob, media_name) => {
			const blob_url = blob_media_urls.get(media_name);
			const remote_url = remote_media_hrefs.get(media_name) || null;
			const size_bytes = blob.size;

			// Find the corresponding link tag to extract metadata
			const link_tag = Array.from(blob_media_tags).find(
				(tag) => tag.getAttribute("name") === media_name,
			);

			// Extract all additional attributes as metadata
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

			if (link_tag) {
				Array.from(link_tag.attributes).forEach((attr) => {
					if (!known_attrs.has(attr.name)) {
						metadata[attr.name] = attr.value;
					}
				});
			}

			blob_media_map.set(media_name, {
				name: media_name,
				remote_url,
				size_bytes,
				blob_url,
				metadata,
			});
		});

		//
		// Process blob style tags
		//

		// First pass: collect all style contents and remote URLs
		blob_style_tags.forEach((style) => {
			const remote_url = style.getAttribute("remote");
			const style_module_name = style.getAttribute("name");

			// Check for name collisions
			if (
				blob_style_sources.has(style_module_name) ||
				remote_styles_hrefs.has(style_module_name)
			) {
				console.warn(
					`Style URL collision detected: "${style_module_name}" already exists. Skipping duplicate.`,
				);
				return;
			}

			// @NOTE: This is a good spot to add hooks for formatting, minifying, or doing preprocessing.
			const content = style.textContent.trim();

			if (!content) {
				// Empty content with remote URL - fetch remote
				remote_styles_hrefs.set(style_module_name, remote_url);
				return;
			} else {
				// Both remote and content exist - store local, compare later
				blob_style_sources.set(style_module_name, content);
				remote_styles_hrefs.set(style_module_name, remote_url);
				return;
			}
		});

		// Fetch remote styles (with caching) and create local copies before proceeding
		for (const [style_name, remote_url] of remote_styles_hrefs) {
			try {
				let remote_content;

				if (BlobLoader.settings.prefers_remote_modules) {
					// Auto-update mode: fetch from remote first, fallback to cache
					try {
						console.log(`Fetching remote style from ${remote_url} (auto-update mode)`);
						const response = await fetch(remote_url);
						remote_content = await response.text();

						// Overwrite cache with new source
						await setCachedModule(remote_url, remote_content);
						console.log(`Updated cache for remote style from ${remote_url}`);
					} catch (fetch_error) {
						console.warn(
							`Failed to fetch remote style from "${remote_url}", falling back to cache:`,
							fetch_error,
						);

						// Fallback to cached version
						const cached_style = await getCachedModule(remote_url);
						if (cached_style) {
							console.log(`Using cached style from ${remote_url} as fallback`);
							remote_content = cached_style.content;
						} else {
							throw new Error("No cached version available");
						}
					}
				} else {
					// Cache-first mode: check cache first, then fetch remote if needed
					const cached_style = await getCachedModule(remote_url);

					if (cached_style) {
						console.log(`Using cached style from ${remote_url}`);
						remote_content = cached_style.content;
					} else {
						console.log(`Fetching remote style from ${remote_url}`);
						const response = await fetch(remote_url);
						remote_content = await response.text();

						// Cache the fetched content
						await setCachedModule(remote_url, remote_content);
						console.log(`Cached remote style from ${remote_url}`);
					}
				}

				if (blob_style_sources.has(style_name)) {
					// Compare with existing local content
					const local_content = blob_style_sources.get(style_name);
					if (remote_content.trim() !== local_content.trim()) {
						if (BlobLoader.settings.prefers_remote_modules) {
							console.log(
								`Remote and local content differ for style "${remote_url}". Using remote content (auto-update mode).`,
							);
							blob_style_sources.set(style_name, remote_content);
						} else {
							const timestamp = new Date().toISOString();
							const notification = `${timestamp} ::: ${style_name} (style) can be updated from remote. To update, run BlobLoader.updateCachedStyleFromRemote("${style_name}").`;
							window.BlobLoader.notifications.push(notification);
							console.warn(
								`Remote and local content are different for style "${remote_url}". Using local content.`,
							);
							console.warn(
								`To update, run BlobLoader.updateCachedStyleFromRemote("${style_name}")`,
							);
						}
					}
					// If content is the same, keep existing (local) content
				} else {
					// No local content, use fetched remote content
					blob_style_sources.set(style_name, remote_content);
					console.log(`Successfully loaded remote style from ${remote_url}`);
				}
			} catch (error) {
				console.warn(`Failed to fetch remote style from "${remote_url}":`, error);
				if (!blob_style_sources.has(style_name)) {
					// Mark the style tag as disabled since we have no content
					const style_tag = Array.from(blob_style_tags).find(
						(tag) => tag.getAttribute("name") === style_name,
					);
					if (style_tag) {
						style_tag.setAttribute("disabled", "");
						console.log(`Marked style "${style_name}" as disabled (no content available)`);
					}
				} else {
					console.log(`Using local style for "${style_name}"`);
				}
			}
		}

		// Create blob URLs for all styles and update style tags
		blob_style_sources.forEach((content, style_name) => {
			// Find the corresponding style tag
			const style_tag = Array.from(blob_style_tags).find(
				(tag) => tag.getAttribute("name") === style_name,
			);

			// Skip if disabled
			if (style_tag && style_tag.hasAttribute("disabled")) {
				console.log(`Skipping disabled style: "${style_name}"`);
				return;
			}

			const style_blob = new Blob([content], {
				type: "text/css",
			});
			const blob_url = URL.createObjectURL(style_blob);
			blob_style_urls.set(style_name, blob_url);

			if (style_tag) {
				// Only create adopted stylesheet if there was a remote URL but no initial inline content
				const had_remote = remote_styles_hrefs.has(style_name);
				const had_initial_content = style_tag.textContent.trim().length > 0;

				if (had_remote && !had_initial_content && !blob_adopted_sheets.has(style_name)) {
					// This was fetched from remote, use adopted stylesheet
					const sheet = new CSSStyleSheet();
					sheet.replaceSync(content);
					document.adoptedStyleSheets.push(sheet);
					blob_adopted_sheets.set(style_name, sheet);

					style_tag.textContent = "";
					style_tag.setAttribute("blob", blob_url);

					console.log(`Adopted stylesheet for ${style_name} (fetched from remote)`);
				} else {
					// Keep inline content in the style tag
					style_tag.textContent = content;
					style_tag.setAttribute("blob", blob_url);

					console.log(`Kept inline stylesheet for ${style_name}`);
				}
			}
		});

		// Populate the style metadata map
		blob_style_sources.forEach((content, style_name) => {
			const blob_url = blob_style_urls.get(style_name);
			const src_bytes = new Blob([content]).size;
			const remote_url = remote_styles_hrefs.get(style_name) || null;

			// Find the corresponding style tag to extract metadata
			const style_tag = Array.from(blob_style_tags).find(
				(tag) => tag.getAttribute("name") === style_name,
			);

			// Extract all additional attributes as metadata
			const known_attrs = new Set(["name", "remote", "disabled", "blob", "type", "nodownload"]);
			const metadata = {};

			if (style_tag) {
				Array.from(style_tag.attributes).forEach((attr) => {
					if (!known_attrs.has(attr.name)) {
						metadata[attr.name] = attr.value;
					}
				});
			}

			blob_style_map.set(style_name, {
				name: style_name,
				remote_url,
				src_bytes,
				blob_url,
				metadata,
			});
		});

		//
		// Process blob script tags
		//

		// First pass: collect all module contents and remote URLs, skip disabled modules
		blob_script_tags.forEach((script) => {
			const module_name = script.getAttribute("name");
			const remote_url = script.getAttribute("remote");
			const is_disabled = script.hasAttribute("disabled");

			if (!module_name) {
				console.warn("blob-module script missing name attribute");
				return;
			}

			// Skip disabled modules
			if (is_disabled) {
				console.log(`Skipping disabled module: "${module_name}"`);
				return;
			}

			// Check for name collisions
			if (blob_modules_sources.has(module_name) || remote_modules_hrefs.has(module_name)) {
				console.warn(
					`Module name collision detected: "${module_name}" already exists. Skipping duplicate.`,
				);
				return;
			}

			// @NOTE: This is a good spot to add hooks for formatting, minifying, or doing preprocessing.
			const content = script.textContent.trim();

			if (remote_url) {
				if (!content) {
					// Empty content with remote URL - fetch remote
					remote_modules_hrefs.set(module_name, remote_url);
					return;
				} else {
					// Both remote and content exist - store local, compare later
					blob_modules_sources.set(module_name, content);
					remote_modules_hrefs.set(module_name, remote_url);
					return;
				}
			}

			// No remote URL, just store content
			blob_modules_sources.set(module_name, content);
		});

		// Fetch remote modules (with caching) and create local copies before proceeding
		for (const [module_name, remote_url] of remote_modules_hrefs) {
			try {
				let remote_content;

				if (BlobLoader.settings.prefers_remote_modules) {
					// Auto-update mode: fetch from remote first, fallback to cache
					try {
						console.log(
							`Fetching remote module "${module_name}" from ${remote_url} (auto-update mode)`,
						);
						const response = await fetch(remote_url);
						remote_content = await response.text();

						// Update the cache with fresh content
						await setCachedModule(remote_url, remote_content);
						console.log(`Updated cache for remote module "${module_name}"`);
					} catch (fetch_error) {
						console.warn(
							`Failed to fetch remote module "${module_name}", falling back to cache:`,
							fetch_error,
						);

						// Fallback to cached version
						const cached_module = await getCachedModule(remote_url);
						if (cached_module) {
							console.log(`Using cached module "${module_name}" as fallback`);
							remote_content = cached_module.content;
						} else {
							throw new Error("No cached version available");
						}
					}
				} else {
					// Cache-first mode: check cache first, then fetch remote if needed
					const cached_module = await getCachedModule(remote_url);

					if (cached_module) {
						console.log(`Using cached module "${module_name}" from ${remote_url}`);
						remote_content = cached_module.content;
					} else {
						console.log(`Fetching remote module "${module_name}" from ${remote_url}`);
						const response = await fetch(remote_url);
						remote_content = await response.text();

						// Cache the fetched content
						await setCachedModule(remote_url, remote_content);
						console.log(`Cached remote module "${module_name}"`);
					}
				}

				if (blob_modules_sources.has(module_name)) {
					// Compare with existing local content
					const local_content = blob_modules_sources.get(module_name);
					if (remote_content.trim() !== local_content.trim()) {
						if (BlobLoader.settings.prefers_remote_modules) {
							console.log(
								`Remote and local content differ for module "${module_name}". Using remote content (auto-update mode).`,
							);
							blob_modules_sources.set(module_name, remote_content);
						} else {
							const timestamp = new Date().toISOString();
							const notification = `${timestamp} ::: ${module_name} can be updated from remote. To update, run BlobLoader.updateCachedModuleFromRemote("${module_name}").`;
							window.BlobLoader.notifications.push(notification);
							console.warn(
								`Remote and local content are different for module "${module_name}". Using local content.`,
							);
							console.warn(
								`To update, run BlobLoader.updateCachedModuleFromRemote("${module_name}")`,
							);
						}
					}
					// If content is the same, keep existing (local) content
				} else {
					// No local content, use fetched remote content
					blob_modules_sources.set(module_name, remote_content);
					console.log(`Successfully loaded remote module "${module_name}"`);
				}
			} catch (error) {
				console.warn(`Failed to fetch remote module "${module_name}":`, error);
				if (!blob_modules_sources.has(module_name)) {
					// Use remote URL directly in importmap
					blob_module_urls.set(module_name, remote_url);
					console.log(`Will use remote URL directly for module "${module_name}"`);
				} else if (blob_modules_sources.has(module_name)) {
					console.log(`Using local module "${module_name}"`);
				}
			}
		}

		// Create blob URLs for all modules
		blob_modules_sources.forEach((content, module_name) => {
			const module_blob = new Blob([content], {
				type: "text/javascript",
			});
			const blob_url = URL.createObjectURL(module_blob);
			blob_module_urls.set(module_name, blob_url);
		});

		// Clear script tag contents and add blob URL attributes (only for non-disabled modules)
		blob_script_tags.forEach((script) => {
			const module_name = script.getAttribute("name");
			const is_disabled = script.hasAttribute("disabled");

			if (is_disabled) {
				return;
			}

			const blob_url = blob_module_urls.get(module_name);

			if (blob_url) {
				script.textContent = "";
				script.setAttribute("blob", blob_url);
			}
		});

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

		// Populate the metadata map (including disabled modules for reference)
		blob_script_tags.forEach((script) => {
			const module_name = script.getAttribute("name");
			const remote_url = script.getAttribute("remote") || null;
			const is_disabled = script.hasAttribute("disabled");
			const blob_url = blob_module_urls.get(module_name) || null;
			const content = blob_modules_sources.get(module_name) || "";
			const src_bytes = new Blob([content]).size;

			// Extract all additional attributes as metadata
			const known_attrs = new Set(["name", "remote", "disabled", "blob", "type", "nodownload"]);
			const metadata = {};

			Array.from(script.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			blob_module_map.set(module_name, {
				module_name,
				src_bytes,
				remote_url,
				blob_url,
				is_disabled,
				metadata,
			});
		});
	});

	//
	// Module cache management
	//

	function getMediaUrl(name) {
		return blob_media_urls.get(name) || null;
	}

	async function getCachedMedia(url) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["media"], "readonly");
			const store = transaction.objectStore("media");

			return new Promise((resolve, reject) => {
				const request = store.get(url);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			});
		} catch (error) {
			console.warn("Failed to get cached media:", error);
			return null;
		}
	}

	async function setCachedMedia(url, blob) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["media"], "readwrite");
			const store = transaction.objectStore("media");

			const cache_entry = {
				url: url,
				blob: blob, // Store blob directly instead of data URL
				timestamp: Date.now(),
			};

			return new Promise((resolve, reject) => {
				const request = store.put(cache_entry);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve();
			});
		} catch (error) {
			console.warn("Failed to cache media:", error);
		}
	}

	async function getCachedModule(url) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["modules"], "readonly");
			const store = transaction.objectStore("modules");

			return new Promise((resolve, reject) => {
				const request = store.get(url);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			});
		} catch (error) {
			console.warn("Failed to get cached module:", error);
			return null;
		}
	}

	async function setCachedModule(url, content) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["modules"], "readwrite");
			const store = transaction.objectStore("modules");

			const cache_entry = {
				url: url,
				content: content,
				timestamp: Date.now(),
			};

			return new Promise((resolve, reject) => {
				const request = store.put(cache_entry);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve();
			});
		} catch (error) {
			console.warn("Failed to cache module:", error);
		}
	}

	async function clearModuleCache(url = null) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["modules"], "readwrite");
			const store = transaction.objectStore("modules");

			return new Promise((resolve, reject) => {
				let request;

				if (url) {
					// Clear specific URL
					request = store.delete(url);
					request.onsuccess = () => {
						console.log(`Cleared cache for: ${url}`);
						resolve();
					};
				} else {
					// Clear all cached modules
					request = store.clear();
					request.onsuccess = () => {
						console.log("Cleared all blob-module cache");
						resolve();
					};
				}

				request.onerror = () => reject(request.error);
			});
		} catch (error) {
			console.warn("Failed to clear cache:", error);
		}
	}

	async function updateCachedModuleFromRemote(module_name) {
		const module_info = blob_module_map.get(module_name);

		if (!module_info) {
			console.warn(`Module "${module_name}" not found`);
			return false;
		}

		const remote_url = module_info.remote_url;

		if (!remote_url) {
			console.warn(`Module "${module_name}" has no remote URL`);
			return false;
		}

		try {
			console.log(`Fetching remote module "${module_name}" from ${remote_url}...`);
			const response = await fetch(remote_url);
			const remote_content = await response.text();

			// Update the sources map
			blob_modules_sources.set(module_name, remote_content);

			// Update cache
			await setCachedModule(remote_url, remote_content);

			// Update blob URL
			const module_blob = new Blob([remote_content], { type: "text/javascript" });
			const old_blob_url = blob_module_urls.get(module_name);
			if (old_blob_url) {
				URL.revokeObjectURL(old_blob_url);
			}
			const new_blob_url = URL.createObjectURL(module_blob);
			blob_module_urls.set(module_name, new_blob_url);

			// Update script tag
			const script_tag = Array.from(blob_script_tags).find(
				(tag) => tag.getAttribute("name") === module_name,
			);
			if (script_tag) {
				script_tag.textContent = remote_content;
				script_tag.setAttribute("blob", new_blob_url);
			}

			console.log(`Successfully updated module "${module_name}" from remote`);
			console.warn("Reload the page for changes to take effect");
			return true;
		} catch (error) {
			console.warn(`Failed to update module "${module_name}" from remote:`, error);
			return false;
		}
	}

	async function updateCachedStyleFromRemote(style_name) {
		const style_info = blob_style_map.get(style_name);

		if (!style_info) {
			console.warn(`Style "${style_name}" not found`);
			return false;
		}

		const remote_url = style_info.remote_url;

		if (!remote_url) {
			console.warn(`Style "${style_name}" has no remote URL`);
			return false;
		}

		try {
			console.log(`Fetching remote style "${style_name}" from ${remote_url}...`);
			const response = await fetch(remote_url);
			const remote_content = await response.text();

			// Update the sources map
			blob_style_sources.set(style_name, remote_content);

			// Update cache
			await setCachedModule(remote_url, remote_content);

			// Update blob URL
			const style_blob = new Blob([remote_content], { type: "text/css" });
			const old_blob_url = blob_style_urls.get(style_name);
			if (old_blob_url) {
				URL.revokeObjectURL(old_blob_url);
			}
			const new_blob_url = URL.createObjectURL(style_blob);
			blob_style_urls.set(style_name, new_blob_url);

			// Update style tag or adopted stylesheet
			const style_tag = Array.from(blob_style_tags).find(
				(tag) => tag.getAttribute("name") === style_name,
			);
			if (style_tag) {
				style_tag.textContent = remote_content;
				style_tag.setAttribute("blob", new_blob_url);
			}

			// Update adopted stylesheet if it exists
			if (blob_adopted_sheets.has(style_name)) {
				const sheet = blob_adopted_sheets.get(style_name);
				sheet.replaceSync(remote_content);
			}

			console.log(`Successfully updated style "${style_name}" from remote`);
			return true;
		} catch (error) {
			console.warn(`Failed to update style "${style_name}" from remote:`, error);
			return false;
		}
	}

	async function updateCachedMediaFromRemote(media_name) {
		const media_info = blob_media_map.get(media_name);

		if (!media_info) {
			console.warn(`Media "${media_name}" not found`);
			return false;
		}

		const remote_url = media_info.remote_url;

		if (!remote_url) {
			console.warn(`Media "${media_name}" has no remote URL`);
			return false;
		}

		try {
			console.log(`Fetching remote media "${media_name}" from ${remote_url}...`);
			const response = await fetch(remote_url);
			const media_blob = await response.blob();

			// Convert to data URL
			const reader = new FileReader();
			const data_url = await new Promise((resolve) => {
				reader.onloadend = () => resolve(reader.result);
				reader.readAsDataURL(media_blob);
			});

			// Update the sources map
			blob_media_sources.set(media_name, data_url);
			blob_media_blobs.set(media_name, media_blob);

			// Update cache
			await setCachedMedia(remote_url, media_blob);

			// Update blob URL
			const old_blob_url = blob_media_urls.get(media_name);
			if (old_blob_url) {
				URL.revokeObjectURL(old_blob_url);
			}
			const new_blob_url = URL.createObjectURL(media_blob);
			blob_media_urls.set(media_name, new_blob_url);

			// Update link tag
			const link_tag = Array.from(blob_media_tags).find(
				(tag) => tag.getAttribute("name") === media_name,
			);
			if (link_tag) {
				link_tag.setAttribute("source", data_url);
				link_tag.setAttribute("href", new_blob_url);
				link_tag.setAttribute("blob", new_blob_url);
			}

			// Update CSS variable if it's an image
			if (media_blob.type.startsWith("image/")) {
				// Regenerate all media CSS variables
				const media_vars_sheet = blob_adopted_sheets.get("__media_vars__");
				if (media_vars_sheet) {
					const all_media_css_vars = [];
					blob_media_blobs.forEach((blob, name) => {
						if (blob.type.startsWith("image/")) {
							const url = blob_media_urls.get(name);
							all_media_css_vars.push(`--BM-${name.replaceAll(" ", "-")}: url('${url}');`);
						}
					});
					const new_css = `:root {\n\t${all_media_css_vars.join("\n\t")}\n}`;
					media_vars_sheet.replaceSync(new_css);
				}
			}

			console.log(`Successfully updated media "${media_name}" from remote`);
			return true;
		} catch (error) {
			console.warn(`Failed to update media "${media_name}" from remote:`, error);
			return false;
		}
	}

	//
	// Snapshot management
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

		// Process module loader script
		const module_loader_script = doc_clone.querySelector('script[id="blob-loader"]');
		if (module_loader_script) {
			const src = module_loader_script.getAttribute("src");
			const has_content = module_loader_script.textContent.trim().length > 0;

			// Only fetch and inline if src exists and textContent is empty
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

		// Process blob media links
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

			// Remove blob attribute if it exists
			if (script.hasAttribute("blob")) {
				script.removeAttribute("blob");
			}

			// Skip processing content for disabled modules
			if (is_disabled) {
				return;
			}

			// Get the module content
			const module_content = blob_modules_sources.get(module_name);

			// Check for nodownload modules
			if ((module_content && !no_download) || force_inline) {
				script.textContent = module_content;
			} else if (no_download) {
				// Keep the remote URL but clear any local content
				script.textContent = "";
			}
		});

		// Process remote styles
		const cloned_style_tags = doc_clone.querySelectorAll("style[blob-module]");
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
				// Keep empty with just the remote attribute
				style.textContent = "";
			} else if (style_content) {
				// Inline the content
				style.textContent = style_content;
			} else if (remote_url) {
				// Fallback: keep remote reference if no local content
				style.textContent = "";
			}
		});

		// Remove the blob link elements we created
		const blob_links = doc_clone.querySelectorAll('link[href^="blob:"]');
		blob_links.forEach((link) => link.remove());

		// Get the full HTML
		return `<!DOCTYPE html>\n${doc_clone.documentElement.outerHTML}`;
	}

	async function saveAsHtmlFile(force_inline = false) {
		const html_content = await getDocumentOuterHtml(force_inline);

		// Check if File System Access API is available
		if (window.showSaveFilePicker) {
			try {
				// Show save file picker
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

				// Get html and create writable
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

		// Fallback to download method
		alert("File System Access API not available, falling back to download");
		console.log("File System Access API not available, falling back to download");

		// Create and trigger download
		const blob = new Blob([html_content], {
			type: "text/html",
		});
		const url = URL.createObjectURL(blob);

		const download_link = document.createElement("a");
		download_link.href = url;
		download_link.download = "index.html";
		download_link.click();

		// Clean up the blob URL
		URL.revokeObjectURL(url);

		console.log("HTML file download initiated");
	}

	async function listSnapshotsInCache() {
		const db = await openCache();
		const transaction = db.transaction(["snapshots"], "readonly");
		const store = transaction.objectStore("snapshots");

		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				// Sort by timestamp descending (newest first)
				const snapshots = request.result.sort((a, b) => b.timestamp - a.timestamp);
				// Return only metadata, not full html_content
				const snapshot_list = snapshots.map((s) => ({
					session_id: s.session_id,
					tag: s.tag,
					timestamp: s.timestamp,
					document_title: s.document_title,
					size_bytes: new Blob([s.html_content]).size,
				}));
				resolve(snapshot_list);
			};
		});
	}

	async function deleteSnapshotFromCache(session_id) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["snapshots"], "readwrite");
			const store = transaction.objectStore("snapshots");

			return new Promise((resolve, reject) => {
				const request = store.delete(session_id);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					console.log(`Deleted snapshot with session_id: ${session_id}`);
					resolve();
				};
			});
		} catch (error) {
			console.warn("Failed to delete snapshot:", error);
			throw error;
		}
	}

	async function saveSnapshotAsHtmlFile(session_id) {
		try {
			// Get the snapshot from cache
			const snapshot = await getSnapshotFromCache(session_id);

			if (!snapshot) {
				console.warn(`Snapshot with session_id "${session_id}" not found`);
				return;
			}

			const html_content = snapshot.html_content;
			const suggested_filename =
				`${snapshot.document_title || snapshot.tag || "snapshot"}.html`.replace(
					/[^a-z0-9_\-\.]/gi,
					"_",
				);

			// Check if File System Access API is available
			if (window.showSaveFilePicker) {
				try {
					// Show save file picker
					const file_handle = await window.showSaveFilePicker({
						suggestedName: suggested_filename,
						types: [
							{
								description: "HTML files",
								accept: {
									"text/html": [".html", ".htm"],
								},
							},
						],
					});

					// Get html and create writable
					const writable = await file_handle.createWritable();
					await writable.write(html_content);
					await writable.close();

					console.log(`Snapshot "${snapshot.tag}" saved successfully`);
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

			// Fallback to download method
			alert("File System Access API not available, falling back to download");
			console.log("File System Access API not available, falling back to download");

			// Create and trigger download
			const blob = new Blob([html_content], {
				type: "text/html",
			});
			const url = URL.createObjectURL(blob);

			const download_link = document.createElement("a");
			download_link.href = url;
			download_link.download = suggested_filename;
			download_link.click();

			// Clean up the blob URL
			URL.revokeObjectURL(url);

			console.log(`Snapshot "${snapshot.tag}" download initiated`);
		} catch (error) {
			console.warn("Failed to save snapshot as HTML file:", error);
			throw error;
		}
	}

	async function saveSnapshotToCache(tag = "") {
		const snapshot_start = performance.now();

		try {
			const html_start = performance.now();
			const html_content = await getDocumentOuterHtml(true);
			const html_duration = performance.now() - html_start;

			const timestamp = Date.now();

			// Generate session_id with fallback for browsers without crypto.randomUUID
			let session_id;
			if (typeof crypto !== "undefined" && crypto.randomUUID) {
				session_id = crypto.randomUUID();
			} else {
				// Fallback: timestamp + random string
				const random_part =
					Math.random().toString(36).substring(2, 15) +
					Math.random().toString(36).substring(2, 15);
				session_id = `${timestamp}_${random_part}`;
			}

			const snapshot_entry = {
				session_id: session_id,
				tag: tag || `snapshot_${timestamp}`,
				html_content: html_content,
				timestamp: timestamp,
				document_title: document.title || "Untitled",
			};

			// Yield to browser before heavy IDB write
			await finish();

			const db_start = performance.now();
			const db = await openCache();
			const transaction = db.transaction(["snapshots"], "readwrite");
			const store = transaction.objectStore("snapshots");

			const result = await new Promise((resolve, reject) => {
				const request = store.put(snapshot_entry);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					const db_duration = performance.now() - db_start;
					const total_duration = performance.now() - snapshot_start;

					console.log(
						`Snapshot saved with session_id: ${session_id}, tag: ${snapshot_entry.tag}`,
					);
					console.log(`  HTML generation: ${html_duration.toFixed(2)}ms`);
					console.log(`  IDB write: ${db_duration.toFixed(2)}ms`);
					console.log(`  Total: ${total_duration.toFixed(2)}ms`);
					console.log(`  Size: ${(html_content.length / 1024).toFixed(2)} KB`);

					resolve(session_id);
				};
			});

			return result;
		} catch (error) {
			console.warn("Failed to save snapshot:", error);
			throw error;
		}
	}

	async function saveAsZipFile() {
		// TODO: Implementation needed
		alert("TODO");
	}

	async function deleteCachedModule(url) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["modules"], "readwrite");
			const store = transaction.objectStore("modules");

			return new Promise((resolve, reject) => {
				const request = store.delete(url);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					console.log(`Deleted cached module: ${url}`);
					resolve();
				};
			});
		} catch (error) {
			console.warn("Failed to delete cached module:", error);
			throw error;
		}
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
				`style[blob-module][name="${style_name}"]`,
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
		style_tag.setAttribute("blob-module", "");
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
			src_bytes: style_blob.size,
			blob_url: blob_url,
			metadata: metadata,
		});

		console.log(`Added new style module "${style_name}"`);
		return true;
	}

	// @IMPR: Only thing that changes is the object store key so we can probably merge with deleteCachedModule
	async function deleteCachedMedia(url) {
		try {
			const db = await openCache();
			const transaction = db.transaction(["media"], "readwrite");
			const store = transaction.objectStore("media");

			return new Promise((resolve, reject) => {
				const request = store.delete(url);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					console.log(`Deleted cached media: ${url}`);
					resolve();
				};
			});
		} catch (error) {
			console.warn("Failed to delete cached media:", error);
			throw error;
		}
	}

	async function runNonExportingModuleScript(source) {
		// Create a blob from the source code
		const module_blob = new Blob([source], {
			type: "text/javascript",
		});

		// Create a blob URL
		const blob_url = URL.createObjectURL(module_blob);

		try {
			// Import the module
			await import(blob_url);
			console.log("Non-exporting module script executed successfully");
		} catch (error) {
			console.warn("Failed to execute non-exporting module script:", error);
			throw error;
		} finally {
			// Clean up the blob URL after import
			URL.revokeObjectURL(blob_url);
		}
	}

	//
	// Clone management
	//

	async function cloneDocument() {
		const current_html = await BlobLoader.getDocumentOuterHtml(true);
		const parser = new DOMParser();
		const clone_doc = parser.parseFromString(current_html, "text/html");

		// Build fresh maps from the cloned DOM
		const clone_modules = new Map();
		const clone_styles = new Map();
		const clone_media = new Map();

		// Extract script modules
		const clone_script_tags = clone_doc.querySelectorAll('script[type="blob-module"]');
		clone_script_tags.forEach((script) => {
			const module_name = script.getAttribute("name");
			const remote_url = script.getAttribute("remote") || null;
			const is_disabled = script.hasAttribute("disabled");
			const src = script.textContent.trim();

			// Extract metadata
			const known_attrs = new Set(["name", "remote", "disabled", "blob", "type", "nodownload"]);
			const metadata = {};
			Array.from(script.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			clone_modules.set(module_name, {
				src,
				remote_url,
				is_disabled,
				metadata,
			});
		});

		// Extract style modules
		const clone_style_tags = clone_doc.querySelectorAll("style[blob-module]");
		clone_style_tags.forEach((style) => {
			const style_name = style.getAttribute("name");
			const remote_url = style.getAttribute("remote") || null;
			const is_disabled = style.hasAttribute("disabled");
			const src = style.textContent.trim();

			// Extract metadata
			const known_attrs = new Set(["name", "remote", "disabled", "blob", "type", "nodownload"]);
			const metadata = {};
			Array.from(style.attributes).forEach((attr) => {
				if (!known_attrs.has(attr.name)) {
					metadata[attr.name] = attr.value;
				}
			});

			clone_styles.set(style_name, {
				src,
				remote_url,
				is_disabled,
				metadata,
			});
		});

		// Extract media modules
		const clone_media_tags = clone_doc.querySelectorAll('link[type="blob-module"]');
		clone_media_tags.forEach((link) => {
			const media_name = link.getAttribute("name");
			const remote_url = link.getAttribute("remote") || null;
			const is_disabled = link.hasAttribute("disabled");
			const src = link.getAttribute("source") || null; // data URL

			// Extract metadata
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

			clone_media.set(media_name, {
				src,
				remote_url,
				is_disabled,
				metadata,
			});
		});

		return {
			doc: clone_doc,
			modules: clone_modules,
			styles: clone_styles,
			media: clone_media,
		};
	}

	function getCloneOuterHtmlFile(clone) {
		return `<!DOCTYPE html>\n${clone.doc.documentElement.outerHTML}`;
	}

	async function saveCloneAsHtmlFile(clone) {
		const html_content = getCloneOuterHtmlFile(clone);

		// Check if File System Access API is available
		if (window.showSaveFilePicker) {
			try {
				// Show save file picker
				const file_handle = await window.showSaveFilePicker({
					suggestedName: `${clone.doc.title || Date.now()}.html`,
					types: [
						{
							description: "HTML files",
							accept: {
								"text/html": [".html", ".htm"],
							},
						},
					],
				});

				// Get html and create writable
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

		// Fallback to download method
		alert("File System Access API not available, falling back to download");
		console.log("File System Access API not available, falling back to download");

		// Create and trigger download
		const blob = new Blob([html_content], {
			type: "text/html",
		});
		const url = URL.createObjectURL(blob);

		const download_link = document.createElement("a");
		download_link.href = url;
		download_link.download = "index.html";
		download_link.click();

		// Clean up the blob URL
		URL.revokeObjectURL(url);

		console.log("HTML file download initiated");
	}

	async function saveCloneAsSnapshot(clone, tag = "") {
		try {
			const html_content = getCloneOuterHtmlFile(clone);
			const timestamp = Date.now();

			// Generate session_id with fallback for browsers without crypto.randomUUID
			let session_id;
			if (typeof crypto !== "undefined" && crypto.randomUUID) {
				session_id = crypto.randomUUID();
			} else {
				// Fallback: timestamp + random string
				const random_part =
					Math.random().toString(36).substring(2, 15) +
					Math.random().toString(36).substring(2, 15);
				session_id = `${timestamp}_${random_part}`;
			}

			const db = await openCache();
			const transaction = db.transaction(["snapshots"], "readwrite");
			const store = transaction.objectStore("snapshots");

			const snapshot_entry = {
				session_id: session_id,
				tag: tag || `snapshot_${timestamp}`,
				html_content: html_content,
				timestamp: timestamp,
				document_title: clone.doc.title || "Untitled clone",
			};

			return new Promise((resolve, reject) => {
				const request = store.put(snapshot_entry);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					console.log(
						`Clone snapshot saved with session_id: ${session_id}, tag: ${snapshot_entry.tag}`,
					);
					resolve(session_id);
				};
			});
		} catch (error) {
			console.warn("Failed to save clone snapshot:", error);
			throw error;
		}
	}

	function saveCloneAsZipFile(clone) {
		// TODO: v1.5 Implementation needed
		alert("TODO");
	}

	function addCloneScriptModule(clone, module) {
		if (clone.modules.has(module.name)) {
			console.warn(`Module "${module.name}" already exists in clone`);
			return false;
		}

		clone.modules.set(module.name, {
			src: module.src || "",
			remote_url: module.remote_url || null,
			is_disabled: module.is_disabled || false,
			metadata: module.metadata || {},
		});

		const script = clone.doc.createElement("script");
		script.setAttribute("type", "blob-module");
		script.setAttribute("name", module.name);
		script.textContent = module.src || "";

		if (module.remote_url) {
			script.setAttribute("remote", module.remote_url);
		}

		if (module.is_disabled) {
			script.setAttribute("disabled", "");
		}

		Object.entries(module.metadata || {}).forEach(([key, value]) => {
			script.setAttribute(key, value);
		});

		clone.doc.head.appendChild(script);

		return true;
	}

	function getCloneScriptModule(clone, module_name) {
		if (!clone.modules.has(module_name)) {
			console.warn(`Module "${module_name}" not found in clone`);
			return null;
		}

		const module_data = clone.modules.get(module_name);

		// Return a copy to prevent accidental mutations
		return {
			name: module_name,
			src: module_data.src,
			remote_url: module_data.remote_url,
			is_disabled: module_data.is_disabled,
			metadata: { ...module_data.metadata },
		};
	}

	function updateCloneScriptModule(clone, module_name, module_data) {
		if (!clone.modules.has(module_name)) {
			console.warn(`Module "${module_name}" not found in clone`);
			return false;
		}

		// Get current module data
		const current_module = clone.modules.get(module_name);

		// Update the module in the map with provided data, keeping existing values for unspecified fields
		clone.modules.set(module_name, {
			src: module_data.src !== undefined ? module_data.src : current_module.src,
			remote_url:
				module_data.remote_url !== undefined
					? module_data.remote_url
					: current_module.remote_url,
			is_disabled:
				module_data.is_disabled !== undefined
					? module_data.is_disabled
					: current_module.is_disabled,
			metadata:
				module_data.metadata !== undefined
					? { ...current_module.metadata, ...module_data.metadata }
					: current_module.metadata,
		});

		// Find and update the corresponding script tag in the cloned document
		const script_tags = clone.doc.querySelectorAll('script[type="blob-module"]');
		for (const script of script_tags) {
			if (script.getAttribute("name") === module_name) {
				// Update textContent if src was provided
				if (module_data.src !== undefined) {
					script.textContent = module_data.src;
				}

				// Update remote attribute
				if (module_data.remote_url !== undefined) {
					if (module_data.remote_url) {
						script.setAttribute("remote", module_data.remote_url);
					} else {
						script.removeAttribute("remote");
					}
				}

				// Update disabled attribute
				if (module_data.is_disabled !== undefined) {
					if (module_data.is_disabled) {
						script.setAttribute("disabled", "");
					} else {
						script.removeAttribute("disabled");
					}
				}

				// Update metadata attributes
				if (module_data.metadata !== undefined) {
					Object.entries(module_data.metadata).forEach(([key, value]) => {
						if (value === null || value === undefined) {
							script.removeAttribute(key);
						} else {
							script.setAttribute(key, value);
						}
					});
				}

				console.log(`Updated module "${module_name}" in clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Module "${module_name}" was in map but script tag not found in clone DOM`);
		return false;
	}

	function removeCloneScriptModule(clone, module_name) {
		if (!clone.modules.has(module_name)) {
			console.warn(`Module "${module_name}" not found in clone`);
			return false;
		}

		// Remove from the modules map
		clone.modules.delete(module_name);

		// Find and remove the corresponding script tag from the cloned document
		const script_tags = clone.doc.querySelectorAll('script[type="blob-module"]');
		for (const script of script_tags) {
			if (script.getAttribute("name") === module_name) {
				script.remove();
				console.log(`Removed module "${module_name}" from clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Module "${module_name}" was in map but script tag not found in clone DOM`);
		return false;
	}

	function addCloneStyleModule(clone, style_name, style_data) {
		if (clone.styles.has(style_name)) {
			console.warn(`Style module "${style_name}" already exists in clone`);
			return false;
		}

		clone.styles.set(style_name, {
			src: style_data.src || "",
			remote_url: style_data.remote_url || null,
			is_disabled: style_data.is_disabled || false,
			metadata: style_data.metadata || {},
		});

		const style = clone.doc.createElement("style");
		style.setAttribute("blob-module", "");
		style.setAttribute("name", style_name);
		style.textContent = style_data.src || "";

		if (style_data.remote_url) {
			style.setAttribute("remote", style_data.remote_url);
		}

		if (style_data.is_disabled) {
			style.setAttribute("disabled", "");
		}

		Object.entries(style_data.metadata || {}).forEach(([key, value]) => {
			style.setAttribute(key, value);
		});

		clone.doc.head.appendChild(style);

		return true;
	}

	function getCloneStyleModule(clone, style_name) {
		if (!clone.styles.has(style_name)) {
			console.warn(`Style module "${style_name}" not found in clone`);
			return null;
		}

		const style_data = clone.styles.get(style_name);

		// Return a copy to prevent accidental mutations
		return {
			name: style_name,
			src: style_data.src,
			remote_url: style_data.remote_url,
			is_disabled: style_data.is_disabled,
			metadata: { ...style_data.metadata },
		};
	}

	function updateCloneStyleModule(clone, style_name, style_data) {
		if (!clone.styles.has(style_name)) {
			console.warn(`Style module "${style_name}" not found in clone`);
			return false;
		}

		// Get current style data
		const current_style = clone.styles.get(style_name);

		// Update the style in the map with provided data, keeping existing values for unspecified fields
		clone.styles.set(style_name, {
			src: style_data.src !== undefined ? style_data.src : current_style.src,
			remote_url:
				style_data.remote_url !== undefined ? style_data.remote_url : current_style.remote_url,
			is_disabled:
				style_data.is_disabled !== undefined
					? style_data.is_disabled
					: current_style.is_disabled,
			metadata:
				style_data.metadata !== undefined
					? { ...current_style.metadata, ...style_data.metadata }
					: current_style.metadata,
		});

		// Find and update the corresponding style tag in the cloned document
		const style_tags = clone.doc.querySelectorAll("style[blob-module]");
		for (const style of style_tags) {
			if (style.getAttribute("name") === style_name) {
				// Update textContent if src was provided
				if (style_data.src !== undefined) {
					style.textContent = style_data.src;
				}

				// Update remote attribute
				if (style_data.remote_url !== undefined) {
					if (style_data.remote_url) {
						style.setAttribute("remote", style_data.remote_url);
					} else {
						style.removeAttribute("remote");
					}
				}

				// Update disabled attribute
				if (style_data.is_disabled !== undefined) {
					if (style_data.is_disabled) {
						style.setAttribute("disabled", "");
					} else {
						style.removeAttribute("disabled");
					}
				}

				// Update metadata attributes
				if (style_data.metadata !== undefined) {
					Object.entries(style_data.metadata).forEach(([key, value]) => {
						if (value === null || value === undefined) {
							style.removeAttribute(key);
						} else {
							style.setAttribute(key, value);
						}
					});
				}

				console.log(`Updated style module "${style_name}" in clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Style module "${style_name}" was in map but style tag not found in clone DOM`);
		return false;
	}

	function removeCloneStyleModule(clone, style_name) {
		if (!clone.styles.has(style_name)) {
			console.warn(`Style module "${style_name}" not found in clone`);
			return false;
		}

		// Remove from the styles map
		clone.styles.delete(style_name);

		// Find and remove the corresponding style tag from the cloned document
		const style_tags = clone.doc.querySelectorAll("style[blob-module]");
		for (const style of style_tags) {
			if (style.getAttribute("name") === style_name) {
				style.remove();
				console.log(`Removed style module "${style_name}" from clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Style module "${style_name}" was in map but style tag not found in clone DOM`);
		return false;
	}

	function addCloneMediaModule(clone, media_name, media_data) {
		if (clone.media.has(media_name)) {
			console.warn(`Media module "${media_name}" already exists in clone`);
			return false;
		}

		clone.media.set(media_name, {
			src: media_data.src || null,
			remote_url: media_data.remote_url || null,
			is_disabled: media_data.is_disabled || false,
			metadata: media_data.metadata || {},
		});

		const link = clone.doc.createElement("link");
		link.setAttribute("type", "blob-module");
		link.setAttribute("name", media_name);

		if (media_data.src) {
			link.setAttribute("source", media_data.src);
		}

		if (media_data.remote_url) {
			link.setAttribute("remote", media_data.remote_url);
		}

		if (media_data.is_disabled) {
			link.setAttribute("disabled", "");
		}

		Object.entries(media_data.metadata || {}).forEach(([key, value]) => {
			link.setAttribute(key, value);
		});

		clone.doc.head.appendChild(link);

		return true;
	}

	function getCloneMediaModule(clone, media_name) {
		if (!clone.media.has(media_name)) {
			console.warn(`Media module "${media_name}" not found in clone`);
			return null;
		}

		const media_data = clone.media.get(media_name);

		// Return a copy to prevent accidental mutations
		return {
			name: media_name,
			src: media_data.src,
			remote_url: media_data.remote_url,
			is_disabled: media_data.is_disabled,
			metadata: { ...media_data.metadata },
		};
	}

	function updateCloneMediaModule(clone, media_name, media_data) {
		if (!clone.media.has(media_name)) {
			console.warn(`Media module "${media_name}" not found in clone`);
			return false;
		}

		// Get current media data
		const current_media = clone.media.get(media_name);

		// Update the media in the map with provided data, keeping existing values for unspecified fields
		clone.media.set(media_name, {
			src: media_data.src !== undefined ? media_data.src : current_media.src,
			remote_url:
				media_data.remote_url !== undefined ? media_data.remote_url : current_media.remote_url,
			is_disabled:
				media_data.is_disabled !== undefined
					? media_data.is_disabled
					: current_media.is_disabled,
			metadata:
				media_data.metadata !== undefined
					? { ...current_media.metadata, ...media_data.metadata }
					: current_media.metadata,
		});

		// Find and update the corresponding link tag in the cloned document
		const link_tags = clone.doc.querySelectorAll('link[type="blob-module"]');
		for (const link of link_tags) {
			if (link.getAttribute("name") === media_name) {
				// Update source attribute if src was provided
				if (media_data.src !== undefined) {
					if (media_data.src) {
						link.setAttribute("source", media_data.src);
					} else {
						link.removeAttribute("source");
					}
				}

				// Update remote attribute
				if (media_data.remote_url !== undefined) {
					if (media_data.remote_url) {
						link.setAttribute("remote", media_data.remote_url);
					} else {
						link.removeAttribute("remote");
					}
				}

				// Update disabled attribute
				if (media_data.is_disabled !== undefined) {
					if (media_data.is_disabled) {
						link.setAttribute("disabled", "");
					} else {
						link.removeAttribute("disabled");
					}
				}

				// Update metadata attributes
				if (media_data.metadata !== undefined) {
					Object.entries(media_data.metadata).forEach(([key, value]) => {
						if (value === null || value === undefined) {
							link.removeAttribute(key);
						} else {
							link.setAttribute(key, value);
						}
					});
				}

				console.log(`Updated media module "${media_name}" in clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Media module "${media_name}" was in map but link tag not found in clone DOM`);
		return false;
	}

	function removeCloneMediaModule(clone, media_name) {
		if (!clone.media.has(media_name)) {
			console.warn(`Media module "${media_name}" not found in clone`);
			return false;
		}

		// Remove from the media map
		clone.media.delete(media_name);

		// Find and remove the corresponding link tag from the cloned document
		const link_tags = clone.doc.querySelectorAll('link[type="blob-module"]');
		for (const link of link_tags) {
			if (link.getAttribute("name") === media_name) {
				link.remove();
				console.log(`Removed media module "${media_name}" from clone`);
				return true;
			}
		}

		// This shouldn't happen if the clone is properly synchronized
		console.warn(`Media module "${media_name}" was in map but link tag not found in clone DOM`);
		return false;
	}

	//
	// Utils
	//

	function openCache() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(
				"blob_module_cache",
				3, // version
			);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Modules store
				if (!db.objectStoreNames.contains("modules")) {
					const store = db.createObjectStore("modules", {
						keyPath: "url",
					});
					store.createIndex("timestamp", "timestamp", {
						unique: false,
					});
				}

				// Media store
				if (!db.objectStoreNames.contains("media")) {
					const media_store = db.createObjectStore("media", {
						keyPath: "url",
					});
					media_store.createIndex("timestamp", "timestamp", {
						unique: false,
					});
				}

				// Snapshots store
				if (!db.objectStoreNames.contains("snapshots")) {
					const snapshots_store = db.createObjectStore("snapshots", {
						keyPath: "session_id",
					});
					snapshots_store.createIndex("timestamp", "timestamp", {
						unique: false,
					});
					snapshots_store.createIndex("tag", "tag", {
						unique: false,
					});
				}
			};
		});
	}

	async function getSnapshotFromCache(session_id) {
		const db = await openCache();
		const transaction = db.transaction(["snapshots"], "readonly");
		const store = transaction.objectStore("snapshots");

		return new Promise((resolve, reject) => {
			const request = store.get(session_id);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	function finish(t = 0) {
		// Wait for next cycle to make sure DOM finished with previuous tasks or other related goals
		return new Promise((resolve) => setTimeout(resolve, t));
	}
})();
