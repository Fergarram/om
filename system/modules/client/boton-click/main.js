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
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Advanced Mining Rig",
			cost: 500,
			description: "Generate 5 clicks per second automatically",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Outsourcerer",
			cost: 200,
			description: "Hire Rajesh to click for you (0.5 clicks/sec)",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Physics",
			cost: 150,
			description: "Button floats up with each click, adding weight to your efforts",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Temperature Threshold",
			cost: 300,
			description:
				"Click to stay hot. Max temp = x10 all multipliers. 0 temp = lose all multipliers",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "I make beats",
			cost: 250,
			description: "Follow the beat for x2 clicks. Off-beat = normal clicks",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Keyboard Shortcuts",
			cost: 50,
			description: "Press Space or Enter to click. Unlocks finger-free clicking",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
		{
			title: "Sniper Mode",
			cost: 400,
			description: "Click a moving target. Hit = x2 clicks. Miss = lose 10 clicks",
			type: "multiplier",
			purchased: false,
			requires: [""],
		},
	];

	function handleWheel(e) {
		// Only handle vertical scroll events
		if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) {
			return;
		}

		const delta_y = e.deltaY;

		e.preventDefault();

		// Determine scroll direction and scroll one full viewport height
		const scroll_amount = delta_y > 0 ? main_element.clientHeight : -main_element.clientHeight;

		main_element.scrollBy({
			top: scroll_amount,
			behavior: "smooth",
		});
	}

	main_element = $.main(
		{
			shop: () => (clicks >= 1).toString(),
			onwheel: handleWheel,
		},
		$.section(
			{
				id: "main-view",
			},
			$.button(
				{
					id: "the-button",
					onclick() {
						clicks++;
					},
				},
				() => clicks.toString(),
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
					},
					$.h3(item.title),
					$.span(item.cost),
					$.p(item.description),
					$.button(
						{
							disabled: () => (all_upgrades[i].purchased ? "" : undefined),
							onclick() {
								if (!all_upgrades[i].purchased && clicks >= item.cost) {
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
		}

		/*
		// Main view
		*/

		#main-view {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100vw;
			height: 100dvh;
			scroll-snap-align: start;
			scroll-snap-stop: always;
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
			grid-template-cols: 1fr 1fr;
			gap: 0.25rem;
			background: white;
			padding: 0.5rem;
			border-radius: 3px;
			border: 1px solid #8c8c8c;
		}

		#shop > article > h2 {
			grid-column-start: 1;
			grid-column-end: 2;
		}

		#shop > article > span {
			grid-column-start: 2;
			grid-column-end: 3;
			text-align: right;
		}

		#shop > article > p {
			grid-column-start: 1;
			grid-column-end: 3;
			flex-grow: 1;
		}

		#shop > article[purchased="true"] {
			background-color: lightgray;
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

		/*
		// Button
		*/

		#the-button {
			background: linear-gradient(#f5f5f5, #e0e0e0);
			border: 1px solid #8c8c8c;
			border-radius: 3px;
			padding: 5px 10px;
			color: #333;
			box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset;
			cursor: pointer;
			font-size: 24px;
		}

		#the-button:hover {
			background-color: #d0d0d0;
			border-color: #888;
		}

		#the-button:active {
			background-color: #c0c0c0;
			border-color: #666;
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
