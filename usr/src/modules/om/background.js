export async function initialize_background_canvas(desktop, canvas) {
	canvas.width = desktop.offsetWidth;
	canvas.height = desktop.offsetHeight;

	// Initialize WebGL
	const gl = canvas.getContext("webgl", { antialias: true });
	if (!gl) {
		console.error("WebGL not supported");
		return null;
	}

	// Create shader program
	const vertex_shader_source = `
        attribute vec2 a_position;
        attribute vec2 a_texcoord;

        varying vec2 v_texcoord;

        void main() {
            // Convert position directly to clip space (-1 to +1)
            gl_Position = vec4(a_position, 0, 1);
            v_texcoord = a_texcoord;
        }
    `;

	const fragment_shader_source = `
        precision mediump float;

        uniform sampler2D u_image;
        varying vec2 v_texcoord;

        void main() {
            gl_FragColor = texture2D(u_image, v_texcoord);
        }
    `;

	// Create shaders
	function create_shader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error("Shader compile error:", gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	const vertex_shader = create_shader(gl, gl.VERTEX_SHADER, vertex_shader_source);
	const fragment_shader = create_shader(gl, gl.FRAGMENT_SHADER, fragment_shader_source);

	// Create program
	const program = gl.createProgram();
	gl.attachShader(program, vertex_shader);
	gl.attachShader(program, fragment_shader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("Program linking error:", gl.getProgramInfoLog(program));
		return null;
	}

	// Look up locations
	const position_location = gl.getAttribLocation(program, "a_position");
	const texcoord_location = gl.getAttribLocation(program, "a_texcoord");

	// Create buffers
	const position_buffer = gl.createBuffer();
	const texcoord_buffer = gl.createBuffer();

	// Set up texture
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Set parameters for the texture
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	// Load wallpaper image
	const wallpaper = new Image();
	wallpaper.src =
		"https://d2w9rnfcy7mm78.cloudfront.net/2214531/original_449037e617330c3f52dcdb03307a1680.jpg?1527086219?bc=1";
	wallpaper.crossOrigin = "anonymous"; // Required for WebGL textures from external sources

	// Wait for the image to load
	await new Promise((resolve) => {
		if (wallpaper.complete) {
			resolve();
		} else {
			wallpaper.onload = resolve;
		}
	});

	// Upload the image into the texture
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallpaper);

	function draw_wallpaper(camera_x, camera_y, current_scale) {
		if (!gl || !wallpaper.complete) return;

		// Set canvas size to match display size
		if (canvas.width !== desktop.offsetWidth || canvas.height !== desktop.offsetHeight) {
			canvas.width = desktop.offsetWidth;
			canvas.height = desktop.offsetHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		// Calculate tile size based on current scale
		const tile_width = Math.min(wallpaper.width, 480) * current_scale;
		const tile_height = Math.min(wallpaper.height, 480) * current_scale;

		// Calculate offset based on scroll position
		let offset_x = -(camera_x % tile_width);
		let offset_y = -(camera_y % tile_height);

		// Clear the canvas
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Use our program
		gl.useProgram(program);

		// Enable texture
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Set up texture coordinates buffer (same for all tiles)
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
			gl.STATIC_DRAW,
		);
		gl.enableVertexAttribArray(texcoord_location);
		gl.vertexAttribPointer(texcoord_location, 2, gl.FLOAT, false, 0, 0);

		// Draw tiles to cover the entire viewport
		for (let x = offset_x; x < canvas.width; x += tile_width) {
			for (let y = offset_y; y < canvas.height; y += tile_height) {
				// Convert pixel coordinates to clip space (-1 to 1)
				const left = (x / canvas.width) * 2 - 1;
				const right = ((x + tile_width) / canvas.width) * 2 - 1;
				const top = 1 - (y / canvas.height) * 2; // Correct Y orientation
				const bottom = 1 - ((y + tile_height) / canvas.height) * 2;

				// Set up position buffer in clip space
				gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
				gl.bufferData(
					gl.ARRAY_BUFFER,
					new Float32Array([
						left,
						top, // top left
						right,
						top, // top right
						left,
						bottom, // bottom left
						left,
						bottom, // bottom left
						right,
						top, // top right
						right,
						bottom, // bottom right
					]),
					gl.STATIC_DRAW,
				);
				gl.enableVertexAttribArray(position_location);
				gl.vertexAttribPointer(position_location, 2, gl.FLOAT, false, 0, 0);

				// Draw
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}
		}
	}

	function resize_canvas() {
		// Resize the canvas to match the desktop dimensions
		canvas.width = desktop.offsetWidth;
		canvas.height = desktop.offsetHeight;

		// Update the WebGL viewport
		if (gl) {
			gl.viewport(0, 0, canvas.width, canvas.height);
		}
	}

	return {
		resize_canvas,
		draw_wallpaper,
	};
}
