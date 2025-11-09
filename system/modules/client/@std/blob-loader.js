//
// MODULE LOADER 0.1.0
// by fergarram
//

// Extends existing html script and styles functionality with:
// - Support for inlined ES Modules
// - Multiple sources of truth for JS and CSS modules (remote, inline, cache)
// - API for editable exports and self-rewriting

//
// TODO
// v1
// [ ] CRUD for modules and media
// [ ] Add saveAsZipFile() which instead of inlined modules and assets it saves everything separately
//     - This is useful for debugging purposes or when using an external IDE
// [ ] Indexeddb backups for full html snapshots
// v1.5
// [ ] Hooks for minification and formatting
// [ ] Optional TSC for lang="ts" or even lang="tsx" (actually would go in the same spot as minification)
//     - maybe add a custom meta module type for this or have it be global in window
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// ISSUES:
//
// - Fonts dont work as media modules, need to try as=".." apprpoach, if font dont work (other would) then we just prompt
//   the user to download the font which we tested and so the font file can be referenced system wide.
//   It seems the issue with fonts is that url(blob/base64) are treated as images always so it just doesn't work.
//
// - Also about fonts, if that's not enough then we just stop using fonts for icons and we use svg and
//   that's it. So essentially we would have media blobs and a special case for font blobs. I guess we
//   can try this and even separate further because for example videos and other type of files we don't
//   want those in css variables lol.
//
//   So I guess we do use an "as" attribute that helps us distinguish what we'll do with the file based on these categories:
//   - images (we get css vars)
//   - fonts (we generate adoptedSheet with @font-face definitions with inlined blob urls)
//   - text files
//   - binary files (known like mp3, mp4, etc and unkown extensions)

//
// Settings
//

window.__blob_module_loader_settings__ = {
	prefers_remote_modules: location.hostname === "localhost" ? true : false,
};

//
// Module Loader Setup
//

