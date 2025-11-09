//
// Not Figma Experiment
//
// Doesn't work on Firefox
//

import { useStyledTags, useCustomStyledTag, main, div, icon, span, pre, iframe, button } from "@std/ima-utils";
import { css } from "@std/utils";

const root_el = document.querySelector("main");

const CanvasContainer = useCustomStyledTag("canvas-container", function ({ $listen }) {
	return {
		connected() {
			this.dispatchEvent(new CustomEvent("mount"));
		},

		disconnected() {
			this.dispatchEvent(new CustomEvent("unmount"));
		},
	};
});

function buildIframeTree(iframe_window) {
	const doc = iframe_window.document;

	const $iframe = useStyledTags({
		iframe_document: doc,
	});

	let external_count = 0;
	// doc.body.appendChild($iframe.div(() => external_count++));
	doc.body.appendChild(
		$iframe.div(
			{
				styles: css`
					& {
						position: fixed;
						bottom: 1rem;
						right: 1rem;
					}
				`,
			},
			"wtf this is pos fixed",
		),
	);
}

function Main() {
	const iframe_ref = {
		current: null,
	};

	return main(
		{
			styles: `
				& {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100vh;
					background-color: #111;
					color: white;
				}
			`,
		},
		div(
			{
				styles: css`
					& {
						position: fixed;
						left: 0;
						top: 0;
						width: 280px;
						height: 100vh;
						display: flex;
						flex-direction: column;
						background: #252525ca;
						backdrop-filter: blur(20px);
						padding: 8px 12px;
						z-index: 100000;
						font-family: "Jetbrains Mono";
						font-size: 13px;
					}
				`,
			},
			pre(
				{
					styles: css`
						& {
							font-family: "Jetbrains Mono";
							font-size: 13px;
						}
						& span {
							opacity: 0.5;
						}
					`,
				},
				`main`,
				span("#container"),
				`
	div
	div
		h1
`,
			),
		),
		CanvasContainer(
			{
				id: "canvas",
				styles: css`
					& {
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
						height: 100%;
						overflow: scroll;
					}
				`,
				onmount() {
					this.scrollTo({
						left: 25000 - window.innerWidth / 2,
						top: 25000 - window.innerHeight / 2,
					});

					buildIframeTree(iframe_ref.current.contentWindow);
				},
			},
			div(
				{
					styles: css`
						& {
							position: relative;
							display: flex;
							align-items: center;
							justify-content: center;
							width: 50000px;
							height: 50000px;
						}
					`,
				},
				iframe({
					ref: iframe_ref,
					// Page viewport
					styles: css`
						& {
							position: absolute;
							width: 320px;
							height: 600px;
							background: white;
						}
					`,
					// srcdoc: () => iframe_src
				}),
			),
		),
		div(
			{
				styles: css`
					& {
						position: fixed;
						right: 0;
						top: 0;
						width: 280px;
						height: 100vh;
						display: flex;
						flex-direction: column;
						background: #252525ca;
						backdrop-filter: blur(20px);
						padding: 8px 12px;
						z-index: 100000;
						font-family: "Jetbrains Mono";
						font-size: 13px;
					}

					& span {
						opacity: 0.5;
					}
				`,
			},
			div("main", span("#container"), "-> div -> h1"),
			pre(`
{
	styles...
},

{
	attrs...
},

children: [
	child1,
	child2,
	child3,
	...
]
`),
		),
		div(
			{
				id: "toolbar",
				styles: css`
					& {
						position: fixed;
						left: 50%;
						bottom: 16px;
						width: fit-content;
						transform: translateX(-50%);
						display: flex;
						align-items: center;
						justify-content: center;
						gap: 2px;
						padding: 4px;
						background: #252525ca;
						backdrop-filter: blur(20px);
						z-index: 100000;
						font-family: "Jetbrains Mono";
						font-size: 13px;
						border-radius: 10px;
					}
				`,
			},
			button(
				{
					styles: css`
						& {
							display: flex;
							align-items: center;
							justify-content: center;
							width: 36px;
							height: 36px;
							border-radius: 8px;
						}

						&[selected] {
							background: white;
							color: black;
						}
					`,
				},
				icon({
					name: "arrow_selector_tool",
					style: css`
						font-size: 20px;
						transform: translateX(2px);
					`,
				}),
			),
			button(
				{
					selected: true,
					styles: css`
						& {
							display: flex;
							align-items: center;
							justify-content: center;
							width: 36px;
							height: 36px;
							border-radius: 8px;
						}

						&[selected] {
							background: white;
							color: black;
						}
					`,
				},
				icon({
					name: "gesture_select",
					style: css`
						font-size: 20px;
					`,
				}),
			),
		),
	);
}

// Hydrate existing <main>
if (root_el) {
	root_el.replaceWith(Main()); // Pass props to Main() if needed
} else {
	console.warn("No <main> element found so we're creating one");
	document.body.appendChild(Main());
}
