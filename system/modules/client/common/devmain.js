import { useTags } from "@std/ima";
import { css } from "@std/utils";
const { canvas, pre } = useTags();


//
// Tests
//

console.log(BlobLoader)


//
// Cursor thing
//

// Create a 32x32 canvas for the cursor
const cursor_canvas = canvas({
	width: 32,
	height: 32,
	style: "display: none;", // Hide the canvas since we only need its data
});

const ctx = cursor_canvas.getContext("2d");
let frame = 0;

function paintCursorFrame() {
	// Clear canvas
	ctx.clearRect(0, 0, 32, 32);

	// Animate the cursor shape - a pulsing circle
	const pulse = Math.sin(frame * 0.015) * 0.1 + 0.7;
	const radius = 8 * pulse;

	// Draw cursor shape
	ctx.fillStyle = "#ffffff";

	// Draw a circle at center
	ctx.beginPath();
	ctx.arc(16, 16, radius, 0, Math.PI * 2);
	ctx.fill();

	// Convert canvas to base64 data URL
	const data_url = cursor_canvas.toDataURL("image/png");

	// Set as cursor
	document.body.style.willChange = "cursor";
	document.body.style.cursor = `url(${data_url}) 16 16, auto`;

	frame++;
	requestAnimationFrame(paintCursorFrame);
}

// Start the animation
paintCursorFrame();

const content = pre(
	{
		style: css`
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			color: white;
			background: black;
			font-family: monospace;
			font-size: 12px;
		`,
	},
	`
		Goals:
		- finish module-loader todo list [active]
		- server api for auth
		- arena-like api for CRUD for spaces/modules/media
			- includes backups
		- create editor module
			- allows self editing
			- allows editing other spaces from outside
	`
);

document.body.replaceChildren(content);
