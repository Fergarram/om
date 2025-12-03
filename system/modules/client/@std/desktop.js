import { mountApplet, createApplet, registerApplet } from "desktop";
import { useStyledTags, uuid } from "ima-utils";

const $ = useStyledTags();

// NON-LEAKY STATE
let some_variable = 0;
const active_calculators = new Map();

// LESS ERGONIMIC STATE BUT LOWER-LEVEL
let arena = new ArrayBuffer(100_000_000);
// Will never be collected but won't leak — we skip object management, etc

// HYDRATION REGISTER
registerApplet(useCalculatorApplet);

// MAIN WAY TO USE THE APPLET EXTERNALLY
export function useCalculatorApplet(prev_el) {
	//
	// Local state
	//

	// Leaky state could be easly added like this
	// let leaky_obj = { something: "hello" };
	// Sometimes that's ok for static data or visible lifecycles
	// but sometimes this will cause performance issues when
	// dealing with large amounts of data like:
	// let some_data = new ArrayBuffer(100_000_000);
	// that remains used in closures hidden within closures
	// with lifecycles you don't really manage fully

	// so we can also do
	const instance_id = uuid();
	active_calculators.set(instance_id, {
		count: 0, // or get from prev_el attributes
		some_val: prev_el.getAttribute("some-attr") || "default_value",
	});

	const state = active_calculators.get(instance_id);

	//
	// Build node element
	//

	const applet_el = createApplet(
		// adds needed attributes for "motion", "tsid", position, etc.
		{
			id: instance_id,
			name: "calculator",
			x: 0, // not-passed as attr
			y: 0, // not-passed as attr
			"reactive-attr": () => some_variable,
			onmousemove(e) {
				// inherits element event listeners
			},
			onconnect(e) {
				console.log("I guess we can have this", e);
			},
			ondisconnect(e) {
				console.log("I guess we can have this", e);
				active_calculators.delete(instance_id); // Clean up
			},
			onresize(e) {
				// Wrapper for resize observer
			},
			onlift(e) {
				// Wrapper for when the attr motion changed
			},
			onplace(e) {
				// Wrapper for when the attr motion changed
			},
			styles: `
				& {
					background: white;
					color: black;
				}
			`,
		},
		$.div("We just build the tree", () => state.count),
	);

	//
	// Mount the element to the desktop
	//

	mountApplet(applet_el);
}
