export default () => {
	create_sprite({
		id: "spr_ball",
		filepath: "assets/sprites/ball.png",
		frame_width: 103,
		frame_height: 107,
		origin_x: 51.5,
		origin_y: 53.5,
		frames: 1,
	});

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
			const speed = self.vars<number>("speed");
			const direction = self.vars<number>("direction");
			const direction_in_radians = direction * (Math.PI / 180);

			self.x = self.x + speed * Math.cos(direction_in_radians);
			self.y = self.y + speed * Math.sin(direction_in_radians);
		},
	});
};
