import { loadStripe } from '@stripe/stripe-js';
import { DEMO_MODE, simulateDelay } from '../config/demoMode';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

/**
 * Initialize Stripe
 */
export const stripePromise = STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface ConnectedAccount {
  accountId: string;
  onboardingUrl?: string;
  onboardingComplete: boolean;
}

/**
 * Stripe Service - Real Payment Processing
 */
export const stripeService = {
  /**
   * Create payment intent for client checkout
   */
  createPaymentIntent: async ({
    amount,
    caregiverStripeAccountId,
    appointmentId,
    clientId
  }: {
    amount: number;
    caregiverStripeAccountId: string;
    appointmentId: string;
    clientId: string;
  }): Promise<PaymentIntent> => {
    if (DEMO_MODE) {
      await simulateDelay(800);
      console.log('💳 [DEMO] Payment intent created:', { amount, caregiverStripeAccountId });
      return {
        clientSecret: 'pi_demo_secret_123',
        amount,
        currency: 'usd'
      };
    }

    // Call Firebase Cloud Function
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const createIntent = httpsCallable(functions, 'createPaymentIntent');
    
    const result = await createIntent({
      amount,
      caregiverStripeAccountId,
      appointmentId,
      clientId
    });
    
    return result.data as PaymentIntent;
  },

  /**
   * Create Stripe Connect account for caregiver
   */
  createConnectedAccount: async (caregiverId: string, email: string): Promise<ConnectedAccount> => {
    if (DEMO_MODE) {
      await simulateDelay(1000);
      console.log('💳 [DEMO] Connect account created for:', caregiverId);
      return {
        accountId: 'acct_demo_123',
        onboardingUrl: 'https://connect.stripe.com/setup/s/demo',
        onboardingComplete: false
      };
    }

    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const createAccount = httpsCallable(functions, 'createStripeConnectAccount');
    
    const result = await createAccount({ caregiverId, email });
    return result.data as ConnectedAccount;
  },

  /**
   * Get onboarding link for caregiver
   */
  getOnboardingLink: async (accountId: string): Promise<string> => {
    if (DEMO_MODE) {
      await simulateDelay(500);
      return 'https://connect.stripe.com/setup/s/demo';
    }

    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const getLink = httpsCallable(functions, 'getStripeOnboardingLink');
    
    const result = await getLink({ accountId });
    return (result.data as { url: string }).url;
  },

  /**
   * Check if caregiver onboarding is complete
   */
  checkOnboardingStatus: async (accountId: string): Promise<boolean> => {
    if (DEMO_MODE) {
      await simulateDelay(300);
      return true;
    }

    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const checkStatus = httpsCallable(functions, 'checkStripeAccountStatus');
    
    const result = await checkStatus({ accountId });
    return (result.data as { onboardingComplete: boolean }).onboardingComplete;
  },

  /**
   * Process payout to caregiver
   */
  createPayout: async ({
    amount,
    caregiverStripeAccountId,
    appointmentId
  }: {
    amount: number;
    caregiverStripeAccountId: string;
    appointmentId: string;
  }): Promise<{ transferId: string; status: string }> => {
    if (DEMO_MODE) {
      await simulateDelay(600);
      console.log('💳 [DEMO] Payout created:', { amount, caregiverStripeAccountId });
      return { transferId: 'tr_demo_123', status: 'paid' };
    }

    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const createPayoutFn = httpsCallable(functions, 'createPayout');
    
    const result = await createPayoutFn({
      amount,
      caregiverStripeAccountId,
      appointmentId
    });
    
    return result.data as { transferId: string; status: string };
  },

  /**
   * Get payment history for user
   */
  getPaymentHistory: async (userId: string, userType: 'client' | 'caregiver'): Promise<any[]> => {
    if (DEMO_MODE) {
      await simulateDelay(400);
      return [
        { id: 'pi_demo_1', amount: 15000, status: 'succeeded', created: Date.now() / 1000 },
        { id: 'pi_demo_2', amount: 20000, status: 'succeeded', created: Date.now() / 1000 - 86400 }
      ];
    }

    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const getHistory = httpsCallable(functions, 'getPaymentHistory');
    
    const result = await getHistory({ userId, userType });
    return result.data as any[];
  }
};

export default stripeService;
