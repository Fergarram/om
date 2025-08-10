import { useTags, type Ref } from "@/lib/ima";
import { finishFrame, shortcut } from "@/lib/utils";
import { liftAppletMirror, spawnApplet, mountedApplets, useDesktop } from "@/monzon/ui/desktop";
import { WindowFrame } from "@/monzon/ui/window-frame";
import { SelectItem, SelectSeparator, useSelect } from "@/om/ui/select";
import { tw } from "@/lib/tw.js";
import sys from "@/lib/bridge";
import { refreshWorkingDirectory } from "@/monzon/applets/file-browser";
import type { ShortcutCallback } from "@/monzon/types";
import { NumberInput } from "@/om/ui/number-input";
import { useMonzonTheme } from "@/monzon/theme";

const tags = useTags();
const { div, icon, input, button } = tags;

export type SoundViewerProps = {
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
		audio: HTMLAudioElement;
		audio_context: AudioContext;
		analyser_node: AnalyserNode;
		// @TODO: Sync state outside of component declaration to allow fun stuff
		// is_playing: boolean;
		// current_time: number;
		// duration: number;
		// volume: number;
		// repeats: boolean;
	}
>();

export async function openSoundViewer(props: SoundViewerProps) {
	const file_data = { ...props };

	let window_name = `sound-viewer---${file_data.full_path}`;
	const [existing_window] = mountedApplets(window_name);

	if (existing_window) {
		existing_window.focus();
		const id = existing_window.getAttribute("stb-tsid");
		if (!id) throw new Error("Window ID not found");
		liftAppletMirror(id);
		const active_viewer = active_viewers.get(window_name);
		if (active_viewer) {
			active_viewer.audio.currentTime = 0;
			active_viewer.audio.play();
		}
		return;
	}

	const desktop = useDesktop();
	const width = 320;
	const height = 320;
	const center_x = desktop.offsetWidth / 2;
	const center_y = desktop.offsetHeight / 2;
	const offset_range = 50;
	const x = Math.max(center_x - width / 2 + (Math.random() - 0.5) * offset_range * 2, 0);
	const y = Math.max(center_y - height / 2 + (Math.random() - 0.5) * offset_range * 2, 0);

	let is_editing_title = false;
	let frame_callback_id: number | null = null;
	let is_playing = false;
	let current_time = 0;
	let duration = 0;
	let volume = 1;
	let repeats = false;

	// Create audio element
	const audio = new Audio(file_data.full_path);

	// Set up audio event listeners
	audio.addEventListener("loadedmetadata", () => {
		duration = audio.duration;
		drawWaveform();
		togglePlay();
	});

	audio.addEventListener("timeupdate", () => {
		current_time = audio.currentTime;
	});

	audio.addEventListener("ended", () => {
		is_playing = false;
		if (repeats) {
			audio.currentTime = 0;
			togglePlay();
		}
	});

	// Add new state for analyzer
	let analyzer: AnalyserNode | null = null;

	// Create audio context and analyzer
	const audio_context = new AudioContext();
	const audio_source = audio_context.createMediaElementSource(audio);
	const analyser_node = audio_context.createAnalyser();

	analyser_node.fftSize = 2048;
	audio_source.connect(analyser_node);
	analyser_node.connect(audio_context.destination);
	analyzer = analyser_node;

	// Create canvas and context
	const canvas = tags.canvas({
		class: tw("w-full h-full pixelated cursor-crosshair"),
	}) as HTMLCanvasElement;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });

	if (!ctx) {
		console.error("Sound viewer was unable to create 2d context.");
		return;
	}

	const shortcuts: Record<string, ShortcutCallback> = {
		[shortcut("CmdOrCtrl", "w")]: ({ win }) => {
			const name = win.getAttribute("stb-window");
			if (!name) return;
			closeWindow(name);
		},
		Space: () => {
			togglePlay();
		},
	};

	const rename_input_ref: Ref<HTMLInputElement> = {
		current: null,
	};

	const theme = useMonzonTheme();

	function drawWaveform() {
		if (!analyzer || !ctx) return;

		const buffer_length = analyzer.frequencyBinCount;
		const data_array = new Uint8Array(buffer_length);
		analyzer.getByteTimeDomainData(data_array);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.lineWidth = 2;
		ctx.strokeStyle = theme.colors.sound_viewer_wave;
		ctx.beginPath();

		const slice_width = canvas.width / buffer_length;
		const amplitude_scale = 1; // Increase this to make waveform taller
		let x = 0;

		for (let i = 0; i < buffer_length; i++) {
			const v = data_array[i] / 128.0 - 1.0;
			const y = canvas.height / 2 + (v * canvas.height * amplitude_scale) / 2;

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

			x += slice_width;
		}

		ctx.stroke();

		frame_callback_id = requestAnimationFrame(drawWaveform);
	}

	function togglePlay() {
		if (is_playing) {
			audio.pause();
		} else {
			audio.play();
			audio_context.resume();
		}
		is_playing = !is_playing;
	}

	function restart() {
		audio.currentTime = 0;
		current_time = 0;
		if (!is_playing) {
			togglePlay();
		}
	}

	function seek(time: number) {
		audio.currentTime = time;
		current_time = time;
	}

	function setVolume(value: number) {
		audio.volume = value;
		volume = value;
	}

	function formatTime(seconds: number) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	function closeWindow(window_name: string) {
		const active_viewer = active_viewers.get(window_name);
		if (!active_viewer) return;

		// Clean up audio resources
		active_viewer.audio.pause();
		active_viewer.audio.src = "";
		active_viewer.audio_context.close();

		active_viewer.win.remove();
		active_viewers.delete(window_name);
	}

	async function renameFile(new_name: string) {
		await sys.file.rename(file_data.full_path, new_name);
		file_data.filename = new_name;
		file_data.full_path = file_data.full_path.split("/").slice(0, -1).join("/") + "/" + new_name;
		file_data.relative_path = file_data.relative_path.split("/").slice(0, -1).join("/") + "/" + new_name;

		active_viewers.delete(window_name);
		window_name = `sound-viewer---${file_data.full_path}`;
		active_viewers.set(window_name, {
			win: previewer_window,
			relative_path: file_data.relative_path,
			filename: file_data.filename,
			full_path: file_data.full_path,
			audio: audio,
			audio_context: audio_context,
			analyser_node: analyser_node,
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
				: file_data.relative_path,
		onclose() {
			closeWindow(window_name);
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
								closeWindow(window_name);
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
				name: theme.icons.sound_viewer.window,
			}),
		],
		right_children: [],
		content_children: [
			div(
				{
					class: tw("w-full h-full flex flex-col items-start justify-start select-none relative"),
				},
				div(
					{
						class: tw("flex justify-center items-center w-full h-full pixelated overflow-hidden bg-sound-viewer-bg select-none"),
					},
					canvas,
				),
				div(
					{
						class: tw("absolute top-0 left-0 w-full h-full flex z-10"),
					},
					div(
						{
							class: tw("flex justify-between items-center grow p-5 w-full self-end relative"),
						},
						div(
							{
								class: tw("text-sound-viewer-fg flex items-center gap-1 whitespace-nowrap"),
							},
							button(
								{
									class: tw("w-5 h-5 text-sound-viewer-fg"),
									onclick: () => {
										repeats = !repeats;
									},
								},
								icon({
									name: theme.icons.sound_viewer.repeat,
									class: () =>
										tw("text-5 w-fit h-fit font-300", {
											"opacity-50": !repeats,
										}),
								}),
							),
							() => `${formatTime(current_time)} / ${formatTime(duration)}`,
						),
						div(
							{
								class: tw("flex items-center gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"),
							},
							button(
								{
									class: tw("text-sound-viewer-fg w-10 h-10 rounded-full bg-sound-viewer-fg/20 flex items-center justify-center"),
									onclick: () => {
										togglePlay();
									},
								},
								icon({
									name: () => (is_playing ? theme.icons.sound_viewer.pause : theme.icons.sound_viewer.play),
									class: () =>
										tw("w-fit h-fit font-200", {
											"text-6": is_playing,
											"text-8": !is_playing,
										}),
								}),
							),
						),
						div(
							{
								class: tw("text-sound-viewer-fg flex items-center gap-1"),
							},
							NumberInput({
								class: tw("w-fit text-right"),
								value: () => volume * 100,
								suffix: "%",
								min: 1,
								max: 100,
								onchange: (new_volume) => {
									setVolume(new_volume / 100);
								},
							}),
							button(
								{
									class: tw("w-6 h-6"),
									onclick: () => {
										if (volume === 0) {
											setVolume(1);
										} else {
											setVolume(0);
										}
									},
								},
								icon({
									name: () => (volume === 0 ? theme.icons.sound_viewer.muted : theme.icons.sound_viewer.volume),
									class: tw("text-6 w-fit h-fit font-300"),
								}),
							),
						),
					),
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
		audio: audio,
		audio_context: audio_context,
		analyser_node: analyser_node,
	});
}

export function getActiveSoundViewers() {
	return active_viewers;
}
