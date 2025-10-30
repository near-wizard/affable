'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

export type UserRole = 'partner' | 'vendor';

interface DemoContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  // Partner data
  partnerData: {
    name: string;
    totalEarnings: number;
    pendingEarnings: number;
    totalClicks: number;
    totalConversions: number;
    conversionRate: string;
    activeCampaigns: number;
    performanceData: Array<{
      date: string;
      clicks: number;
      conversions: number;
    }>;
    topLinks: Array<{
      label: string;
      clicks: number;
      url: string;
    }>;
    recentConversions: Array<{
      campaign: string;
      amount: number;
      status: string;
      date: string;
    }>;
  };
  // Vendor data
  vendorData: {
    name: string;
    totalCampaigns: number;
    totalPartners: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalPayout: number;
    pendingPayouts: number;
    conversionRate: string;
    performanceData: Array<{
      date: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
    topPartners: Array<{
      partner_id: number;
      name: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
    availableCampaigns: Array<{
      campaign_id: number;
      name: string;
    }>;
    availableUtmSources: string[];
    availableUtmMediums: string[];
    availableUtmCampaigns: string[];
  };
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>('partner');

  // Generate demo data
  const generatePerformanceData = (daysCount: number) => {
    const data = [];
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        clicks: Math.floor(Math.random() * 500) + 50,
        conversions: Math.floor(Math.random() * 50) + 5,
        revenue: Math.floor(Math.random() * 2000) + 200,
      });
    }
    return data;
  };

  const partnerData = useMemo(() => {
    const performanceData = generatePerformanceData(7);
    const totalClicks = performanceData.reduce((sum, d) => sum + d.clicks, 0);
    const totalConversions = performanceData.reduce((sum, d) => sum + d.conversions, 0);
    const conversionRate = ((totalConversions / totalClicks) * 100).toFixed(2);

    return {
      name: 'Tech Reviewer Pro',
      totalEarnings: 5250.75,
      pendingEarnings: 1200.50,
      totalClicks,
      totalConversions,
      conversionRate,
      activeCampaigns: 8,
      performanceData,
      topLinks: [
        { label: 'SaaS Platform Link', clicks: 1250, url: 'aff/abc123' },
        { label: 'Premium Course Link', clicks: 890, url: 'aff/def456' },
        { label: 'Tool Comparison Link', clicks: 654, url: 'aff/ghi789' },
      ],
      recentConversions: [
        {
          campaign: 'Campaign #1',
          amount: 125.50,
          status: 'approved',
          date: new Date().toLocaleDateString(),
        },
        {
          campaign: 'Campaign #2',
          amount: 89.75,
          status: 'approved',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
        },
        {
          campaign: 'Campaign #3',
          amount: 156.00,
          status: 'pending',
          date: new Date(Date.now() - 172800000).toLocaleDateString(),
        },
        {
          campaign: 'Campaign #1',
          amount: 98.25,
          status: 'approved',
          date: new Date(Date.now() - 259200000).toLocaleDateString(),
        },
      ],
    };
  }, []);

  const vendorData = useMemo(() => {
    const performanceData = generatePerformanceData(7);
    const totalClicks = performanceData.reduce((sum, d) => sum + d.clicks, 0);
    const totalConversions = performanceData.reduce((sum, d) => sum + d.conversions, 0);
    const totalRevenue = performanceData.reduce((sum, d) => sum + d.revenue, 0);
    const conversionRate = ((totalConversions / totalClicks) * 100).toFixed(2);

    return {
      name: 'TechSaaS Inc',
      totalCampaigns: 5,
      totalPartners: 12,
      totalClicks,
      totalConversions,
      totalRevenue,
      totalPayout: 3200.00,
      pendingPayouts: 850.00,
      conversionRate,
      performanceData,
      topPartners: [
        {
          partner_id: 1,
          name: 'Tech Reviewer Pro',
          clicks: 1250,
          conversions: 145,
          revenue: 2875.50,
        },
        {
          partner_id: 2,
          name: 'Marketing Maven',
          clicks: 980,
          conversions: 98,
          revenue: 1960.00,
        },
        {
          partner_id: 3,
          name: 'Fitness Influencer Jane',
          clicks: 750,
          conversions: 75,
          revenue: 1500.00,
        },
      ],
      availableCampaigns: [
        { campaign_id: 1, name: 'Summer Sale 2025' },
        { campaign_id: 2, name: 'Product Launch' },
        { campaign_id: 3, name: 'Black Friday Campaign' },
        { campaign_id: 4, name: 'Year-End Promotion' },
        { campaign_id: 5, name: 'Brand Awareness' },
      ],
      availableUtmSources: ['direct', 'facebook', 'google', 'linkedin', 'twitter'],
      availableUtmMediums: ['cpc', 'email', 'organic', 'referral', 'social'],
      availableUtmCampaigns: ['black_friday', 'brand_awareness', 'product_launch', 'retargeting', 'summer_sale'],
    };
  }, []);

  return (
    <DemoContext.Provider
      value={{
        userRole,
        setUserRole,
        partnerData,
        vendorData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
}
