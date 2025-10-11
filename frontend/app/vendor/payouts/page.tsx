"use client"
import { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Download, Filter, CreditCard } from 'lucide-react';
import VendorLayout from '../layout';

export default function VendorPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      // Mock data - in production, fetch from API
      setPendingPayouts([
        {
          partnerId: 1,
          partnerName: 'Sarah Tech Blogger',
          amountDue: 1680.00,
          conversionsCount: 42,
          oldestUnpaidDate: '2024-09-15',
        },
        {
          partnerId: 2,
          partnerName: 'Mike Marketing',
          amountDue: 720.00,
          conversionsCount: 18,
          oldestUnpaidDate: '2024-09-18',
        },
        {
          partnerId: 3,
          partnerName: 'Lisa Influencer',
          amountDue: 2720.00,
          conversionsCount: 68,
          oldestUnpaidDate: '2024-09-12',
        },
      ]);

      setPayouts([
        {
          id: 1,
          partnerId: 1,
          partnerName: 'Sarah Tech Blogger',
          amount: 1250.00,
          status: 'completed',
          paymentMethod: 'Stripe',
          periodStart: '2024-08-01',
          periodEnd: '2024-08-31',
          processedAt: '2024-09-05',
          completedAt: '2024-09-05',
        },
        {
          id: 2,
          partnerId: 2,
          partnerName: 'Mike Marketing',
          amount: 580.00,
          status: 'completed',
          paymentMethod: 'PayPal',
          periodStart: '2024-08-01',
          periodEnd: '2024-08-31',
          processedAt: '2024-09-05',
          completedAt: '2024-09-06',
        },
        {
          id: 3,
          partnerId: 3,
          partnerName: 'Lisa Influencer',
          amount: 2150.00,
          status: 'processing',
          paymentMethod: 'Stripe',
          periodStart: '2024-09-01',
          periodEnd: '2024-09-30',
          processedAt: '2024-10-05',
          completedAt: null,
        },
        {
          id: 4,
          partnerId: 4,
          partnerName: 'Tom Affiliate',
          amount: 450.00,
          status: 'failed',
          paymentMethod: 'Direct Deposit',
          periodStart: '2024-08-01',
          periodEnd: '2024-08-31',
          processedAt: '2024-09-05',
          failureReason: 'Invalid bank account details',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      setLoading(false);
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    if (statusFilter === 'all') return true;
    return payout.status === statusFilter;
  });

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amountDue, 0);

  const processBatchPayout = () => {
    console.log('Processing batch payout for all pending partners');
    // In production, call API
  };

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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"> <CreditCard size={32} className="text-blue-600" /> Payouts</h1>
                <p className="text-gray-600 mt-1">Manage partner payouts and commission payments</p>
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
                {pendingPayouts.map((payout) => (
                  <div key={payout.partnerId} className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{payout.partnerName}</div>
                        <div className="text-sm text-gray-600">
                          {payout.conversionsCount} conversions
                        </div>
                      </div>
                      <Clock className="text-orange-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      ${payout.amountDue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      Oldest unpaid: {new Date(payout.oldestUnpaidDate).toLocaleDateString()}
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
              value={`$${payouts.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0).toLocaleString()}`}
              icon={<Clock className="text-blue-600" />}
              bgColor="bg-blue-50"
            />
            <SummaryCard
              label="Completed This Month"
              value={`$${payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}`}
              icon={<CheckCircle className="text-green-600" />}
              bgColor="bg-green-50"
            />
            <SummaryCard
              label="Failed"
              value={payouts.filter(p => p.status === 'failed').length}
              icon={<XCircle className="text-red-600" />}
              bgColor="bg-red-50"
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Payouts History */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
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
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payout.partnerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          ${payout.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(payout.periodStart).toLocaleDateString()} -{' '}
                        {new Date(payout.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={payout.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.completedAt
                          ? new Date(payout.completedAt).toLocaleDateString()
                          : payout.processedAt
                          ? new Date(payout.processedAt).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPayouts.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payouts found</h3>
                <p className="text-gray-600">
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