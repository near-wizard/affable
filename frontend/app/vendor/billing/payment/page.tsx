'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getAuthToken } from '@/lib/api-client';
import {
  createCardElement,
  mountCardElement,
  confirmSetupIntent,
  getStripe,
  formatStripeError,
  isStripeTestMode,
} from '@/lib/stripe-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CreditCard,
  CheckCircle,
  Shield,
  Lock,
  Info,
  ArrowLeft,
} from 'lucide-react';

interface PaymentMethodFormData {
  cardholderName: string;
  email: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    cardholderName: '',
    email: '',
  });

  const cardElementRef = useRef<HTMLDivElement>(null);
  const cardInstanceRef = useRef<any>(null);

  useEffect(() => {
    initializePaymentForm();
  }, []);

  const initializePaymentForm = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get vendor info
      const token = getAuthToken();
      const vendor = await apiClient.currentUser.getVendor(token || undefined);
      setVendorId(vendor.vendor_id);
      setFormData((prev) => ({
        ...prev,
        email: vendor.email || '',
      }));

      // Initialize Stripe card element
      if (cardElementRef.current) {
        const cardElement = await createCardElement();
        if (cardElement && cardElementRef.current) {
          cardInstanceRef.current = cardElement;
          mountCardElement(cardElement, cardElementRef.current.id);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment form';
      setError(errorMessage);
      console.error('Error initializing payment form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!vendorId || !cardInstanceRef.current) {
      setError('Payment form not properly initialized');
      return;
    }

    if (!formData.cardholderName.trim()) {
      setError('Please enter cardholder name');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const token = getAuthToken();

      // Step 1: Create setup intent
      const setupIntentResponse = await apiClient.billing.createSetupIntent(
        vendorId,
        token || undefined
      );

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Step 2: Confirm setup intent with card
      const setupResult = await confirmSetupIntent(
        stripe,
        cardInstanceRef.current,
        setupIntentResponse.client_secret
      );

      if (setupResult.error) {
        throw new Error(
          setupResult.error.message || 'Failed to process payment method'
        );
      }

      if (setupResult.setupIntent?.payment_method) {
        // Step 3: Attach payment method to customer
        await apiClient.billing.attachPaymentMethod(
          setupIntentResponse.stripe_customer_id,
          setupResult.setupIntent.payment_method as string,
          token || undefined
        );

        setSuccess(true);
        setTimeout(() => {
          router.push('/vendor/billing?success=payment_method_added');
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add payment method';
      setError(formatStripeError(errorMessage));
      console.error('Error adding payment method:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-muted">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </button>

        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3">Add Payment Method</h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Set up your credit card for automatic billing. Your payment information is secure and never stored by us.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl">
              <CreditCard className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Test Mode Banner */}
        {isStripeTestMode() && (
          <Alert className="mb-8 border-border bg-gradient-to-r from-purple-50 to-purple-100">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold">Test Mode Active</AlertTitle>
            <AlertDescription>
              Use test card <code className="font-mono font-bold bg-purple-200 px-3 py-1 rounded-md">4242 4242 4242 4242</code> with any future date and CVC code to test the checkout.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <AlertTitle className="font-semibold">Payment Method Saved</AlertTitle>
            <AlertDescription>
              Your payment method has been saved successfully. Redirecting you back...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-8 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Payment Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Main Form - Larger on desktop */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8">
                  <CardTitle className="text-white text-2xl">Card Information</CardTitle>
                  <CardDescription className="text-emerald-100 text-base">
                    Your card details are secure and processed by Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 py-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        name="cardholderName"
                        value={formData.cardholderName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full px-5 py-3 bg-background border border-border rounded-xl text-foreground placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-slate-300"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                        Billing Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className="w-full px-5 py-3 bg-background border border-border rounded-xl text-foreground placeholder-slate-400 cursor-not-allowed transition-all focus:outline-none hover:border-slate-300"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        From your account profile
                      </p>
                    </div>

                    {/* Card Element */}
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                        Card Details
                      </label>
                      <div
                        id="card-element"
                        ref={cardElementRef}
                        className="p-5 bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all"
                      />
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <Shield className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">PCI DSS Compliant</p>
                        <p className="text-xs text-emerald-700">Your card data is encrypted by Stripe</p>
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={processing}
                        className="px-6 py-3 rounded-xl font-semibold transition-all"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={processing || loading}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-lg hover:shadow-xl"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {processing ? 'Securing...' : 'Save Payment Method'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Info Cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Security Features */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-foreground">Security First</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    'PCI DSS Level 1',
                    'SSL/TLS Encrypted',
                    '3D Secure Ready',
                    'Fraud Protected',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/100 flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">{feature}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Accepted Cards */}
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-foreground">Accepted Cards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Visa', color: 'from-purple-500 to-primary' },
                      { name: 'Mastercard', color: 'from-red-500 to-orange-500' },
                      { name: 'Amex', color: 'from-cyan-500 to-primary/100' },
                      { name: 'Discover', color: 'from-orange-500 to-yellow-500' },
                    ].map((card) => (
                      <div
                        key={card.name}
                        className={`p-3 rounded-lg bg-gradient-to-br ${card.color} text-white text-center font-semibold text-sm shadow-md`}
                      >
                        {card.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="border-0 shadow-lg rounded-2xl bg-amber-50 border-amber-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-foreground">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground mb-1">No charges today</p>
                    <p className="text-muted-foreground">We only charge on your billing date</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Update anytime</p>
                    <p className="text-muted-foreground">Change your card whenever needed</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
