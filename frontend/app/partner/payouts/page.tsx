'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getAuthToken } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
} from 'lucide-react';

interface PayoutSummary {
  summary_period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  totals: {
    all_payouts: number;
    total_amount: number;
  };
  by_status: {
    completed: { count: number; amount: number; percentage: number };
    processing: { count: number; amount: number; percentage: number };
    pending: { count: number; amount: number; percentage: number };
    failed: { count: number; amount: number; percentage: number };
  };
  insights: {
    average_payout: number;
    largest_payout: number;
    days_since_last_payout: number | null;
  };
}

interface Payout {
  payout_id: number;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  payment_method: string;
  provider_transaction_id: string | null;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

interface UpcomingPayouts {
  pending: {
    count: number;
    total_amount: number;
    payouts: Array<{ payout_id: number; amount: number; period_end: string; created_at: string }>;
  };
  processing: {
    count: number;
    total_amount: number;
    payouts: Array<{ payout_id: number; amount: number; period_end: string; processing_started: string }>;
  };
  message: string;
}

export default function PartnerPayoutsPage() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [upcomingPayouts, setUpcomingPayouts] = useState<UpcomingPayouts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();

      // Load all payout data in parallel
      const [summaryData, payoutsData, upcomingData] = await Promise.all([
        apiClient.partnerPayouts.getSummary({ days: 90 }, token || undefined).catch(() => null),
        apiClient.partnerPayouts.getPayouts({ limit: 20 }, token || undefined).catch(() => null),
        apiClient.partnerPayouts.getUpcomingPayouts(token || undefined).catch(() => null),
      ]);

      if (summaryData) setSummary(summaryData);
      if (payoutsData) setPayouts(payoutsData.data || []);
      if (upcomingData) setUpcomingPayouts(upcomingData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payout data';
      setError(errorMessage);
      console.error('Error loading payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-purple-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <Card className="border-red-200 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-red-900">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-secondary" />
            Payout History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your payouts and payment history
          </p>
        </div>

        {/* Summary Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Amount */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Payouts (90d)</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${summary.totals.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-secondary opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="border-border bg-gradient-to-br from-purple-50 to-cyan-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Completed</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${summary.by_status.completed.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.by_status.completed.count} payouts
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Pending/Processing */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(summary.by_status.pending.amount + summary.by_status.processing.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.by_status.pending.count + summary.by_status.processing.count} payouts
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Average Payout */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Average Payout</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${summary.insights.average_payout.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.totals.all_payouts} total
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Main Content Tabs */}
        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="upcoming">Upcoming ({upcomingPayouts?.pending.count || 0})</TabsTrigger>
              <TabsTrigger value="all">All Payouts</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Upcoming Payouts */}
            <TabsContent value="upcoming" className="space-y-6">
              {upcomingPayouts && (upcomingPayouts.pending.count > 0 || upcomingPayouts.processing.count > 0) ? (
                <>
                  {/* Pending */}
                  {upcomingPayouts.pending.count > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          Pending Payouts
                        </CardTitle>
                        <CardDescription>
                          {upcomingPayouts.pending.count} payout(s) waiting to be processed
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {upcomingPayouts.pending.payouts.map((p) => (
                            <div key={p.payout_id} className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                              <div>
                                <p className="font-semibold text-foreground">
                                  ${p.amount.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Period ending {new Date(p.period_end).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="text-xs text-yellow-700 font-semibold px-3 py-1 bg-yellow-100 rounded-full">
                                PENDING
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Processing */}
                  {upcomingPayouts.processing.count > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Processing Payouts
                        </CardTitle>
                        <CardDescription>
                          {upcomingPayouts.processing.count} payout(s) being processed
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {upcomingPayouts.processing.payouts.map((p) => (
                            <div key={p.payout_id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-primary/10">
                              <div>
                                <p className="font-semibold text-foreground">
                                  ${p.amount.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Started {new Date(p.processing_started).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="text-xs text-primary font-semibold px-3 py-1 bg-purple-100 rounded-full">
                                PROCESSING
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-12 text-center">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No upcoming payouts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* All Payouts */}
            <TabsContent value="all" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payout History</CardTitle>
                  <CardDescription>All your payouts from the past year</CardDescription>
                </CardHeader>
                <CardContent>
                  {payouts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-background border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Period
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                              Payment Method
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                              Status
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payouts.map((payout) => (
                            <tr key={payout.payout_id} className="hover:bg-background transition">
                              <td className="px-4 py-3 text-sm font-semibold text-foreground">
                                {payout.currency} ${payout.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {new Date(payout.period_start).toLocaleDateString()} -{' '}
                                {new Date(payout.period_end).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {payout.payment_method}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payout.status)}`}>
                                  {getStatusIcon(payout.status)}
                                  {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                                {payout.completed_at
                                  ? new Date(payout.completed_at).toLocaleDateString()
                                  : payout.processed_at
                                  ? new Date(payout.processed_at).toLocaleDateString()
                                  : new Date(payout.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No payout history yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary */}
            <TabsContent value="summary">
              {summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>90-Day Summary</CardTitle>
                    <CardDescription>
                      Summary from {new Date(summary.summary_period.start_date).toLocaleDateString()} to{' '}
                      {new Date(summary.summary_period.end_date).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Breakdown */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Payouts by Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: 'Completed', status: 'completed', color: 'bg-green-100 text-green-800' },
                          { label: 'Processing', status: 'processing', color: 'bg-purple-100 text-blue-800' },
                          { label: 'Pending', status: 'pending', color: 'bg-yellow-100 text-yellow-800' },
                          { label: 'Failed', status: 'failed', color: 'bg-red-100 text-red-800' },
                        ].map(({ label, status, color }) => (
                          <div key={status} className={`p-4 rounded-lg ${color} ${color === 'bg-green-100 text-green-800' ? 'bg-secondary border border-green-200' : color === 'bg-purple-100 text-blue-800' ? 'bg-primary/10 border border-border' : color === 'bg-yellow-100 text-yellow-800' ? 'bg-yellow-50 border border-yellow-200' : 'bg-destructive/10 border border-red-200'}`}>
                            <p className="text-sm font-semibold mb-1">{label}</p>
                            <p className="text-2xl font-bold">
                              ${summary.by_status[status as keyof typeof summary.by_status].amount.toFixed(2)}
                            </p>
                            <p className="text-xs opacity-75 mt-1">
                              {summary.by_status[status as keyof typeof summary.by_status].count} payout(s) •{' '}
                              {summary.by_status[status as keyof typeof summary.by_status].percentage.toFixed(0)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Insights */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Key Insights</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                          <span className="text-muted-foreground">Average Payout</span>
                          <span className="font-semibold text-foreground">
                            ${summary.insights.average_payout.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                          <span className="text-muted-foreground">Largest Payout</span>
                          <span className="font-semibold text-foreground">
                            ${summary.insights.largest_payout.toFixed(2)}
                          </span>
                        </div>
                        {summary.insights.days_since_last_payout !== null && (
                          <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                            <span className="text-muted-foreground">Days Since Last Payout</span>
                            <span className="font-semibold text-foreground">
                              {summary.insights.days_since_last_payout} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
