export default () => {
	create_sprite({
		id: "spr_cannon",
		filepath: "assets/sprites/cannon.png",
		frame_width: 429,
		frame_height: 230,
		frames: 1,
		origin_x: 214.5,
		origin_y: 115,
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
		global_mouse_pressed(self: SB_Instance) {
			if (!self.vars("can_shoot")) return;
			shoot(self);
		},
	});
};

function shoot(self: SB_Instance) {
	const ctrl = instance_ref("controller");
	if (!ctrl) return;

	ctrl.vars("balls", (b: number) => b + 1);
	instance_create("obj_ball", self.x, self.y, 0, {
		randomshit: "asfasdf",
	});
	play_sound("click");

	// ctrl.vars("some_really_large_variable", (current_data: any) => {
	// 	const new_data = create_large_test_data();

	// 	// If no current data exists, return just the new data
	// 	if (!current_data) {
	// 		console.log("First click - entities:", new_data.entities.length);
	// 		return new_data;
	// 	}

	// 	const result = {
	// 		meta_info: {
	// 			...new_data.meta_info,
	// 			debug_flags: [...(current_data.meta_info?.debug_flags || []), ...new_data.meta_info.debug_flags],
	// 		},
	// 		entities: [...(current_data.entities || []), ...new_data.entities],
	// 	};

	// 	console.log(
	// 		"Click data - Total entities:",
	// 		result.entities.length,
	// 		"Debug flags:",
	// 		result.meta_info.debug_flags.length,
	// 	);

	// 	console.log("Approximate size in MB:", JSON.stringify(result).length / (1024 * 1024));

	// 	return result;
	// });
}

function create_large_test_data() {
	const test_data = {
		meta_info: {
			version: "1.0.0",
			timestamp: Date.now(),
			debug_flags: Array(100).fill(true),
		},
		entities: Array(100)
			.fill(null)
			.map((_, index) => ({
				entity_id: `ent_${index}`,
				position: {
					x: Math.random() * 1000,
					y: Math.random() * 1000,
					z: Math.random() * 1000,
				},
				components: {
					physics: {
						velocity: Array(10)
							.fill(null)
							.map(() => ({
								dx: Math.random(),
								dy: Math.random(),
								dz: Math.random(),
							})),
						collision_data: Array(5).fill({
							bounds: { min: [0, 0, 0], max: [1, 1, 1] },
							material_properties: {
								density: Math.random(),
								restitution: Math.random(),
								friction: Math.random(),
							},
						}),
					},
					render: {
						meshes: Array(5).fill({
							vertices: Array(100).fill([0, 0, 0]),
							normals: Array(100).fill([0, 1, 0]),
							uvs: Array(100).fill([0, 0]),
						}),
						materials: Array(5).fill({
							diffuse: [Math.random(), Math.random(), Math.random()],
							specular: [Math.random(), Math.random(), Math.random()],
							properties: Array(10).fill({
								name: "prop",
								value: Math.random(),
							}),
						}),
					},
				},
				state_history: Array(10).fill({
					timestamp: Date.now(),
					state: "active",
					metrics: Array(10).fill(Math.random()),
				}),
			})),
	};

	return test_data;
}
