const { ipcRenderer } = require("electron");

// Setup game state monitoring
const UPDATE_INTERVAL = (1000 / 60) * 5; // 5 frames worth of time at 60fps (~83ms)

function process_value(value, seen = new WeakMap(), depth = 0) {
	// Add depth limit to prevent deep recursion
	const MAX_DEPTH = 10;
	if (depth > MAX_DEPTH) {
		return "[Max Depth Exceeded]";
	}

	// Handle null and undefined
	if (value === null || value === undefined) {
		return null;
	}

	const type = typeof value;

	// Handle primitive types
	if (type === "number" || type === "string" || type === "boolean") {
		return value;
	}

	// Handle objects
	if (type === "object") {
		// Check for circular references
		if (seen.has(value)) {
			return "[Circular Reference]";
		}

		// Add current object to seen map
		seen.set(value, true);

		// Handle arrays
		if (Array.isArray(value)) {
			const processed_array = value.map((item) => process_value(item, seen, depth + 1));
			seen.delete(value);
			return processed_array;
		}

		// Handle regular objects
		try {
			const processed_obj = {};
			for (const [key, val] of Object.entries(value)) {
				// Skip functions and symbols
				if (typeof val !== "function" && typeof val !== "symbol") {
					processed_obj[key] = process_value(val, seen, depth + 1);
				}
			}
			seen.delete(value);
			return processed_obj;
		} catch (error) {
			console.warn("Error processing object:", error);
			return "[Object Processing Error]";
		}
	}

	// Return typeof for any other types (functions, symbols, etc.)
	return type;
}

function get_game_state() {
	if (!window.gm) return null;

	return {
		config: {
			debug: window.gm.config.debug,
			description: window.gm.config.description,
			image_smoothing_enabled: window.gm.config.image_smoothing_enabled,
			shape_smoothing_enabled: window.gm.config.shape_smoothing_enabled,
			culling_enabled: window.gm.config.culling_enabled,
			title: window.gm.config.title,
		},
		current_room: window.gm.current_room,
		running: window.gm.running,
		rooms: Object.fromEntries(
			Object.entries(window.gm.rooms).map(([id, room]) => [
				id,
				{
					id: room.id,
					instance_refs: room.instance_refs,
					instances: Object.fromEntries(
						Object.entries(room.instances).map(([inst_id, instance]) => {
							const processed_instance = {};

							for (const [key, value] of Object.entries(instance)) {
								processed_instance[key] = process_value(value);
							}

							return [inst_id, processed_instance];
						}),
					),
					object_index: room.object_index,
				},
			]),
		),
	};
}

function monitor_game_state() {
	const game_state = get_game_state();
	if (game_state) {
		ipcRenderer.send("monzon.state_update", game_state);
	}
}

// Start monitoring with setInterval
setInterval(monitor_game_state, UPDATE_INTERVAL);

// Optional: Log that monitoring has started
console.log("Game state monitoring initialized");
