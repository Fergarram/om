import * as SB from "@/lib/stormborn.ts";

import { create_rooms } from "./game/room";
import create_obj_ctrl from "./game/ctrl";
import create_obj_camera from "./game/camera";
import create_obj_cannon from "./game/cannon";
import create_obj_ball from "./game/ball";
import create_sounds from "./game/sounds";

import { DEBUG } from "./lib/consts";
import { dom, tags } from "./lib/swan";

// Expose all Stormborn functions to the global scope
Object.assign(window, SB);

const { main, div, a } = tags;

const app = dom(
	main(
		// Game Canvas
		div({ id: "game" }),
		// UI Container
		div({ id: "ui" }),
	),
);

document.body.appendChild(app);

await finish();

// Create game runtime object
const game_runtime = create_game({
	title: "Blank Game",
	description: "A blank game template.",
	image_smoothing_enabled: false,
	shape_smoothing_enabled: true,
	container: app.querySelector("#game"),
	culling_enabled: false,
	debug: DEBUG
		? {
				default_color: "red",
				collision_masks: true,
				fps: true,
			}
		: undefined,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game_runtime);

// Create objects
create_obj_ctrl();
create_obj_camera();
create_obj_cannon();
create_obj_ball();

// Create sounds
create_sounds();

// Create rooms
create_rooms();

// Start the game
run_game({
	on_start() {
		room_goto("rm_game");
	},
});

await finish();
