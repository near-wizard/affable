// utils/posthog.ts
import type posthogType from "posthog-js";

let posthog: typeof posthogType | null = null;

export async function loadPostHog(): Promise<typeof posthogType> {
	if (posthog) return posthog;

	const mod = await import("posthog-js");
	posthog = mod.default;
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
		autocapture: true,
	});
	console.log("loaded posthog");
	return posthog;
}

// Optional helper hook
import { useCallback } from "react";

export function usePostHog() {
	const capture = useCallback(
		async (event: string, props?: Record<string, any>) => {
			const ph = await loadPostHog();
			ph.capture(event, props);
		},
		[]
	);

	return { capture };
}
