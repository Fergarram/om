import { useTags } from "ima";
import { finish } from "utils";
const $ = useTags();

//
// State
//

const INITIAL_DEBT = 1_500_000;
const TOTAL_YEARS = 50;

let cash = 0;
let debt = INITIAL_DEBT;
let bank = 50;
let stress_level = 0; // 0 to 100

let days_passed = 0;
let months_passed = 0;
let years_passed = 0;

let last_update_time = Date.now();
const MILLISECONDS_PER_DAY = 10000; // 3 seconds = 1 day

const ideas = [
	{
		description: "Sell candy on the street",
		checked: true,
		isPurchasable: () => true,
		implementIdea: () => {},
		notes: "",
	},
	{
		description: "Sell homemade cookies for $4 each",
		checked: false,
		isPurchasable: () => bank >= 120,
		implementIdea: () => {
			bank -= 120;
		},
		notes: "Requires $120 in bank",
	},
	{
		description: "Buy a mini vending machine for $500",
		checked: false,
		isPurchasable: () => bank >= 500,
		implementIdea: () => {
			bank -= 500;
		},
		notes: "Generate passive income",
	},
];

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

	// Update stress level based on current day in month
	const day_in_month = days_passed % 30;
	stress_level = Math.floor((day_in_month / 30) * 100);
}

function sellCandy() {
	cash += 2;
}

function generatePassiveIncome() {
	const random_income = Math.floor(Math.random() * 16); // 0 to 15
	cash += random_income;
}

function saveInBank() {
	if (cash < 100) return;
	bank += cash;
	cash = 0;
}

async function resetGame() {
	localStorage.removeItem("student_debt_game");
	await finish();
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
		stress_level,
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
		stress_level = state.stress_level || 0;

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

// Generate passive income every second
// setInterval(() => {
// 	generatePassiveIncome();
// }, 1000);

//
// Layout
//

document.body.replaceChildren(
	$.main(
		{
			class: "flex whitespace-nowrap w-full overflow-scroll min-h-screen bg-neutral-200",
		},
		PageColumn(
			$.h1("HOW THE FUCK WILL I PAY THIS?"),
			$.br(),
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.p(() => `Debt: $${debt.toLocaleString()}`),
				$.p(() => `Bank: $${bank}`),
			),
			$.br(),
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.button(
					{
						onclick: sellCandy,
					},
					"Sell candy",
				),
				$.div(
					{
						class: "flex justify-between w-full",
					},
					$.p(() => `Cash: $${cash}`),
					$.button(
						{
							disabled: () => (cash < 100 ? "true" : undefined),
							onclick: saveInBank,
						},
						"Save in bank",
					),
				),
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
			$.h2("JOURNAL"),
			$.br(),
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.div(
					$.p(() => `Days passed: ${days_passed} / 30`),
					$.p(() => `Months passed: ${months_passed} / 12`),
					$.p(() => `Years passed: ${years_passed} / ${TOTAL_YEARS}`),
					$.br(),
				),
				$.div(
					$.p("Stress meter:"),
					$.div(
						{
							class: "border w-full h-5 text-red-700 font-mono flex items-center px-1",
						},
						() => {
							const filled_slashes = Math.floor((stress_level / 100) * 30);
							return "/".repeat(filled_slashes);
						},
					),
				),
				$.p("Monthly payment:"),
				$.p(
					$.span({ class: "text-red-700" }, "$", () => bank),
					" / ",
					"$",
					INITIAL_DEBT / TOTAL_YEARS / 12,
				),
			),
		),
		PageColumn(
			$.p("IDEAS"),
			$.br(),
			...ideas.map((idea, i) => {
				return $.div(
					() => {
						if (idea.checked) {
							return $.p({ class: "line-through decoration-2" }, `- ${idea.description}`);
						} else if (idea.isPurchasable()) {
							return $.button(`- ${idea.description}`);
						} else {
							return $.p(`- ${idea.description}`);
						}
					},
					$.p({ class: "opacity-40 pl-4" }, idea.notes),
					$.br(),
				);
			}),
		),
	),
);

function PageColumn(...children) {
	return $.div(
		{
			class: "pl-6 min-w-[32rem] pt-8",
			style: `
			background-image: url(/modules/student-debt/bg.png);
			background-size: 100%;
		`,
		},
		...children,
	);
}
