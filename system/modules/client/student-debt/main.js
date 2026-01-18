import { useTags } from "ima";
const $ = useTags();

//
// State
//

let days_passed = 0;
let months_passed = 0;
let years_passed = 0;

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
				$.h1("Debt: $500,000"),
				$.p("Bank: $50"),
			),
			$.br(),
			$.div(
				{
					class: "flex justify-between",
				},
				$.button("Sell candy"),
				$.p("Cash: $0"),
			),
		),
		PageColumn(
			$.div(
				{
					class: "grid grid-cols-2",
				},
				$.div($.p("Days passed: 1"), $.p("Months passed: 1"), $.p("Years passed: 1")),
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
