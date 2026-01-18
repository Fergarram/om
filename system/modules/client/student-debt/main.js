import { useTags } from "ima";
const $ = useTags();

//
// State
//

let cash = 0;
let debt = 100_000_000;
let bank = 50;

let days_passed = 0;
let months_passed = 0;
let years_passed = 0;

let last_update_time = Date.now();
const MILLISECONDS_PER_DAY = 3000; // 3 seconds = 1 day

//
// Game Logic
//

function updateGameTime() {
	const current_time = Date.now();
	const elapsed_ms = current_time - last_update_time;

	const days_elapsed = Math.floor(elapsed_ms / MILLISECONDS_PER_DAY);

	if (days_elapsed > 0) {
		days_passed += days_elapsed;
		months_passed = Math.floor(days_passed / 30);
		years_passed = Math.floor(days_passed / 365);

		last_update_time = current_time - (elapsed_ms % MILLISECONDS_PER_DAY);
	}
}

function handleSellCandy() {
	cash += 1;
}

function resetGame() {
	localStorage.removeItem("student_debt_game");
	location.reload();
}

function saveGameState() {
	const game_state = {
		cash,
		debt,
		bank,
		days_passed,
		months_passed,
		years_passed,
		last_update_time,
	};
	localStorage.setItem("student_debt_game", JSON.stringify(game_state));
}

function loadGameState() {
	const saved_state = localStorage.getItem("student_debt_game");
	if (saved_state) {
		const state = JSON.parse(saved_state);
		cash = state.cash;
		debt = state.debt;
		bank = state.bank;
		days_passed = state.days_passed;
		months_passed = state.months_passed;
		years_passed = state.years_passed;
		last_update_time = state.last_update_time;

		// Calculate time passed since last save
		updateGameTime();
	}
}

// Load saved game on startup
loadGameState();

// Update game time every 100ms
setInterval(() => {
	updateGameTime();
	saveGameState();
}, 100);

//
// Layout
//

document.body.replaceChildren(
	$.main(
		{
			class: "flex whitespace-nowrap w-full overflow-scroll min-h-screen bg-neutral-200",
		},
		PageColumn(
			$.div(
				{
					class: "flex justify-evenly",
				},
				$.h1(() => `Debt: $${debt.toLocaleString()}`),
				$.p(() => `Bank: $${bank}`),
			),
			$.br(),
			$.div(
				{
					class: "flex justify-between",
				},
				$.button(
					{
						onclick: handleSellCandy,
					},
					"Sell candy",
				),
				$.p(() => `Cash: $${cash}`),
			),
			$.br(),
			$.button(
				{
					onclick: resetGame,
					class: "text-sm text-gray-600",
				},
				"Reset Game",
			),
		),
		PageColumn(
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.div(
					$.p(() => `Days passed: ${days_passed}`),
					$.p(() => `Months passed: ${months_passed}`),
					$.p(() => `Years passed: ${years_passed}`),
				),
				$.div(
					$.p("Stress meter:"),
					$.div(
						{
							class: "border w-full h-5 text-red-700",
						},
						// 30 characters for filled bar:
						"//////////////////////////////",
					),
				),
			),
		),
		PageColumn($.p("Ideas:")),
	),
);

function PageColumn(...children) {
	return $.div(
		{
			class: "px-4 min-w-[32rem] pt-3",
			style: `
			background-image: url(https://img.freepik.com/free-vector/blank-white-notepaper-design_53876-118304.jpg?semt=ais_hybrid&w=740&q=80);
			background-size: 100%;
			background-position: 432px;
		`,
		},
		...children,
	);
}
