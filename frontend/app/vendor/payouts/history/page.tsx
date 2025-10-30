'use client'

import { useState } from 'react';
import { DollarSign, Filter, Download, ArrowLeft } from 'lucide-react';
import { useVendorPayouts, useCurrentVendor } from '@/hooks/use-api';
import { ErrorBoundary } from '@/components/loading-skeleton';
import Link from 'next/link';

export default function PayoutHistoryPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const { data: vendorData, loading: vendorLoading } = useCurrentVendor();
  const { data: payoutsResponse, loading: payoutsLoading, error } = useVendorPayouts(
    vendorData?.vendor_id?.toString(),
    { status: statusFilter !== 'all' ? statusFilter : undefined }
  );

  const loading = vendorLoading || payoutsLoading;
  const payouts = payoutsResponse?.data || [];

  // Filter payouts by status
  const filteredPayouts = payouts.filter(payout => {
    if (statusFilter === 'all') return true;
    return payout.status === statusFilter;
  });

  // Sort payouts
  const sortedPayouts = [...filteredPayouts].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'date-asc':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      case 'amount-desc':
        return (b.amount || 0) - (a.amount || 0);
      case 'amount-asc':
        return (a.amount || 0) - (b.amount || 0);
      default:
        return 0;
    }
  });

  // Calculate statistics
  const completedPayouts = payouts.filter(p => p.status === 'completed');
  const totalCompleted = completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgPayout = completedPayouts.length > 0 ? totalCompleted / completedPayouts.length : 0;

  if (error) {
    return <ErrorBoundary error={error.message} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading payout history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/vendor/payouts"
                className="text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign size={32} className="text-primary" />
                  Payout History
                </h1>
                <p className="text-muted-foreground mt-1">View all completed and historical payouts</p>
              </div>
            </div>
            <button className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-background transition">
              <Download size={20} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            label="Total Payouts"
            value={filteredPayouts.length.toString()}
            subtext={`${completedPayouts.length} completed`}
            bgColor="bg-primary/10"
          />
          <StatCard
            label="Total Amount"
            value={`$${totalCompleted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            subtext={`${completedPayouts.length} payouts`}
            bgColor="bg-secondary"
          />
          <StatCard
            label="Average Payout"
            value={`$${avgPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            subtext="Per completed payout"
            bgColor="bg-purple-50"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="bg-background rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Status Filter Buttons */}
            {payouts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pb-4 border-b">
                <Filter size={16} className="text-muted-foreground" />
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    statusFilter === 'all'
                      ? 'border border-blueberry bg-primary/100 text-white'
                      : 'border border-border text-foreground hover:bg-background'
                  }`}
                >
                  All ({payouts.length})
                </button>
                {(() => {
                  const statuses = ['completed', 'processing', 'pending', 'failed'];
                  const counts = {};
                  statuses.forEach(status => {
                    counts[status] = payouts.filter(p => p.status === status).length;
                  });
                  return statuses
                    .filter(status => counts[status] > 0)
                    .map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          statusFilter === status
                            ? 'border border-blueberry bg-primary/100 text-white'
                            : 'border border-border text-foreground hover:bg-background'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
                      </button>
                    ));
                })()}
              </div>
            )}

            {/* Sort By */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="bg-background rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-background">
            <h2 className="text-lg font-bold text-foreground">
              {statusFilter !== 'all' ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Payouts` : 'All Payouts'} ({sortedPayouts.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Payout Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-gray-200">
                {sortedPayouts.map((payout) => (
                  <tr key={payout.payout_id} className="hover:bg-background transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">Partner {payout.partner_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">
                        ${(payout.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {payout.start_date ? new Date(payout.start_date).toLocaleDateString() : '-'} {' - '} {' '}
                      {payout.end_date ? new Date(payout.end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {payout.currency || 'USD'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {payout.created_at
                        ? new Date(payout.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedPayouts.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto text-muted-foreground mb-4" size={48} />
              <h3 className="text-lg font-semibold text-foreground mb-2">No payouts found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all'
                  ? 'Try changing the filter to see more payouts'
                  : 'Payouts will appear here once processed'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, bgColor }) {
  return (
    <div className="bg-background rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${bgColor} mb-4`}>
        <DollarSign className="text-foreground" size={24} />
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    processing: { bg: 'bg-purple-100', text: 'text-blue-800', label: 'Processing' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pending' },
  };

  const style = config[status] || config.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
