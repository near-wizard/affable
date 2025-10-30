/**
 * Stripe.js Client Utility
 * Handles Stripe Elements integration, payment methods, and setup intents
 */

import {
  Stripe,
  StripeElements,
  StripeCardElement,
  StripePaymentMethodType,
  PaymentIntentResult,
  SetupIntentResult,
} from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Get or initialize Stripe instance
 */
export const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

/**
 * Create Stripe Elements instance
 */
export const createElements = async (): Promise<StripeElements | null> => {
  const stripe = await getStripe();
  if (!stripe) return null;

  return stripe.elements({
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px',
      },
    },
  });
};

/**
 * Create card element
 */
export const createCardElement = async (): Promise<StripeCardElement | null> => {
  const elements = await createElements();
  if (!elements) return null;

  return elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  });
};

/**
 * Mount card element to DOM
 */
export const mountCardElement = (element: StripeCardElement, containerId: string): boolean => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return false;
  }

  try {
    element.mount(`#${containerId}`);
    return true;
  } catch (error) {
    console.error('Failed to mount card element:', error);
    return false;
  }
};

/**
 * Create payment method from card element
 */
export const createPaymentMethod = async (
  stripe: Stripe,
  cardElement: StripeCardElement,
  billingDetails: {
    name: string;
    email?: string;
  }
): Promise<{ paymentMethodId: string } | { error: string }> => {
  try {
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: billingDetails,
    });

    if (error) {
      return { error: error.message || 'Failed to create payment method' };
    }

    if (!paymentMethod) {
      return { error: 'Payment method creation returned null' };
    }

    return { paymentMethodId: paymentMethod.id };
  } catch (error) {
    return { error: String(error) };
  }
};

/**
 * Confirm payment with card element
 */
export const confirmPaymentWithCard = async (
  stripe: Stripe,
  cardElement: StripeCardElement,
  clientSecret: string,
  returnUrl: string
): Promise<PaymentIntentResult> => {
  return stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        // Billing details should be filled in by the form
      },
    },
    return_url: returnUrl,
  });
};

/**
 * Confirm setup intent (for saving payment method)
 */
export const confirmSetupIntent = async (
  stripe: Stripe,
  cardElement: StripeCardElement,
  clientSecret: string
): Promise<SetupIntentResult> => {
  return stripe.confirmCardSetup(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        // Billing details should be filled in by the form
      },
    },
  });
};

/**
 * Handle 3D Secure authentication
 */
export const handle3DSecure = async (
  stripe: Stripe,
  paymentIntentClientSecret: string
): Promise<PaymentIntentResult> => {
  return stripe.retrievePaymentIntent(paymentIntentClientSecret);
};

/**
 * Get payment intent status
 */
export const getPaymentIntentStatus = async (
  stripe: Stripe,
  clientSecret: string
): Promise<{
  status: string;
  error?: string;
}> => {
  try {
    const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

    if (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }

    return {
      status: paymentIntent?.status || 'unknown',
    };
  } catch (error) {
    return {
      status: 'error',
      error: String(error),
    };
  }
};

/**
 * Clear card element value
 */
export const clearCardElement = (element: StripeCardElement): void => {
  element.clear();
};

/**
 * Unmount card element
 */
export const unmountCardElement = (element: StripeCardElement): void => {
  element.unmount();
};

/**
 * Get Stripe test mode status
 */
export const isStripeTestMode = (): boolean => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  return key.includes('pk_test');
};

/**
 * Format Stripe error for display
 */
export const formatStripeError = (error: any): string => {
  if (!error) return 'An unknown error occurred';

  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;

  return 'An unknown error occurred';
};

/**
 * Validate Stripe response for errors
 */
export const validateStripeResponse = (response: any): { valid: boolean; error?: string } => {
  if (!response) {
    return { valid: false, error: 'Empty response' };
  }

  if (response.error) {
    return {
      valid: false,
      error: formatStripeError(response.error),
    };
  }

  if (response.paymentIntent?.status === 'requires_action') {
    return {
      valid: false,
      error: '3D Secure authentication required',
    };
  }

  if (response.setupIntent?.status === 'requires_action') {
    return {
      valid: false,
      error: 'Additional verification required',
    };
  }

  return { valid: true };
};
