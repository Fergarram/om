import sys from "@/lib/bridge";
import { initializeCompiler, tw } from "@/lib/tw";
import type { JSONObject, OmBaseTheme } from "@/lib/types";
import { css, useGlobalStyles } from "@/lib/utils";

let theme: OmBaseTheme | null = null;

export async function initializeThemeSystem(theme_dir: string, customStyles?: (theme: OmBaseTheme) => string) {
	const theme_config = await sys.file.read(theme_dir + "/theme.json");
	const theme_raw = (JSON.parse(theme_config) as JSONObject) || {};

	theme = theme_raw as OmBaseTheme;

	// Expose the sizing variables, etc. before loading tailwind.
	useGlobalStyles(css`
		:root {
			--font-sans:
				Inter, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
				"Noto Color Emoji";
			--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
			--font-mono:
				"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
				monospace;
			--font-100: 100;
			--font-200: 200;
			--font-300: 300;
			--font-400: 400;
			--font-500: 500;
			--font-600: 600;
			--font-700: 700;
			--font-800: 800;
			--font-900: 900;
			--tracking-tighter: -0.05em;
			--tracking-tight: -0.025em;
			--tracking-normal: 0em;
			--tracking-wide: 0.025em;
			--tracking-wider: 0.05em;
			--tracking-widest: 0.1em;
			--leading-tight: 1.25;
			--leading-snug: 1.375;
			--leading-normal: 1.5;
			--leading-relaxed: 1.625;
			--leading-loose: 2;
			--aspect-video: 16 / 9;
			--size-px: 1px;
			--size-0_5: 0.125rem;
			--size-1: 0.25rem;
			--size-1_5: 0.375rem;
			--size-2: 0.5rem;
			--size-2_5: 0.625rem;
			--size-3: 0.75rem;
			--size-3_5: 0.875rem;
			--size-4: 1rem;
			--size-4_5: 1.125rem;
			--size-5: 1.25rem;
			--size-6: 1.5rem;
			--size-7: 1.75rem;
			--size-8: 2rem;
			--size-9: 2.25rem;
			--size-10: 2.5rem;
			--size-11: 2.75rem;
			--size-12: 3rem;
			--size-14: 3.5rem;
			--size-16: 4rem;
			--size-20: 5rem;
			--size-24: 6rem;
			--size-28: 7rem;
			--size-32: 8rem;
			--size-36: 9rem;
			--size-40: 10rem;
			--size-44: 11rem;
			--size-48: 12rem;
			--size-52: 13rem;
			--size-56: 14rem;
			--size-60: 15rem;
			--size-64: 16rem;
			--size-72: 18rem;
			--size-80: 20rem;
			--size-96: 24rem;
			--size-104: 26rem;
			--size-112: 28rem;
			--size-120: 30rem;
			--size-128: 32rem;
			--size-136: 34rem;
			--size-144: 36rem;
			--size-152: 38rem;
			--size-160: 40rem;
			--size-168: 42rem;
			--size-176: 44rem;
			--size-184: 46rem;
			--size-192: 48rem;
			--size-200: 50rem;
			--size-208: 52rem;
			--size-216: 54rem;
			--size-224: 56rem;
			--size-232: 58rem;
			--size-240: 60rem;
			--size-248: 62rem;
			--size-256: 64rem;
			--size-264: 66rem;
			--size-272: 68rem;
			--size-280: 70rem;
			--size-288: 72rem;
			--size-296: 74rem;
			--size-304: 76rem;
			--size-312: 78rem;
			--size-320: 80rem;
			--size-328: 82rem;
			--size-336: 84rem;
			--size-344: 86rem;
			--size-352: 88rem;
			--size-360: 90rem;
			--size-368: 92rem;
			--size-376: 94rem;
			--size-384: 96rem;
			--size-392: 98rem;
			--size-400: 100rem;
			--size-408: 102rem;
			--size-416: 104rem;
			--size-424: 106rem;
			--size-432: 108rem;
			--size-440: 110rem;
			--size-448: 112rem;
			--size-456: 114rem;
			--size-464: 116rem;
			--size-472: 118rem;
			--size-480: 120rem;
			--size-488: 122rem;
			--size-496: 124rem;
			--size-504: 126rem;
			--size-512: 128rem;

			--size-neg-px: -1px;
			--size-neg-0_5: -0.125rem;
			--size-neg-1: -0.25rem;
			--size-neg-1_5: -0.375rem;
			--size-neg-2: -0.5rem;
			--size-neg-2_5: -0.625rem;
			--size-neg-3: -0.75rem;
			--size-neg-3_5: -0.875rem;
			--size-neg-4: -1rem;
			--size-neg-4_5: -1.125rem;
			--size-neg-5: -1.25rem;
			--size-neg-6: -1.5rem;
			--size-neg-7: -1.75rem;
			--size-neg-8: -2rem;
			--size-neg-9: -2.25rem;
			--size-neg-10: -2.5rem;
			--size-neg-11: -2.75rem;
			--size-neg-12: -3rem;
			--size-neg-14: -3.5rem;
			--size-neg-16: -4rem;
			--size-neg-20: -5rem;
			--size-neg-24: -6rem;
			--size-neg-28: -7rem;
			--size-neg-32: -8rem;
			--size-neg-36: -9rem;
			--size-neg-40: -10rem;
			--size-neg-44: -11rem;
			--size-neg-48: -12rem;
			--size-neg-52: -13rem;
			--size-neg-56: -14rem;
			--size-neg-60: -15rem;
			--size-neg-64: -16rem;
			--size-neg-72: -18rem;
			--size-neg-80: -20rem;
			--size-neg-96: -24rem;
			--size-neg-104: -26rem;
			--size-neg-112: -28rem;
			--size-neg-120: -30rem;
			--size-neg-128: -32rem;
			--size-neg-136: -34rem;
			--size-neg-144: -36rem;
			--size-neg-152: -38rem;
			--size-neg-160: -40rem;
			--size-neg-168: -42rem;
			--size-neg-176: -44rem;
			--size-neg-184: -46rem;
			--size-neg-192: -48rem;
			--size-neg-200: -50rem;
			--size-neg-208: -52rem;
			--size-neg-216: -54rem;
			--size-neg-224: -56rem;
			--size-neg-232: -58rem;
			--size-neg-240: -60rem;
			--size-neg-248: -62rem;
			--size-neg-256: -64rem;
			--size-neg-264: -66rem;
			--size-neg-272: -68rem;
			--size-neg-280: -70rem;
			--size-neg-288: -72rem;
			--size-neg-296: -74rem;
			--size-neg-304: -76rem;
			--size-neg-312: -78rem;
			--size-neg-320: -80rem;
			--size-neg-328: -82rem;
			--size-neg-336: -84rem;
			--size-neg-344: -86rem;
			--size-neg-352: -88rem;
			--size-neg-360: -90rem;
			--size-neg-368: -92rem;
			--size-neg-376: -94rem;
			--size-neg-384: -96rem;
			--size-neg-392: -98rem;
			--size-neg-400: -100rem;
			--size-neg-408: -102rem;
			--size-neg-416: -104rem;
			--size-neg-424: -106rem;
			--size-neg-432: -108rem;
			--size-neg-440: -110rem;
			--size-neg-448: -112rem;
			--size-neg-456: -114rem;
			--size-neg-464: -116rem;
			--size-neg-472: -118rem;
			--size-neg-480: -120rem;
			--size-neg-488: -122rem;
			--size-neg-496: -124rem;
			--size-neg-504: -126rem;
			--size-neg-512: -128rem;
		}
	`);

	await initializeCompiler(css`
		@import "tailwindcss";

		@theme {
			/* Colors */
			${theme.colors ? generateColorVariables(theme.colors) : ""}

			/* Typography */
			--font-weight-100: var(--font-100);
			--font-weight-200: var(--font-200);
			--font-weight-300: var(--font-300);
			--font-weight-400: var(--font-400);
			--font-weight-500: var(--font-500);
			--font-weight-600: var(--font-600);
			--font-weight-700: var(--font-700);
			--font-weight-800: var(--font-800);
			--font-weight-900: var(--font-900);

			/* Base font sizes */
			--text-4: var(--size-1); /* 4px */
			--text-6: var(--size-1_5); /* 6px */
			--text-8: var(--size-2); /* 8px */
			--text-10: var(--size-2_5); /* 10px */
			--text-12: var(--size-3); /* 12px */
			--text-14: var(--size-3_5); /* 14px */
			--text-16: var(--size-4); /* 16px */
			--text-18: var(--size-4_5); /* 18px */
			--text-20: var(--size-5); /* 20px */
			--text-22: var(--size-5_5); /* 22px */
			--text-24: var(--size-6); /* 24px */
			--text-26: var(--size-6_5); /* 26px */
			--text-28: var(--size-7); /* 28px */
			--text-30: var(--size-7_5); /* 30px */
			--text-32: var(--size-8); /* 32px */
			--text-34: var(--size-8_5); /* 34px */
			--text-36: var(--size-9); /* 36px */
			--text-40: var(--size-10); /* 40px */
			--text-44: var(--size-11); /* 44px */
			--text-48: var(--size-12); /* 48px */
			--text-56: var(--size-14); /* 56px */
			--text-64: var(--size-16); /* 64px */
			--text-80: var(--size-20); /* 80px */
			--text-96: var(--size-24); /* 96px */
			--text-112: var(--size-28); /* 112px */
			--text-128: var(--size-32); /* 128px */
			--text-144: var(--size-36); /* 144px */
			--text-160: var(--size-40); /* 160px */
			--text-176: var(--size-44); /* 176px */
			--text-192: var(--size-48); /* 192px */
			--text-208: var(--size-52); /* 208px */
			--text-224: var(--size-56); /* 224px */
			--text-240: var(--size-60); /* 240px */
			--text-256: var(--size-64); /* 256px */
		}

		@layer utilities {
			.app-drag {
				-webkit-app-region: drag;
			}

			.pixelated {
				image-rendering: -moz-crisp-edges;
				image-rendering: -webkit-crisp-edges;
				image-rendering: pixelated;
				image-rendering: crisp-edges;
			}
		}

		${await sys.file.read(theme_dir + "/theme.css")}

		${customStyles ? customStyles(theme) : ""}
	`);

	tw("flex"); // @FIXME: The initializeCompiler should do the job but it's not working as expected so we manually trigger it

	return theme;
}

export function useTheme() {
	if (!theme) {
		throw new Error("Theme not initialized");
	}

	return theme;
}

function generateColorVariables(colors: Record<string, string>): string {
	let color_variables = "";

	for (const [key, value] of Object.entries(colors)) {
		// Convert snake_case or camelCase to CSS variable format
		const variable_name = key
			.replace(/([A-Z])/g, "_$1") // Convert camelCase to snake_case if needed
			.toLowerCase()
			.replace(/_/g, "-"); // Convert snake_case to kebab-case for CSS

		color_variables += `--color-${variable_name}: ${value};\n\t\t\t`;
	}

	return color_variables;
}
