import { desktopCapturer, ipcMain, BrowserWindow } from "electron";
import net from "net";
import fs from "fs";

// Path to the Unix socket
const SOCKET_PATH = "/tmp/omwm_socket";

// Store captured windows
const captured_windows = new Map();

function connect_to_wm_socket() {
	// Check if socket exists
	if (!fs.existsSync(SOCKET_PATH)) {
		console.log(`Socket ${SOCKET_PATH} does not exist yet, waiting...`);
		setTimeout(connect_to_wm_socket, 1000);
		return;
	}

	const client = net.createConnection({ path: SOCKET_PATH });
	let buffer = Buffer.alloc(0);
	let current_header = null;
	let bytes_expected = 0;
	let bytes_received = 0;

	client.on("connect", () => {
		console.log("Connected to window manager socket");
	});

	client.on("data", (data) => {
		// Append data to buffer
		buffer = Buffer.concat([buffer, data]);

		// Process complete messages
		while (buffer.length > 0) {
			// If we're waiting for header
			if (current_header === null) {
				// Try to find header end
				const header_end_pos = buffer.indexOf("\ndata_follows:");
				if (header_end_pos === -1) {
					// Incomplete header, wait for more data
					if (buffer.length > 10000) {
						// Something is wrong, reset
						console.error("Header too large, resetting");
						buffer = Buffer.alloc(0);
					}
					break;
				}

				// Extract header text and parse
				const header_end_line_pos = buffer.indexOf("\n", header_end_pos + 1);
				if (header_end_line_pos === -1) {
					break; // Wait for full header
				}

				const header_text = buffer.slice(0, header_end_line_pos + 1).toString();

				// Parse header
				const header_lines = header_text.split("\n");

				// Extract metadata
				const metadata = {};
				header_lines.forEach((line) => {
					const match = line.match(/([^:]+):\s*(.*)/);
					if (match) {
						metadata[match[1]] = match[2].trim();
					}
				});

				if (header_lines[0] === "WINDOW_CAPTURE") {
					current_header = metadata;
					bytes_expected = parseInt(metadata["data_follows"], 10);
					bytes_received = 0;

					// Remove header from buffer
					buffer = buffer.slice(header_end_line_pos + 1);
				} else if (header_lines[0] === "WINDOW_CLOSED") {
					// Handle window closed message
					captured_windows.delete(metadata.window_id);

					// Notify renderer
					BrowserWindow.getAllWindows().forEach((win) => {
						if (!win.isDestroyed()) {
							win.webContents.send("appstream.window_closed", metadata.window_id);
						}
					});

					// Remove header from buffer
					buffer = buffer.slice(header_end_line_pos + 1);
					continue;
				} else {
					console.error("Invalid header type:", header_lines[0]);
					buffer = buffer.slice(header_end_line_pos + 1);
					continue;
				}
			} else {
				// We're receiving pixel data
				const bytes_available = Math.min(buffer.length, bytes_expected - bytes_received);

				if (bytes_available === 0) break; // No more data available yet

				if (bytes_received === 0) {
					// Allocate new buffer for the image data
					current_header.pixel_data = Buffer.alloc(bytes_expected);
				}

				// Copy received data to the image buffer
				buffer.copy(current_header.pixel_data, bytes_received, 0, bytes_available);
				bytes_received += bytes_available;
				buffer = buffer.slice(bytes_available);

				// Check if image is complete
				if (bytes_received >= bytes_expected) {
					console.log(`Received complete window capture: ${current_header.window_id} (${bytes_received} bytes)`);

					// Store the captured window as a copy to avoid potential buffer modification issues
					const pixel_data_copy = Buffer.from(current_header.pixel_data);

					captured_windows.set(current_header.window_id, {
						width: parseInt(current_header.width, 10),
						height: parseInt(current_header.height, 10),
						depth: parseInt(current_header.depth, 10),
						bpp: parseInt(current_header.bpp, 10),
						pixel_data: pixel_data_copy,
					});

					// Notify renderer about the new window capture
					BrowserWindow.getAllWindows().forEach((win) => {
						if (!win.isDestroyed()) {
							win.webContents.send("appstream.window_capture_updated", current_header.window_id);
						}
					});

					// Reset for the next message
					current_header = null;
					bytes_expected = 0;
					bytes_received = 0;
				}
			}
		}
	});

	client.on("error", (err) => {
		console.error("Socket error:", err);
		setTimeout(connect_to_wm_socket, 1000);
	});

	client.on("close", () => {
		console.log("Socket connection closed, reconnecting...");
		setTimeout(connect_to_wm_socket, 1000);
	});

	ipcMain.handle("appstream.focus_window", async (event, window_id) => {
		if (!client || !client.writable) {
			console.error("Socket not connected");
			return false;
		}

		try {
			// Send focus request to window manager
			client.write(`FOCUS_WINDOW ${window_id}\n`);
			return true;
		} catch (error) {
			console.error("Failed to send focus request:", error);
			return false;
		}
	});

	ipcMain.handle("appstream.close_window", async (event, window_id) => {
		if (!client || !client.writable) {
			console.error("Socket not connected");
			return false;
		}

		try {
			// Send close request to window manager
			client.write(`CLOSE_WINDOW ${window_id}\n`);
			return true;
		} catch (error) {
			console.error("Failed to send close request:", error);
			return false;
		}
	});

	ipcMain.handle("appstream.resize_window", async (event, window_id, dimensions) => {
		if (!client || !client.writable) {
			console.error("Socket not connected");
			return false;
		}

		try {
			// Send resize request to window manager
			client.write(`RESIZE_WINDOW ${window_id} ${dimensions.width} ${dimensions.height}\n`);
			return true;
		} catch (error) {
			console.error("Failed to send resize request:", error);
			return false;
		}
	});

	ipcMain.handle("appstream.set_window_position", async (event, window_id, x, y) => {
		if (!client || !client.writable) {
			console.error("Socket not connected");
			return false;
		}

		try {
			console.log(`SET_WINDOW_POSITION ${window_id} ${x} ${y}\n`);
			client.write(`SET_WINDOW_POSITION ${window_id} ${x} ${y}\n`);
			return true;
		} catch (error) {
			console.error("Failed to send position update:", error);
			return false;
		}
	});
}

// Handle requests from the renderer for window captures
ipcMain.handle("appstream.get_captured_windows", (event) => {
	// Return list of window IDs
	return Array.from(captured_windows.keys());
});

ipcMain.handle("appstream.get_window_capture", (event, window_id) => {
	// Return specific window capture
	const capture = captured_windows.get(window_id);
	if (!capture) return null;

	// Create a copy of the buffer to avoid buffer sharing issues
	const pixel_data_buffer = Buffer.from(capture.pixel_data);

	return {
		window_id,
		width: capture.width,
		height: capture.height,
		depth: capture.depth,
		bpp: capture.bpp,
		pixel_data: pixel_data_buffer.buffer.slice(
			pixel_data_buffer.byteOffset,
			pixel_data_buffer.byteOffset + pixel_data_buffer.byteLength,
		),
	};
});

ipcMain.handle("appstream.select", async (event, options) => {
	return await desktopCapturer.getSources(options);
});

// Start socket connection
connect_to_wm_socket();
