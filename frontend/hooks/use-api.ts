/**
 * Custom Hooks for API Data Fetching
 * Provides reusable hooks for fetching data from the backend API
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient, ApiClientError, getAuthToken } from "@/lib/api-client";
import type {
	Campaign,
	Partner,
	PartnerCurrentCampaign,
	ConversionEvent,
	Payout,
	PaginationParams,
} from "@/types/api";

// ============================================================================
// GENERIC FETCH HOOK
// ============================================================================

interface UseAsyncState<T> {
	data: T | null;
	loading: boolean;
	error: ApiClientError | null;
}

interface UseAsyncOptions {
	enabled?: boolean;
	onSuccess?: (data: any) => void;
	onError?: (error: ApiClientError) => void;
}

/**
 * Generic hook for async data fetching
 */
export function useAsync<T>(
	asyncFunction: () => Promise<T>,
	options: UseAsyncOptions = {},
	deps: any[] = []
): UseAsyncState<T> {
	const [state, setState] = useState<UseAsyncState<T>>({
		data: null,
		loading: true,
		error: null,
	});

	const { enabled = true, onSuccess, onError } = options;

	// Memoize the async function to prevent infinite loops
	const memoizedAsyncFunction = useCallback(asyncFunction, deps);

	useEffect(() => {
		if (!enabled) {
			setState({ data: null, loading: false, error: null });
			return;
		}

		let isMounted = true;

		async function execute() {
			try {
				setState((prev) => ({ ...prev, loading: true, error: null }));
				const data = await memoizedAsyncFunction();

				if (isMounted) {
					setState({ data, loading: false, error: null });
					onSuccess?.(data);
				}
			} catch (error) {
				if (isMounted) {
					const apiError =
						error instanceof ApiClientError
							? error
							: new ApiClientError("UNKNOWN_ERROR", String(error));
					setState({ data: null, loading: false, error: apiError });
					onError?.(apiError);
				}
			}
		}

		execute();

		return () => {
			isMounted = false;
		};
	}, [enabled, memoizedAsyncFunction]);

	return state;
}

// ============================================================================
// CAMPAIGN HOOKS
// ============================================================================

/**
 * Hook to fetch campaigns (for partners - public campaigns)
 */
export function useCampaigns(params?: {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
}) {
	const paramsString = JSON.stringify(params);
	return useAsync(
		() => apiClient.campaigns.list(params, getAuthToken() || undefined),
		{
			enabled: true,
		},
		[paramsString]
	);
}

/**
 * Hook to fetch campaign details
 */
export function useCampaignDetail(campaignId?: string) {
	return useAsync(() => apiClient.campaigns.detail(campaignId!), {
		enabled: !!campaignId,
	});
}

/**
 * Hook to fetch vendor's campaigns (for current authenticated vendor)
 */
export function useVendorCampaigns(
	vendorId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(
		() => apiClient.campaigns.listVendor(vendorId!, params),
		{
			enabled: !!vendorId, // Only fetch when vendorId is available
		},
		[vendorId, paramsString]
	);
}

/**
 * Hook to fetch partner's enrolled campaigns
 */
export function usePartnerCampaigns(
	partnerId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(
		() => apiClient.partnerCampaigns.list(partnerId!, params),
		{
			enabled: !!partnerId,
		},
		[partnerId, paramsString]
	);
}

// ============================================================================
// PARTNER HOOKS
// ============================================================================

/**
 * Hook to fetch partners (for vendors - marketplace discovery)
 */
export function usePartners(params?: {
	page?: number;
	limit?: number;
	search?: string;
	type?: string;
	tier?: string;
	verified_only?: boolean;
}) {
	const paramsString = JSON.stringify(params);
	return useAsync(
		() => apiClient.partners.list(params),
		{
			enabled: true,
		},
		[paramsString]
	);
}

/**
 * Hook to fetch partner details
 */
export function usePartnerDetail(partnerId?: string) {
	return useAsync(() => apiClient.partners.detail(partnerId!), {
		enabled: !!partnerId,
	});
}

/**
 * Hook to fetch partner stats
 */
export function usePartnerStats(partnerId?: string) {
	return useAsync(() => apiClient.partners.stats(partnerId!), {
		enabled: !!partnerId,
	});
}

/**
 * Hook to fetch campaign partners (vendor view)
 */
export function useCampaignPartners(
	campaignId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(
		() => apiClient.partners.campaignPartners(campaignId!, params),
		{
			enabled: !!campaignId,
		},
		[campaignId, paramsString]
	);
}

// ============================================================================
// CURRENT USER HOOKS
// ============================================================================

/**
 * Hook to fetch current partner profile
 */
export function useCurrentPartner() {
	return useAsync(
		() => apiClient.currentUser.getPartner(getAuthToken() || undefined),
		{
			enabled: true,
		}
	);
}

/**
 * Hook to fetch current vendor profile
 */
export function useCurrentVendor() {
	return useAsync(
		() => apiClient.currentUser.getVendor(getAuthToken() || undefined),
		{
			enabled: true,
		}
	);
}

/**
 * Hook to fetch partner dashboard data
 */
export function usePartnerDashboard(partnerId?: string) {
	return useAsync(
		() =>
			apiClient.partnerDashboard.get(partnerId!, getAuthToken() || undefined),
		{
			enabled: !!partnerId,
		},
		[partnerId]
	);
}

