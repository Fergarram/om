import { useTags, type Ref } from "@/lib/ima";
import { docMain, finish } from "@/lib/utils";

const { div } = useTags();

export interface DialogOptions {
	ref?: Ref<HTMLDivElement>;
	onclose?: () => void;
	variant?: "default" | "none";
	classes?: string;
	backdrop_classes?: string;
}

let active_dialog: (() => void) | null = null;

export function closeDialog() {
	if (active_dialog) {
		active_dialog();
		active_dialog = null;
	}
}

export function useDialog({ ref, onclose, classes, backdrop_classes, variant = "default" }: DialogOptions, content: HTMLElement): Promise<void> {
	return new Promise(async (resolve) => {
		// Close any existing dialog first
		closeDialog();

		// Create backdrop element
		const backdrop = div({
			variant,
			component: "dialog-backdrop",
			class: backdrop_classes,
			onclick: (e: MouseEvent) => {
				// Only close if clicking the backdrop itself, not its children
				if (e.target === backdrop) {
					handleCloseDialog();
				}
			},
		});

		// Create dialog container
		const dialog_container = div(
			{
				ref,
				variant,
				component: "dialog",
				class: classes,
				tabindex: -1,
			},
			content,
		);

		// Add dialog to backdrop
		backdrop.appendChild(dialog_container);

		// Escape key handler
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				handleCloseDialog();
			}
		}

		// Close dialog function
		function handleCloseDialog() {
			document.removeEventListener("keydown", handleKeydown);
			backdrop.remove();
			active_dialog = null;

			if (onclose) {
				onclose();
			}
			resolve();
		}

		active_dialog = handleCloseDialog;
		document.addEventListener("keydown", handleKeydown);
		const container = docMain() || document.body;
		container.appendChild(backdrop);

		await finish();

		dialog_container.focus();
	});
}
