export type Position = number[];

export type Polygon = {
	type: "Polygon";
	coordinates: Position[][];
};

export type MultiPolygon = {
	type: "MultiPolygon";
	coordinates: Position[][][];
};

export type GeoJSONPolygon = Polygon | MultiPolygon;

export function getRandomLatLng(polygon?: Polygon | MultiPolygon): google.maps.LatLng {
	if (!polygon) {
		// Default behavior: Generate coordinates within areas more likely to have Street View coverage
		// Avoiding extreme latitudes with less coverage
		const lat = Math.random() * 140 - 70; // -70 to 70 degrees
		const lng = Math.random() * 360 - 180; // -180 to 180 degrees
		return new google.maps.LatLng(lat, lng);
	}

	// Generate points within the polygon
	const bounds = getBoundsFromGeoJSON(polygon);

	// Try to find a point inside the polygon
	let attempts = 0;
	const MAX_ATTEMPTS = 1000;

	while (attempts < MAX_ATTEMPTS) {
		// Generate a random point within the bounding box
		const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
		const lng = bounds.west + Math.random() * (bounds.east - bounds.west);

		// Check if this point is inside the polygon
		if (isPointInPolygon(lat, lng, polygon)) {
			return new google.maps.LatLng(lat, lng);
		}

		attempts++;
	}

	// Fallback if we couldn't find a point inside the polygon after max attempts
	// Return the center of the bounds as a last resort
	const centerLat = (bounds.north + bounds.south) / 2;
	const centerLng = (bounds.east + bounds.west) / 2;
	return new google.maps.LatLng(centerLat, centerLng);
}

// Helper function to get bounding box from GeoJSON
export function getBoundsFromGeoJSON(polygon: Polygon | MultiPolygon): {
	north: number;
	south: number;
	east: number;
	west: number;
} {
	let coordinates: number[][][] = [];

	if (polygon.type === "Polygon") {
		coordinates = polygon.coordinates;
	} else if (polygon.type === "MultiPolygon") {
		polygon.coordinates.forEach((poly) => {
			coordinates = coordinates.concat(poly);
		});
	}

	let north = -90;
	let south = 90;
	let east = -180;
	let west = 180;

	coordinates.forEach((ring) => {
		ring.forEach(([lng, lat]) => {
			north = Math.max(north, lat);
			south = Math.min(south, lat);
			east = Math.max(east, lng);
			west = Math.min(west, lng);
		});
	});

	return { north, south, east, west };
}

// Ray casting algorithm to check if point is inside a polygon
export function isPointInPolygon(lat: number, lng: number, polygon: Polygon | MultiPolygon): boolean {
	const point = [lng, lat]; // GeoJSON uses [longitude, latitude] order

	if (polygon.type === "Polygon") {
		return isPointInSinglePolygon(point, polygon.coordinates);
	} else if (polygon.type === "MultiPolygon") {
		// Check each polygon in the multi-polygon
		return polygon.coordinates.some((polygonCoords) => isPointInSinglePolygon(point, polygonCoords));
	}

	return false;
}

export function isPointInSinglePolygon(point: number[], polygonCoords: number[][][]): boolean {
	// The first ring is the exterior ring
	const exteriorRing = polygonCoords[0];

	if (!pointInRing(point, exteriorRing)) {
		return false;
	}

	// Check if point is in any hole (the rest of the rings)
	for (let i = 1; i < polygonCoords.length; i++) {
		if (pointInRing(point, polygonCoords[i])) {
			// Point is in a hole, so it's not in the polygon
			return false;
		}
	}

	return true;
}

export function pointInRing(point: number[], ring: number[][]): boolean {
	const [x, y] = point;
	let inside = false;

	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];

		const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

		if (intersect) inside = !inside;
	}

	return inside;
}
