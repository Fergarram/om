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
let has_weed_prescription = false;
let vending_machine_base_cost = 500;

let days_passed = 0;
let months_passed = 0;
let years_passed = 0;

let event_log = [];
let last_update_time = Date.now();

const event_types = [
	{
		description:
			"You were walking late at night, someone jumped in front with a knife. You lost all your cash.",
		min_hour: 22,
		max_hour: 4,
		is_positive: false,
		effect: () => {
			cash = 0;
		},
	},
	{
		description: "Your credit card got cloned. You got charged with $1,200.",
		min_hour: 0,
		max_hour: 23,
		is_positive: false,
		effect: () => {
			bank -= 1200;
		},
	},
	{
		description:
			"You had a small car accident and now have to pay 50% of your cash to bribe out of it.",
		min_hour: 8,
		max_hour: 18,
		is_positive: false,
		effect: () => {
			cash = Math.floor(cash * 0.5);
		},
	},
	{
		description: "You were looking down while walking and saw 100 bucks.",
		min_hour: 7,
		max_hour: 21,
		is_positive: true,
		effect: () => {
			cash += 100;
		},
	},
];

const vending_machine_types = [
	{
		name: "Mini vending machine",
		description: "A few good bucks every once in a while",
		min_income: 1,
		max_income: 15,
		interval_ticks: 1,
	},
	{
		name: "Snack dispenser",
		description: "Placed in front of a school",
		min_income: 5,
		max_income: 25,
		interval_ticks: 2,
	},
	{
		name: "Coffee machine",
		description: "Near the train station",
		min_income: 10,
		max_income: 40,
		interval_ticks: 3,
	},
	{
		name: "Combo machine",
		description: "Drinks and snacks combo",
		min_income: 15,
		max_income: 60,
		interval_ticks: 5,
	},
	{
		name: "Premium kiosk",
		description: "High-end goods for high-end prices",
		min_income: 25,
		max_income: 100,
		interval_ticks: 8,
	},
];

