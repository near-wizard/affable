"use client"
import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Download, Filter, CreditCard } from 'lucide-react';
import { useVendorPayouts, useCurrentVendor } from '@/hooks/use-api';
import { ErrorBoundary } from '@/components/loading-skeleton';

export default function VendorPayouts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: vendorData, loading: vendorLoading } = useCurrentVendor();
  const { data: payoutsResponse, loading: payoutsLoading, error } = useVendorPayouts(
    vendorData?.vendor_id?.toString(),
    { status: statusFilter !== 'all' ? statusFilter : undefined }
  );

  const loading = vendorLoading || payoutsLoading;
  const payouts = payoutsResponse?.data || [];

  // Separate payouts by status
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const completedPayouts = payouts.filter(p => p.status === 'completed');
  const processingPayouts = payouts.filter(p => p.status === 'processed' || p.status === 'processing');
  const failedPayouts = payouts.filter(p => p.status === 'failed');

  const filteredPayouts = payouts.filter(payout => {
    if (statusFilter === 'all') return true;
    return payout.status === statusFilter;
  });

  const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const processBatchPayout = () => {
    console.log('Processing batch payout for all pending partners');
    // TODO: Call API to process batch payouts
  };

  if (error) {
    return <ErrorBoundary error={error.message} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payouts...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"> <CreditCard size={32} className="text-blue-600" /> Manage Payouts</h1>
                <p className="text-gray-600 mt-1">Process and manage pending partner payouts</p>
              </div>
              <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                <Download size={20} />
                Export Report
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Pending Payouts Section */}
          {pendingPayouts.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Pending Payouts</h2>
                  <p className="text-gray-700">
                    {pendingPayouts.length} partners have pending commissions totaling{' '}
                    <span className="font-bold text-orange-700">${totalPending.toLocaleString()}</span>
                  </p>
                </div>
                <button
                  onClick={processBatchPayout}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  Process All Payouts
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {pendingPayouts.slice(0, 3).map((payout) => (
                  <div key={payout.payout_id} className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">Partner {payout.partner_id}</div>
                        <div className="text-sm text-gray-600">
                          1 pending conversion
                        </div>
                      </div>
                      <Clock className="text-orange-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      ${(payout.amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      Oldest unpaid: {payout.start_date ? new Date(payout.start_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <button className="w-full mt-3 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium">
                      Process Payout
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              label="Total Pending"
              value={`$${totalPending.toLocaleString()}`}
              icon={<Clock className="text-orange-600" />}
              bgColor="bg-orange-50"
            />
            <SummaryCard
              label="Processing"
              value={`$${processingPayouts.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}`}
              icon={<Clock className="text-blue-600" />}
              bgColor="bg-blue-50"
            />
            <SummaryCard
              label="Completed This Month"
              value={`$${completedPayouts.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}`}
              icon={<CheckCircle className="text-green-600" />}
              bgColor="bg-green-50"
            />
            <SummaryCard
              label="Failed"
              value={failedPayouts.length}
              icon={<XCircle className="text-red-600" />}
              bgColor="bg-red-50"
            />
          </div>

          {/* Filters */}
          {payouts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <Filter size={20} className="text-gray-400" />
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
                      </button>
                    ));
                })()}
              </div>
            </div>
          )}

          {/* View Full History */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">View Complete Payout History</h2>
            <p className="text-gray-600 mb-6">
              See all completed and historical payouts with detailed filtering and export options.
            </p>
            <a
              href="/vendor/payouts/history"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              View Full History
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
  );
}

function SummaryCard({ label, value, icon, bgColor }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${bgColor} mb-4`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
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