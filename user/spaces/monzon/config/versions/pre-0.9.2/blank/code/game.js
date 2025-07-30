// GLOBALS
const ROOM_SPEED = 60;
const ROOM_WIDTH = 300;
const ROOM_HEIGHT = 300;
const SCALE = 2;

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
			screen_width: ROOM_WIDTH,
			screen_height: ROOM_HEIGHT,
			active: true,
		},
	],
	room_speed: ROOM_SPEED,
	bg_color: "#87CEEB",
	setup() {
		return [];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
