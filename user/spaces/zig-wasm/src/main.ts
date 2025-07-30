import { useTags } from "@/lib/ima";
import { css, finish, GlobalStyleSheet } from "@/lib/utils";
import sys from "@/lib/bridge";

// DOM Setup
const { main } = useTags();

const OmSpace = main(
	{
		id: "om-space",
	},
	"Hello World!",
);

document.body.appendChild(OmSpace);

await finish();

type WasmExports = {
	onFrame: (ts: number) => void;
	onMouseMove: (x: number, y: number) => void;
	onKeyDown: (key: number) => void;
};

const wasm = await WebAssembly.instantiateStreaming(fetch("zig-out/bin/main.wasm"), {});

console.log(wasm);

function loop(ts: number) {
	// onFrame(ts);
	requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener("keydown", (e) => {
	console.log(e)
	// console.log(onKeyDown(e.keyCode));
});

window.addEventListener("mousemove", (e) => {
	// onMouseMove(e.clientX, e.clientY);
});

GlobalStyleSheet(css`
	#om-space {
		display: flex;
		flex-direction: column;
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		color: white;
		background: transparent;
	}
`);
