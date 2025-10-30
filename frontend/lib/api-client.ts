/**
 * API Client Utility
 * Handles all HTTP requests to the backend API with error handling and logging
 */

import { ApiError, ApiResponse } from '@/types/api';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  token?: string;
}

/**
 * Make an API request to the backend
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    headers = {},
    params = {},
    token,
    method = 'GET',
    body,
    ...rest
  } = options;

  // Build URL with query parameters
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authentication token if provided
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    // Try to get token from localStorage (client-side only)
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      requestHeaders['Authorization'] = `Bearer ${storedToken}`;
    }
  }

  try {
    console.debug('API Request:', {
      url: url.toString(),
      method,
      headers: requestHeaders,
    });

    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    console.debug('API Response Status:', response.status, 'Content-Type:', response.headers.get('content-type'));

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiError = {
        code: 'API_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        details: {},
      };

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const json = await response.json();
          errorData = json.error || json || errorData;
        } else {
          // Try to get response text for non-JSON responses
          const text = await response.text();
          if (text) {
            errorData.message = `${errorData.message}: ${text.substring(0, 200)}`;
          }
        }
      } catch (parseError) {
        // Failed to parse error response, use default message
        console.error('Failed to parse error response:', parseError);
      }

      throw new ApiClientError(
        errorData.code,
        errorData.message,
        response.status,
        errorData.details
      );
    }

    // Parse and return response
    const data = await response.json();
    console.debug('API Response:', {
      status: response.status,
      data: data,
    });
    return data; // Return the full response object
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiClientError(
        'NETWORK_ERROR',
        'Failed to connect to the server. Please check your internet connection.',
        undefined,
        { originalError: error.message }
      );
    }

    // Unknown error
    throw new ApiClientError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      undefined,
      { originalError: String(error) }
    );
  }
}

// ============================================================================
// API SERVICE METHODS
// ============================================================================

export const apiClient = {
  /**
   * Generic POST request
   */
  post: async <T>(endpoint: string, body?: any, token?: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body,
      token,
    });
  },

  /**
   * Generic GET request
   */
  get: async <T>(endpoint: string, params?: Record<string, any>, token?: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'GET',
      params,
      token,
    });
  },

  /**
   * Generic PUT request
   */
  put: async <T>(endpoint: string, body?: any, token?: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body,
      token,
    });
  },

  /**
   * Generic DELETE request
   */
  delete: async <T>(endpoint: string, token?: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'DELETE',
      token,
    });
  },

  // ===== CAMPAIGNS =====
  campaigns: {
    /**
     * Get all campaigns (for partners - public campaigns)
     */
    list: async (
      params?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
      },
      token?: string
    ) => {
      // Map frontend 'limit' parameter to backend 'page_size'
      const backendParams = {
        page: params?.page,
        page_size: params?.limit,
        search: params?.search,
        is_public: params?.category ? undefined : true, // Show public campaigns
      };
      return apiRequest('/v1/campaigns', { params: backendParams, token });
    },

    /**
     * Get campaign details
     */
    detail: async (campaignId: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}`);
    },

    /**
     * Get vendor's campaigns (for current authenticated vendor)
     */
    listVendor: async (vendorId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      return apiRequest(`/v1/vendors/${vendorId}/campaigns`, { params });
    },

    /**
     * Create a new campaign
     */
    create: async (data: any, token?: string) => {
      return apiRequest('/v1/campaigns', {
        method: 'POST',
        body: data,
        token,
      });
    },

    /**
     * Update campaign
     */
    update: async (campaignId: string, data: any, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}`, {
        method: 'PUT',
        body: data,
        token,
      });
    },

    /**
     * Create a new campaign version
     */
    createVersion: async (campaignId: string, data: any, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}/versions`, {
        method: 'POST',
        body: data,
        token,
      });
    },

    /**
     * Apply to campaign (partner)
     */
    apply: async (campaignId: string, data?: any, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}/apply`, {
        method: 'POST',
        body: data || {},
        token,
      });
    },
  },

  // ===== PARTNERS (for vendors looking for affiliates) =====
  partners: {
    /**
     * Get all partners (for vendors - marketplace discovery)
     */
    list: async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      tier?: string;
      verified_only?: boolean;
    }) => {
      return apiRequest('/v1/partners', { params });
    },

    /**
     * Get partner details
     */
    detail: async (partnerId: string) => {
      return apiRequest(`/v1/partners/${partnerId}`);
    },

    /**
     * Get partner stats
     */
    stats: async (partnerId: string) => {
      return apiRequest(`/v1/partners/${partnerId}/stats`);
    },

    /**
     * Get campaign partners (vendor view)
     */
    campaignPartners: async (campaignId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      return apiRequest(`/v1/campaigns/${campaignId}/partners`, { params });
    },

    /**
     * Approve partner for campaign (vendor)
     */
    approve: async (campaignId: string, partnerId: string, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}/partners/${partnerId}/approve`, {
        method: 'POST',
        token,
      });
    },

    /**
     * Reject partner for campaign (vendor)
     */
    reject: async (campaignId: string, partnerId: string, reason?: string, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}/partners/${partnerId}/reject`, {
        method: 'POST',
        body: { rejection_reason: reason },
        token,
      });
    },
  },

  // ===== PARTNER CAMPAIGNS (enrolled campaigns for partners) =====
  partnerCampaigns: {
    /**
     * Get partner's enrolled campaigns
     */
    list: async (partnerId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      return apiRequest(`/v1/partners/${partnerId}/campaigns`, { params });
    },

    /**
     * Get partner campaign details
     */
    detail: async (partnerId: string, campaignId: string) => {
      return apiRequest(`/v1/partners/${partnerId}/campaigns/${campaignId}`);
    },

    /**
     * Unenroll from campaign (partner)
     */
    unenroll: async (campaignId: string, token?: string) => {
      return apiRequest(`/v1/campaigns/${campaignId}/unenroll`, {
        method: 'POST',
        token,
      });
    },
  },

  // ===== CURRENT USER (partner or vendor) =====
  currentUser: {
    /**
     * Get current partner profile
     */
    getPartner: async (token?: string) => {
      return apiRequest('/v1/partners/me', { token });
    },

    /**
     * Get current vendor profile
     */
    getVendor: async (token?: string) => {
      return apiRequest('/v1/vendors/me', { token });
    },

    /**
     * Get current partner dashboard data (authenticated user's own dashboard)
     */
    getPartnerDashboard: async (token?: string) => {
      return apiRequest('/v1/partners/me/dashboard', { token });
    },

    /**
     * Get current partner analytics (authenticated user's own analytics)
     */
    getPartnerAnalytics: async (
      token?: string,
      params?: {
        start_date?: string;
        end_date?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
      }
    ) => {
      return apiRequest('/v1/partners/me/analytics', { token, params });
    },

    /**
     * Get current vendor dashboard data (authenticated user's own dashboard)
     */
    getVendorDashboard: async (token?: string, params?: {
      start_date?: string;
      end_date?: string;
      campaign_id?: number;
      partner_id?: number;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    }) => {
      return apiRequest('/v1/vendors/me/dashboard', { token, params });
    },
  },

  // ===== PARTNER DASHBOARD & ANALYTICS =====
  partnerDashboard: {
    /**
     * Get partner dashboard data
     */
    get: async (partnerId: string, token?: string) => {
      return apiRequest(`/v1/partners/${partnerId}/dashboard`, { token });
    },
  },

  // ===== PARTNER ANALYTICS =====
  partnerAnalytics: {
    /**
     * Get partner analytics with daily click aggregates
     */
    get: async (
      partnerId: string,
      token?: string,
      params?: {
        start_date?: string;
        end_date?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
      }
    ) => {
      return apiRequest(`/v1/partners/${partnerId}/analytics`, { token, params });
    },
  },

  // ===== VENDOR DASHBOARD =====
  vendorDashboard: {
    /**
     * Get vendor dashboard data
     */
    get: async (vendorId: string, token?: string) => {
      return apiRequest(`/v1/vendors/${vendorId}/dashboard`, { token });
    },
  },

  // ===== CONVERSIONS & TRACKING =====
  conversions: {
    /**
     * Get conversions for partner
     */
    listPartner: async (partnerId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      return apiRequest(`/v1/partners/${partnerId}/conversions`, { params });
    },

    /**
     * Get conversions for campaign
     */
    listCampaign: async (campaignId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      return apiRequest(`/v1/campaigns/${campaignId}/conversions`, { params });
    },

    /**
     * Get conversion details
     */
    detail: async (conversionId: string) => {
      return apiRequest(`/v1/conversions/${conversionId}`);
    },

    /**
     * Approve conversion (vendor)
     */
    approve: async (conversionId: string, token?: string) => {
      return apiRequest(`/v1/conversions/${conversionId}/approve`, {
        method: 'POST',
        token,
      });
    },

    /**
     * Reject conversion (vendor)
     */
    reject: async (conversionId: string, reason?: string, token?: string) => {
      return apiRequest(`/v1/conversions/${conversionId}/reject`, {
        method: 'POST',
        body: { rejection_reason: reason },
        token,
      });
    },
  },

  // ===== EARNINGS & PAYOUTS =====
  payouts: {
    /**
     * Get partner payouts
     */
    listPartner: async (partnerId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      return apiRequest(`/v1/partners/${partnerId}/payouts`, { params });
    },

    /**
     * Get vendor payouts to partners
     */
    listVendor: async (vendorId: string, params?: {
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      return apiRequest(`/v1/vendors/${vendorId}/payouts`, { params });
    },

    /**
     * Create payout (vendor)
     */
    create: async (partnerId: string, data: any, token?: string) => {
      return apiRequest(`/v1/partners/${partnerId}/payouts`, {
        method: 'POST',
        body: data,
        token,
      });
    },
  },

  // ===== VENDORS =====
  vendors: {
    /**
     * Get available partners for vendor dashboard filtering
     */
    getAvailablePartners: async (campaignId?: number, token?: string) => {
      const params = campaignId ? { campaign_id: campaignId } : {};
      return apiRequest('/v1/vendors/me/available-partners', { token, params });
    },
  },

  // ===== AFFILIATE LINKS =====
  links: {
    /**
     * Get partner links
     */
    list: async (partnerId: string, params?: {
      page?: number;
      limit?: number;
    }) => {
      return apiRequest(`/v1/partners/${partnerId}/links`, { params });
    },

    /**
     * Create affiliate link
     */
    create: async (data: any, token?: string) => {
      return apiRequest('/v1/links', {
        method: 'POST',
        body: data,
        token,
      });
    },

    /**
     * Get link stats
     */
    stats: async (linkId: string) => {
      return apiRequest(`/v1/links/${linkId}/stats`);
    },
  },

  // ===== BILLING =====
  billing: {
    /**
     * Get available subscription plans
     */
    getPlans: async (token?: string) => {
      return apiRequest('/v1/billing/plans', { token });
    },

    /**
     * Get current vendor subscription
     */
    getCurrentSubscription: async (vendorId: string, token?: string) => {
      return apiRequest(`/v1/billing/subscriptions/${vendorId}`, { token });
    },

    /**
     * Create new subscription
     */
    createSubscription: async (vendorId: string, planId: string, currency: string = 'USD', token?: string) => {
      return apiRequest('/v1/billing/subscriptions', {
        method: 'POST',
        body: { vendor_id: vendorId, plan_id: planId, currency },
        token,
      });
    },

    /**
     * Update subscription (change plan)
     */
    updateSubscription: async (vendorId: string, planId: string, token?: string) => {
      return apiRequest(`/v1/billing/subscriptions/${vendorId}`, {
        method: 'PUT',
        body: { plan_id: planId },
        token,
      });
    },

    /**
     * Cancel subscription
     */
    cancelSubscription: async (vendorId: string, token?: string) => {
      return apiRequest(`/v1/billing/subscriptions/${vendorId}`, {
        method: 'DELETE',
        token,
      });
    },

    /**
     * Get vendor invoices
     */
    getInvoices: async (vendorId: string, params?: {
      limit?: number;
      offset?: number;
    }, token?: string) => {
      return apiRequest(`/v1/billing/invoices/${vendorId}`, { params, token });
    },

    /**
     * Get invoice details
     */
    getInvoiceDetail: async (invoiceId: string, token?: string) => {
      return apiRequest(`/v1/billing/invoices/detail/${invoiceId}`, { token });
    },

    /**
     * Create Stripe customer
     */
    createStripeCustomer: async (vendorId: string, email: string, name: string, currency: string = 'USD', token?: string) => {
      return apiRequest('/v1/billing/payments/stripe/customer', {
        method: 'POST',
        body: { vendor_id: vendorId, email, name, currency },
        token,
      });
    },

    /**
     * Create payment for invoice
     */
    createPayment: async (invoiceId: string, token?: string) => {
      return apiRequest(`/v1/billing/payments/invoices/${invoiceId}`, {
        method: 'POST',
        token,
      });
    },

    /**
     * Confirm payment
     */
    confirmPayment: async (transactionId: string, token?: string) => {
      return apiRequest(`/v1/billing/payments/${transactionId}/confirm`, {
        method: 'POST',
        token,
      });
    },

    /**
     * Create setup intent for payment method
     */
    createSetupIntent: async (vendorId: string, token?: string) => {
      return apiRequest('/v1/billing/payments/setup-intent', {
        method: 'POST',
        body: { vendor_id: vendorId },
        token,
      });
    },

    /**
     * Attach payment method to customer
     */
    attachPaymentMethod: async (customerId: string, paymentMethodId: string, token?: string) => {
      return apiRequest('/v1/billing/payments/attach-method', {
        method: 'POST',
        body: { stripe_customer_id: customerId, payment_method_id: paymentMethodId },
        token,
      });
    },

    /**
     * List vendor payment methods
     */
    listPaymentMethods: async (vendorId: string, token?: string) => {
      return apiRequest(`/v1/billing/payment-methods/${vendorId}`, { token });
    },

    /**
     * Add vendor payment method
     */
    addPaymentMethod: async (vendorId: string, paymentMethod: {
      payment_provider: string;
      provider_account_id: string;
      account_details?: Record<string, any>;
      is_default?: boolean;
    }, token?: string) => {
      return apiRequest(`/v1/billing/payment-methods/${vendorId}`, {
        method: 'POST',
        body: paymentMethod,
        token,
      });
    },

    /**
     * Update vendor payment method
     */
    updatePaymentMethod: async (vendorId: string, methodId: string, updates: {
      is_default?: boolean;
      account_details?: Record<string, any>;
    }, token?: string) => {
      return apiRequest(`/v1/billing/payment-methods/${vendorId}/${methodId}`, {
        method: 'PUT',
        body: updates,
        token,
      });
    },

    /**
     * Delete vendor payment method
     */
    deletePaymentMethod: async (vendorId: string, methodId: string, token?: string) => {
      return apiRequest(`/v1/billing/payment-methods/${vendorId}/${methodId}`, {
        method: 'DELETE',
        token,
      });
    },

    /**
     * Download invoice PDF
     */
    downloadInvoice: async (invoiceId: string, token?: string) => {
      return apiRequest(`/v1/billing/invoices/${invoiceId}/download`, {
        token,
      });
    },
  },

};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get authorization token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * Set authentication token
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}
