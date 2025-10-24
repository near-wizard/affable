"use client"
import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, Download, Filter, TrendingUp } from 'lucide-react';
import { useCurrentPartner, usePartnerConversions, usePartnerPayouts } from '@/hooks/use-api';

export default function PartnerEarnings() {
  const { data: currentPartner, loading: partnerLoading } = useCurrentPartner();
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch conversions and payouts
  const { data: conversionsData, loading: conversionsLoading } = usePartnerConversions(
    currentPartner?.partner_id?.toString()
  );
  const { data: payoutsData, loading: payoutsLoading } = usePartnerPayouts(
    currentPartner?.partner_id?.toString()
  );

  // Extract data from responses
  const conversions = conversionsData?.data || [];
  const payouts = payoutsData?.data || [];

  // Calculate summary statistics
  const pendingCommission = conversions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const approvedCommission = conversions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const paidCommission = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Estimate next payout (first day of next month)
  const today = new Date();
  const nextPayoutDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const loading = partnerLoading || conversionsLoading || payoutsLoading;

  const filteredConversions = conversions.filter(conv => {
    if (statusFilter === 'all') return true;
    return conv.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading earnings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
              <p className="text-gray-600 mt-1">Track your commissions and payouts</p>
            </div>
            <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
              <Download size={20} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            icon={<Clock className="text-orange-600" />}
            label="Pending Approval"
            value={`$${pendingCommission.toFixed(2)}`}
            bgColor="bg-orange-50"
          />
          <SummaryCard
            icon={<CheckCircle className="text-blue-600" />}
            label="Approved (Unpaid)"
            value={`$${approvedCommission.toFixed(2)}`}
            bgColor="bg-blue-50"
          />
          <SummaryCard
            icon={<DollarSign className="text-green-600" />}
            label="Total Paid Out"
            value={`$${paidCommission.toFixed(2)}`}
            bgColor="bg-green-50"
          />
          <SummaryCard
            icon={<TrendingUp className="text-purple-600" />}
            label="Next Payout"
            value={nextPayoutDate.toLocaleDateString()}
            bgColor="bg-purple-50"
            subtext="Estimated"
          />
        </div>

        {/* Payout Schedule Banner */}
        {approvedCommission > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">Ready for Payout</h3>
                <p className="text-gray-700">
                  You have <span className="font-bold text-blue-700">${approvedCommission.toFixed(2)}</span> in approved commissions.
                  Next payout on {nextPayoutDate.toLocaleDateString()}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Commission History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConversions.map((conversion) => (
                  <tr key={conversion.conversion_event_id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Campaign #{conversion.campaign_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {conversion.event_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {conversion.event_value ? `$${conversion.event_value.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        ${(conversion.commission_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={conversion.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(conversion.occurred_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredConversions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversions found</h3>
              <p className="text-gray-600">
                {statusFilter !== 'all'
                  ? 'Try changing the filter to see more conversions'
                  : 'Conversions will appear here once you start earning'}
              </p>
            </div>
          )}
        </div>

        {/* Payout History */}
        {payouts.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
            </div>

            <div className="divide-y divide-gray-200">
              {payouts.map((payout) => (
                <div key={payout.payout_id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="text-green-600" size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            ${(payout.amount || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(payout.period_start_date).toLocaleDateString()} -{' '}
                            {new Date(payout.period_end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={payout.status} />
                      <div className="text-sm text-gray-600 mt-1">
                        Partner #{payout.partner_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(payout.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <DollarSign className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
              <p className="text-gray-700 mb-3">
                Your earnings are paid out via <span className="font-semibold">Stripe</span> to your connected account.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                Update Payment Method →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, bgColor, subtext }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${bgColor} mb-4`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
    pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pending' },
    paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  };

  const style = config[status] || config.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
