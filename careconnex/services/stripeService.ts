import firebase, { auth, db, functions, isConfigured } from '../lib/firebase';
import { DEMO_MODE, demoResponses, simulateDelay } from '../config/demoMode';
import { isFirebaseError } from '../utils/validation';
export const stripeService = {
    /**
     * Create (or reuse) a Stripe Connect account for the logged-in caregiver,
     * then generate an onboarding link.
     */
    initiateOnboarding: async () => {
        // Demo mode: return mock response
        if (DEMO_MODE) {
            await simulateDelay(800);
            console.log('💳 [DEMO] Stripe onboarding initiated');
            return demoResponses.stripe.createOnboardingLink();
        }

        if (!isConfigured || !functions || !db || !auth?.currentUser) {
            throw new Error("Backend not configured or user not logged in. Stripe functions unavailable.");
        }

        try {
            const uid = auth.currentUser.uid;

            // Reuse existing connected account if we already have one
            const caregiverDoc = await db.collection('caregivers').doc(uid).get();
            const existingAccountId = caregiverDoc.exists ? (caregiverDoc.data() as { stripeAccountId?: string })?.stripeAccountId : null;

            let accountId = existingAccountId;
            if (!accountId) {
                const createAccountFn = functions.httpsCallable('createConnectedAccount');
                const accountResult = await createAccountFn();
                accountId = (accountResult.data as { accountId?: string })?.accountId;
            }

            if (!accountId) {
                throw new Error("Failed to create or load Stripe account.");
            }

            const createLinkFn = functions.httpsCallable('createOnboardingLink');
            const linkResult = await createLinkFn({
                accountId,
                baseUrl: window.location.origin
            });

            return { url: (linkResult.data as { url?: string })?.url || '' };
        } catch (error: unknown) {
            console.error("Stripe Onboarding Failed:", error);
            
            // Proper error classification with user-friendly messages
            if (isFirebaseError(error)) {
                switch (error.code) {
                    case 'permission-denied':
                        throw new Error('Access denied. Please check your account permissions or contact support.');
                    case 'unauthenticated':
                        throw new Error('Please sign in again to continue with Stripe setup.');
                    case 'resource-exhausted':
                        throw new Error('Too many requests. Please wait a moment and try again.');
                    case 'internal':
                        throw new Error('Stripe service temporarily unavailable. Please try again later.');
                    default:
                        throw new Error('Unable to connect to Stripe. Please try again or contact support if the problem persists.');
                }
            }
            
            // Handle specific Stripe-related errors
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
                if (message.includes('stripe') && message.includes('country')) {
                    throw new Error('Stripe is not available in your country. Please contact support for alternative payment options.');
                }
                if (message.includes('stripe') && message.includes('verification')) {
                    throw new Error('Additional verification required. Please check your email for instructions from Stripe.');
                }
                if (message.includes('stripe') && message.includes('restricted')) {
                    throw new Error('Your Stripe account has restrictions. Please contact Stripe support for assistance.');
                }
            }
            
            throw error instanceof Error ? error : new Error('Stripe onboarding failed. Please try again later.');
        }
    },

    /**
     * Called on the return_url page after onboarding.
     * For production: persist onboarding completion so the UI can reflect it.
     */
    completeOnboarding: async () => {
        // Demo mode: just update local state
        if (DEMO_MODE) {
            await simulateDelay(300);
            console.log('💳 [DEMO] Stripe onboarding completed');
            return demoResponses.stripe.completeOnboarding();
        }

        if (!isConfigured || !db || !auth?.currentUser) {
            throw new Error("Backend not configured or user not logged in.");
        }

        const uid = auth.currentUser.uid;
        await db.collection('caregivers').doc(uid).set({
            stripeOnboardingComplete: true,
            stripeOnboardingCompletedAt: new Date().toISOString()
        }, { merge: true });

        return true;
    },

    /**
     * Direct call used by HireCaregiverButton.
     */
    createDirectCharge: async (amount: number, destinationAccountId: string, includeInsurance: boolean = false) => {
        // Demo mode: return mock response
        if (DEMO_MODE) {
            await simulateDelay(600);
            console.log(`💳 [DEMO] Stripe charge created: $${amount}`);
            return demoResponses.stripe.createDirectCharge();
        }

        if (!isConfigured || !functions) {
            throw new Error("Backend not configured. Stripe functions unavailable.");
        }

        if (!destinationAccountId) {
            throw new Error("Missing destination Stripe account id.");
        }

        try {
            const createChargeFn = functions.httpsCallable('createDirectCharge');
            const result = await createChargeFn({
                amount,
                destinationAccountId,
                baseUrl: window.location.origin,
                includeInsurance
            });
            return { url: (result.data as { url?: string })?.url || '' };
        } catch (error) {
            console.error("Stripe Charge Failed:", error);
            throw error;
        }
    },

    /**
     * Higher-level helper: looks up the appointment, resolves caregiver's Stripe
     * connected account id from caregivers/{uid}, and creates a Checkout Session.
     */
    createPaymentSession: async (appointmentId: string, amount: number, includeInsurance: boolean = false) => {
        // Demo mode: return mock response
        if (DEMO_MODE) {
            await simulateDelay(600);
            console.log(`💳 [DEMO] Stripe payment session: $${amount} for appointment ${appointmentId}`);
            return demoResponses.stripe.createPaymentSession();
        }

        if (!isConfigured || !functions || !db) {
            throw new Error("Backend not configured. Stripe functions unavailable.");
        }

        try {
            const appt = await db.collection('appointments').doc(appointmentId).get();
            if (!appt.exists) throw new Error("Appointment not found");

            const caregiverId = (appt.data() as { caregiverId?: string })?.caregiverId;
            if (!caregiverId) throw new Error("Appointment missing caregiverId");

            const caregiverDoc = await db.collection('caregivers').doc(String(caregiverId)).get();
            const destinationAccountId = caregiverDoc.exists ? (caregiverDoc.data() as { stripeAccountId?: string })?.stripeAccountId : null;

            if (!destinationAccountId) {
                throw new Error("Caregiver has not connected Stripe payouts (missing stripeAccountId).");
            }

            const createChargeFn = functions.httpsCallable('createDirectCharge');
            const result = await createChargeFn({
                amount,
                destinationAccountId,
                baseUrl: window.location.origin,
                includeInsurance
            });
            return { url: (result.data as { url?: string })?.url || '' };
        } catch (error) {
            console.error("Stripe Charge Failed:", error);
            throw error;
        }
    }
};
