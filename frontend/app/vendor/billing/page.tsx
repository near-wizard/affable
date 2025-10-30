'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getAuthToken } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Download,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  base_price: string;
  gmv_percentage: string;
  billing_cycle: string;
}

interface Subscription {
  subscription_id: string;
  vendor_id: string;
  plan_id: string;
  status: string;
  currency: string;
  start_date: string;
  next_billing_date: string;
  stripe_customer_id?: string;
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  billing_start: string;
  billing_end: string;
  paid_at?: string;
  created_at: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();

      // Get vendor profile
      const vendor = await apiClient.currentUser.getVendor(token || undefined);
      setVendorId(vendor.vendor_id);

      // Load subscription and invoices
      const [subsData, invoiceData, plansData] = await Promise.all([
        apiClient.billing.getCurrentSubscription(vendor.vendor_id, token || undefined),
        apiClient.billing.getInvoices(vendor.vendor_id, { limit: 10 }, token || undefined),
        apiClient.billing.getPlans(token || undefined),
      ]);

      setSubscription(subsData);
      setInvoices(invoiceData.invoices || []);
      setPlans(plansData.plans || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load billing data';
      setError(errorMessage);
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const token = getAuthToken();
      // In a real implementation, this would fetch the PDF from the backend
      const response = await fetch(
        `/api/v1/billing/invoices/${invoiceId}/download`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
          <p className="text-slate-600">Manage your subscription plan, payment methods, and invoices</p>
        </div>

        {/* Test Mode Banner */}
        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('pk_test') && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Test Mode</AlertTitle>
            <AlertDescription>
              This is a test environment. Use test credit cards (e.g., 4242 4242 4242 4242) for payments.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-80" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payment">Payment Method</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Current Plan Card */}
              {subscription && (
                <Card className="border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      Current Subscription Plan
                    </CardTitle>
                    <CardDescription>
                      Your active billing plan and next billing date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Plan Details */}
                      <div>
                        <div className="mb-6">
                          {(() => {
                            const currentPlan = plans.find(p => p.id === subscription.plan_id);
                            return (
                              <>
                                <h3 className="text-2xl font-bold text-slate-900">
                                  {currentPlan?.display_name || 'Unknown Plan'}
                                </h3>
                                <p className="text-slate-600 mt-1">
                                  {currentPlan?.description || ''}
                                </p>
                              </>
                            );
                          })()}
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Base Price</span>
                            <span className="font-semibold text-slate-900">
                              ${(() => {
                                const currentPlan = plans.find(p => p.id === subscription.plan_id);
                                return parseFloat(currentPlan?.base_price || '0').toFixed(2);
                              })()}/month
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">GMV Fee</span>
                            <span className="font-semibold text-slate-900">
                              {(() => {
                                const currentPlan = plans.find(p => p.id === subscription.plan_id);
                                return `${currentPlan?.gmv_percentage || '0'}%`;
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-slate-600 font-semibold">Status</span>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="capitalize font-semibold text-green-600">
                                {subscription.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Billing Information */}
                      <div>
                        <div className="bg-white rounded-lg p-4 space-y-4 border border-slate-200">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Subscription Started
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                              {new Date(subscription.start_date).toLocaleDateString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next Billing Date
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                              {new Date(subscription.next_billing_date).toLocaleDateString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Currency
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                              {subscription.currency}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Link href="/vendor/billing/plans">
                            <Button className="w-full" variant="outline">
                              Change Plan
                            </Button>
                          </Link>
                          <Link href="/vendor/billing/payment">
                            <Button className="w-full" variant="outline">
                              Update Payment Method
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Usage Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Usage Summary
                  </CardTitle>
                  <CardDescription>
                    Your current billing period usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-1">Base Fee</p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${(() => {
                          const currentPlan = plans.find(p => p.id === subscription?.plan_id);
                          return parseFloat(currentPlan?.base_price || '0').toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-1">GMV This Period</p>
                      <p className="text-2xl font-bold text-slate-900">--</p>
                      <p className="text-xs text-slate-500 mt-1">Coming from API</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-1">GMV Fee</p>
                      <p className="text-2xl font-bold text-slate-900">--</p>
                      <p className="text-xs text-slate-500 mt-1">Based on GMV %</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    Recent Invoices
                  </CardTitle>
                  <CardDescription>
                    Download and manage your invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No invoices yet</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Your invoices will appear here once you have active usage
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                              Invoice
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                              Period
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                              Status
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invoices.map((invoice) => (
                            <tr key={invoice.invoice_id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {invoice.invoice_number}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {new Date(invoice.billing_start).toLocaleDateString()} -{' '}
                                {new Date(invoice.billing_end).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                                ${parseFloat(invoice.total).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center text-sm">
                                {invoice.status === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                                    <CheckCircle className="h-3 w-3" />
                                    Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                                    <Clock className="h-3 w-3" />
                                    {invoice.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDownloadInvoice(invoice.invoice_id, invoice.invoice_number)
                                  }
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="ml-1">Download</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Method Tab */}
            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>
                    Manage your payment method for automatic billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 rounded-lg p-6 text-center">
                    <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-900 font-semibold mb-2">
                      No payment method on file
                    </p>
                    <p className="text-slate-600 text-sm mb-4">
                      Add a payment method to enable automatic billing
                    </p>
                    <Link href="/vendor/billing/payment">
                      <Button>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Add Payment Method
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
