/**
 * API Types and Interfaces
 * Defines all request/response types for communicating with the backend API
 */

// ============================================================================
// PARTNER TYPES
// ============================================================================

export type PartnerTier = 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Partner {
  id?: string;
  partner_id?: number;
  name: string;
  email: string;
  status: PartnerStatus;
  tier: PartnerTier;
  bio?: string;
  website?: string;
  website_url?: string;
  verified?: boolean;
  rating?: number;
  types?: string[];
  campaign_count?: number;
  total_conversions?: number;
  total_revenue?: number;
  created_at: string;
  updated_at?: string;
}

export interface PartnerDetail extends Partner {
  types: PartnerType[];
  stats?: PartnerStats;
}

export interface PartnerStats {
  campaigns: number;
  clicks: number;
  conversions: number;
  revenue: number;
  commission_earned: number;
  pending_payout: number;
}

export interface PartnerType {
  id: string;
  partner_type_id?: string;
  name: string;
  description?: string;
}

export interface PartnerPaymentMethod {
  id: string;
  partner_id: string;
  type: 'bank_transfer' | 'paypal' | 'stripe' | 'wise';
  details: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

// ============================================================================
// VENDOR TYPES
// ============================================================================

export type VendorUserRole = 'owner' | 'admin' | 'manager' | 'member';
export type VendorUserStatus = 'active' | 'inactive' | 'pending';

export interface Vendor {
  id: string;
  vendor_id?: string;
  name: string;
  email: string;
  company_name: string;
  website_url?: string;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VendorDetail extends Vendor {
  stats?: VendorStats;
  users?: VendorUser[];
}

export interface VendorStats {
  total_campaigns: number;
  total_partners: number;
  total_conversions: number;
  revenue: number;
  commission_paid: number;
}

export interface VendorUser {
  id: string;
  vendor_user_id?: string;
  vendor_id: string;
  email: string;
  name: string;
  role: VendorUserRole;
  status: VendorUserStatus;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export type CommissionType = 'percentage' | 'flat' | 'tiered';
export type CampaignStatus = 'active' | 'paused' | 'archived';

export interface Campaign {
  id: string;
  campaign_id?: string;
  vendor_id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  commission_type: CommissionType;
  commission_value: number;
  partner_count?: number;
  conversions?: number;
  revenue?: number;
  conversion_rate?: number;
  is_public: boolean;
  approval_required: boolean;
  cookie_duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignDetail extends Campaign {
  destination_url: string;
  terms_url?: string;
  promotional_guidelines?: string;
  max_partners?: number;
  tiers?: CampaignTier[];
  stats?: CampaignStats;
}

export interface CampaignStats {
  total_partners: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
}

export interface CampaignTier {
  id: string;
  campaign_tier_id?: string;
  label: string;
  min_amount: number;
  max_amount: number;
  reward_type: 'flat' | 'percentage';
  reward_value: number;
}

export interface CampaignPartner {
  id: string;
  campaign_partner_id?: string;
  campaign_id: string;
  partner_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  applied_at: string;
  approved_at?: string;
  rejection_reason?: string;
  total_clicks?: number;
  total_conversions?: number;
  total_revenue?: number;
  total_commission_earned?: number;
}

// ============================================================================
// CONVERSION & TRACKING TYPES
// ============================================================================

export interface PartnerLink {
  id: string;
  partner_link_id?: string;
  campaign_partner_id: string;
  short_code: string;
  full_url: string;
  link_label?: string;
  custom_params?: Record<string, string>;
  utm_params?: Record<string, string>;
  created_at: string;
}

export interface Click {
  id: string;
  click_id?: string;
  partner_link_id: string;
  ip_address: string;
  user_agent: string;
  source_url?: string;
  referrer_url?: string;
  country_code?: string;
  device_type?: string;
  clicked_at: string;
}

export interface ConversionEvent {
  id: string;
  conversion_event_id?: string;
  click_id?: string;
  partner_id: string;
  campaign_id: string;
  event_value: number;
  commission_amount: number;
  commission_type: CommissionType;
  commission_value: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  occurred_at: string;
  recorded_at: string;
}

export interface ConversionEventType {
  id: string;
  conversion_event_type_id?: string;
  name: string;
  display_name: string;
  description?: string;
  is_commissionable: boolean;
}

// ============================================================================
// PAYOUT TYPES
// ============================================================================

export interface Payout {
  id: string;
  payout_id?: string;
  partner_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method_id: string;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// API REQUEST/RESPONSE WRAPPERS
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface CampaignFilters extends PaginationParams {
  status?: CampaignStatus;
  is_public?: boolean;
  search?: string;
  category?: string;
  commission_type?: CommissionType;
  vendor_id?: string;
}

export interface PartnerFilters extends PaginationParams {
  status?: PartnerStatus;
  tier?: PartnerTier;
  search?: string;
  types?: string[];
  rating_min?: number;
  verified_only?: boolean;
}

export interface ConversionFilters extends PaginationParams {
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  start_date?: string;
  end_date?: string;
  campaign_id?: string;
  partner_id?: string;
}

// ============================================================================
// PARTNER DASHBOARD TYPES
// ============================================================================

export interface PartnerDashboard {
  stats: PartnerStats;
  recent_campaigns: Campaign[];
  recent_conversions: ConversionEvent[];
  earnings_by_campaign: {
    campaign_name: string;
    earnings: number;
  }[];
  top_performing_links: {
    link_label: string;
    clicks: number;
    conversions: number;
  }[];
}

export interface PartnerCurrentCampaign extends Campaign {
  enrolled_at: string;
  commission_earned: number;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  pending_commission?: number;
}

// ============================================================================
// VENDOR DASHBOARD TYPES
// ============================================================================

export interface VendorDashboard {
  stats: VendorStats;
  recent_campaigns: Campaign[];
  recent_partners: CampaignPartner[];
  top_campaigns: Campaign[];
  pending_approvals: CampaignPartner[];
}

export interface VendorPartnerForMarketplace extends Partner {
  stats: PartnerStats;
  types: PartnerType[];
  verified: boolean;
  rating: number;
}

// ============================================================================
// API ENDPOINT RESPONSE TYPES
// ============================================================================

// Campaigns
export interface GetCampaignsResponse extends PaginatedResponse<Campaign> {}
export interface GetCampaignDetailResponse extends ApiResponse<CampaignDetail> {}
export interface CreateCampaignRequest {
  name: string;
  description: string;
  destination_url: string;
  commission_type: CommissionType;
  commission_value: number;
  cookie_duration_days?: number;
  is_public?: boolean;
  approval_required?: boolean;
}
export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {}

// Partners
export interface GetPartnersResponse extends PaginatedResponse<Partner> {}
export interface GetPartnerDetailResponse extends ApiResponse<PartnerDetail> {}
export interface GetPartnerStatsResponse extends ApiResponse<PartnerStats> {}

// Conversions
export interface GetConversionsResponse extends PaginatedResponse<ConversionEvent> {}
export interface CreateConversionRequest {
  click_id?: string;
  customer_email?: string;
  event_value: number;
  event_type: string;
}

// Payouts
export interface GetPayoutsResponse extends PaginatedResponse<Payout> {}
export interface CreatePayoutRequest {
  partner_id: string;
  amount: number;
  payment_method_id: string;
}
