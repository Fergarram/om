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
			title: "Bitcoin Mining",
			cost: 100,
			description: "Generate 1 click per second automatically",
			type: "auto",
			purchased: false,
			requires: [""],
			cps: 1,
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
		{
			title: "Outsourcerer",
			cost: 200,
			description: "Hire Rajesh to click for you (0.5 clicks/sec)",
			type: "auto",
			purchased: false,
			requires: [""],
			cps: 0.5,
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
			title: "Temperature Threshold",
			cost: 300,
			description:
				"Click to stay hot. Max temp = x10 all multipliers. 0 temp = lose all multipliers",
			type: "temperature",
			purchased: false,
			requires: [""],
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
			title: "Keyboard Shortcuts",
			cost: 50,
			description: "Press Space or Enter to click. Unlocks finger-free clicking",
			type: "keyboard",
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
	];

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

	function handleClick() {
		let final_multiplier = 1;

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

	// Game loop
	let last_time = performance.now();

	function gameLoop() {
		const now = performance.now();
		const delta = (now - last_time) / 1000;
		last_time = now;

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

	main_element = $.main(
		{
			shop: () => (clicks >= 1).toString(),
			dark: () => isUpgradePurchased("Dark Mode").toString(),
			onwheel: handleWheel,
		},
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
				return $.article(
					{
						purchased: () => all_upgrades[i].purchased.toString(),
						affordable: () => (clicks >= item.cost).toString(),
					},
					$.h3(item.title),
					$.span({ class: "cost" }, () => `${item.cost} clicks`),
					$.p(item.description),
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
								}
							},
						},
						() => (all_upgrades[i].purchased ? "Purchased" : "Purchase"),
					),
					$.button(
						{
							class: "sell-button",
							style: () => (all_upgrades[i].purchased ? "" : "display: none;"),
							onclick() {
								if (!all_upgrades[i].purchased) return;

								clicks += Math.floor(item.cost * 0.5);
								all_upgrades[i].purchased = false;

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
							},
						},
						() => `Sell (${Math.floor(item.cost * 0.5)})`,
					),
				);
			}),
		),
	);

	document.body.replaceChildren(main_element);

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

		main[dark="true"] {
			background: #1a1a1a;
			color: #ffffff;
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

		main[dark="true"] #temperature-bar {
			background: #555;
			border-color: #888;
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

		main[dark="true"] #beat-indicator {
			background: #555;
			border-color: #888;
		}

		.beat-zone {
			position: absolute;
			top: 0;
			height: 100%;
			width: 20%;
			background: rgba(0, 255, 0, 0.3);
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

		main[dark="true"] #sniper-container {
			background: #444;
			border-color: #888;
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

		main[dark="true"] #cps-display {
			color: #aaa;
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
		}

		main[dark="true"] #shop {
			background: #2a2a2a;
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

		main[dark="true"] #shop > article {
			background: #3a3a3a;
			border-color: #555;
		}

		#shop > article > h3 {
			grid-column-start: 1;
			grid-column-end: 2;
			margin: 0;
			font-size: 14px;
		}

		#shop > article > span.cost {
			grid-column-start: 2;
			grid-column-end: 3;
			text-align: right;
			font-size: 12px;
			color: #666;
		}

		main[dark="true"] #shop > article > span.cost {
			color: #aaa;
		}

		#shop > article[affordable="true"] > span.cost {
			color: #00aa00;
			font-weight: bold;
		}

		#shop > article > p {
			grid-column-start: 1;
			grid-column-end: 3;
			flex-grow: 1;
			font-size: 12px;
			margin: 0.25rem 0;
			color: #555;
		}

		main[dark="true"] #shop > article > p {
			color: #999;
		}

		#shop > article[purchased="true"] {
			background-color: #d0ffd0;
			border-color: #00aa00;
		}

		main[dark="true"] #shop > article[purchased="true"] {
			background-color: #2a3a2a;
			border-color: #00aa00;
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

		main[dark="true"] #shop > article > .sell-button {
			background: linear-gradient(#4a2a2a, #3a1a1a);
			color: #ff6666;
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

		main[dark="true"] button {
			background: linear-gradient(#444, #333);
			border-color: #666;
			color: #fff;
		}

		main[dark="true"] button:hover {
			background: linear-gradient(#555, #444);
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
