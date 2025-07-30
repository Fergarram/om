import { ROOM_SPEED, SCALE } from "@/lib/consts";

// ROOMS
export function create_rooms() {
	// Window Resizing
	let screen_width = window.innerWidth;
	let screen_height = window.innerHeight;

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
			room.screen.final_width = screen_width * SCALE;
			room.screen.final_height = screen_height * SCALE;

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

	window.addEventListener("resize", resize_game_screen);

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
		room_speed: ROOM_SPEED,
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
}