// Each owned machine: { type_index: number, accumulated: number }
let owned_vending_machines = [];

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
			owned_vending_machines.push({
				type_index: 0,
				accumulated: 0,
				ticks: 0,
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
		effect: () => {
			has_weed_prescription = true;
		},
		notes: "Relaxation and new ideas",
	},
	{
		visible: () => ideas[3].checked,
		description: "Sell magic cookies for $20 each",
		checked: false,
		isPurchasable: () => bank >= 100,
		purchase: () => {
			bank -= 100;
		},
		effect: () => {
			click_worth = 20;
			click_button_label = "Sell magic cookies";
		},
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

		// Check for random events for each day that passed
		for (let i = 0; i < days_elapsed; i++) {
			checkForRandomEvent();
		}

		// Check if we've crossed a payment due date
		if (days_passed >= next_payment_due_day && previous_days < next_payment_due_day) {
			const monthly_payment = INITIAL_DEBT / TOTAL_YEARS / 12;

			// Check if player can pay from bank
			if (bank >= monthly_payment) {
				bank -= monthly_payment;
				debt -= monthly_payment;
				stress_level = 10; // Reset stress to 10% after payment
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
	const monthly_payment = INITIAL_DEBT / TOTAL_YEARS / 12;

	// Calculate base stress growth
	let stress_growth_rate = 1.0;

	// If player has enough money in bank, stress grows half as fast
	if (bank >= monthly_payment) {
		stress_growth_rate *= 0.5;
	}

	// If player has weed prescription, cap stress growth at 50%
	if (has_weed_prescription) {
		stress_growth_rate = Math.min(stress_growth_rate, 0.5);
	}

	stress_level = Math.floor((day_in_month / 30) * 100 * stress_growth_rate);
}

function sellCandy() {
	cash += click_worth;
}

function saveInBank() {
	if (cash < 100) return;
	bank += cash;
	cash = 0;
}

function getNextVendingMachineCost() {
	return Math.floor(vending_machine_base_cost * Math.pow(1.5, owned_vending_machines.length));
}

function getNextVendingMachineType() {
	return owned_vending_machines.length;
}

function buyVendingMachine() {
	if (owned_vending_machines.length >= 5) return;
	const cost = getNextVendingMachineCost();
	if (bank < cost) return;

	bank -= cost;
	owned_vending_machines.push({
		type_index: getNextVendingMachineType(),
		accumulated: 0,
		ticks: 0,
	});

	saveGameState();
}

function collectFromMachine(index) {
	if (index >= owned_vending_machines.length) return;
	if (owned_vending_machines[index].accumulated <= 0) return;

	cash += owned_vending_machines[index].accumulated;
	owned_vending_machines[index].accumulated = 0;
	saveGameState();
}

function updateVendingMachines() {
	owned_vending_machines.forEach((machine) => {
		const machine_type = vending_machine_types[machine.type_index];
		machine.ticks = (machine.ticks || 0) + 1;

		if (machine.ticks >= machine_type.interval_ticks) {
			const income_range = machine_type.max_income - machine_type.min_income + 1;
			const random_income = machine_type.min_income + Math.floor(Math.random() * income_range);
			machine.accumulated += random_income;
			machine.ticks = 0;
		}
	});
}

function generateEventTime(min_hour, max_hour) {
	let hour;
	if (min_hour > max_hour) {
		// Wraps around midnight (e.g., 22 to 4)
		const range = 24 - min_hour + max_hour + 1;
		const random_offset = Math.floor(Math.random() * range);
		hour = (min_hour + random_offset) % 24;
	} else {
		hour = min_hour + Math.floor(Math.random() * (max_hour - min_hour + 1));
	}

	const minute = Math.floor(Math.random() * 60);
	const period = hour >= 12 ? "PM" : "AM";
	const display_hour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

	return `${display_hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function checkForRandomEvent() {
	// 0% stress = 1 event per 6 months = ~0.167 per month
	// 100% stress = 4 events per month
	const stress_factor = stress_level / 100;
	const events_per_month = 0.167 + stress_factor * (4 - 0.167);
	const daily_probability = events_per_month / 30;

	if (Math.random() < daily_probability) {
		triggerRandomEvent();
	}
}

function triggerRandomEvent() {
	const event_type = event_types[Math.floor(Math.random() * event_types.length)];
	const time = generateEventTime(event_type.min_hour, event_type.max_hour);

	event_type.effect();

	event_log.unshift({
		time: time,
		description: event_type.description,
		day: days_passed,
	});

	if (event_log.length > 20) {
		event_log.pop();
	}
}

function payDebtManually() {
	const monthly_payment = INITIAL_DEBT / TOTAL_YEARS / 12;
	if (bank < monthly_payment) return;
	if (debt <= 0) return;

	const payment = Math.min(monthly_payment, debt);
	bank -= payment;
	debt -= payment;
	next_payment_due_day += 30;
	stress_level = Math.max(0, stress_level - 20);

	saveGameState();
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
		has_weed_prescription,
		owned_vending_machines,
		checked_ideas: ideas.map((idea) => idea.checked),
		event_log,
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
		has_weed_prescription = state.has_weed_prescription || false;
		owned_vending_machines = state.owned_vending_machines || [];
		event_log = state.event_log || [];

		// Restore checked ideas state and re-apply their effects
		if (state.checked_ideas) {
			state.checked_ideas.forEach((checked, index) => {
				if (checked && index < ideas.length) {
					ideas[index].checked = checked;
					// Skip vending machine idea effect - machines already restored
					if (index !== 2) {
						ideas[index].effect();
					}
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

// Generate passive income every second (for future ideas)
setInterval(() => {
	passive_income_functions.forEach((fn) => fn());
}, passive_income_interval);

// Update vending machines every second
setInterval(() => {
	updateVendingMachines();
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
				$.div(
					{
						class: () => "flex justify-between w-full " + (bank < 0 ? "text-red-700" : ""),
					},
					$.p(() => `Bank: $${bank}`),
					$.button(
						{
							disabled: () => {
								const monthly_payment = INITIAL_DEBT / TOTAL_YEARS / 12;
								return bank < monthly_payment || debt <= 0 ? "true" : undefined;
							},
							onclick: payDebtManually,
						},
						"Pay debt",
					),
				),
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
			$.br(),

			$.div(
				{
					class: () => (!ideas[2].checked ? "hidden" : ""),
				},
				$.h2("VENDING MACHINES"),
				$.p({ class: "opacity-40" }, "Easy money $_$"),
				$.br(),
				...[0, 1, 2, 3, 4].map((index) => {
					return $.div(
						{
							style: () => (index >= owned_vending_machines.length ? "display: none" : ""),
							class: "grid grid-cols-2",
						},
						$.div(
							$.p(() => {
								if (index >= owned_vending_machines.length) return "";
								return vending_machine_types[owned_vending_machines[index].type_index].name;
							}),
							$.p({ class: "opacity-40 " }, () => {
								if (index >= owned_vending_machines.length) return "";
								return vending_machine_types[owned_vending_machines[index].type_index]
									.description;
							}),
							$.br(),
						),
						$.button(
							{
								disabled: () => {
									if (index >= owned_vending_machines.length) return "true";
									return owned_vending_machines[index].accumulated <= 0
										? "true"
										: undefined;
								},
								onclick: () => collectFromMachine(index),
							},
							() => {
								if (index >= owned_vending_machines.length) return "Collect $0";
								return `Collect $${owned_vending_machines[index].accumulated}`;
							},
						),
					);
				}),
				$.br(),
				$.div(
					{
						style: () => (owned_vending_machines.length >= 5 ? "display: none" : ""),
					},
					$.p({ class: "opacity-40 " }, () => {
						const next_type = getNextVendingMachineType();
						if (next_type >= 5) return "";
						return `Next: ${vending_machine_types[next_type].name}`;
					}),
				),
				$.button(
					{
						class: () => (owned_vending_machines.length >= 5 ? "hidden!" : ""),
						disabled: () =>
							owned_vending_machines.length >= 5 || bank < getNextVendingMachineCost()
								? "true"
								: undefined,
						onclick: buyVendingMachine,
					},
					() => `Acquire new machine for $${getNextVendingMachineCost()}`,
					$.br(),
				),
			),
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
							const clamped_stress = Math.min(stress_level, 100);
							const filled_slashes = Math.floor((clamped_stress / 100) * 30);
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
				$.p(`Next payment due in:`),
				$.p(() => {
					const day_in_cycle = days_passed % 30;
					const days_remaining = day_in_cycle === 0 ? 30 : 30 - day_in_cycle;
					return `${days_remaining} days`;
				}),
				$.p(`Payments left:`),
				$.p(() => {
					const total_payments = TOTAL_YEARS * 12;
					const payments_made = Math.floor(days_passed / 30);
					return `${total_payments - payments_made}`;
				}),
				$.p(`Years of debt left:`),
				$.p(() => TOTAL_YEARS - years_passed),
			),
			$.div(
				{
					class: "flex flex-col",
				},
				$.br(),
				$.br(),
				$.h2("EVENTS"),
				$.br(),
				() => {
					return $.div(
						...event_log.map((event) =>
							$.div(
								{
									class: "flex gap-8",
								},
								$.p({ class: "min-w-16" }, event.time),
								$.div(
									$.p(
										{
											class: "whitespace-normal",
										},
										event.description,
									),
									$.br(),
								),
							),
						),
					);
				},
			),
		),
		...[1, 2, 3, 4, 5, 6].map(() => PageColumn()),
		PageColumn(
			$.button(
				{
					onclick: resetGame,
				},
				"Reset Game",
			),
		),
	),
);

function PageColumn(...children) {
	return $.div(
		{
			class: "pl-6 min-w-[32rem] max-w-[32rem] pt-8",
			style: `
			background-image: url(/modules/student-debt/bg.png);
			background-size: 100%;
		`,
		},
		...children,
	);
}
