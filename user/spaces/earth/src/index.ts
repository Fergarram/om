import { useTags } from "$/lib/ima.js";
import { css, finish, GlobalStyleSheet } from "$/lib/utils.js";
import { tw } from "$/lib/tw.js";
import { Map } from "maplibre-gl";

// DOM Setup
const { main, div } = useTags();

const app = main(
	{
		id: "app",
		class: tw("absolute w-full h-[calc(100%-2rem)] top-8 flex flex-col items-center justify-center bg-black text-white"),
	},
	div({
		id: "globe",
		class: tw("absolute w-full h-full [&_*]:outline-none"),
	}),
);

document.body.appendChild(app);
await finish();

// Calculate time angle based on local time
function calculateTimeAngle() {
	const now = new Date();
	const hours = now.getHours();
	const minutes = now.getMinutes();

	// Convert time to decimal hours (0-24)
	const decimal_time = hours + minutes / 60;

	// Map 24 hours to 360 degrees
	// Midnight (0) should be 180° (darkness)
	// Noon (12) should be 0° (full sun)
	let time_angle = ((decimal_time / 24) * 360 + 180) % 360;

	return time_angle - 90;
}

// Initial time angle
let time_angle = calculateTimeAngle();

const map = new Map({
	container: "globe",
	zoom: 0,
	canvasContextAttributes: {
		contextType: "webgl2",
		antialias: true,
		powerPreference: "high-performance",
	},
	center: [137.9150899566626, 36.25956997955441],
	style: {
		version: 8,
		name: "orto",
		metadata: {},
		center: [1.537786, 41.837539],
		zoom: 12,
		bearing: 0,
		pitch: 0,
		sources: {
			orto_esri: {
				type: "raster",
				tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
				tileSize: 256,
				attribution: "ESRI &copy; <a href='http://www.esri.com'>ESRI</a>",
				// Enable overzooming to show pixelated tiles
				maxzoom: 18,
			},
		},
		projection: {
			type: "globe",
		},
		sky: {
			"atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 1.5, 1, 3, 0],
		},
		light: {
			anchor: "map",
			position: [1.5, 90, time_angle],
		},
		layers: [
			{
				id: "background",
				type: "background",
				paint: {
					"background-color": "#F4F9F4",
				},
			},
			{
				id: "orto_esri",
				type: "raster",
				source: "orto_esri",
				layout: {
					visibility: "visible",
				},
				// Allow the raster to be displayed beyond its maxzoom level
				paint: {
					"raster-resampling": "nearest",
				},
			},
		],
	},
	// Enable rasterization for overzooming
	transformRequest: (url, resource_type) => {
		return {
			url: url,
			headers: {},
			credentials: "same-origin",
		};
	},
});

await finish();

setInterval(
	() => {
		time_angle = calculateTimeAngle();
		map.setLight({
			anchor: "map",
			position: [1.5, 90, time_angle],
		});
	},
	60 * 60 * 1000,
);

app.appendChild(
	div(
		{
			id: "zoom_info",
			class: tw("absolute top-4 right-4 z-1"),
		},
		() => map.getZoom(),
	),
);

GlobalStyleSheet(css`
	.maplibregl-ctrl-bottom-right {
		position: fixed;
		bottom: 0.5rem;
		right: 0.5rem;
		font-size: 0.75rem;
		opacity: 0.5;

		summary {
			display: none;
		}
	}
`);
