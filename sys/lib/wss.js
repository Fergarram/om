import WebSocket from "./ws.js";

// Logs
const LOG_PREFIX = "[WSS]";
const log = (...args) => console.log(LOG_PREFIX, ...args);

// Room types
const ROOM_TYPES = {
	PRIVATE_WITH_PASS: "private_with_pass",
	PUBLIC_WITH_PASS: "public_with_pass",
	PUBLIC_WITHOUT_PASS: "public_without_pass",
};

// Server state
const state = {
	rooms: new Map(),
	clients: new Map(),
};

//
// Room operations
//

function create_room({ room_id, room_type, password = null, host_id }) {
	const room = {
		id: room_id,
		type: room_type,
		password,
		host_id,
		clients: new Set([host_id]),
		shared_state: {},
		created_at: Date.now(),
		status: "waiting",
	};

	state.rooms.set(room_id, room);
	log(`Room created: ${room_id} (Type: ${room_type}, Host: ${host_id})`);
	return room;
}

function join_room({ room_id, client_id, password = null }) {
	const room = state.rooms.get(room_id);

	if (!room) {
		return { error: "Room not found" };
	}

	if (room.type !== ROOM_TYPES.PUBLIC_WITHOUT_PASS) {
		if (!password || password !== room.password) {
			return { error: "Invalid password" };
		}
	}

	room.clients.add(client_id);
	log(`Client ${client_id} joined room ${room_id} (Total clients: ${room.clients.size})`);
	return { success: true, room };
}

function leave_room({ room_id, client_id }) {
	const room = state.rooms.get(room_id);
	if (!room) return;

	room.clients.delete(client_id);
	log(`Client ${client_id} left room ${room_id}`);

	// Delete room if empty
	if (room.clients.size === 0) {
		state.rooms.delete(room_id);
		log(`Room ${room_id} deleted - No clients remaining`);
	}
	// Transfer host if host leaves
	else if (client_id === room.host_id) {
		room.host_id = Array.from(room.clients)[0];
		log(`Host transferred in room ${room_id} from ${client_id} to ${newHost}`);
	}
}

function get_public_room_info(room) {
	return {
		id: room.id,
		type: room.type,
		host_id: room.host_id,
		client_count: room.clients.size,
		has_password: !!room.password,
	};
}

function get_room_details(room) {
	return {
		id: room.id,
		type: room.type,
		host_id: room.host_id,
		client_count: room.clients.size,
		has_password: !!room.password,
		clients: Array.from(room.clients),
		created_at: room.created_at, // You'll need to add this when creating rooms
		status: room.status || "waiting", // Add status management to your room logic
		// Add any other room details you want to expose
		shared_state: room.shared_state, // Be careful with what you expose here
	};
}

// Client message handlers
function handle_message(ws, raw_message) {
	const message = JSON.parse(raw_message);

	const handlers = {
		CREATE_ROOM: handle_create_room,
		JOIN_ROOM: handle_join_room,
		LEAVE_ROOM: handle_leave_room,
		UPDATE_SHARED_STATE: handle_update_shared_state,
		CLIENT_ACTION: handle_client_action,
		LIST_ROOMS: handle_list_rooms,
		GET_ROOM_DETAILS: handle_room_details,
	};

	const handler = handlers[message.type];
	if (handler) {
		handler(ws, message);
	}
}

function handle_list_rooms(ws, message) {
	const public_rooms = Array.from(state.rooms.values())
		.filter((room) => room.type !== ROOM_TYPES.PRIVATE_WITH_PASS)
		.map(get_public_room_info);

	broadcast_to_client(ws, {
		type: "ROOM_LIST",
		rooms: public_rooms,
	});
}

function handle_room_details(ws, message) {
	const { room_id } = message;
	const room = state.rooms.get(room_id);

	if (!room) {
		broadcast_to_client(ws, {
			type: "ERROR",
			error: "Room not found",
		});
		return;
	}

	broadcast_to_client(ws, {
		type: "ROOM_DETAILS",
		room: get_room_details(room),
	});
}

