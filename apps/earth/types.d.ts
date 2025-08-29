declare module "$/lib/ima.js" {
	export type Child = HTMLElement | Node | null | undefined | string | boolean | number | Function;

	export type Props = {
		is?: string;
		key?: any;
		[key: string]: any;
	};

	export type TagArgs =
		| [] // No arguments
		| [Props] // Just props
		| [Child, ...Child[]] // First child followed by more children
		| [Props, ...Child[]]; // Props followed by children

	export type TagFunction = (...args: TagArgs) => HTMLElement;

	export type TagsProxy = {
		[key: string]: TagFunction;
	};

	// Functions
	export function useTags(): TagsProxy;
	export function getFrameTime(): number;

	// Tag generation
	export const tag_generator: (target: any, name: string) => TagFunction;
	export const tags: TagsProxy;

	// Static generation
	export const static_tag_generator: (target: any, name: string) => (...args: any[]) => string;
	export const staticTags: TagsProxy;
}

// Other commonly used modules from your imports
declare module "$/lib/utils.js" {
	export function css(strings: TemplateStringsArray, ...values: any[]): string;
	export function finish(): Promise<void>;
	export function GlobalStyleSheet(styles: string): void;
}

declare module "$/lib/bridge.js" {
	const sys: any;
	export default sys;
}

declare module "$/modules/om/desktop.js" {
	export function initializeDesktop(container: HTMLElement): Promise<void>;
}
