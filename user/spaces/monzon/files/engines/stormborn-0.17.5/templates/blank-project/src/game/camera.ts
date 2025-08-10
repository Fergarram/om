export default () =>
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
			// Initialize the camera scale
			camera_set_scale("main", self.vars<number>("current_scale"));
		},
		step(self, dt) {
			const target = instance_ref("cannon");
			if (target) {
				const tx = target.x;
				const ty = target.y;
				const sf = self.vars<number>("smooth_factor");
				const scale_sf = self.vars<number>("scale_smooth_factor");

				// Get middle point between mouse and target
				const mx = (gm.mouse_x + tx) / 2;
				const my = (gm.mouse_y + ty) / 2;

				// Calculate distance between mouse and target
				const distance = point_distance(tx, ty, gm.mouse_x, gm.mouse_y);

				// Calculate desired scale based on distance
				const min_scale = self.vars<number>("min_scale");
				const max_scale = self.vars<number>("max_scale");
				const scale_factor = self.vars<number>("scale_factor");
				const current_scale = self.vars<number>("current_scale");

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