function handle_create_room(ws, message) {
	const { room_id, room_type, password } = message;
	const room = create_room({
		room_id,
		room_type,
		password,
		host_id: ws.client_id,
	});

	broadcast_to_client(ws, {
		type: "ROOM_CREATED",
		room: {
			id: room.id,
			type: room.type,
			host_id: room.host_id,
			client_count: room.clients.size,
		},
	});
}

function handle_join_room(ws, message) {
	const { room_id, password } = message;
	const result = join_room({
		room_id,
		client_id: ws.client_id,
		password,
	});

	if (result.error) {
		broadcast_to_client(ws, {
			type: "ERROR",
			error: result.error,
		});
		return;
	}

	broadcast_to_room(result.room, {
		type: "CLIENT_JOINED",
		client_id: ws.client_id,
	});

	// Send current state to new client
	broadcast_to_client(ws, {
		type: "ROOM_STATE",
		state: result.room.shared_state,
	});
}

function handle_leave_room(ws, message) {
	const { room_id } = message;
	const room = state.rooms.get(room_id);

	if (!room) {
		return;
	}

	leave_room({
		room_id,
		client_id: ws.client_id,
	});

	// Notify remaining clients
	if (room.clients.size > 0) {
		broadcast_to_room(room, {
			type: "CLIENT_LEFT",
			client_id: ws.client_id,
			new_host_id: room.host_id, // In case host changed
		});
	}

	// Notify the leaving client
	broadcast_to_client(ws, {
		type: "ROOM_LEFT",
		room_id,
	});
}

function handle_update_shared_state(ws, message) {
	const { room_id, state_update } = message;
	const room = state.rooms.get(room_id);

	if (!room || room.host_id !== ws.client_id) {
		log(`Rejected state update from non-host client ${ws.client_id} in room ${room_id}`);
		return;
	}

	room.shared_state = {
		...room.shared_state,
		...state_update,
	};
	log(`State updated in room ${room_id} by host ${ws.client_id}`);

	broadcast_to_room(room, {
		type: "STATE_UPDATE",
		state: room.shared_state,
	});
}

function handle_client_action(ws, message) {
	const { room_id, action } = message;
	const room = state.rooms.get(room_id);

	if (!room) return;

	broadcast_to_room(
		room,
		{
			type: "CLIENT_ACTION",
			client_id: ws.client_id,
			action,
		},
		[ws.client_id],
	); // Exclude sender
}

// Broadcasting utilities
function broadcast_to_room(room, message, exclude_clients = []) {
	room.clients.forEach((client_id) => {
		if (!exclude_clients.includes(client_id)) {
			const client = state.clients.get(client_id);
			if (client?.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		}
	});
}

function broadcast_to_client(ws, message) {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(message));
	}
}

//
// Server setup
//

const wss = new WebSocket.Server({ port: 1691 });

wss.on("connection", (ws) => {
	ws.client_id = Math.random().toString(36).slice(2, 9);
	state.clients.set(ws.client_id, ws);
	log(`New client connected: ${ws.client_id} (Total clients: ${state.clients.size})`);

	// Send client their ID
	broadcast_to_client(ws, {
		type: "CONNECTED",
		client_id: ws.client_id,
	});

	ws.on("message", (message) => {
		const parsed = JSON.parse(message);
		log(`Received ${parsed.type} from client ${ws.client_id}`);
		handle_message(ws, message);
	});

	ws.on("close", () => {
		log(`Client disconnected: ${ws.client_id}`);

		// Leave all rooms
		state.rooms.forEach((room, room_id) => {
			if (room.clients.has(ws.client_id)) {
				leave_room({ room_id, client_id: ws.client_id });
				broadcast_to_room(room, {
					type: "CLIENT_LEFT",
					client_id: ws.client_id,
				});
			}
		});

		state.clients.delete(ws.client_id);
		log(`Current server state: ${state.clients.size} clients, ${state.rooms.size} rooms`);
	});
});

log(`WebSocket server started on port 1691`);
