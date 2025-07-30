import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "New Game",
	description: "A new game created with Stormborn",
	image_smoothing_enabled: false, // Set to false for pixel art
	shape_smoothing_enabled: true, // Set to false for non-antialiased shapes (transparency not supported)
	container: document.getElementById("game"),
	debug: false, // Set to true to see collision masks and other debug info
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);
