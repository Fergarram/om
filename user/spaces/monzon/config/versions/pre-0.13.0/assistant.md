This is how a typical project is structured:

```plaintext
flappy-clone/
	assets/
		block.png
		player.png
	code/
		game.js
	index.html
	index.js
	stormborn.js
```

And an example of how some of those files look:

```javascript ./flappy-clone/index.js
import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Jump",
	description: "Flappy bird clone",
	image_smoothing_enabled: false, // Set to false for pixel art
	shape_smoothing_enabled: true, // Set to false for non-antialiased shapes
	container: document.getElementById("game"),
	debug: {
		// default_color: "red",
		// collision_masks: true,
		// fps: true,
	},
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);
```

```javascript ./flappy-clone/code/game.js
// GLOBALS
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 240;
const SCALE = 1;

// SPRITES
create_sprite({
	id: "spr_player",
	filepath: "assets/player.png",
	frames: 6,
	frame_width: 18,
	frame_height: 24,
	origin_x: 9,
	origin_y: 12,
});

create_sprite({
	id: "spr_block",
	filepath: "assets/block.png",
	frames: 1,
	frame_width: 24,
	frame_height: 24,
	origin_x: 0,
	origin_y: 0,
});

// OBJECTS
create_object({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: { type: "rect", geom: [-9, -12, 18, 24] },
	create(self) {
		self.gravity = 0.5;
		self.jump_force = -7;
		self.vertical_speed = 0;
		self.can_flap = true;
		self.rotation = 0;
		instance_ref("player", self); // saving ref
		self.controller = instance_ref("controller"); // using ref
	},
	step(self, dt) {
		if (!self.controller.game_over) {
			// Apply gravity
			self.vertical_speed += self.gravity;

			// Jump when space is pressed
			if (gm.keys_pressed.Space && self.can_flap) {
				self.vertical_speed = self.jump_force;
				self.can_flap = false;
			}

			// Reset can_flap when space is released
			if (!gm.keys_pressed.Space) {
				self.can_flap = true;
			}

			// Update position
			self.y += self.vertical_speed;

			// Rotate player based on vertical speed
			self.rotation = Math.min(Math.max(self.vertical_speed * 3, -30), 90);
			self.image_angle = self.rotation;

			// Animate wings
			self.image_speed = 0.2;

			// Check collisions with blocks
			const blocks = objects_colliding(self, "obj_block");
			if (blocks.length > 0) {
				self.controller.game_over = true;
			}

			// Check if player hits ground or ceiling
			if (self.y > 220 || self.y < 20) {
				self.controller.game_over = true;
			}
		} else {
			// Bird falls when game over
			self.vertical_speed += self.gravity;
			self.y += self.vertical_speed;
			self.image_speed = 0;
		}
	},
});

create_object({
	id: "obj_block",
	sprite: "spr_block",
	collision_mask: { type: "rect", geom: [0, 0, 24, 24] },
	create(self) {
		self.speed = 3;
		self.controller = instance_ref("controller");
		self.score_added = false;
	},
	step(self, dt) {
		if (!self.controller.game_over) {
			// Move block left
			self.x -= self.speed;

			// Remove block when it's off screen
			if (self.x < -60) {
				instance_destroy(self);
			}

			// Add score when block passes player
			const player = instance_ref("player");
			if (player && player.x > self.x + 12 && !self.score_added) {
				self.controller.score++;
				self.score_added = true;
			}
		}
	},
});

create_object({
	id: "obj_controller",
	create(self) {
		self.spawn_timer = 0;
		self.spawn_interval = 90; // Adjust for difficulty
		self.score = 0;
		self.game_over = false;
		instance_ref("controller", self);
	},
	step(self, dt) {
		const room = room_current();

		if (!self.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				// Create gap position (smaller range since we're using smaller blocks)
				const gap_position = Math.random() * 140 + 60; // Between 60 and 200
				const gap_size = 4; // Number of blocks to leave empty for gap

				// Create column of blocks
				for (let i = 0; i < 10; i++) {
					// Top column
					if (i < gap_position / 24 - gap_size) {
						// Use block height (24) to calculate positions
						const block = instance_create("obj_block", config.viewport_width / config.scale, i * 24);
						block.group_id = self.spawn_timer; // Track blocks in same column
					}
				}

				for (let i = Math.ceil(gap_position / 24) + 1; i < 10; i++) {
					// Bottom column
					const block = instance_create("obj_block", config.viewport_width / config.scale, i * 24);
					block.group_id = self.spawn_timer; // Track blocks in same column
				}

				self.spawn_timer = 0;
			}
		} else if (gm.keys_pressed.Space) {
			room_restart();
		}
	},
	draw(self) {
		// Draw score
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "24px Arial";
		gm.ctx.fillText(`Score: ${self.score}`, 10, 30);

		// Draw game over message
		if (self.game_over) {
			gm.ctx.fillStyle = "white";
			gm.ctx.font = "32px Arial";
			gm.ctx.fillText("Game Over!", 100, 100);
			gm.ctx.font = "16px Arial";
			gm.ctx.fillText("Press Space to restart", 90, 130);
		}
	},
});

// Create room
create_room({
	id: "rm_game",
	width: ROOM_WIDTH,
	height: ROOM_HEIGHT,
	screen: {
		width: ROOM_WIDTH,
		height: ROOM_HEIGHT,
		final_width: ROOM_WIDTH * SCALE,
		final_height: ROOM_HEIGHT * SCALE,
	},
	cameras: [
		{
			id: "main",
			x: 0,
			y: 0,
			screen_x: 0,
			screen_y: 0,
			width: ROOM_WIDTH,
			height: ROOM_HEIGHT,
			active: true,
		},
	],
	fps: 60,
	bg_color: "#4EC0CA", // Sky blue background
	setup() {
		const room = room_current();

		return [
			{
				id: "obj_controller",
				z: 1000,
			},
			{
				id: "obj_player",
				x: 80,
				y: 180,
			},
		];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game({
        on_start() {
            room_goto("rm_game");
        }
    });
});
```

NOTES:

- When asked to make a game don't over explain. The project is already setup and the game developer will probably only want the game.js file or other game related code. So don't bother making html files and other setup files.

- Avoid using "this" when it's actually "self" from the custom instnace menthods.

- Always add a camera to the room setup.