/**
 * Hook to fetch partner analytics with daily click aggregates
 * If analyticsParams is undefined, will NOT fetch (used when we already have loaded data)
 * If analyticsParams is provided, will fetch that specific date range
 */
export function usePartnerAnalytics(
	partnerId?: string,
	analyticsParams?: {
		start_date?: string;
		end_date?: string;
		utm_source?: string;
		utm_medium?: string;
		utm_campaign?: string;
	}
) {
	const paramsString = JSON.stringify(analyticsParams);
	return useAsync(
		() => {
			// Params are defined - use them as-is
			return apiClient.partnerAnalytics.get(partnerId!, getAuthToken() || undefined, analyticsParams);
		},
		{
			enabled: !!partnerId && analyticsParams !== undefined, // Only fetch when both partnerId and params are provided
		},
		[partnerId, paramsString]
	);
}

/**
 * Hook to fetch vendor dashboard data
 */
export function useVendorDashboard() {
	return useAsync(
		() => apiClient.currentUser.getVendorDashboard(getAuthToken() || undefined),
		{
			enabled: true,
		}
	);
}

// ============================================================================
// CONVERSION HOOKS
// ============================================================================

/**
 * Hook to fetch partner conversions
 */
export function usePartnerConversions(
	partnerId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
		start_date?: string;
		end_date?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(() => apiClient.conversions.listPartner(partnerId!, params), {
		enabled: !!partnerId,
	}, [partnerId, paramsString]);
}

/**
 * Hook to fetch campaign conversions
 */
export function useCampaignConversions(
	campaignId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
		start_date?: string;
		end_date?: string;
	}
) {
	return useAsync(
		() => apiClient.conversions.listCampaign(campaignId!, params),
		{
			enabled: !!campaignId,
		}
	);
}

// ============================================================================
// PAYOUT HOOKS
// ============================================================================

/**
 * Hook to fetch partner payouts
 */
export function usePartnerPayouts(
	partnerId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(() => apiClient.payouts.listPartner(partnerId!, params), {
		enabled: !!partnerId,
	}, [partnerId, paramsString]);
}

/**
 * Hook to fetch vendor payouts
 */
export function useVendorPayouts(
	vendorId?: string,
	params?: {
		page?: number;
		limit?: number;
		status?: string;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(() => apiClient.payouts.listVendor(vendorId!, params), {
		enabled: !!vendorId,
	}, [vendorId, paramsString]);
}

// ============================================================================
// AFFILIATE LINK HOOKS
// ============================================================================

/**
 * Hook to fetch partner links
 */
export function usePartnerLinks(
	partnerId?: string,
	params?: {
		page?: number;
		limit?: number;
	}
) {
	const paramsString = JSON.stringify(params);
	return useAsync(() => apiClient.links.list(partnerId!, params), {
		enabled: !!partnerId,
	}, [partnerId, paramsString]);
}

// ============================================================================
// MUTATION HOOKS (for POST, PUT, DELETE operations)
// ============================================================================

interface UseMutationState<T> {
	data: T | null;
	loading: boolean;
	error: ApiClientError | null;
}

/**
 * Generic mutation hook
 */
export function useMutation<T, V = any>(
	mutationFn: (variables: V) => Promise<T>
): UseMutationState<T> & {
	mutate: (variables: V) => Promise<T>;
	reset: () => void;
} {
	const [state, setState] = useState<UseMutationState<T>>({
		data: null,
		loading: false,
		error: null,
	});

	const mutate = useCallback(
		async (variables: V) => {
			setState({ data: null, loading: true, error: null });
			try {
				const data = await mutationFn(variables);
				setState({ data, loading: false, error: null });
				return data;
			} catch (error) {
				const apiError =
					error instanceof ApiClientError
						? error
						: new ApiClientError("UNKNOWN_ERROR", String(error));
				setState({ data: null, loading: false, error: apiError });
				throw apiError;
			}
		},
		[mutationFn]
	);

	const reset = useCallback(() => {
		setState({ data: null, loading: false, error: null });
	}, []);

	return { ...state, mutate, reset };
}

/**
 * Hook to apply to a campaign
 */
export function useApplyCampaign() {
	return useMutation((campaignId: string) =>
		apiClient.campaigns.apply(campaignId, {}, getAuthToken() || undefined)
	);
}

/**
 * Hook to approve a partner
 */
export function useApprovePartner() {
	return useMutation((vars: { campaignId: string; partnerId: string }) =>
		apiClient.partners.approve(
			vars.campaignId,
			vars.partnerId,
			getAuthToken() || undefined
		)
	);
}

/**
 * Hook to reject a partner
 */
export function useRejectPartner() {
	return useMutation(
		(vars: { campaignId: string; partnerId: string; reason?: string }) =>
			apiClient.partners.reject(
				vars.campaignId,
				vars.partnerId,
				vars.reason,
				getAuthToken() || undefined
			)
	);
}

/**
 * Hook to create a payout
 */
export function useCreatePayout() {
	return useMutation((vars: { partnerId: string; data: any }) =>
		apiClient.payouts.create(
			vars.partnerId,
			vars.data,
			getAuthToken() || undefined
		)
	);
}

/**
 * Hook to create an affiliate link
 */
export function useCreateLink() {
	return useMutation((data: any) =>
		apiClient.links.create(data, getAuthToken() || undefined)
	);
}
