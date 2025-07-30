import * as SB from "./stormborn.js";
import { dom, tags } from "./swan.js";
import run from "./game.js";

Object.assign(window, SB);

const { main, div } = tags;

const app = dom(
	main(
		div({ id: "game" }), // Game Canvas
		div({ id: "ui" }), // UI Container
	),
);

document.body.appendChild(app);

await finish();

// Create game runtime object
const game_runtime = create_game({
	title: "Blank Prototype",
	description: "A blank prototype template.",
	image_smoothing_enabled: false,
	shape_smoothing_enabled: true,
	container: app.querySelector("#game"),
	culling_enabled: false,
	debug: {
		default_color: "red",
		collision_masks: true,
		fps: true,
	},
});

// Expose all game runtime functions to the global scope
Object.assign(window, game_runtime);

// Run game
run();
