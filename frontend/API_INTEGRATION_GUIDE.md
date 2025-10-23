# API Integration Guide

This guide explains how to integrate backend API calls into the Affable frontend pages.

## Setup

### 1. Environment Configuration

Create a `.env.local` file based on `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

The API client will use this URL for all backend requests.

## Architecture

### Files Created

1. **`types/api.ts`** - Type definitions for all API responses and request payloads
2. **`lib/api-client.ts`** - Core API client with all endpoint methods
3. **`hooks/use-api.ts`** - Custom React hooks for data fetching
4. **`components/loading-skeleton.tsx`** - Loading and error state components

## Usage Examples

### Basic Data Fetching

#### Fetch Campaigns (for Partners)

```tsx
'use client';

import { useCampaigns } from '@/hooks/use-api';
import { CardSkeleton, ErrorBoundary } from '@/components/loading-skeleton';

export default function FindCampaignsPage() {
  const { data: campaigns, loading, error } = useCampaigns({
    page: 1,
    limit: 12,
  });

  if (loading) return <CardSkeleton />;
  if (error) return <ErrorBoundary error={error.message} />;

  return (
    <div className="grid grid-cols-3 gap-6">
      {campaigns?.data?.map(campaign => (
        <div key={campaign.id}>
          <h3>{campaign.name}</h3>
          {/* ... */}
        </div>
      ))}
    </div>
  );
}
```

#### Fetch Partner Current Campaigns

```tsx
'use client';

import { usePartnerCampaigns } from '@/hooks/use-api';
import { useCurrentPartner } from '@/hooks/use-api';

export default function CurrentCampaignsPage() {
  const { data: partner } = useCurrentPartner();
  const { data: campaigns, loading, error } = usePartnerCampaigns(partner?.id, {
    status: 'active',
  });

  // ... render campaigns
}
```

#### Fetch Vendor's Partners

```tsx
'use client';

import { useCampaignPartners } from '@/hooks/use-api';

export default function VendorPartnersPage() {
  const { data: partners, loading, error } = useCampaignPartners(campaignId, {
    status: 'approved',
    page: 1,
    limit: 20,
  });

  // ... render partners
}
```

### Data Mutations (POST, PUT, DELETE)

#### Apply to Campaign

```tsx
'use client';

import { useApplyCampaign } from '@/hooks/use-api';

export default function CampaignCard() {
  const { mutate, loading } = useApplyCampaign();

  const handleApply = async () => {
    try {
      await mutate(campaignId);
      // Show success message
    } catch (error) {
      // Handle error
    }
  };

  return (
    <button onClick={handleApply} disabled={loading}>
      {loading ? 'Applying...' : 'Apply'}
    </button>
  );
}
```

#### Approve Partner (Vendor)

```tsx
'use client';

import { useApprovePartner } from '@/hooks/use-api';

export default function PartnerApprovalButton() {
  const { mutate, loading } = useApprovePartner();

  const handleApprove = async () => {
    await mutate({
      campaignId: campaignId,
      partnerId: partnerId,
    });
  };

  return (
    <button onClick={handleApprove} disabled={loading}>
      Approve Partner
    </button>
  );
}
```

## API Client Methods

### Campaigns

```typescript
// Get all campaigns (public)
apiClient.campaigns.list({ page, limit, search, category })

// Get campaign details
apiClient.campaigns.detail(campaignId)

// Get vendor's campaigns
apiClient.campaigns.listVendor(vendorId, { page, limit, status })

// Create campaign
apiClient.campaigns.create(data, token)

// Update campaign
apiClient.campaigns.update(campaignId, data, token)

// Apply to campaign
apiClient.campaigns.apply(campaignId, data, token)
```

### Partners

```typescript
// Get all partners (marketplace)
apiClient.partners.list({ page, limit, search, type, tier, verified_only })

// Get partner details
apiClient.partners.detail(partnerId)

// Get partner stats
apiClient.partners.stats(partnerId)

// Get campaign partners
apiClient.partners.campaignPartners(campaignId, { page, limit, status })

// Approve partner for campaign
apiClient.partners.approve(campaignId, partnerId, token)

