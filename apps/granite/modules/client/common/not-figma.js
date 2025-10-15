import { useStaticTags } from "@std/ima";
import { useStyledTags, useCustomStyledTag } from "@std/ima-utils";
import { css } from "@std/utils";

const { main, div, span, pre, iframe } = useStyledTags();
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

function Main() {
	const $S = useStaticTags();

	let iframe_src = $S.html($S.head(), $S.body($S.div()));

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
						background: #202020;
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
				`
main`,
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

					const doc = iframe_ref.current.contentWindow.document;
					doc.body.appendChild(div("hello test"));
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
						background: #202020;
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
	);
}

// Hydrate existing <main>
if (root_el) {
	root_el.replaceWith(Main()); // Pass props to Main() if needed
}
