export default () => {
	// LOCALS
	let room_speed = 60;
	let screen_width = window.innerWidth;
	let screen_height = window.innerHeight;

	// SPRITES
	create_sprite({
		id: "spr_cannon",
		filepath: "sprites/cannon.png",
		frame_width: 429,
		frame_height: 230,
		frames: 1,
		origin_x: 214.5,
		origin_y: 115,
	});

	create_sprite({
		id: "spr_ball",
		filepath: "sprites/ball.png",
		frame_width: 103,
		frame_height: 107,
		origin_x: 51.5,
		origin_y: 53.5,
		frames: 1,
	});

	// SOUNDS
	create_sound({
		id: "click",
		filepath: "sounds/click.mp3",
	});

	// OBJECTS
	create_object({
		id: "obj_ball",
		sprite: "spr_ball",
		collision_mask: {
			type: "circle",
			geom: [8],
		},
		variables: {
			speed: 100,
			direction: 0,
		},
		create(self) {
			const cannon = instance_ref("cannon");
			if (cannon) {
				const dir = point_direction(cannon.x, cannon.y, gm.mouse_x, gm.mouse_y);
				self.vars("direction", dir);
			}
		},
		step(self, dt) {
			const speed = self.vars("speed");
			const direction = self.vars("direction");
			const direction_in_radians = direction * (Math.PI / 180);

			self.x = self.x + speed * Math.cos(direction_in_radians);
			self.y = self.y + speed * Math.sin(direction_in_radians);
		},
	});

	create_object({
		id: "obj_cannon",
		sprite: "spr_cannon",
		variables: {
			can_shoot: true,
		},
		create(self) {
			instance_ref("cannon", self);
		},
		step(self, dt) {
			const dir = point_direction(self.x, self.y, gm.mouse_x, gm.mouse_y);
			self.image_angle = dir;
		},
		global_mouse_pressed(self) {
			if (!self.vars("can_shoot")) return;
			const ctrl = instance_ref("controller");
			if (!ctrl) return;

			ctrl.vars("balls", (b) => b + 1);
			instance_create("obj_ball", self.x, self.y, 0, {
				randomshit: "asfasdf",
			});
			play_sound("click");
		},
	});

	create_object({
		id: "obj_camera",
		variables: {
			smooth_factor: 0.1, // Controls how smoothly the camera follows
			scale_smooth_factor: 0.1, // Controls how smoothly the camera scales
			min_scale: 0.2, // Minimum zoom level
			max_scale: 0.3, // Maximum zoom level
			scale_factor: 0.001, // How much distance affects zoom
			current_scale: 0.3, // Track the current scale for smooth interpolation
		},
		create(self) {
			instance_ref("camera", self);
			camera_set_scale("main", self.vars("current_scale"));
		},
		step(self, dt) {
			const target = instance_ref("cannon");
			if (target) {
				const tx = target.x;
				const ty = target.y;
				const sf = self.vars("smooth_factor");
				const scale_sf = self.vars("scale_smooth_factor");

				// Get middle point between mouse and target
				const mx = (gm.mouse_x + tx) / 2;
				const my = (gm.mouse_y + ty) / 2;

				// Calculate distance between mouse and target
				const distance = point_distance(tx, ty, gm.mouse_x, gm.mouse_y);

				// Calculate desired scale based on distance
				const min_scale = self.vars("min_scale");
				const max_scale = self.vars("max_scale");
				const scale_factor = self.vars("scale_factor");
				const current_scale = self.vars("current_scale");

				// Inverse relationship: closer = more zoomed in
				const desired_scale = Math.max(min_scale, Math.min(max_scale, 1 / (distance * scale_factor + 0.5)));

				// Smoothly interpolate the scale
				const new_scale = current_scale + (desired_scale - current_scale) * scale_sf;
				self.vars("current_scale", new_scale);

				// Update camera position and scale
				self.x += (mx - self.x) * sf;
				self.y += (my - self.y) * sf;
				camera_set_scale("main", new_scale);
			}
		},
	});

	create_object({
		id: "obj_ctrl",
		persists: true,
		variables: {
			balls: 0,
			some_really_large_variable: {},
		},
		create(self) {
			instance_ref("controller", self);
		},
		draw(self) {
			// Using draw_text function instead of direct context manipulation
			draw_text(`Balls: ${self.vars("balls")}`, -100, -100, {
				font: "100px Arial",
				fill_color: "white",
				align: "left",
				baseline: "top",
			});
		},
	});

	// ROOMS
	create_room({
		id: "rm_game",
		width: screen_width,
		height: screen_height,
		screen: {
			width: screen_width,
			height: screen_height,
			final_width: screen_width,
			final_height: screen_height,
		},
		cameras: [
			{
				id: "main",
				x: 0,
				y: 0,
				screen_x: 0,
				screen_y: 0,
				screen_width: screen_width,
				screen_height: screen_height,
				active: true,
				rotation: 0,
				scale: 0.25,
				follow: {
					target: "obj_camera", // Always follow the camera object
				},
			},
		],
		room_speed: room_speed,
		bg_color: "black",
		setup() {
			resize_game_screen();

			return [
				{
					id: "obj_ctrl",
					x: 0,
					y: 0,
				},
				{
					id: "obj_camera",
					x: 0,
					y: 0,
				},
				{
					id: "obj_cannon",
					x: screen_width / 2,
					y: screen_height / 2,
					z: 100,
				},
			];
		},
	});

	// RESPONSIVE GAME SCREEN
	window.addEventListener("resize", resize_game_screen);

	function resize_game_screen() {
		screen_width = window.innerWidth;
		screen_height = window.innerHeight;

		// Update room dimensions
		if (gm.current_room) {
			const room = gm.rooms[gm.current_room];
			room.width = screen_width;
			room.height = screen_height;
			room.screen.width = screen_width;
			room.screen.height = screen_height;
			room.screen.final_width = screen_width;
			room.screen.final_height = screen_height;

			// Update canvas dimensions
			if (gm.canvas) {
				gm.canvas.width = screen_width * window.devicePixelRatio;
				gm.canvas.height = screen_height * window.devicePixelRatio;
				gm.canvas.style.width = `${screen_width}px`;
				gm.canvas.style.height = `${screen_height}px`;
			}

			// Update camera dimensions
			if (room.cameras && room.cameras.length > 0) {
				room.cameras[0].screen_width = screen_width;
				room.cameras[0].screen_height = screen_height;
			}
		}
	}

	// START GAME
	run_game({
		on_start() {
			room_goto("rm_game");
		},
	});
};
