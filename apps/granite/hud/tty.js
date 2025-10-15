	import { useTags } from "@std/ima";
	const t = useTags();

	const layout = t.div({
		style: `
			background-color: rgba(0,0,0,0.8);
			color: white;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			display: flex;
			align-items: flex-end;
			justify-content: flex-strart;
		`
	}, "Paris")

	const main_el = document.body.querySelector("main");
	main_el.replaceChildren(layout);
