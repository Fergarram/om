export default () =>
	create_object({
		id: "obj_ctrl",
		persists: true,
		variables: {
			balls: 0,
			some_really_large_variable: {},
		},
		create(self: SB_Instance) {
			instance_ref("controller", self);
		},
		draw(self: SB_Instance) {
			// Set text properties
			gm.ctx.font = "200px Arial";
			gm.ctx.fillStyle = "white";
			gm.ctx.textAlign = "left";

			const balls = self.vars<number>("balls");

			// Draw the ball count in the top-left corner
			gm.ctx.fillText(`Balls: ${balls}`, 10, 30);
		},
	});