window.addEventListener("load", async () => {
	const load_start_time = performance.now();

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

	const blob_media_tags = document.querySelectorAll(`link[type="blob-module"]`);
	const blob_style_tags = document.querySelectorAll(`style[type="blob-module"]`);
	const blob_script_tags = document.querySelectorAll('script[type="blob-module"]');

	const blob_media_sources = new Map();
	const blob_style_sources = new Map();
	const blob_modules_sources = new Map();

	const blob_media_map = new Map();
	const blob_style_map = new Map();
	const blob_module_map = new Map();

	const media_css_vars = [];
	const blob_media_blobs = new Map();
	const blob_adopted_sheets = new Map(); // This is where both styles and media variable definitions live

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
			console.warn(`Media name collision detected: "${media_name}" already exists. Skipping duplicate.`);
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

			if (__blob_module_loader_settings__.prefers_remote_modules) {
				// Auto-update mode: fetch from remote first, fallback to cache
				try {
					console.log(`Fetching remote media "${media_name}" from ${remote_url} (auto-update mode)`);
					const response = await fetch(remote_url);
					media_blob = await response.blob();

					// Update cache with blob
					await setCachedMedia(remote_url, media_blob);
					console.log(`Updated cache for remote media "${media_name}"`);
				} catch (fetch_error) {
					console.warn(`Failed to fetch remote media "${media_name}", falling back to cache:`, fetch_error);

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
					if (__blob_module_loader_settings__.prefers_remote_modules) {
						console.log(
							`Remote and local content differ for media "${media_name}". Using remote content (auto-update mode).`,
						);
						blob_media_blobs.set(media_name, media_blob); // Use remote blob
						blob_media_sources.set(media_name, remote_data_url); // Update source for saving
					} else {
						console.warn(`Remote and local content are different for media "${media_name}". Using local content.`);
						// Convert local data URL to blob for consistency
						const local_response = await fetch(local_data_url);
						const local_blob = await local_response.blob();
						blob_media_blobs.set(media_name, local_blob);
					}
				} else {
					// Content is the same, use the blob we have
					blob_media_blobs.set(media_name, media_blob);
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
				const link_tag = Array.from(blob_media_tags).find((tag) => tag.getAttribute("name") === media_name);
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
		const link_tag = Array.from(blob_media_tags).find((tag) => tag.getAttribute("name") === media_name);

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
		const link_tag = Array.from(blob_media_tags).find((tag) => tag.getAttribute("name") === media_name);
		if (link_tag) {
			link_tag.removeAttribute("src");
			link_tag.setAttribute("href", blob_url);
			link_tag.setAttribute("blob", blob_url);
		}

		// Add CSS variable definition
		media_css_vars.push(`--BM-${media_name}: url('${blob_url}') format('woff2');`);

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

		const metadata = {
			name: media_name,
			remote_url,
			size_bytes,
			blob_url,
		};

		blob_media_map.set(media_name, metadata);
	});

	//
	// Process blob style tags
	//

	// First pass: collect all style contents and remote URLs
	blob_style_tags.forEach((style) => {
		const remote_url = style.getAttribute("remote");
		const style_module_name = style.getAttribute("name");

		// Check for name collisions
		if (blob_style_sources.has(style_module_name) || remote_styles_hrefs.has(style_module_name)) {
			console.warn(`Style URL collision detected: "${style_module_name}" already exists. Skipping duplicate.`);
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

			if (__blob_module_loader_settings__.prefers_remote_modules) {
				// Auto-update mode: fetch from remote first, fallback to cache
				try {
					console.log(`Fetching remote style from ${remote_url} (auto-update mode)`);
					const response = await fetch(remote_url);
					remote_content = await response.text();

					// Overwrite cache with new source
					await setCachedModule(remote_url, remote_content);
					console.log(`Updated cache for remote style from ${remote_url}`);
				} catch (fetch_error) {
					console.warn(`Failed to fetch remote style from "${remote_url}", falling back to cache:`, fetch_error);

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
					if (__blob_module_loader_settings__.prefers_remote_modules) {
						console.log(
							`Remote and local content differ for style "${remote_url}". Using remote content (auto-update mode).`,
						);
						blob_style_sources.set(style_name, remote_content); // Use remote content
					} else {
						console.warn(`Remote and local content are different for style "${remote_url}". Using local content.`);
						// Keep local content (no change needed)
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
				const style_tag = Array.from(blob_style_tags).find((tag) => tag.getAttribute("name") === style_name);
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
		const style_tag = Array.from(blob_style_tags).find((tag) => tag.getAttribute("name") === style_name);

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

		if (style_tag && !blob_adopted_sheets.has(style_name)) {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(content);
			document.adoptedStyleSheets.push(sheet);
			blob_adopted_sheets.set(style_name, sheet);

			style_tag.textContent = "";
			style_tag.setAttribute("blob", blob_url);

			console.log(`Adopted stylesheet for ${style_name}`);
		}
	});

	// Populate the style metadata map
	blob_style_sources.forEach((content, style_name) => {
		const blob_url = blob_style_urls.get(style_name);
		const src_bytes = new Blob([content]).size;
		const remote_url = remote_styles_hrefs.get(style_name) || null;

		const metadata = {
			name: style_name,
			remote_url,
			src_bytes,
			blob_url,
		};

		blob_style_map.set(style_name, metadata);
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
			console.warn(`Module name collision detected: "${module_name}" already exists. Skipping duplicate.`);
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

			if (__blob_module_loader_settings__.prefers_remote_modules) {
				// Auto-update mode: fetch from remote first, fallback to cache
				try {
					console.log(`Fetching remote module "${module_name}" from ${remote_url} (auto-update mode)`);
					const response = await fetch(remote_url);
					remote_content = await response.text();

					// Update the cache with fresh content
					await setCachedModule(remote_url, remote_content);
					console.log(`Updated cache for remote module "${module_name}"`);
				} catch (fetch_error) {
					console.warn(`Failed to fetch remote module "${module_name}", falling back to cache:`, fetch_error);

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
					if (__blob_module_loader_settings__.prefers_remote_modules) {
						console.log(
							`Remote and local content differ for module "${module_name}". Using remote content (auto-update mode).`,
						);
						blob_modules_sources.set(module_name, remote_content); // Use remote content
					} else {
						console.warn(`Remote and local content are different for module "${module_name}". Using local content.`);
						// Keep local content (no change needed)
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
		setTimeout(() => {
			const main_script = document.createElement("script");
			main_script.type = "module";
			main_script.setAttribute("entrypoint", "");
			main_script.textContent = `
									const main_start_time = performance.now();
									const load_duration = main_start_time - ${load_start_time};
									console.log(\`Main module started \${load_duration.toFixed(2)}ms after page load\`);
									import("main");
								`;
			document.head.appendChild(main_script);
		}, 0);
	}

	// Populate the metadata map (including disabled modules for reference)
	blob_script_tags.forEach((script) => {
		const module_name = script.getAttribute("name");
		const remote_url = script.getAttribute("remote") || null;
		const is_disabled = script.hasAttribute("disabled");
		const blob_url = blob_module_urls.get(module_name) || null;
		const content = blob_modules_sources.get(module_name) || "";
		const src_bytes = new Blob([content]).size;

		const metadata = {
			module_name,
			src_bytes,
			remote_url,
			blob_url,
			is_disabled,
		};

		blob_module_map.set(module_name, metadata);
	});

	//
	// Blob-module loader API
	//

	function openCache() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(
				"blob_module_cache",
				2, // version
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
			};
		});
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

	async function clearBlobLoaderCache(url = null) {
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
					console.log("Inlined blob-loader script");
				} catch (error) {
					console.warn("Failed to fetch and inline blob-loader script:", error);
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
		const cloned_style_tags = doc_clone.querySelectorAll('style[type="blob-module"]');
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
					console.warn("Failed to save file using File System Access API, falling back to download:", error);
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

	async function saveAsZipFile() {
		console.log("TODO");
	}

	window.BlobLoader = {
		blobMedia: (name) => blob_media_urls.get(name) || null,
		openCache,
		getCachedModule,
		setCachedModule,
		getCachedMedia,
		setCachedMedia,
		clearBlobLoaderCache,
		getDocumentOuterHtml,
		saveAsHtmlFile,
		saveAsZipFile,
	};
});
