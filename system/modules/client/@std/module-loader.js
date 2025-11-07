//
// MODULE LOADER 0.1.0
// by fergarram
//

// Extends existing html script and styles functionality with:
// - Support for inlined ES Modules
// - Multiple sources of truth for JS and CSS modules (remote, inline, cache)
// - API for editable exports and self-rewriting

//
// Settings
//

window.__blob_module_loader_settings__ = {
	prefers_remote_modules: true,
};

//
// Module Loader Setup
//

async function initializeBlobModuleLoader() {
	const load_start_time = performance.now();
	const blob_urls = new Map();
	const remote_modules = new Map();

	window.__blob_modules__ = new Map();

	//
	// Remote Blob Module Cache
	//

	function openCache() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open("blob_module_cache", 1);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (!db.objectStoreNames.contains("modules")) {
					const store = db.createObjectStore("modules", {
						keyPath: "url",
					});
					store.createIndex("timestamp", "timestamp", {
						unique: false,
					});
				}
			};
		});
	}

	window.getCachedModule = async function (url) {
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
	};

	window.setCachedModule = async function (url, content) {
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
	};

	// Cache busting function - exposing globally
	window.clearBlobModuleCache = async function (url = null) {
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
						console.log("Cleared all blob module cache");
						resolve();
					};
				}

				request.onerror = () => reject(request.error);
			});
		} catch (error) {
			console.warn("Failed to clear cache:", error);
		}
	};

	//
	// Blob Style Processing
	//

	const blob_styles = new Map();
	const blob_style_urls = new Map();
	const remote_styles = new Map();

	const style_tags = document.querySelectorAll("style[remote]");

	// First pass: collect all style contents and remote URLs
	style_tags.forEach((style) => {
		const remote_url = style.getAttribute("remote");
		const style_id = remote_url; // Use URL as identifier since styles don't have names

		if (!remote_url) {
			console.warn("style tag missing remote attribute");
			return;
		}

		// Check for name collisions
		if (blob_styles.has(style_id) || remote_styles.has(style_id)) {
			console.warn(`Style URL collision detected: "${style_id}" already exists. Skipping duplicate.`);
			return;
		}

		const content = style.textContent.trim();

		if (!content) {
			// Empty content with remote URL - fetch remote
			remote_styles.set(style_id, remote_url);
			return;
		} else {
			// Both remote and content exist - store local, compare later
			blob_styles.set(style_id, content);
			remote_styles.set(style_id, remote_url);
			return;
		}
	});

	// Fetch remote styles (with caching) and create local copies before proceeding
	for (const [style_id, remote_url] of remote_styles) {
		try {
			let remote_content;

			if (__blob_module_loader_settings__.prefers_remote_modules) {
				// Auto-update mode: fetch from remote first, fallback to cache
				try {
					console.log(`Fetching remote style from ${remote_url} (auto-update mode)`);
					const response = await fetch(remote_url);
					remote_content = await response.text();

					// @TODO: Instead of updating cache with fresh content it should be a setting for "backup_cached_modules" or something like this.
					// Update the cache with fresh content
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

			if (blob_styles.has(style_id)) {
				// Compare with existing local content
				const local_content = blob_styles.get(style_id);
				if (remote_content.trim() !== local_content.trim()) {
					if (__blob_module_loader_settings__.prefers_remote_modules) {
						console.log(
							`Remote and local content differ for style "${remote_url}". Using remote content (auto-update mode).`,
						);
						blob_styles.set(style_id, remote_content); // Use remote content
					} else {
						console.warn(`Remote and local content are different for style "${remote_url}". Using local content.`);
						// Keep local content (no change needed)
					}
				}
				// If content is the same, keep existing (local) content
			} else {
				// No local content, use fetched remote content
				blob_styles.set(style_id, remote_content);
				console.log(`Successfully loaded remote style from ${remote_url}`);
			}
		} catch (error) {
			console.warn(`Failed to fetch remote style from "${remote_url}":`, error);
			if (!blob_styles.has(style_id)) {
				console.log(`Will keep original remote reference for style "${remote_url}"`);
			} else if (blob_styles.has(style_id)) {
				console.log(`Using local style for "${remote_url}"`);
			}
		}
	}

	// Create blob URLs for all styles and update style tags
	blob_styles.forEach((content, style_id) => {
		const style_blob = new Blob([content], {
			type: "text/css",
		});
		const blob_url = URL.createObjectURL(style_blob);
		blob_style_urls.set(style_id, blob_url);

		// Find the corresponding style tag and update it
		const style_tag = Array.from(style_tags).find((tag) => tag.getAttribute("remote") === style_id);
		if (style_tag) {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(content);
			document.adoptedStyleSheets.push(sheet);

			// @TODO: Add identifier just in case.

			style_tag.textContent = "";
			style_tag.setAttribute("blob", blob_url);

			console.log(`Adopted stylesheet for ${style_id}`);
		}
	});
	// Expose blob style metadata map
	window.__blob_style_map__ = new Map();

	// Populate the style metadata map
	blob_styles.forEach((content, style_id) => {
		const blob_url = blob_style_urls.get(style_id);
		const src_bytes = new Blob([content]).size;

		const metadata = {
			remote_url: style_id,
			src_bytes,
			blob_url,
		};

		window.__blob_style_map__.set(style_id, metadata);
	});

	//
	// Blob Module Processing
	//

	const blob_scripts = document.querySelectorAll('script[type="blob-module"]');

	// First pass: collect all module contents and remote URLs, skip disabled modules
	blob_scripts.forEach((script) => {
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
		if (__blob_modules__.has(module_name) || remote_modules.has(module_name)) {
			console.warn(`Module name collision detected: "${module_name}" already exists. Skipping duplicate.`);
			return;
		}

		// @TODO: We could minify or format here since this will be the source map from blobs
		const content = script.textContent.trim();

		if (remote_url) {
			if (!content) {
				// Empty content with remote URL - fetch remote
				remote_modules.set(module_name, remote_url);
				return;
			} else {
				// Both remote and content exist - store local, compare later
				__blob_modules__.set(module_name, content);
				remote_modules.set(module_name, remote_url);
				return;
			}
		}

		// No remote URL, just store content
		__blob_modules__.set(module_name, content);
	});

	// Fetch remote modules (with caching) and create local copies before proceeding
	for (const [module_name, remote_url] of remote_modules) {
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

			if (__blob_modules__.has(module_name)) {
				// Compare with existing local content
				const local_content = __blob_modules__.get(module_name);
				if (remote_content.trim() !== local_content.trim()) {
					if (__blob_module_loader_settings__.prefers_remote_modules) {
						console.log(
							`Remote and local content differ for module "${module_name}". Using remote content (auto-update mode).`,
						);
						__blob_modules__.set(module_name, remote_content); // Use remote content
					} else {
						console.warn(`Remote and local content are different for module "${module_name}". Using local content.`);
						// Keep local content (no change needed)
					}
				}
				// If content is the same, keep existing (local) content
			} else {
				// No local content, use fetched remote content
				__blob_modules__.set(module_name, remote_content);
				console.log(`Successfully loaded remote module "${module_name}"`);
			}
		} catch (error) {
			console.warn(`Failed to fetch remote module "${module_name}":`, error);
			if (!__blob_modules__.has(module_name)) {
				// Use remote URL directly in importmap
				blob_urls.set(module_name, remote_url);
				console.log(`Will use remote URL directly for module "${module_name}"`);
			} else if (__blob_modules__.has(module_name)) {
				console.log(`Using local module "${module_name}"`);
			}
		}
	}

	// Create blob URLs for all modules
	__blob_modules__.forEach((content, module_name) => {
		const module_blob = new Blob([content], {
			type: "text/javascript",
		});
		const blob_url = URL.createObjectURL(module_blob);
		blob_urls.set(module_name, blob_url);
	});

	// Clear script tag contents and add blob URL attributes (only for non-disabled modules)
	blob_scripts.forEach((script) => {
		const module_name = script.getAttribute("name");
		const is_disabled = script.hasAttribute("disabled");

		if (is_disabled) {
			return;
		}

		const blob_url = blob_urls.get(module_name);

		if (blob_url) {
			script.textContent = "";
			script.setAttribute("blob", blob_url);
		}
	});

	// Create import map with all blob URLs
	const imports = {};
	blob_urls.forEach((url, name) => {
		imports[name] = url;
	});

	const import_map = document.createElement("script");
	import_map.type = "importmap";
	import_map.textContent = JSON.stringify(
		{
			imports,
		},
		null,
		2,
	);
	document.head.appendChild(import_map);

	// Run the main module if it exists and is not disabled
	if (__blob_modules__.has("main")) {
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

	// Expose blob module metadata map
	window.__blob_module_map__ = new Map();

	// Populate the metadata map (including disabled modules for reference)
	blob_scripts.forEach((script) => {
		const module_name = script.getAttribute("name");
		const remote_url = script.getAttribute("remote") || null;
		const is_disabled = script.hasAttribute("disabled");
		const blob_url = blob_urls.get(module_name) || null;
		const content = __blob_modules__.get(module_name) || "";
		const src_bytes = new Blob([content]).size;

		const metadata = {
			module_name,
			src_bytes,
			remote_url,
			blob_url,
			is_disabled,
		};

		window.__blob_module_map__.set(module_name, metadata);
	});

	//
	// Editable HTML Export
	//
	//

	window.getDocumentOuterHtml = function () {
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
			const module_content = __blob_modules__.get(module_name);

			// Check for nodownload modules
			if (module_content && !no_download) {
				script.textContent = module_content;
			} else if (no_download) {
				// Keep the remote URL but clear any local content
				script.textContent = "";
			}
		});

		// Process remote styles
		const original_style_tags = doc_clone.querySelectorAll("style[remote]");
		original_style_tags.forEach((style) => {
			const remote_url = style.getAttribute("remote");
			const no_download = style.hasAttribute("nodownload");

			if (no_download) {
				// Keep empty with just the remote attribute
				style.textContent = "";
			} else {
				// Get the style content and inline it
				const style_content = blob_styles.get(remote_url);
				if (style_content) {
					style.textContent = style_content;
				}
			}
		});

		// Remove the blob link elements we created
		const blob_links = doc_clone.querySelectorAll('link[href^="blob:"]');
		blob_links.forEach((link) => link.remove());

		// Get the full HTML
		return `<!DOCTYPE html>\n${doc_clone.documentElement.outerHTML}`;
	};

	window.saveHtmlFile = async function () {
		// Try to use Om sys function
		if (location.origin === "file://" && globalThis.__sys) {
			try {
				await __sys.invoke("file.write", location.pathname, getDocumentOuterHtml());
				return;
			} catch (error) {
				console.error("Failed to save HTML file using Om sys:", error);
			}
		}

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
				const html_content = getDocumentOuterHtml();
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

		const html_content = getDocumentOuterHtml();

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
	};
}

// Attach event listener
window.addEventListener("load", initializeBlobModuleLoader);
