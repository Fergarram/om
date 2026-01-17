import { useTags } from "ima";
import { CloneEditor } from "clone-editor";
import { css, finish, useGlobalStyles } from "utils";

const params = new URLSearchParams(window.location.search);

//
// Open editor directly
//

if (params.get("clone-editor") === "true") {
	useGlobalStyles(css`
		:root {
			--code-editor-font-size: 12px;
			--code-editor-font-family: "Google Sans Code";
		}
	`);

	document.body.appendChild(
		CloneEditor(window.location.href.replace("clone-editor=true", "clone-editor=false")),
	);
}

// Run game
else main();

//
// Game
//

async function main() {
	const $ = useTags();

	//
	// State
	//

	let clicks = 0;
	let main_element;
	const button_ref = { current: null };
	const canvas_ref = { current: null };

	// Physics state - now 2D
	let button_x_offset = 0;
	let button_y_offset = 0;
	let button_velocity_x = 0;
	let button_velocity_y = 0;

	// Temperature state
	let temperature = 50;
	const max_temperature = 100;

	// Beat state
	let beat_phase = 0;
	const beat_interval = 600;

	// Sniper state
	let sniper_x = 50;
	let sniper_direction = 1;

	// Auto click accumulator
	let auto_click_accumulator = 0;

	// Particle system
	let particles = [];
	const max_particles = 200;

	// Theme
	let active_theme = "";

	// Auto-save interval
	let last_save_time = 0;
	const save_interval = 5000; // Save every 5 seconds

	window.addClicks = function (how_much) {
		clicks += how_much;
	};

	const all_upgrades = [
		{
			title: "Dark Mode",
			cost: 30,
			description: "Easy on the eyes",
			type: "theme",
			purchased: false,
			requires: [""],
		},
		{
			title: "Keyboard Shortcuts",
			cost: 50,
			description: "Press Space or Enter to click. Unlocks finger-free clicking",
			type: "keyboard",
			purchased: false,
			requires: [""],
		},
		{
			title: "Windows 95",
			cost: 75,
			description: "Classic computing aesthetic. Floating window particles everywhere",
			type: "theme-win95",
			purchased: false,
			requires: [""],
		},
		{
			title: "Bitcoin Mining",
			cost: 25,
			description: "Generate 1 click per second automatically",
			type: "auto",
			purchased: false,
			requires: [""],
			cps: 1,
		},
		{
			title: "Aqua",
			cost: 150,
			description: "Mac OS X inspired. Shiny bubbles float around",
			type: "theme-aqua",
			purchased: false,
			requires: [""],
		},
		{
			title: "Physics",
			cost: 150,
			description: "Button bounces around with each click. x1.5 multiplier for the chaos",
			type: "physics",
			purchased: false,
			requires: [""],
		},
		{
			title: "Matrix",
			cost: 200,
			description: "Green falling code. See the digital rain",
			type: "theme-matrix",
			purchased: false,
			requires: ["Dark Mode"],
		},
		{
			title: "Outsourcerer",
			cost: 100,
			description: "Hire Rajesh to click for you (0.5 clicks/sec)",
			type: "auto",
			purchased: false,
			requires: [""],
			cps: 0.5,
		},
		{
			title: "I make beats",
			cost: 250,
			description: "Follow the beat for x2 clicks. Off-beat = normal clicks",
			type: "beat",
			purchased: false,
			requires: [""],
		},
		{
			title: "Temperature Threshold",
			cost: 300,
			description:
				"Click to stay hot. Max temp = x10 all multipliers. 0 temp = lose all multipliers",
			type: "temperature",
			purchased: false,
			requires: [""],
		},
		{
			title: "Neon Synthwave",
			cost: 350,
			description: "80s retrowave vibes. Glowing neon particles and grid",
			type: "theme-synthwave",
			purchased: false,
			requires: ["Dark Mode"],
		},
		{
			title: "Fire",
			cost: 400,
			description: "Burning hot. Flame particles rise from every click",
			type: "theme-fire",
			purchased: false,
			requires: [""],
		},
		{
			title: "Sniper Mode",
			cost: 400,
			description: "Click a moving target. Hit = x2 clicks. Miss = lose 10 clicks",
			type: "sniper",
			purchased: false,
			requires: [""],
		},
		{
			title: "Advanced Mining Rig",
			cost: 500,
			description: "Generate 5 clicks per second automatically",
			type: "auto",
			purchased: false,
			requires: ["Bitcoin Mining"],
			cps: 5,
		},
	];

	function saveGame() {
		const save_data = {
			clicks,
			temperature,
			active_theme,
			upgrades: all_upgrades.map((u) => u.purchased),
		};
		localStorage.setItem("boton_click_save", JSON.stringify(save_data));
	}

	function loadGame() {
		const save_string = localStorage.getItem("boton_click_save");
		if (!save_string) return;

		try {
			const save_data = JSON.parse(save_string);

			if (typeof save_data.clicks === "number") {
				clicks = save_data.clicks;
			}

			if (typeof save_data.temperature === "number") {
				temperature = save_data.temperature;
			}

			if (typeof save_data.active_theme === "string") {
				active_theme = save_data.active_theme;
			}

			if (Array.isArray(save_data.upgrades)) {
				for (let i = 0; i < save_data.upgrades.length && i < all_upgrades.length; i++) {
					all_upgrades[i].purchased = save_data.upgrades[i];
				}
			}
		} catch (err) {
			console.error("Failed to load save data:", err);
		}
	}

	function resetGame() {
		// Reset clicks
		clicks = 0;

		// Reset temperature
		temperature = 50;

		// Reset theme
		active_theme = "";

		// Reset all upgrades
		for (const upgrade of all_upgrades) {
			upgrade.purchased = false;
		}

		// Reset physics
		button_x_offset = 0;
		button_y_offset = 0;
		button_velocity_x = 0;
		button_velocity_y = 0;

		if (button_ref.current) {
			button_ref.current.style.transform = "";
		}

		// Reset particles
		particles = [];

		// Reset auto click accumulator
		auto_click_accumulator = 0;

		// Clear localStorage
		localStorage.removeItem("boton_click_save");

		location.reload();
	}

	window.resetGame = resetGame;

	// Load saved game before anything else
	loadGame();

	function isThemeUpgrade(upgrade) {
		return upgrade.type.startsWith("theme");
	}

	function getThemeNameFromType(type) {
		switch (type) {
			case "theme":
				return "dark";
			case "theme-win95":
				return "win95";
			case "theme-aqua":
				return "aqua";
			case "theme-matrix":
				return "matrix";
			case "theme-synthwave":
				return "synthwave";
			case "theme-fire":
				return "fire";
			default:
				return "";
		}
	}

	function isUpgradePurchased(title) {
		return all_upgrades.find((u) => u.title === title)?.purchased ?? false;
	}

	function canPurchaseUpgrade(upgrade) {
		if (upgrade.purchased) return false;
		if (clicks < upgrade.cost) return false;

		for (const req of upgrade.requires) {
			if (req && req !== "" && !isUpgradePurchased(req)) {
				return false;
			}
		}

		return true;
	}

	function isOnBeat() {
		return beat_phase < 20 || beat_phase > 80;
	}

	//
	// Particle System
	//

	function spawnParticle(type, x, y) {
		if (particles.length >= max_particles) return;

		let particle = { type, x, y, life: 1, max_life: 1 };

		switch (type) {
			case "win95":
				particle.vx = (Math.random() - 0.5) * 30;
				particle.vy = -Math.random() * 20 - 10;
				particle.size = Math.random() * 12 + 8;
				particle.max_life = 4 + Math.random() * 2;
				particle.life = particle.max_life;
				particle.rotation = Math.random() * 360;
				particle.rot_speed = (Math.random() - 0.5) * 60;
				break;

			case "aqua":
				particle.vx = (Math.random() - 0.5) * 40;
				particle.vy = -Math.random() * 60 - 30;
				particle.size = Math.random() * 20 + 10;
				particle.max_life = 3 + Math.random() * 2;
				particle.life = particle.max_life;
				particle.wobble = Math.random() * Math.PI * 2;
				break;

			case "matrix":
				particle.vx = 0;
				particle.vy = Math.random() * 200 + 100;
				particle.char = String.fromCharCode(0x30a0 + Math.random() * 96);
				particle.max_life = 2 + Math.random() * 2;
				particle.life = particle.max_life;
				particle.size = Math.random() * 8 + 12;
				break;

			case "synthwave":
				particle.vx = (Math.random() - 0.5) * 100;
				particle.vy = (Math.random() - 0.5) * 100;
				particle.size = Math.random() * 4 + 2;
				particle.max_life = 2 + Math.random();
				particle.life = particle.max_life;
				particle.hue = Math.random() > 0.5 ? 300 : 180;
				particle.trail = [];
				break;

			case "fire":
				particle.vx = (Math.random() - 0.5) * 50;
				particle.vy = -Math.random() * 150 - 50;
				particle.size = Math.random() * 15 + 5;
				particle.max_life = 1 + Math.random();
				particle.life = particle.max_life;
				break;
		}

		particles.push(particle);
	}

	function spawnAmbientParticles() {
		const canvas = canvas_ref.current;
		if (!canvas) return;

		if (isUpgradePurchased("Windows 95") && Math.random() < 0.02) {
			spawnParticle("win95", Math.random() * canvas.width, canvas.height + 20);
		}

		if (isUpgradePurchased("Aqua") && Math.random() < 0.03) {
			spawnParticle("aqua", Math.random() * canvas.width, canvas.height + 20);
		}

		if (isUpgradePurchased("Matrix") && Math.random() < 0.15) {
			spawnParticle("matrix", Math.random() * canvas.width, -20);
		}

		if (isUpgradePurchased("Neon Synthwave") && Math.random() < 0.05) {
			spawnParticle("synthwave", Math.random() * canvas.width, Math.random() * canvas.height);
		}
	}

	function spawnClickParticles(x, y) {
		if (isUpgradePurchased("Fire")) {
			for (let i = 0; i < 8; i++) {
				spawnParticle("fire", x, y);
			}
		}

		if (isUpgradePurchased("Neon Synthwave")) {
			for (let i = 0; i < 5; i++) {
				spawnParticle("synthwave", x, y);
			}
		}

		if (isUpgradePurchased("Aqua")) {
			for (let i = 0; i < 3; i++) {
				spawnParticle("aqua", x, y);
			}
		}
	}

	function updateParticles(delta) {
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= delta;

			if (p.life <= 0) {
				particles.splice(i, 1);
				continue;
			}

			p.x += p.vx * delta;
			p.y += p.vy * delta;

			switch (p.type) {
				case "win95":
					p.vy += 30 * delta;
					p.rotation += p.rot_speed * delta;
					break;

				case "aqua":
					p.vy += 20 * delta;
					p.wobble += 3 * delta;
					p.x += Math.sin(p.wobble) * 20 * delta;
					break;

				case "fire":
					p.vx += (Math.random() - 0.5) * 100 * delta;
					p.size *= 0.97;
					break;

				case "synthwave":
					if (p.trail.length > 10) p.trail.shift();
					p.trail.push({ x: p.x, y: p.y });
					break;
			}
		}
	}

	function renderParticles(ctx) {
		const canvas = canvas_ref.current;
		if (!canvas) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Synthwave grid background
		if (isUpgradePurchased("Neon Synthwave")) {
			renderSynthwaveGrid(ctx, canvas);
		}

		for (const p of particles) {
			const alpha = p.life / p.max_life;

			switch (p.type) {
				case "win95":
					ctx.save();
					ctx.translate(p.x, p.y);
					ctx.rotate((p.rotation * Math.PI) / 180);
					ctx.globalAlpha = alpha;

					// Draw mini window
					ctx.fillStyle = "#c0c0c0";
					ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

					// Title bar
					ctx.fillStyle = "#000080";
					ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.25);

					// Border
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1;
					ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

					ctx.restore();
					break;

				case "aqua":
					ctx.save();
					ctx.globalAlpha = alpha * 0.7;

					const gradient = ctx.createRadialGradient(
						p.x - p.size * 0.3,
						p.y - p.size * 0.3,
						0,
						p.x,
						p.y,
						p.size,
					);
					gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
					gradient.addColorStop(0.3, "rgba(120, 200, 255, 0.6)");
					gradient.addColorStop(1, "rgba(0, 100, 200, 0.1)");

					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
					ctx.fillStyle = gradient;
					ctx.fill();

					// Shine
					ctx.beginPath();
					ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
					ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
					ctx.fill();

					ctx.restore();
					break;

				case "matrix":
					ctx.save();
					ctx.globalAlpha = alpha;
					ctx.font = `${p.size}px monospace`;
					ctx.fillStyle = `rgb(0, ${Math.floor(200 + 55 * alpha)}, 0)`;
					ctx.shadowColor = "#00ff00";
					ctx.shadowBlur = 10;
					ctx.fillText(p.char, p.x, p.y);
					ctx.restore();
					break;

				case "synthwave":
					ctx.save();

					// Draw trail
					if (p.trail.length > 1) {
						ctx.beginPath();
						ctx.moveTo(p.trail[0].x, p.trail[0].y);
						for (let i = 1; i < p.trail.length; i++) {
							ctx.lineTo(p.trail[i].x, p.trail[i].y);
						}
						ctx.strokeStyle = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`;
						ctx.lineWidth = p.size;
						ctx.stroke();
					}

					// Draw particle
					ctx.globalAlpha = alpha;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
					ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
					ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
					ctx.shadowBlur = 15;
					ctx.fill();

					ctx.restore();
					break;

				case "fire":
					ctx.save();
					ctx.globalAlpha = alpha;

					const fire_gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
					const heat = p.life / p.max_life;
					fire_gradient.addColorStop(0, `rgba(255, 255, ${Math.floor(200 * heat)}, 1)`);
					fire_gradient.addColorStop(0.4, `rgba(255, ${Math.floor(150 * heat)}, 0, 0.8)`);
					fire_gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
					ctx.fillStyle = fire_gradient;
					ctx.fill();

					ctx.restore();
					break;
			}
		}
	}

	function renderSynthwaveGrid(ctx, canvas) {
		ctx.save();
		ctx.strokeStyle = "rgba(255, 0, 255, 0.2)";
		ctx.lineWidth = 1;

		const grid_size = 40;
		const horizon = canvas.height * 0.6;

		// Horizontal lines with perspective
		for (let i = 0; i < 15; i++) {
			const y = horizon + Math.pow(i / 15, 2) * (canvas.height - horizon);
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}

		// Vertical lines
		const center_x = canvas.width / 2;
		for (let i = -10; i <= 10; i++) {
			const x_top = center_x + i * 5;
			const x_bottom = center_x + i * grid_size * 3;
			ctx.beginPath();
			ctx.moveTo(x_top, horizon);
			ctx.lineTo(x_bottom, canvas.height);
			ctx.stroke();
		}

		// Sun
		const sun_gradient = ctx.createLinearGradient(0, horizon - 100, 0, horizon);
		sun_gradient.addColorStop(0, "rgba(255, 100, 200, 0.8)");
		sun_gradient.addColorStop(1, "rgba(255, 200, 100, 0.8)");

		ctx.beginPath();
		ctx.arc(center_x, horizon, 80, Math.PI, 0);
		ctx.fillStyle = sun_gradient;
		ctx.fill();

		// Sun stripes
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		for (let i = 0; i < 5; i++) {
			const stripe_y = horizon - 70 + i * 15;
			ctx.fillRect(center_x - 80, stripe_y, 160, 5);
		}

		ctx.restore();
	}

	function handleClick(e) {
		let final_multiplier = 1;

		// Spawn click particles
		if (e && button_ref.current) {
			const rect = button_ref.current.getBoundingClientRect();
			const canvas = canvas_ref.current;
			if (canvas) {
				const scale_x = canvas.width / window.innerWidth;
				const scale_y = canvas.height / window.innerHeight;
				spawnClickParticles(
					(rect.left + rect.width / 2) * scale_x,
					(rect.top + rect.height / 2) * scale_y,
				);
			}
		}

		// Temperature multiplier
		if (isUpgradePurchased("Temperature Threshold")) {
			final_multiplier *= Math.max(0.1, (temperature / max_temperature) * 10);
			temperature = Math.min(max_temperature, temperature + 20);
		}

		// Beat multiplier
		if (isUpgradePurchased("I make beats") && isOnBeat()) {
			final_multiplier *= 2;
		}

		// Physics multiplier
		if (isUpgradePurchased("Physics")) {
			final_multiplier *= 2;

			// Apply random impulse
			const angle = Math.random() * Math.PI * 2;
			const impulse_strength = 400;
			button_velocity_x += Math.cos(angle) * impulse_strength;
			button_velocity_y += Math.sin(angle) * impulse_strength;
		}

		clicks += Math.max(1, Math.floor(final_multiplier));
		saveGame();
	}

	function handleSniperClick(e) {
		const target_el = document.getElementById("sniper-target");
		if (!target_el) return;

		const rect = target_el.getBoundingClientRect();
		const click_x = e.clientX;
		const click_y = e.clientY;

		const hit =
			click_x >= rect.left &&
			click_x <= rect.right &&
			click_y >= rect.top &&
			click_y <= rect.bottom;

		if (hit) {
			clicks += 2;
			target_el.style.background = "#00ff00";
			setTimeout(() => {
				target_el.style.background = "#ff0000";
			}, 100);
		} else {
			clicks = Math.max(0, clicks - 10);
		}
	}

	function handleWheel(e) {
		if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) {
			return;
		}

		const delta_y = e.deltaY;
		e.preventDefault();

		const scroll_amount = delta_y > 0 ? main_element.clientHeight : -main_element.clientHeight;

		main_element.scrollBy({
			top: scroll_amount,
			behavior: "smooth",
		});
	}

	function resizeCanvas() {
		const canvas = canvas_ref.current;
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	// Game loop
	let last_time = performance.now();

	function gameLoop() {
		const now = performance.now();
		const delta = (now - last_time) / 1000;
		last_time = now;

		// Auto-save periodically
		if (now - last_save_time > save_interval) {
			saveGame();
			last_save_time = now;
		}

		// Auto clicks
		let total_cps = 0;
		for (const upgrade of all_upgrades) {
			if (upgrade.purchased && upgrade.type === "auto") {
				total_cps += upgrade.cps;
			}
		}

		if (total_cps > 0) {
			auto_click_accumulator += total_cps * delta;
			if (auto_click_accumulator >= 1) {
				const to_add = Math.floor(auto_click_accumulator);
				clicks += to_add;
				auto_click_accumulator -= to_add;
			}
		}

		// Temperature decay
		if (isUpgradePurchased("Temperature Threshold")) {
			temperature = Math.max(0, temperature - delta * 8);
		}

		// Beat system
		if (isUpgradePurchased("I make beats")) {
			beat_phase = ((now % beat_interval) / beat_interval) * 100;
		}

		// Physics - 2D movement with wall bouncing
		if (isUpgradePurchased("Physics") && button_ref.current) {
			const friction = 2.5;
			const bounce_damping = 0.7;

			// Apply friction
			button_velocity_x -= button_velocity_x * friction * delta;
			button_velocity_y -= button_velocity_y * friction * delta;

			// Update position
			button_x_offset += button_velocity_x * delta;
			button_y_offset += button_velocity_y * delta;

			// Get bounds
			const main_view = document.getElementById("main-view");
			const button = button_ref.current;

			if (main_view && button) {
				const container_rect = main_view.getBoundingClientRect();
				const button_rect = button.getBoundingClientRect();

				const padding = 20;
				const max_x = (container_rect.width - button_rect.width) / 2 - padding;
				const max_y = (container_rect.height - button_rect.height) / 2 - padding;

				// Bounce off horizontal walls
				if (button_x_offset > max_x) {
					button_x_offset = max_x;
					button_velocity_x = -button_velocity_x * bounce_damping;
				} else if (button_x_offset < -max_x) {
					button_x_offset = -max_x;
					button_velocity_x = -button_velocity_x * bounce_damping;
				}

				// Bounce off vertical walls
				if (button_y_offset > max_y) {
					button_y_offset = max_y;
					button_velocity_y = -button_velocity_y * bounce_damping;
				} else if (button_y_offset < -max_y) {
					button_y_offset = -max_y;
					button_velocity_y = -button_velocity_y * bounce_damping;
				}
			}

			button_ref.current.style.transform = `translate(${button_x_offset}px, ${button_y_offset}px)`;
		}

		// Sniper target movement
		if (isUpgradePurchased("Sniper Mode")) {
			sniper_x += sniper_direction * 80 * delta;
			if (sniper_x > 85) {
				sniper_x = 85;
				sniper_direction = -1;
			}
			if (sniper_x < 15) {
				sniper_x = 15;
				sniper_direction = 1;
			}
		}

		// Particle system
		spawnAmbientParticles();
		updateParticles(delta);

		const canvas = canvas_ref.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			renderParticles(ctx);
		}

		requestAnimationFrame(gameLoop);
	}

	requestAnimationFrame(gameLoop);

	// Keyboard shortcuts
	document.addEventListener("keydown", (e) => {
		if (!isUpgradePurchased("Keyboard Shortcuts")) return;
		if (e.code === "Space" || e.code === "Enter") {
			e.preventDefault();
			handleClick();
		}
	});

	window.addEventListener("resize", resizeCanvas);

	window.addEventListener("beforeunload", saveGame);

	function getActiveTheme() {
		// Check if the active theme is still purchased
		const theme_upgrade = all_upgrades.find(
			(u) => isThemeUpgrade(u) && getThemeNameFromType(u.type) === active_theme,
		);

		if (theme_upgrade && theme_upgrade.purchased) {
			return active_theme;
		}

		// Fallback: if active theme was sold, clear it
		active_theme = "";
		return "";
	}

	main_element = $.main(
		{
			shop: () => (clicks >= 1).toString(),
			dark: () => isUpgradePurchased("Dark Mode").toString(),
			theme: () => getActiveTheme(),
			onwheel: handleWheel,
		},
		$.canvas({
			ref: canvas_ref,
			id: "particle-canvas",
		}),
		$.section(
			{
				id: "main-view",
			},
			// Temperature bar
			$.div(
				{
					id: "temperature-bar",
					style: () => (isUpgradePurchased("Temperature Threshold") ? "" : "display: none;"),
				},
				$.div(
					{
						id: "temperature-fill",
						style: () => `width: ${temperature}%;`,
					},
					() => `${Math.floor(temperature)}%`,
				),
			),
			// Beat indicator
			$.div(
				{
					id: "beat-indicator",
					style: () => (isUpgradePurchased("I make beats") ? "" : "display: none;"),
				},
				$.div({ class: "beat-zone beat-zone-left" }),
				$.div({ class: "beat-zone beat-zone-right" }),
				$.div({
					id: "beat-cursor",
					style: () => `left: ${beat_phase}%;`,
				}),
			),
			// Sniper container
			$.div(
				{
					id: "sniper-container",
					style: () => (isUpgradePurchased("Sniper Mode") ? "" : "display: none;"),
					onclick: handleSniperClick,
				},
				$.div({
					id: "sniper-target",
					style: () => `left: ${sniper_x}%;`,
				}),
			),
			// CPS display
			$.div(
				{
					id: "cps-display",
					style: () => {
						let total_cps = 0;
						for (const upgrade of all_upgrades) {
							if (upgrade.purchased && upgrade.type === "auto") {
								total_cps += upgrade.cps;
							}
						}
						return total_cps > 0 ? "" : "display: none;";
					},
				},
				() => {
					let total_cps = 0;
					for (const upgrade of all_upgrades) {
						if (upgrade.purchased && upgrade.type === "auto") {
							total_cps += upgrade.cps;
						}
					}
					return `${total_cps} clicks/sec`;
				},
			),
			$.button(
				{
					ref: button_ref,
					id: "the-button",
					onclick: handleClick,
				},
				() => clicks.toString(),
			),
			// Keyboard hint
			$.div(
				{
					id: "keyboard-hint",
					style: () => (isUpgradePurchased("Keyboard Shortcuts") ? "" : "display: none;"),
				},
				"Press SPACE or ENTER",
			),
		),
		$.button(
			{
				id: "shop-cta",
				onclick() {
					main_element.scroll({
						top: main_element.clientHeight,
						behavior: "smooth",
					});
				},
			},
			"Scroll down",
		),
		$.section(
			{
				id: "shop",
			},
			...all_upgrades.map((item, i) => {
				const missing_requirements = item.requires.filter(
					(req) => req && req !== "" && !isUpgradePurchased(req),
				);

				return $.article(
					{
						purchased: () => all_upgrades[i].purchased.toString(),
						affordable: () => (clicks >= item.cost).toString(),
					},
					$.h3(item.title),
					$.span({ class: "cost" }, () => `${item.cost} clicks`),
					$.p(item.description),
					// Requirements display
					$.div(
						{
							class: "requirements",
							style: () => {
								const reqs = item.requires.filter((r) => r && r !== "");
								return reqs.length > 0 ? "" : "display: none;";
							},
						},
						$.span("Requires: "),
						...item.requires
							.filter((r) => r && r !== "")
							.map((req, req_index, arr) =>
								$.span(
									{
										class: "requirement",
										fulfilled: () => isUpgradePurchased(req).toString(),
									},
									req,
									req_index < arr.length - 1 ? ", " : "",
								),
							),
					),
					// Purchase button
					$.button(
						{
							disabled: () =>
								all_upgrades[i].purchased || !canPurchaseUpgrade(all_upgrades[i])
									? ""
									: undefined,
							onclick() {
								if (canPurchaseUpgrade(all_upgrades[i])) {
									clicks -= item.cost;
									all_upgrades[i].purchased = true;

									// Auto-apply theme if it's the first one purchased
									if (isThemeUpgrade(item) && active_theme === "") {
										active_theme = getThemeNameFromType(item.type);
									}

									saveGame();
								}
							},
						},
						() => (all_upgrades[i].purchased ? "Purchased" : "Purchase"),
					),
					// Apply button for themes
					$.button(
						{
							class: "apply-button",
							style: () => {
								if (!isThemeUpgrade(item)) return "display: none;";
								if (!all_upgrades[i].purchased) return "display: none;";
								if (getThemeNameFromType(item.type) === active_theme)
									return "display: none;";
								return "";
							},
							onclick() {
								active_theme = getThemeNameFromType(item.type);
								saveGame();
							},
						},
						"Apply",
					),
					// Active indicator for themes
					$.span(
						{
							class: "active-indicator",
							style: () => {
								if (!isThemeUpgrade(item)) return "display: none;";
								if (!all_upgrades[i].purchased) return "display: none;";
								if (getThemeNameFromType(item.type) !== active_theme)
									return "display: none;";
								return "";
							},
						},
						"Active",
					),
					// Sell button
					$.button(
						{
							class: "sell-button",
							style: () => (all_upgrades[i].purchased ? "" : "display: none;"),
							onclick() {
								if (!all_upgrades[i].purchased) return;

								clicks += Math.floor(item.cost * 0.5);
								all_upgrades[i].purchased = false;

								// Clear active theme if selling the active one
								if (
									isThemeUpgrade(item) &&
									getThemeNameFromType(item.type) === active_theme
								) {
									active_theme = "";
								}

								// Reset physics when sold
								if (item.type === "physics" && button_ref.current) {
									button_x_offset = 0;
									button_y_offset = 0;
									button_velocity_x = 0;
									button_velocity_y = 0;
									button_ref.current.style.transform = "";
								}

								// Reset temperature when sold
								if (item.type === "temperature") {
									temperature = 50;
								}

								saveGame();
							},
						},
						() => `Sell (${Math.floor(item.cost * 0.5)})`,
					),
				);
			}),
		),
	);

	document.body.replaceChildren(main_element);

	// Initialize canvas size
	requestAnimationFrame(resizeCanvas);

	useGlobalStyles(css`
		* {
			touch-action: manipulation;
			user-select: none;
		}

		main {
			position: fixed;
			overflow: scroll;
			width: 100vw;
			height: 100dvh;
			scroll-snap-type: y mandatory;
			background: #ffffff;
			transition:
				background 0.3s,
				color 0.3s;
		}

		main[dark="true"],
		main[theme="dark"],
		main[theme="matrix"],
		main[theme="synthwave"] {
			background: #1a1a1a;
			color: #ffffff;
		}

		main[theme="win95"] {
			background: #008080;
		}

		main[theme="aqua"] {
			background: linear-gradient(180deg, #b8d4e8 0%, #7cb3d4 100%);
		}

		main[theme="matrix"] {
			background: #0a0a0a;
			color: #00ff00;
		}

		main[theme="synthwave"] {
			background: linear-gradient(180deg, #0f0f23 0%, #1a0a2e 50%, #0f0f23 100%);
		}

		main[theme="fire"] {
			background: linear-gradient(180deg, #1a0a00 0%, #2a0a00 50%, #1a0000 100%);
			color: #ffcc00;
		}

		/*
		// Particle canvas
		*/

		#particle-canvas {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			pointer-events: none;
			z-index: 1;
		}

		/*
		// Main view
		*/

		#main-view {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			width: 100vw;
			height: 100dvh;
			scroll-snap-align: start;
			scroll-snap-stop: always;
			gap: 1rem;
			z-index: 2;
		}

		/*
		// Temperature bar
		*/

		#temperature-bar {
			position: absolute;
			top: 20px;
			left: 50%;
			transform: translateX(-50%);
			width: 200px;
			height: 24px;
			background: #333;
			border: 2px solid #666;
			border-radius: 4px;
			overflow: hidden;
		}

		main[dark="true"] #temperature-bar,
		main[theme="matrix"] #temperature-bar,
		main[theme="synthwave"] #temperature-bar {
			background: #555;
			border-color: #888;
		}

		main[theme="win95"] #temperature-bar {
			background: #c0c0c0;
			border: 2px outset #ffffff;
			border-radius: 0;
		}

		main[theme="aqua"] #temperature-bar {
			background: rgba(255, 255, 255, 0.5);
			border: 1px solid rgba(0, 0, 0, 0.2);
			border-radius: 12px;
		}

		#temperature-fill {
			height: 100%;
			background: linear-gradient(90deg, #0066ff, #ff6600, #ff0000);
			transition: width 0.1s;
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			font-size: 12px;
			font-weight: bold;
			text-shadow: 1px 1px 1px #000;
		}

		main[theme="matrix"] #temperature-fill {
			background: linear-gradient(90deg, #003300, #00ff00);
		}

		main[theme="synthwave"] #temperature-fill {
			background: linear-gradient(90deg, #ff00ff, #00ffff);
		}

		main[theme="fire"] #temperature-fill {
			background: linear-gradient(90deg, #ff3300, #ffff00);
		}

		/*
		// Beat indicator
		*/

		#beat-indicator {
			position: absolute;
			top: 60px;
			left: 50%;
			transform: translateX(-50%);
			width: 200px;
			height: 20px;
			background: #333;
			border: 2px solid #666;
			border-radius: 4px;
			overflow: hidden;
		}

		main[dark="true"] #beat-indicator,
		main[theme="matrix"] #beat-indicator,
		main[theme="synthwave"] #beat-indicator {
			background: #555;
			border-color: #888;
		}

		main[theme="win95"] #beat-indicator {
			background: #c0c0c0;
			border: 2px inset #ffffff;
			border-radius: 0;
		}

		main[theme="aqua"] #beat-indicator {
			background: rgba(255, 255, 255, 0.5);
			border: 1px solid rgba(0, 0, 0, 0.2);
			border-radius: 10px;
		}

		.beat-zone {
			position: absolute;
			top: 0;
			height: 100%;
			width: 20%;
			background: rgba(0, 255, 0, 0.3);
		}

		main[theme="matrix"] .beat-zone {
			background: rgba(0, 255, 0, 0.5);
		}

		main[theme="synthwave"] .beat-zone {
			background: rgba(255, 0, 255, 0.4);
		}

		main[theme="fire"] .beat-zone {
			background: rgba(255, 100, 0, 0.5);
		}

		.beat-zone-left {
			left: 0;
		}

		.beat-zone-right {
			right: 0;
		}

		#beat-cursor {
			position: absolute;
			top: 0;
			width: 4px;
			height: 100%;
			background: #ffffff;
			transform: translateX(-50%);
			box-shadow: 0 0 4px #fff;
		}

		main[theme="matrix"] #beat-cursor {
			background: #00ff00;
			box-shadow: 0 0 10px #00ff00;
		}

		main[theme="synthwave"] #beat-cursor {
			background: #00ffff;
			box-shadow: 0 0 15px #00ffff;
		}

		main[theme="fire"] #beat-cursor {
			background: #ffff00;
			box-shadow: 0 0 10px #ff6600;
		}

		/*
		// Sniper container
		*/

		#sniper-container {
			position: absolute;
			bottom: 100px;
			left: 50%;
			transform: translateX(-50%);
			width: 300px;
			height: 60px;
			background: #222;
			border: 2px solid #666;
			border-radius: 4px;
			cursor: crosshair;
		}

		main[dark="true"] #sniper-container,
		main[theme="matrix"] #sniper-container,
		main[theme="synthwave"] #sniper-container {
			background: #444;
			border-color: #888;
		}

		main[theme="win95"] #sniper-container {
			background: #c0c0c0;
			border: 2px inset #ffffff;
			border-radius: 0;
		}

		main[theme="aqua"] #sniper-container {
			background: rgba(255, 255, 255, 0.4);
			border: 1px solid rgba(0, 0, 0, 0.2);
			border-radius: 30px;
		}

		main[theme="matrix"] #sniper-container {
			background: #001100;
			border-color: #00ff00;
		}

		main[theme="synthwave"] #sniper-container {
			background: rgba(255, 0, 255, 0.2);
			border-color: #ff00ff;
		}

		main[theme="fire"] #sniper-container {
			background: #220000;
			border-color: #ff3300;
		}

		#sniper-target {
			position: absolute;
			top: 50%;
			transform: translate(-50%, -50%);
			width: 30px;
			height: 30px;
			background: #ff0000;
			border-radius: 50%;
			pointer-events: none;
		}

		main[theme="matrix"] #sniper-target {
			background: #00ff00;
			box-shadow: 0 0 15px #00ff00;
		}

		main[theme="synthwave"] #sniper-target {
			background: linear-gradient(45deg, #ff00ff, #00ffff);
			box-shadow: 0 0 20px #ff00ff;
		}

		main[theme="fire"] #sniper-target {
			background: radial-gradient(circle, #ffff00, #ff6600, #ff0000);
			box-shadow: 0 0 15px #ff6600;
		}

		/*
		// CPS display
		*/

		#cps-display {
			position: absolute;
			top: 100px;
			left: 50%;
			transform: translateX(-50%);
			font-size: 14px;
			color: #666;
		}

		main[dark="true"] #cps-display,
		main[theme="synthwave"] #cps-display {
			color: #aaa;
		}

		main[theme="matrix"] #cps-display {
			color: #00ff00;
			text-shadow: 0 0 5px #00ff00;
		}

		main[theme="synthwave"] #cps-display {
			color: #ff00ff;
			text-shadow: 0 0 10px #ff00ff;
		}

		main[theme="fire"] #cps-display {
			color: #ffcc00;
			text-shadow: 0 0 5px #ff6600;
		}

		main[theme="win95"] #cps-display {
			color: #ffffff;
			text-shadow: 1px 1px 0 #000000;
		}

		/*
		// Keyboard hint
		*/

		#keyboard-hint {
			position: absolute;
			bottom: 60px;
			left: 50%;
			transform: translateX(-50%);
			font-size: 12px;
			color: #888;
		}

		main[dark="true"] #keyboard-hint {
			color: #666;
		}

		main[theme="matrix"] #keyboard-hint {
			color: #00aa00;
		}

		main[theme="synthwave"] #keyboard-hint {
			color: #aa00aa;
		}

		/*
		// Shop
		*/

		#shop {
			position: relative;
			display: grid;
			grid-template-rows: 1fr 1fr 1fr;
			grid-auto-flow: column;
			grid-auto-columns: 60vw;
			overflow-x: scroll;
			overflow-y: hidden;
			width: 100vw;
			height: 100dvh;
			background: lightgray;
			scroll-snap-align: start;
			scroll-snap-stop: always;
			padding: 1.5rem;
			gap: 1.5rem;
			z-index: 2;
		}

		main[dark="true"] #shop,
		main[theme="matrix"] #shop,
		main[theme="synthwave"] #shop {
			background: #2a2a2a;
		}

		main[theme="win95"] #shop {
			background: #c0c0c0;
		}

		main[theme="aqua"] #shop {
			background: linear-gradient(180deg, #7cb3d4 0%, #5a9fc4 100%);
		}

		main[theme="matrix"] #shop {
			background: #0a0a0a;
		}

		main[theme="synthwave"] #shop {
			background: #1a0a2e;
		}

		main[theme="fire"] #shop {
			background: #1a0500;
		}

		@media (min-width: 600px) {
			#shop {
				grid-auto-columns: 35vw;
			}
		}

		[shop="false"] #shop {
			display: none;
		}

		#shop-cta {
			position: absolute;
			bottom: 0;
			left: 50%;
			width: fit-content;
			animation: bounce-cta 3s ease-in-out infinite;
			z-index: 100;
		}

		[shop="false"] #shop-cta {
			display: none;
		}

		/*
		// Shop item
		*/

		#shop > article {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.25rem;
			background: white;
			padding: 0.5rem;
			border-radius: 3px;
			border: 1px solid #8c8c8c;
		}

		main[dark="true"] #shop > article,
		main[theme="matrix"] #shop > article,
		main[theme="synthwave"] #shop > article {
			background: #3a3a3a;
			border-color: #555;
		}

		main[theme="win95"] #shop > article {
			background: #c0c0c0;
			border: 2px outset #ffffff;
			border-radius: 0;
		}

		main[theme="aqua"] #shop > article {
			background: rgba(255, 255, 255, 0.8);
			border: 1px solid rgba(0, 0, 0, 0.15);
			border-radius: 8px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		}

		main[theme="matrix"] #shop > article {
			background: #001100;
			border-color: #00ff00;
		}

		main[theme="synthwave"] #shop > article {
			background: rgba(30, 10, 50, 0.9);
			border-color: #ff00ff;
			box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
		}

		main[theme="fire"] #shop > article {
			background: #1a0500;
			border-color: #ff3300;
			box-shadow: 0 0 10px rgba(255, 100, 0, 0.3);
		}

		#shop > article > h3 {
			grid-column-start: 1;
			grid-column-end: 2;
			margin: 0;
			font-size: 14px;
		}

		main[theme="matrix"] #shop > article > h3 {
			color: #00ff00;
		}

		main[theme="synthwave"] #shop > article > h3 {
			color: #00ffff;
		}

		main[theme="fire"] #shop > article > h3 {
			color: #ffcc00;
		}

		#shop > article > span.cost {
			grid-column-start: 2;
			grid-column-end: 3;
			text-align: right;
			font-size: 12px;
			color: #666;
		}

		main[dark="true"] #shop > article > span.cost,
		main[theme="synthwave"] #shop > article > span.cost {
			color: #aaa;
		}

		main[theme="matrix"] #shop > article > span.cost {
			color: #00aa00;
		}

		main[theme="fire"] #shop > article > span.cost {
			color: #ff9900;
		}

		#shop > article[affordable="true"] > span.cost {
			color: #00aa00;
			font-weight: bold;
		}

		main[theme="matrix"] #shop > article[affordable="true"] > span.cost {
			color: #00ff00;
			text-shadow: 0 0 5px #00ff00;
		}

		main[theme="synthwave"] #shop > article[affordable="true"] > span.cost {
			color: #00ffff;
			text-shadow: 0 0 5px #00ffff;
		}

		#shop > article > p {
			grid-column-start: 1;
			grid-column-end: 3;
			flex-grow: 1;
			font-size: 12px;
			margin: 0.25rem 0;
			color: #555;
		}

		main[dark="true"] #shop > article > p,
		main[theme="synthwave"] #shop > article > p {
			color: #999;
		}

		main[theme="matrix"] #shop > article > p {
			color: #00aa00;
		}

		main[theme="fire"] #shop > article > p {
			color: #cc9900;
		}

		#shop > article[purchased="true"] {
			background-color: #d0ffd0;
			border-color: #00aa00;
		}

		main[dark="true"] #shop > article[purchased="true"],
		main[theme="matrix"] #shop > article[purchased="true"],
		main[theme="synthwave"] #shop > article[purchased="true"] {
			background-color: #2a3a2a;
			border-color: #00aa00;
		}

		main[theme="win95"] #shop > article[purchased="true"] {
			background-color: #90c090;
		}

		main[theme="matrix"] #shop > article[purchased="true"] {
			background-color: #002200;
			border-color: #00ff00;
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
		}

		main[theme="synthwave"] #shop > article[purchased="true"] {
			background-color: #1a2a3a;
			border-color: #00ffff;
			box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
		}

		main[theme="fire"] #shop > article[purchased="true"] {
			background-color: #2a1a00;
			border-color: #ffcc00;
			box-shadow: 0 0 10px rgba(255, 200, 0, 0.3);
		}

		#shop > article > button:not(.sell-button) {
			grid-column-start: 1;
			grid-column-end: 2;
		}

		#shop > article > .sell-button {
			grid-column-start: 2;
			grid-column-end: 3;
			background: linear-gradient(#ffe5e5, #ffcccc);
			border-color: #cc0000;
		}

		#shop > article > .sell-button:hover {
			background-color: #ffb3b3;
		}

		#shop > article > .sell-button:active {
			background-color: #ff9999;
		}

		main[dark="true"] #shop > article > .sell-button,
		main[theme="matrix"] #shop > article > .sell-button,
		main[theme="synthwave"] #shop > article > .sell-button {
			background: linear-gradient(#4a2a2a, #3a1a1a);
			color: #ff6666;
		}

		main[theme="matrix"] #shop > article > .sell-button {
			background: #220000;
			border-color: #ff0000;
			color: #ff0000;
		}

		main[theme="synthwave"] #shop > article > .sell-button {
			background: linear-gradient(#3a1a2a, #2a0a1a);
			border-color: #ff0066;
			color: #ff0066;
		}

		/*
		// Button
		*/

		#the-button {
			background: linear-gradient(#f5f5f5, #e0e0e0);
			border: 1px solid #8c8c8c;
			border-radius: 3px;
			padding: 20px 40px;
			color: #333;
			box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset;
			cursor: pointer;
			font-size: 32px;
			min-width: 120px;
			text-align: center;
			transition: transform 0.05s;
		}

		main[dark="true"] #the-button {
			background: linear-gradient(#444, #333);
			border-color: #666;
			color: #fff;
		}

		main[theme="win95"] #the-button {
			background: #c0c0c0;
			border: 2px outset #ffffff;
			border-radius: 0;
			box-shadow: none;
			font-family: "MS Sans Serif", "Segoe UI", sans-serif;
		}

		main[theme="win95"] #the-button:active {
			border-style: inset;
		}

		main[theme="aqua"] #the-button {
			background: linear-gradient(180deg, #6cb4e8 0%, #2a8dd4 50%, #1a7dc4 100%);
			border: 1px solid #1a5a8a;
			border-radius: 20px;
			color: #ffffff;
			text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.3);
			box-shadow:
				0 1px 0 rgba(255, 255, 255, 0.5) inset,
				0 -1px 3px rgba(0, 0, 0, 0.2) inset,
				0 4px 8px rgba(0, 0, 0, 0.2);
		}

		main[theme="aqua"] #the-button:hover {
			background: linear-gradient(180deg, #7cc4f8 0%, #3a9de4 50%, #2a8dd4 100%);
		}

		main[theme="matrix"] #the-button {
			background: #001100;
			border: 2px solid #00ff00;
			color: #00ff00;
			box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
			text-shadow: 0 0 10px #00ff00;
			font-family: monospace;
		}

		main[theme="matrix"] #the-button:hover {
			background: #002200;
			box-shadow: 0 0 30px rgba(0, 255, 0, 0.7);
		}

		main[theme="synthwave"] #the-button {
			background: linear-gradient(180deg, #ff00ff, #aa00aa);
			border: 2px solid #ff00ff;
			color: #ffffff;
			box-shadow:
				0 0 30px rgba(255, 0, 255, 0.6),
				0 0 60px rgba(255, 0, 255, 0.3);
			text-shadow: 0 0 10px #ffffff;
			border-radius: 5px;
		}

		main[theme="synthwave"] #the-button:hover {
			background: linear-gradient(180deg, #ff66ff, #cc00cc);
			box-shadow:
				0 0 40px rgba(255, 0, 255, 0.8),
				0 0 80px rgba(255, 0, 255, 0.4);
		}

		main[theme="fire"] #the-button {
			background: linear-gradient(180deg, #ff6600, #cc3300, #990000);
			border: 2px solid #ff3300;
			color: #ffff00;
			box-shadow:
				0 0 20px rgba(255, 100, 0, 0.6),
				0 0 40px rgba(255, 50, 0, 0.3);
			text-shadow:
				0 0 10px #ff6600,
				0 0 20px #ff0000;
		}

		main[theme="fire"] #the-button:hover {
			background: linear-gradient(180deg, #ff8800, #ee4400, #aa0000);
			box-shadow:
				0 0 30px rgba(255, 100, 0, 0.8),
				0 0 60px rgba(255, 50, 0, 0.5);
		}

		#the-button:hover {
			background: linear-gradient(#e8e8e8, #d0d0d0);
			border-color: #888;
		}

		main[dark="true"] #the-button:hover {
			background: linear-gradient(#555, #444);
		}

		#the-button:active {
			background: linear-gradient(#d0d0d0, #c0c0c0);
			border-color: #666;
		}

		main[dark="true"] #the-button:active {
			background: linear-gradient(#333, #222);
		}

		button {
			background: linear-gradient(#f5f5f5, #e0e0e0);
			border: 1px solid #8c8c8c;
			border-radius: 3px;
			padding: 5px 10px;
			color: #333;
			cursor: pointer;
			font-size: 12px;
		}

		button:hover {
			background: linear-gradient(#e8e8e8, #d0d0d0);
		}

		button:active {
			background: linear-gradient(#d0d0d0, #c0c0c0);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		main[dark="true"] button,
		main[theme="matrix"] button,
		main[theme="synthwave"] button {
			background: linear-gradient(#444, #333);
			border-color: #666;
			color: #fff;
		}

		main[dark="true"] button:hover,
		main[theme="matrix"] button:hover,
		main[theme="synthwave"] button:hover {
			background: linear-gradient(#555, #444);
		}

		main[theme="win95"] button {
			background: #c0c0c0;
			border: 2px outset #ffffff;
			border-radius: 0;
			font-family: "MS Sans Serif", "Segoe UI", sans-serif;
		}

		main[theme="win95"] button:active {
			border-style: inset;
		}

		main[theme="aqua"] button {
			background: linear-gradient(180deg, #f0f0f0 0%, #d0d0d0 100%);
			border: 1px solid #999;
			border-radius: 12px;
			box-shadow:
				0 1px 0 rgba(255, 255, 255, 0.8) inset,
				0 1px 3px rgba(0, 0, 0, 0.1);
		}

		main[theme="matrix"] button {
			background: #001100;
			border: 1px solid #00ff00;
			color: #00ff00;
		}

		main[theme="matrix"] button:hover {
			background: #002200;
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}

		main[theme="synthwave"] button {
			background: linear-gradient(180deg, #3a1a4a, #2a0a3a);
			border: 1px solid #ff00ff;
			color: #ff00ff;
		}

		main[theme="synthwave"] button:hover {
			box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
		}

		main[theme="fire"] button {
			background: linear-gradient(180deg, #331100, #220800);
			border: 1px solid #ff6600;
			color: #ffcc00;
		}

		main[theme="fire"] button:hover {
			background: linear-gradient(180deg, #441500, #331000);
			box-shadow: 0 0 10px rgba(255, 100, 0, 0.5);
		}

		/*
// Requirements
*/

		#shop > article > .requirements {
			grid-column-start: 1;
			grid-column-end: 3;
			font-size: 11px;
			color: #888;
			margin-bottom: 0.25rem;
		}

		main[dark="true"] #shop > article > .requirements,
		main[theme="matrix"] #shop > article > .requirements,
		main[theme="synthwave"] #shop > article > .requirements {
			color: #777;
		}

		main[theme="matrix"] #shop > article > .requirements {
			color: #006600;
		}

		main[theme="fire"] #shop > article > .requirements {
			color: #996600;
		}

		#shop > article > .requirements .requirement[fulfilled="false"] {
			color: #cc0000;
			font-weight: bold;
		}

		#shop > article > .requirements .requirement[fulfilled="true"] {
			color: #00aa00;
		}

		main[theme="matrix"] #shop > article > .requirements .requirement[fulfilled="true"] {
			color: #00ff00;
		}

		main[theme="synthwave"] #shop > article > .requirements .requirement[fulfilled="true"] {
			color: #00ffff;
		}

		/*
// Apply button
*/

		#shop > article > .apply-button {
			grid-column-start: 1;
			grid-column-end: 2;
			background: linear-gradient(#e5f0ff, #cce0ff);
			border-color: #0066cc;
		}

		#shop > article > .apply-button:hover {
			background: linear-gradient(#d5e5ff, #b3d0ff);
		}

		main[dark="true"] #shop > article > .apply-button,
		main[theme="matrix"] #shop > article > .apply-button,
		main[theme="synthwave"] #shop > article > .apply-button {
			background: linear-gradient(#2a3a4a, #1a2a3a);
			border-color: #4488cc;
			color: #88ccff;
		}

		main[theme="matrix"] #shop > article > .apply-button {
			background: #001122;
			border-color: #00aaff;
			color: #00aaff;
		}

		main[theme="synthwave"] #shop > article > .apply-button {
			background: linear-gradient(#1a2a4a, #0a1a3a);
			border-color: #00ffff;
			color: #00ffff;
		}

		main[theme="fire"] #shop > article > .apply-button {
			background: linear-gradient(#2a1a00, #1a1000);
			border-color: #ffaa00;
			color: #ffcc00;
		}

		/*
// Active indicator
*/

		#shop > article > .active-indicator {
			grid-column-start: 1;
			grid-column-end: 2;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 11px;
			font-weight: bold;
			color: #00aa00;
			background: #e0ffe0;
			border: 1px solid #00aa00;
			border-radius: 3px;
			padding: 5px 10px;
		}

		main[dark="true"] #shop > article > .active-indicator,
		main[theme="matrix"] #shop > article > .active-indicator,
		main[theme="synthwave"] #shop > article > .active-indicator {
			background: #1a2a1a;
			color: #00ff00;
		}

		main[theme="matrix"] #shop > article > .active-indicator {
			background: #002200;
			border-color: #00ff00;
			box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
		}

		main[theme="synthwave"] #shop > article > .active-indicator {
			background: #1a2a3a;
			border-color: #00ffff;
			color: #00ffff;
			box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
		}

		main[theme="fire"] #shop > article > .active-indicator {
			background: #2a1a00;
			border-color: #ffcc00;
			color: #ffcc00;
			box-shadow: 0 0 5px rgba(255, 200, 0, 0.5);
		}

		main[theme="win95"] #shop > article > .active-indicator {
			background: #c0c0c0;
			border: 2px inset #ffffff;
			border-radius: 0;
		}

		main[theme="aqua"] #shop > article > .active-indicator {
			background: rgba(200, 255, 200, 0.8);
			border-radius: 10px;
		}

		/*
		// Animations
		*/

		@keyframes bounce-cta {
			0%,
			100% {
				transform: translate(-50%, -25%);
			}
			50% {
				transform: translate(-50%, -50%);
			}
		}
	`);
}
