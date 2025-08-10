declare global {
	const SBVERSION: string;

	// JSON types
	type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
	interface JSONObject {
		[key: string]: JSONValue;
	}
	interface JSONArray extends Array<JSONValue> {}

	// SB Config
	type SB_Config = {
		title: string;
		description: string;
		image_smoothing_enabled: boolean;
		container: HTMLElement | null;
		debug?: {
			fps?: boolean;
			collision_masks?: boolean;
			default_color?: string;
		};
		culling_enabled?: boolean;
		shape_smoothing_enabled?: boolean;
	};

	// SB Game
	type SB_Game = {
		config: SB_Config | null;
		canvas: HTMLCanvasElement | null;
		ctx: CanvasRenderingContext2D;
		keydown: { [key: string]: boolean };
		mouse_x: number;
		mouse_y: number;
		touch_points: Record<number, { x: number; y: number }>;
		mousedown: { [button: number]: boolean };
		current_room: string | null;
		running: boolean;
		audio_context: AudioContext;
		audio_master_gain: GainNode;
		objects: Record<string, SB_Object>;
		sprites: Record<string, SB_Sprite>;
		rooms: Record<string, SB_Room>;
		tile_layers: Record<string, SB_TileLayer>;
		images: Record<string, HTMLImageElement>;
		sounds: Record<string, SB_Sound>;
		instance_variables: Record<string, Record<string, JSONValue>>;
	};

	// SB Sprite
	type SB_Sprite = {
		id: string;
		frames: number;
		frame_width: number;
		frame_height: number;
		origin_x: number;
		origin_y: number;
		filepath: string;
	};

	// SB Sound
	type SB_Sound = {
		id: string;
		filepath: string;
		volume: number;
		buffer: AudioBuffer | null;
		source: AudioBufferSourceNode | null;
	};

	// SB Object
	type SB_Object = {
		id: string;
		collision_mask: SB_Mask;
		tile_layer: string | null;
		sprite: string | null;
		persists?: boolean;
		variables?: JSONObject;
		setup?: (obj_id: string) => void;
		create?: (self: SB_Instance, props?: JSONObject) => void;
		destroy?: (self: SB_Instance) => void;
		step?: (self: SB_Instance, dt: number) => void;
		draw?: (self: SB_Instance) => void;
		key_pressed?: (self: SB_Instance, key: string, e: KeyboardEvent) => void;
		key_released?: (self: SB_Instance, key: string, e: KeyboardEvent) => void;
		mouse_over?: (self: SB_Instance) => void;
		mouse_out?: (self: SB_Instance) => void;
		mouse_down?: (self: SB_Instance) => void;
		mouse_up?: (self: SB_Instance) => void;
		mouse_pressed?: (self: SB_Instance, button: number, e: MouseEvent) => void;
		mouse_released?: (self: SB_Instance, button: number, e: MouseEvent) => void;
		mouse_wheel?: (self: SB_Instance, delta: number, e: WheelEvent) => void;
		touch_start?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		touch_move?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		touch_end?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		global_mouse_pressed?: (self: SB_Instance, button: number, e: MouseEvent) => void;
		global_mouse_released?: (self: SB_Instance, button: number, e: MouseEvent) => void;
		global_mouse_wheel?: (self: SB_Instance, delta: number, e: WheelEvent) => void;
		global_mouse_move?: (self: SB_Instance, mouse_x: number, mouse_y: number, e: MouseEvent) => void;
		global_touch_start?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		global_touch_move?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		global_touch_end?: (self: SB_Instance, touch_id: number, x: number, y: number, e: TouchEvent) => void;
		animation_end?: (self: SB_Instance) => void;
		room_start?: (self: SB_Instance) => void;
		room_end?: (self: SB_Instance) => void;
	};

	// SB Instance
	type SB_Instance = {
		id: string;
		object_id: string;
		x: number;
		y: number;
		z: number;
		collision_mask: SB_Mask;
		tile_layer: string | null;
		sprite: string | null;
		is_culled?: boolean;
		direction: number;
		image_index: number;
		image_speed: number;
		image_scale_x: number;
		image_scale_y: number;
		image_angle: number;
		image_width: number;
		image_height: number;
		image_alpha: number;
		image_clock: number;
		vars<T extends JSONValue>(key: string): T;
		vars<T extends JSONValue>(key: string, value: T): void;
		vars<T extends JSONValue>(key: string, updater: (current: T) => T): void;
	};

	// SB Camera
	type SB_Camera = {
		id: string;
		x: number;
		y: number;
		screen_width: number;
		screen_height: number;
		screen_x: number;
		screen_y: number;
		rotation: number;
		scale: number;
		follow?: {
			target: string;
			offset_x?: number;
			offset_y?: number;
		};
		active: boolean;
	};

	// SB Room
	type SB_Room = {
		id: string;
		width: number;
		height: number;
		screen: {
			width: number;
			height: number;
			final_width: number;
			final_height: number;
		};
		room_speed: number;
		bg_color: string;
		setup: () => {
			id: string;
			x?: number;
			y?: number;
			z?: number;
			mask?: SB_Mask;
			props?: {};
		}[];
		instances: Record<string, SB_Instance>;
		instance_refs: Record<string, string>;
		object_index: Record<string, string[]>;
		cameras: SB_Camera[];
	};

	// SB TileLayer
	type SB_TileLayer = {
		id: string;
		cols: number;
		rows: number;
		grid_size: number;
		tiles: {
			sprite: string;
			frame_index: number;
			x: number;
			y: number;
		}[];
		image?: ImageBitmap;
	};

	// SB Mask
	type SB_Mask = {
		type: "circle" | "rect" | "polygon";
		geom: number[];
	};

	// Drawing types
	type SB_DrawOptions = {
		color?: string;
		alpha?: number;
		fill?: string | CanvasGradient | CanvasPattern;
		fill_transform?: DOMMatrix;
		stroke?: {
			color?: string;
			alpha?: number;
			width?: number;
			dash?: number[];
			cap?: "butt" | "round" | "square";
			join?: "bevel" | "round" | "miter";
		};
	};

	// Path command types
	type SB_PathCommand =
		| { type: "move"; x: number; y: number }
		| { type: "line"; x: number; y: number }
		| { type: "bezier"; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
		| { type: "quadratic"; cpx: number; cpy: number; x: number; y: number }
		| { type: "arc"; x: number; y: number; radius: number; start_angle: number; end_angle: number; anticlockwise?: boolean }
		| { type: "rect"; x: number; y: number; width: number; height: number }
		| { type: "close" };

	// Global game variable
	let gm: SB_Game;

	// Game creation and management functions
	function create_game(config: SB_Config): any;
	function run_game(options: {
		preprocess_sprite?: (sprite: SB_Sprite, img: HTMLImageElement) => Promise<HTMLImageElement>;
		on_start: (gm: SB_Game) => void;
	}): Promise<void>;

	// Asset creation functions
	function create_object(obj: Partial<SB_Object>): void;
	function create_sprite(sprite: Partial<SB_Sprite>): void;
	function create_room(room: Partial<SB_Room>): void;
	function create_layer(layer: Partial<SB_TileLayer>): void;
	function create_sound(sound: Partial<SB_Sound>): void;

	// Room management functions
	function room_goto(room_id: string): void;
	function room_restart(): Promise<void>;
	function room_current(): SB_Room | null;

	// Audio functions
	function play_sound(sound_id: string, opts?: { volume?: number; loop?: boolean }): void;
	function stop_sound(sound_id: string): void;
	function sound_volume(sound_id: string, volume: number): void;
	function master_volume(volume: number): void;

	// Instance management functions
	function instance_ref(key: string, instance?: SB_Instance): SB_Instance | undefined;
	function instance_unref(key: string): void;
	function instance_create(obj_id: string, x?: number, y?: number, z?: number, props?: JSONObject): SB_Instance;
	function instance_count(obj_id: string): number;
	function instance_destroy(instance: SB_Instance): boolean;
	function instance_exists(instance: SB_Instance): boolean;

	// Collision and positioning functions
	function instances_colliding(a: SB_Instance, b: SB_Instance): boolean;
	function objects_colliding(instance: SB_Instance, obj_id: string): SB_Instance[];
	function point_in_instance(instance: SB_Instance, x: number, y: number): boolean;
	function animation_ended(instance: SB_Instance): boolean;

	// Camera functions
	function screen_to_world_coords(screen_x: number, screen_y: number, camera: SB_Camera): { x: number; y: number };
	function camera_set_rotation(camera_id: string, rotation: number): void;
	function camera_set_scale(camera_id: string, scale: number): void;
	function camera_rotate(camera_id: string, amount: number): void;
	function camera_zoom(camera_id: string, factor: number): void;

	// Drawing functions
	function create_pattern(
		sprite_id: string,
		repeat_mode?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat",
		frame_index?: number
	): CanvasPattern | null;
	function draw_sprite(instance: SB_Instance, camera: SB_Camera): void;
	function draw_line(x1: number, y1: number, x2: number, y2: number, options?: SB_DrawOptions): void;
	function draw_rect(
		x: number,
		y: number,
		width: number,
		height: number,
		options?: SB_DrawOptions & {
			radius?: number | [number, number, number, number];
		}
	): void;
	function draw_ellipse(
		x: number,
		y: number,
		radius_x: number,
		radius_y?: number | null,
		options?: SB_DrawOptions
	): void;
	function draw_polygon(x: number, y: number, points: number[], options?: SB_DrawOptions): void;
	function draw_path(commands: SB_PathCommand[], options?: SB_DrawOptions): void;
	function draw_text(
		text: string,
		x: number,
		y: number,
		options?: SB_DrawOptions & {
			font?: string;
			align?: "left" | "center" | "right";
			baseline?: CanvasTextBaseline;
			max_width?: number;
		}
	): void;

	// Math utility functions
	function point_distance(x1: number, y1: number, x2: number, y2: number): number;
	function point_direction(x1: number, y1: number, x2: number, y2: number): number;
	function point_in_polygon(x: number, y: number, vertices: number[]): boolean;
	function rect_circle_intersect(
		rect_x: number,
		rect_y: number,
		rect_width: number,
		rect_height: number,
		circle_x: number,
		circle_y: number,
		circle_radius: number
	): boolean;
	function circle_line_segment_intersect(
		circle_x: number,
		circle_y: number,
		circle_radius: number,
		line_x1: number,
		line_y1: number,
		line_x2: number,
		line_y2: number
	): boolean;
	function polygon_circle_intersect(
		vertices: number[],
		circle_x: number,
		circle_y: number,
		circle_radius: number
	): boolean;
	function line_segments_intersect(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		x4: number,
		y4: number
	): boolean;
	function polygons_intersect(vertices1: number[], vertices2: number[]): boolean;

	// General utility functions
	function unique_id(): string;
	function finish(time?: number): Promise<void>;
}

export {};
