import { useTags, type Ref } from "@/lib/ima";

import { css, finish, finishFrame, shortcut } from "@/lib/utils";
import { liftAppletMirror, spawnApplet, mountedApplets, useDesktop } from "@/monzon/ui/desktop";
import { WindowFrame } from "@/monzon/ui/window-frame";
import { SelectItem, SelectSeparator, useSelect } from "@/om/ui/select";
import { tw } from "@/lib/tw.macro" with { type: "macro" } ;
import sys from "@/lib/bridge";
import { Button } from "@/om/ui/button";
import { refreshWorkingDirectory } from "./file-browser";
import { closeDialog, useDialog } from "@/om/ui/dialog";
import type { ShortcutCallback } from "@/lib/types";
import { NumberInput } from "@/om/ui/number-input";
import { AppSettings } from "@/monzon/state";
import { useMonzonTheme } from "@/monzon/theme";

const tags = useTags();
const { div, icon, input } = tags;

export type ImageViewerProps = {
	filename: string;
	full_path: string;
	relative_path: string;
};

const active_viewers = new Map<
	string,
	{
		win: HTMLElement;
		filename: string;
		relative_path: string;
		full_path: string;
	}
>();

export async function openImageViewer(props: ImageViewerProps) {
	const file_data = { ...props };

	let window_name = `image-viewer---${file_data.full_path}`;
	const [existing_window] = mountedApplets(window_name);

	if (existing_window) {
		existing_window.focus();
		const id = existing_window.getAttribute("om-tsid");
		if (!id) throw new Error("Window ID not found");
		liftAppletMirror(id);
		return;
	}

	const theme = useMonzonTheme();
	const desktop = useDesktop();
	const width = 640;
	const height = Math.min(desktop.offsetHeight, 600);
	const center_x = desktop.offsetWidth / 2;
	const center_y = desktop.offsetHeight / 2;
	const offset_range = 50;
	const x = Math.max(center_x - width / 2 + (Math.random() - 0.5) * offset_range * 2, 0);
	const y = Math.max(center_y - height / 2 + (Math.random() - 0.5) * offset_range * 2, 0);

	let zoom = 100;
	let mouse_x = 0;
	let mouse_y = 0;
	let frames = 1;
	let frame_width = 0;
	let origin_x = 0;
	let origin_y = 0;
	let image_width = 0;
	let image_height = 0;
	let translate_x = 0;
	let translate_y = 0;
	let is_dragging = false;
	let drag_start_x = 0;
	let drag_start_y = 0;

	let has_unsaved_changes = false;
	let is_editing_title = false;
	let frame_callback_id: number | null = null;

	// Create canvas and context
	const canvas = tags.canvas({
		class: () =>
			tw("w-fit h-hit pixelated cursor-crosshair", {
				"cursor-grabbing": is_dragging,
				"cursor-crosshair": !is_dragging,
				"invert": AppSettings.invert_colors,
			}),
		style: () => css`
			transform: scale(${zoom / 100}) translate(${translate_x}px, ${translate_y}px);
			transform-origin: center;
		`,
	}) as HTMLCanvasElement;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	const image = new Image();

	if (!ctx) {
		console.error("Image viewer was unable to create 2d context.");
		return;
	}

	// Load and draw image
	image.onload = async () => {
		drawImage();
		await finish();
		image_width = image.width;
		image_height = image.height;
	};

	image.src = file_data.full_path;

	const shortcuts: Record<string, ShortcutCallback> = {
		[shortcut("CmdOrCtrl", "w")]: ({ win }) => {
			const name = win.getAttribute("om-applet");
			if (!name) return;
			if (has_unsaved_changes) {
				showUnsavedWarning(name);
			} else {
				closeWindow(window_name);
			}
		},
		[shortcut("CmdOrCtrl", "s")]: saveContents,
	};

	const rename_input_ref: Ref<HTMLInputElement> = {
		current: null,
	};

	function drawCheckeredBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
		const square_size = 1;
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "#ddd";

		for (let y = 0; y < height; y += square_size) {
			for (let x = 0; x < width; x += square_size) {
				if ((x + y) % (square_size * 2) === 0) {
					ctx.fillRect(x, y, square_size, square_size);
				}
			}
		}
	}

	function drawImage() {
		if (!ctx) {
			console.error("2d context in image viewer no longer exists.");
			return;
		}

		// Set canvas dimensions to match image
		canvas.width = image.width;
		canvas.height = image.height;

		// Draw checkered background
		drawCheckeredBackground(ctx, canvas.width, canvas.height);

		// Draw the image
		ctx.drawImage(image, 0, 0);

		// Get image data
		const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = image_data.data;

		// Draw frame lines if frame width is set
		if (frame_width > 0 && frames > 1) {
			// Calculate and draw each frame line
			for (let f = 1; f < frames; f++) {
				const x = f * frame_width;
				if (x >= canvas.width) continue;

				// Draw vertical line by inverting pixels
				for (let y = 0; y < canvas.height; y++) {
					const pixel_index = (y * canvas.width + x) * 4;

					// Invert colors and mix with fuchsia
					data[pixel_index] = 255 - data[pixel_index] + 255; // R
					data[pixel_index + 1] = 255 - data[pixel_index + 1]; // G
					data[pixel_index + 2] = 255 - data[pixel_index + 2] + 255; // B
					// Alpha remains unchanged
				}
			}
		}

		// Draw origin point if set
		// if (origin_x >= 0 && origin_x < canvas.width && origin_y >= 0 && origin_y < canvas.height) {
		// 	const origin_index = (origin_y * canvas.width + origin_x) * 4;

		// 	// Invert colors and mix with fuchsia for origin point
		// 	data[origin_index] = 255 - data[origin_index] + 255; // R
		// 	data[origin_index + 1] = 255 - data[origin_index + 1]; // G
		// 	data[origin_index + 2] = 255 - data[origin_index + 2] + 255; // B
		// }

		ctx.putImageData(image_data, 0, 0);
	}

	function handleZoom(delta: number) {
		const zoom_factor = 1.1;
		const new_zoom = delta > 0 ? zoom * zoom_factor : zoom / zoom_factor;

		// Clamp the zoom value between 10% and 5000%
		zoom = Math.max(10, Math.min(5000, Math.round(new_zoom)));
	}

	// Handle mouse movement
	function handleMouseMove(e: MouseEvent) {
		if (e.target !== canvas) {
			mouse_x = 0;
			mouse_y = 0;
			return;
		}
		const rect = (e.target as HTMLElement).getBoundingClientRect();
		const zoom_scale = zoom / 100;
		const x = Math.floor((e.clientX - rect.left) / zoom_scale);
		const y = Math.floor((e.clientY - rect.top) / zoom_scale);
		mouse_x = x;
		mouse_y = y;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0 || e.button === 1) {
			is_dragging = true;
			// Adjust start position by zoom scale
			const zoom_scale = zoom / 100;
			drag_start_x = e.clientX - translate_x * zoom_scale;
			drag_start_y = e.clientY - translate_y * zoom_scale;
		}
	}

	function handleMouseUp() {
		is_dragging = false;
	}

	function handleDrag(e: MouseEvent) {
		if (is_dragging) {
			// Apply inverse zoom scale to translation
			const zoom_scale = zoom / 100;
			translate_x = (e.clientX - drag_start_x) / zoom_scale;
			translate_y = (e.clientY - drag_start_y) / zoom_scale;
		}
	}

	function closeWindow(window_name: string) {
		const active_viewer = active_viewers.get(window_name);
		if (!active_viewer) return;
		active_viewer.win.remove();
		active_viewers.delete(window_name);
	}

	function saveContents() {
		if (!has_unsaved_changes) return;
		if (!file_data.full_path) return;

		console.log("save here");
		has_unsaved_changes = false;
	}

	async function renameFile(new_name: string) {
		await sys.file.rename(file_data.full_path, new_name);
		file_data.filename = new_name;
		file_data.full_path = file_data.full_path.split("/").slice(0, -1).join("/") + "/" + new_name;
		file_data.relative_path = file_data.relative_path.split("/").slice(0, -1).join("/") + "/" + new_name;

		active_viewers.delete(window_name);
		window_name = `image-viewer---${file_data.full_path}`;
		active_viewers.set(window_name, {
			win: previewer_window,
			relative_path: file_data.relative_path,
			filename: file_data.filename,
			full_path: file_data.full_path,
		});

		await refreshWorkingDirectory();
	}

	async function startRenaming() {
		if (is_editing_title) return;
		is_editing_title = true;

		await finishFrame();

		if (rename_input_ref.current) {
			rename_input_ref.current.focus();
			rename_input_ref.current.select();
		}
	}

	function showUnsavedWarning(window_name: string) {
		const relative_path = active_viewers.get(window_name)?.relative_path;
		if (!relative_path) return;

		useDialog(
			{},
			div(
				{ class: tw("flex flex-col items-center gap-2") },
				icon({
					name: "sd_card_alert",
					class: tw("text-8 font-200"),
				}),
				div(`"${relative_path}" have unsaved changes`),
				div(
					{ class: tw("flex flex-row gap-1 w-full") },
					Button(
						{
							variant: "outline",
							class: tw("grow"),
							onclick() {
								closeDialog();
								closeWindow(window_name);
							},
						},
						"Discard changes",
					),
					Button(
						{
							variant: "outline",
							class: tw("grow"),
							onclick() {
								closeDialog();
							},
						},
						"Cancel",
					),
				),
			),
		);
	}

	const previewer_window = WindowFrame({
		name: window_name,
		x,
		y,
		width,
		height,
		ontitleclick: startRenaming,
		ontitlemenu(e) {
			useSelect(
				{
					click: e,
					follow_cursor: true,
					async onselect(action: string) {
						switch (action) {
							case "rename":
								startRenaming();
								break;
						}
					},
				},
				SelectItem({ value: "rename" }, "Rename"),
			);
		},
		title: () =>
			is_editing_title
				? input({
						ref: rename_input_ref,
						class: tw("rename-input w-fit text-center"),
						value: file_data.filename,
						async onkeydown(e) {
							const input_val = (e.currentTarget as HTMLInputElement).value;
							if (e.key === "Enter") {
								await renameFile(input_val);
								is_editing_title = false;
							} else if (e.key === "Escape") {
								is_editing_title = false;
							}
						},
						onblur() {
							is_editing_title = false;
						},
					})
				: `${file_data.relative_path}${has_unsaved_changes ? "*" : ""}`,
		onclose() {
			if (has_unsaved_changes) {
				showUnsavedWarning(window_name);
			} else {
				closeWindow(window_name);
			}
			if (frame_callback_id !== null) {
				cancelAnimationFrame(frame_callback_id);
			}
		},
		oncontextmenu(e) {
			useSelect(
				{
					click: e,
					follow_cursor: true,
					onselect: (action: string) => {
						switch (action) {
							case "save":
								console.log("save");
								break;
							case "close":
								if (has_unsaved_changes) {
									showUnsavedWarning(window_name);
								} else {
									closeWindow(window_name);
								}
								break;
						}
					},
				},
				SelectItem({ value: "save" }, "Save"),
				SelectSeparator(),
				SelectItem({ value: "close" }, "Close"),
			);
		},
		shortcuts,
		left_children: [
			icon({
				name: theme.icons.image_viewer.window
			}),
		],
		right_children: [
			Button(
				{
					size: "icon",
					title: "Save",
					onclick: saveContents,
				},
				icon({
					name: theme.icons.image_viewer.animate,
				}),
			),
			// Button(
			// 	{
			// 		size: "icon",
			// 		title: "Save",
			// 		onclick: saveContents,
			// 	},
			// 	icon({
			// 		name: "draw", // "design_services" //"edit_square",
			// 	}),
			// ),
			// Button(
			// 	{
			// 		size: "icon",
			// 		title: "Save",
			// 		onclick: saveContents,
			// 	},
			// 	icon({
			// 		name: "sd_card",
			// 	}),
			// ),
		],
		content_children: [
			div(
				{
					class: tw("w-full h-full flex flex-col items-start justify-start select-none relative"),
				},
				div(
					{
						class: tw(
							"flex justify-center items-center w-full h-full pixelated overflow-hidden bg-dim select-none",
						),
						onwheel(e) {
							e.preventDefault();
							handleZoom(e.deltaY < 0 ? 1 : -1);
						},
						onmousemove(e) {
							handleMouseMove(e);
							handleDrag(e);
						},
						onmousedown: handleMouseDown,
						onmouseup: handleMouseUp,
						onmouseleave() {
							mouse_x = 0;
							mouse_y = 0;
							is_dragging = false;
						},
					},
					canvas,
				),
				div(
					{
						class: tw(
							"bg-statusbar-bg text-statusbar-fg w-full h-5 relative z-90 bottom-0 left-0 border-t border-hover flex items-center justify-start gap-1",
						),
					},
					div(
						{
							class: tw("px-1 pr-4 flex items-center gap-1 h-full"),
						},
						() => `${image_width}x${image_height}px`,
					),
					NumberInput({
						class: tw("w-16"),
						value: () => frames,
						suffix: " frames",
						min: 1,
						onchange: (new_frames) => {
							// Check if we should auto-calculate frame width
							// Continue auto-calculating if frame_width is 0 OR if current frame_width appears to be auto-calculated
							const expected_frame_width = Math.floor(image_width / frames);
							const should_auto_calculate = frame_width === 0 || frame_width === expected_frame_width;

							if (should_auto_calculate && image_width > 0 && new_frames > 0) {
								frame_width = Math.floor(image_width / new_frames);
							}

							frames = new_frames;
							drawImage();
						},
					}),
					NumberInput({
						class: tw("w-16"),
						value: () => frame_width,
						suffix: " width",
						min: 0,
						onchange: (new_width) => {
							frame_width = new_width;
							drawImage();
						},
					}),
					div({
						class: tw("grow")
					}),
					div(
						{
							class: tw("px-1 flex items-center gap-1 h-full"),
						},
						() => `(${mouse_x}, ${mouse_y})`,
					),
					NumberInput({
						class: tw("w-12"),
						value: () => zoom,
						suffix: "%",
						min: 10,
						max: 2000,
						onchange: (new_zoom) => {
							zoom = new_zoom;
						},
					}),
				),
			),
		],
	});

	spawnApplet(previewer_window);

	active_viewers.set(window_name, {
		win: previewer_window,
		relative_path: file_data.relative_path,
		filename: file_data.filename,
		full_path: file_data.full_path,
	});
}

export function getActiveImageViewers() {
	return active_viewers;
}
