import * as SB from "./lib/stormborn.ts";

type Runtime = ReturnType<typeof SB.create_game>;
type Exports = typeof SB;
type AllFunctions = Runtime & Exports;

declare global {
	const SBVERSION: string;

	// JSON types
	type JSONValue = SB.JSONValue;
	type JSONObject = SB.JSONObject;
	type JSONArray = SB.JSONArray;

	// SB types
	type SB_Config = SB.SB_Config;
	type SB_Game = SB.SB_Game;
	type SB_Sprite = SB.SB_Sprite;
	type SB_Sound = SB.SB_Sound;
	type SB_Method = SB.SB_Method;
	type SB_Object = SB.SB_Object;
	type SB_Instance = SB.SB_Instance;
	type SB_Camera = SB.SB_Camera;
	type SB_Room = SB.SB_Room;
	type SB_TileLayer = SB.SB_TileLayer;
	type SB_Mask = SB.SB_Mask;

	// Drawing types
	type SB_DrawOptions = SB.SB_DrawOptions;
	type SB_FillOptions = SB.SB_FillOptions;
	type SB_PathCommand = SB.SB_PathCommand;

	// Global variables
	let gm: SB_Game;

	// Declare all functions directly in global scope
	declare const {
		create_game,
		create_object,
		create_sprite,
		create_room,
		create_layer,
		create_sound,
		run_game,
		room_goto,
		room_restart,
		room_current,
		play_sound,
		stop_sound,
		sound_volume,
		master_volume,
		instance_ref,
		instance_unref,
		instances_colliding,
		instance_create,
		instance_count,
		instance_destroy,
		instance_exists,
		objects_colliding,
		point_in_instance,
		animation_ended,
		screen_to_world_coords,
		camera_set_rotation,
		camera_set_scale,
		camera_rotate,
		camera_zoom,
		draw_sprite,
		draw_line,
		draw_rect,
		draw_ellipse,
		draw_polygon,
		draw_path,
		draw_text,
		point_distance,
		point_direction,
		unique_id,
		finish,
		point_in_polygon,
		rect_circle_intersect,
		circle_line_segment_intersect,
		polygon_circle_intersect,
		line_segments_intersect,
		polygons_intersect,
	}: AllFunctions;
}

export {};
