import { useTags } from "ima";
import { finish } from "utils";
const $ = useTags();

//
// State
//

const INITIAL_DEBT = 1_500_000;
const TOTAL_YEARS = 50;
const MILLISECONDS_PER_DAY = 10000; // 3 seconds = 1 day

let cash = 0;
let debt = INITIAL_DEBT;
let bank = 50;
let passive_income_functions = [];
let passive_income_interval = 1000;
let stress_level = 0; // 0 to 100
let click_worth = 2;
let click_button_label = "Sell candy";
let next_payment_due_day = 30;

let days_passed = 0;
let months_passed = 0;
let years_passed = 0;

let last_update_time = Date.now();

const ideas = [
	{
		visible: () => true,
		description: "Sell candy on the street",
		checked: true,
		isPurchasable: () => true,
		purchase: () => {},
		effect: () => {},
		notes: "",
	},
	{
		visible: () => true,
		description: "Sell homemade cookies for $4 each",
		checked: false,
		isPurchasable: () => bank >= 120,
		purchase: () => {
			bank -= 120;
		},
		effect: () => {
			click_worth = 4;
			click_button_label = "Sell cookies";
		},
		notes: "Requires $120 in bank",
	},
	{
		visible: () => true,
		description: "Buy a mini vending machine for $500",
		checked: false,
		isPurchasable: () => bank >= 500,
		purchase: () => {
			bank -= 500;
		},
		effect: () => {
			passive_income_functions.push(() => {
				const random_income = Math.floor(Math.random() * 16);
				cash += random_income;
			});
		},
		notes: "Generate passive income",
	},
	{
		visible: () => true,
		description: "Get a weed prescription for $1,500",
		checked: false,
		isPurchasable: () => bank >= 1500,
		purchase: () => {
			bank -= 1500;
		},
		effect: () => {},
		notes: "Relaxation and new ideas",
	},
	{
		visible: () => ideas[3].checked,
		description: "Sell magic cookies for $20 each",
		checked: false,
		isPurchasable: () => bank >= 1500,
		purchase: () => {
			bank -= 1500;
		},
		effect: () => {},
		notes: "Could go wrong, but let's see",
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
		const previous_days = days_passed;
		days_passed += days_elapsed;
		months_passed = Math.floor(days_passed / 30);
		years_passed = Math.floor(days_passed / 365);

		// Check if we've crossed a payment due date
		if (days_passed >= next_payment_due_day && previous_days < next_payment_due_day) {
			const monthly_payment = INITIAL_DEBT / TOTAL_YEARS / 12;

			// Check if player can pay from bank
			if (bank >= monthly_payment) {
				bank -= monthly_payment;
				debt -= monthly_payment;
			} else {
				// Punishment for missing payment
				debt = debt * 1.025; // Increase debt by 2.5%
				bank -= 500; // Penalty
			}

			// Set next payment due date
			next_payment_due_day += 30;
		}

		last_update_time = current_time - (elapsed_ms % MILLISECONDS_PER_DAY);
	}

	// Update stress level based on current day in month
	const day_in_month = days_passed % 30;
	stress_level = Math.floor((day_in_month / 30) * 100);
}

function sellCandy() {
	cash += click_worth;
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
		click_button_label,
		click_worth,
		passive_income_interval,
		next_payment_due_day,
		checked_ideas: ideas.map((idea) => idea.checked),
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
		passive_income_interval = state.passive_income_interval || 1000;
		next_payment_due_day = state.next_payment_due_day || 30;

		// Restore checked ideas state and re-apply their effects
		if (state.checked_ideas) {
			state.checked_ideas.forEach((checked, index) => {
				if (checked && index < ideas.length) {
					ideas[index].checked = checked;
					// Re-apply effects only (no cost)
					ideas[index].effect();
				}
			});
		}

		// Override these after reapplying effects
		click_button_label = state.click_button_label || "Sell candy";
		click_worth = state.click_worth || 2;

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
setInterval(() => {
	passive_income_functions.forEach((fn) => fn());
}, passive_income_interval);

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
					() => click_button_label,
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
					$.p("Monthly payment:"),
					$.p(
						$.span(
							{
								class: () => (bank < INITIAL_DEBT / TOTAL_YEARS / 12 ? "text-red-700" : ""),
							},
							"$",
							() => bank,
						),
						" / ",
						"$",
						INITIAL_DEBT / TOTAL_YEARS / 12,
					),
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
			),
			$.br(),
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.p(() => `Next payment due in:`),
				$.p(() => `${next_payment_due_day - days_passed} days`),
				$.p(() => `Payments left:`),
				$.p(() => {
					const total_payments = TOTAL_YEARS * 12;
					const payments_made = Math.floor(days_passed / 30);
					return `${total_payments - payments_made}`;
				}),
				$.p(() => `Years of debt left:`),
				$.p(() => TOTAL_YEARS - years_passed),
			),
		),
		PageColumn(
			$.p("IDEAS"),
			$.br(),
			...ideas.map((idea, i) => {
				return $.div(
					{
						style: () => (!idea.visible() ? "display: none" : ""),
					},
					() => {
						if (idea.checked) {
							return $.p({ class: "line-through decoration-2" }, `- ${idea.description}`);
						} else if (idea.isPurchasable()) {
							return $.button(
								{
									onclick() {
										idea.checked = true;
										idea.purchase();
										idea.effect();
									},
								},
								`- ${idea.description}`,
							);
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
