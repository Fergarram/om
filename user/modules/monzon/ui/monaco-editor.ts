import { useTags, type Props } from "@/lib/ima";
import { useMonzonTheme } from "../theme";
const { div } = useTags();

export function Editor(
	props: Props & {
		content?: string;
		language?: string;
		settings?: monaco.editor.IStandaloneEditorConstructionOptions;
	},
) {
	const container = div(props);

	const theme = useMonzonTheme();

	const editor = monaco.editor.create(container, {
		value: props.content || "",
		language: props.language || "plainText",
		automaticLayout: false,
		...theme.editor.settings,
		...(props.settings ? props.settings : {}),
	});

	// Initialize resize observer
	let resizeTimeout: any;
	const resizeObserver = new ResizeObserver(() => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			editor.layout();
		}, 0);
	});

	resizeObserver.observe(container);

	return {
		editor,
		container,
	};
}
