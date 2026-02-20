
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { checkRateLimit, RATE_LIMITS, getClientIdentifier } from './rateLimit';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Helper to get Stripe instance securely
const getStripe = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new functions.https.HttpsError('internal', 'Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(stripeKey, { apiVersion: "2023-10-16" });
};

// Rate limit helper for Stripe functions
async function enforceRateLimit(context: functions.https.CallableContext): Promise<void> {
  const clientId = getClientIdentifier(context);
  const result = await checkRateLimit(clientId, RATE_LIMITS.stripe);
  
  if (!result.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Too many payment attempts. Try again in ${Math.ceil((result.retryAfterMs || 0) / 1000 / 60)} minutes.`
    );
  }
}

// Helper: Bind Usage-Based Insurance (Bunker/Tint)
const bindInsurancePolicy = async (caregiverId: string) => {
  // IN PRODUCTION: Call actual API (Bunker/Tint/Sure) using axios
  // const response = await axios.post('https://api.bunker.com/v1/bind', { ... });
  // return response.data;

  console.log(`Binding insurance policy for caregiver ${caregiverId}...`);
  // Placeholder for real integration
  return {
    policy_id: `pol_bunker_${Math.random().toString(36).substr(2, 9)}`,
    status: 'active'
  };
};

/**
 * 1. createConnectedAccount
 * Creates a Standard Stripe Connect account for the user and saves the ID.
 * Rate limited to prevent abuse.
 */
export const createConnectedAccount = functions.runWith({ secrets: ["STRIPE_SECRET_KEY"] }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  await enforceRateLimit(context);

  const uid = context.auth.uid;
  const userEmail = context.auth.token.email;
  const stripe = getStripe();

  try {
    const account = await stripe.accounts.create({
      type: "standard",
      email: userEmail,
      country: "US",
    });

    // Save the Stripe Account ID to the caregiver's profile in Firestore
    await db.collection("caregivers").doc(uid).set({
      stripeAccountId: account.id
    }, { merge: true });

    // Also update public 'caregivers' collection if separate
    await db.collection("caregivers").doc(uid).set({
      stripeAccountId: account.id
    }, { merge: true });

    return { accountId: account.id };
  } catch (error: any) {
    console.error("Stripe Create Account Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 2. createOnboardingLink
 * Generates an Account Link for the user to complete Stripe onboarding.
 */
export const createOnboardingLink = functions.runWith({ secrets: ["STRIPE_SECRET_KEY"] }).https.onCall(async (data, context) => {
  // Auth check added
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { accountId, baseUrl } = data;
  const stripe = getStripe();

  if (!accountId) {
    throw new functions.https.HttpsError("invalid-argument", "Account ID is required.");
  }

  const appUrl = baseUrl || "http://localhost:3000";

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/?view=caregiver`,
      return_url: `${appUrl}/?view=stripe-callback`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  } catch (error: any) {
    console.error("Stripe Onboarding Link Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 3. createDirectCharge
 * Creates a Checkout Session that charges the client and transfers funds to the caregiver.
 * Rate limited to prevent payment abuse.
 */
export const createDirectCharge = functions.runWith({ secrets: ["STRIPE_SECRET_KEY"] }).https.onCall(async (data, context) => {
  // Rate limit payment attempts
  await enforceRateLimit(context);
  
  const { amount, destinationAccountId, baseUrl, includeInsurance } = data;
  const stripe = getStripe();

  if (!amount || !destinationAccountId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and destination Account ID are required.");
  }

  const appUrl = baseUrl || "http://localhost:3000";

  // 1. Calculate Base Amounts (Stripe uses cents)
  let totalAmountInCents = Math.round(amount * 100);

  // 2. Base Platform Fee (3%)
  let platformFeeInCents = Math.round(totalAmountInCents * 0.03);

  // 3. Insurance Logic
  let insuranceMetadata = {};
  if (includeInsurance) {
    // Add $2.00 flat fee for CareShield
    const INSURANCE_FEE_CENTS = 200;

    // Increase what the customer pays
    totalAmountInCents += INSURANCE_FEE_CENTS;

    // Increase the platform fee so we keep the $2.00 (to pay Bunker later)
    platformFeeInCents += INSURANCE_FEE_CENTS;

    // Bind Policy
    const policy = await bindInsurancePolicy(destinationAccountId);
    insuranceMetadata = {
      hasInsurance: 'true',
      insuranceProvider: 'Bunker',
      insurancePolicyId: policy.policy_id
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: includeInsurance ? "Care Service + CareShield Guarantee" : "Care Service Charge",
            description: includeInsurance ? "Includes Usage-Based Liability Insurance ($2.00)" : undefined,
          },
          unit_amount: totalAmountInCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: destinationAccountId,
        },
        metadata: insuranceMetadata
      },
      success_url: `${appUrl}/?view=payment-success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?view=payment-cancel`,
      metadata: {
        ...insuranceMetadata
      }
    });

    return { url: session.url };
  } catch (error: any) {
    console.error("Stripe Direct Charge Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Helper: Update payment status in Firestore
 */
const updatePaymentStatus = async (paymentIntentId: string, status: 'failed' | 'succeeded' | 'pending') => {
  try {
    // Find appointment by paymentIntentId
    const appointmentsSnap = await db.collection('appointments')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    
    if (!appointmentsSnap.empty) {
      const appointmentDoc = appointmentsSnap.docs[0];
      await appointmentDoc.ref.update({
        paymentStatus: status,
        paymentStatusUpdatedAt: new Date().toISOString()
      });
      console.log(`✅ Payment status updated for appointment ${appointmentDoc.id}: ${status}`);
    } else {
      console.warn(`⚠️ No appointment found for paymentIntent: ${paymentIntentId}`);
    }
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * 4. stripeWebhook
 * Handles Stripe webhook events for payment status updates
 */
export const stripeWebhook = functions.runWith({ 
  secrets: ["STRIPE_SECRET_KEY"]
}).https.onRequest(async (req, res) => {
  const stripe = getStripe();
  // Get webhook secret from environment variable (set via firebase functions:config:set)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;
  
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig) {
    console.error('Missing stripe-signature header');
    res.status(400).send('Missing signature');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💳 Payment failed: ${paymentIntent.id}`);
        await updatePaymentStatus(paymentIntent.id, 'failed');
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💳 Payment succeeded: ${paymentIntent.id}`);
        await updatePaymentStatus(paymentIntent.id, 'succeeded');
        break;
      }
      
      case 'payment_intent.created': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💳 Payment intent created: ${paymentIntent.id}`);
        break;
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`💰 Refund processed: ${charge.id}`);
        // Handle refund logic if needed
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`📄 Invoice payment failed: ${invoice.id}`);
        break;
      }
      
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * 5. checkStripeAccountStatus
 * Checks the onboarding status of a Stripe Connect account.
 * Used by frontend to verify if caregiver has completed onboarding.
 */
export const checkStripeAccountStatus = functions.runWith({ secrets: ["STRIPE_SECRET_KEY"] }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { accountId } = data;
  const stripe = getStripe();

  if (!accountId) {
    throw new functions.https.HttpsError("invalid-argument", "Account ID is required.");
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    // Determine onboarding status based on account requirements
    const requirements = account.requirements;
    const isOnboardingComplete = !requirements || 
      (requirements.currently_due?.length === 0 && requirements.eventually_due?.length === 0);

    // Update caregiver profile with latest status
    const uid = context.auth.uid;
    await db.collection("caregivers").doc(uid).set({
      stripeOnboardingComplete: isOnboardingComplete,
      stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
      stripeCapabilities: account.capabilities,
      lastStripeStatusCheck: new Date().toISOString()
    }, { merge: true });

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: isOnboardingComplete,
      requirements: {
        currentlyDue: requirements?.currently_due || [],
        eventuallyDue: requirements?.eventually_due || [],
        pendingVerification: requirements?.pending_verification || []
      }
    };
  } catch (error: any) {
    console.error("Stripe Check Account Status Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