// Reject partner
apiClient.partners.reject(campaignId, partnerId, reason, token)
```

### Partner Campaigns

```typescript
// Get partner's enrolled campaigns
apiClient.partnerCampaigns.list(partnerId, { page, limit, status })

// Get partner campaign details
apiClient.partnerCampaigns.detail(partnerId, campaignId)

// Unenroll from campaign
apiClient.partnerCampaigns.unenroll(campaignId, token)
```

### Conversions

```typescript
// Get partner conversions
apiClient.conversions.listPartner(partnerId, { page, limit, status, dates })

// Get campaign conversions
apiClient.conversions.listCampaign(campaignId, { page, limit, status, dates })

// Approve conversion
apiClient.conversions.approve(conversionId, token)

// Reject conversion
apiClient.conversions.reject(conversionId, reason, token)
```

### Payouts

```typescript
// Get partner payouts
apiClient.payouts.listPartner(partnerId, { page, limit, status })

// Get vendor payouts
apiClient.payouts.listVendor(vendorId, { page, limit, status })

// Create payout
apiClient.payouts.create(partnerId, data, token)
```

### Links

```typescript
// Get partner links
apiClient.links.list(partnerId, { page, limit })

// Create link
apiClient.links.create(data, token)

// Get link stats
apiClient.links.stats(linkId)
```

## Authentication

The API client automatically handles authentication tokens:

```typescript
import { getAuthToken, setAuthToken, clearAuthToken } from '@/lib/api-client';

// Get stored token
const token = getAuthToken();

// Store token (after login)
setAuthToken(token);

// Clear token (on logout)
clearAuthToken();
```

Tokens are stored in localStorage and automatically included in all API requests.

## Error Handling

All hooks return an error state:

```typescript
const { data, loading, error } = useCampaigns();

if (error) {
  console.error(error.code, error.message);
  // error.details contains additional information
}
```

## Loading States

Use skeleton loaders while data is loading:

```typescript
import { CardSkeleton, GridSkeleton, TableSkeleton } from '@/components/loading-skeleton';

if (loading) {
  return <GridSkeleton columns={3} items={6} />;
}
```

## Pagination

All list endpoints support pagination:

```typescript
const { data: campaigns } = useCampaigns({
  page: 1,
  limit: 20,
});

// Response includes:
// - campaigns.data: Campaign[]
// - campaigns.total: number
// - campaigns.page: number
// - campaigns.limit: number
// - campaigns.total_pages: number
```

## Implementing Pages with API Integration

### Step-by-Step Example: Partner Current Campaigns

1. **Create the page component**:
```tsx
'use client';

import { useCurrentPartner, usePartnerCampaigns } from '@/hooks/use-api';
import { GridSkeleton, ErrorBoundary } from '@/components/loading-skeleton';
import { useState } from 'react';
```

2. **Fetch current partner**:
```tsx
const { data: partner, loading: partnerLoading } = useCurrentPartner();
```

3. **Fetch partner's campaigns**:
```tsx
const {
  data: campaignsResponse,
  loading: campaignsLoading,
  error
} = usePartnerCampaigns(partner?.id, {
  page: currentPage,
  limit: 20,
});
```

4. **Render with proper states**:
```tsx
if (partnerLoading || campaignsLoading) return <GridSkeleton />;
if (error) return <ErrorBoundary error={error.message} />;

const campaigns = campaignsResponse?.data || [];

return (
  <div className="grid grid-cols-3 gap-6">
    {campaigns.map(campaign => (
      <CampaignCard key={campaign.id} campaign={campaign} />
    ))}
  </div>
);
```

## Backend API Contract

The backend should return responses in the following format:

### Successful Response
```json
{
  "data": {
    "id": "...",
    "name": "...",
    "...": "..."
  },
  "success": true
}
```

### Paginated Response
```json
{
  "data": [
    { "id": "...", "name": "..." },
    { "id": "...", "name": "..." }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

### Error Response
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Campaign not found",
    "details": {
      "field": "campaign_id"
    }
  },
  "success": false
}
```

## Next Steps

1. Replace all mock data in pages with API hooks
2. Update pages to handle loading states with skeletons
3. Add error boundary components
4. Test with actual backend API
5. Add error tracking/logging
6. Implement retry logic for failed requests
7. Add request debouncing for search/filter fields
8. Cache responses where appropriate
