//
// Many windows stress test
//
// Usage: om . [count]
//

const { app, BrowserWindow, screen } = require("electron");

//
// Constants
//

const DEFAULT_COUNT = 20;
const WINDOW_WIDTH = 220;
const WINDOW_HEIGHT = 160;
const WINDOW_GAP = 10;
const SCREEN_MARGIN = 40;

const COLORS = [
	"#e63946",
	"#f4a261",
	"#e9c46a",
	"#2a9d8f",
	"#264653",
	"#457b9d",
	"#8338ec",
	"#ff006e",
];

//
// State
//

const windows = [];

//
// Code execution
//

const window_count = parseCount(process.argv);

app.whenReady().then(() => {
	const started_at = Date.now();

	const positions = computePositions(window_count);

	for (let i = 0; i < window_count; i++) {
		windows.push(createNumberWindow(i + 1, positions[i]));
	}

	console.log(`created ${window_count} windows in ${Date.now() - started_at}ms`);
});

app.on("window-all-closed", () => {
	app.quit();
});

//
// Functions
//

function parseCount(argv) {
	// The app path is consumed by om, so pick the last plain number argument
	const numbers = argv.slice(1).filter((arg) => /^\d+$/.test(arg));
	if (numbers.length === 0) return DEFAULT_COUNT;
	const count = parseInt(numbers[numbers.length - 1], 10);
	return count > 0 ? count : DEFAULT_COUNT;
}

function computePositions(count) {
	const work_area = screen.getPrimaryDisplay().workAreaSize;

	const cell_width = WINDOW_WIDTH + WINDOW_GAP;
	const cell_height = WINDOW_HEIGHT + WINDOW_GAP;

	const columns = Math.max(1, Math.floor((work_area.width - SCREEN_MARGIN * 2) / cell_width));
	const rows = Math.max(1, Math.floor((work_area.height - SCREEN_MARGIN * 2) / cell_height));
	const per_screen = columns * rows;

	const positions = [];

	for (let i = 0; i < count; i++) {
		// Wrap around with a small offset once the grid is full
		const slot = i % per_screen;
		const wrap = Math.floor(i / per_screen);
		const offset = wrap * WINDOW_GAP * 2;

		positions.push({
			x: SCREEN_MARGIN + (slot % columns) * cell_width + offset,
			y: SCREEN_MARGIN + Math.floor(slot / columns) * cell_height + offset,
		});
	}

	return positions;
}

function createNumberWindow(number, position) {
	const win = new BrowserWindow({
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
		x: position.x,
		y: position.y,
		title: `window ${number}`,
		autoHideMenuBar: true,
		backgroundColor: "#000000",
		useContentSize: true,
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
		},
	});

	win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(number))}`);

	return win;
}

function buildHtml(number) {
	const color = COLORS[(number - 1) % COLORS.length];

	return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<title>window ${number}</title>
		<style>
			html, body {
				margin: 0;
				height: 100%;
				background: ${color};
				color: #ffffff;
				font-family: system-ui, sans-serif;
			}
			body {
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.number {
				font-size: 90px;
				font-weight: 700;
				line-height: 1;
			}
		</style>
	</head>
	<body>
		<div class="number">${number}</div>
	</body>
</html>`;
}
