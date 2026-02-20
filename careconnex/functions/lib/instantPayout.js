"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestInstantPayout = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const Stripe = require('stripe');
// Ensure Admin is initialized (defensive; index.ts also initializes)
if (!admin.apps.length) {
    admin.initializeApp();
}
const stripe = new Stripe(((_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret) || process.env.STRIPE_SECRET_KEY);
const db = admin.firestore();
/**
 * Request instant payout for caregiver
 * Calculates available balance and initiates Stripe instant payout
 */
exports.requestInstantPayout = functions.runWith({ secrets: ["STRIPE_SECRET_KEY"] }).https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const uid = context.auth.uid;
    try {
        // Get caregiver data
        const caregiverDoc = await db.collection('caregivers').doc(uid).get();
        if (!caregiverDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Caregiver profile not found');
        }
        const caregiver = caregiverDoc.data();
        const stripeAccountId = caregiver === null || caregiver === void 0 ? void 0 : caregiver.stripeAccountId;
        if (!stripeAccountId) {
            throw new functions.https.HttpsError('failed-precondition', 'Please connect your bank account first');
        }
        // Verify Stripe account is fully onboarded
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (!account.charges_enabled || !account.payouts_enabled) {
            throw new functions.https.HttpsError('failed-precondition', 'Account not fully onboarded. Please complete your Stripe Connect setup.');
        }
        // Calculate available balance from completed appointments
        const appointmentsSnapshot = await db.collection('appointments')
            .where('caregiverId', '==', uid)
            .where('status', '==', 'completed')
            .where('paymentStatus', '==', 'pending')
            .get();
        let totalEarnings = 0;
        const appointmentIds = [];
        appointmentsSnapshot.forEach(doc => {
            const appointment = doc.data();
            totalEarnings += appointment.cost || 0;
            appointmentIds.push(doc.id);
        });
        if (totalEarnings < 1) {
            throw new functions.https.HttpsError('failed-precondition', 'Minimum payout amount is $1.00');
        }
        // Calculate fee (1.5% or $0.50, whichever is greater)
        const feePercentage = totalEarnings * 0.015;
        const fee = Math.max(feePercentage, 0.50);
        const netAmount = totalEarnings - fee;
        // Create Stripe instant payout
        const payout = await stripe.payouts.create({
            amount: Math.round(netAmount * 100), // Convert to cents
            currency: 'usd',
            method: 'instant',
            statement_descriptor: 'CareConnex Payout',
        }, {
            stripeAccount: stripeAccountId,
        });
        // Update appointments to mark as paid
        const batch = db.batch();
        appointmentIds.forEach(id => {
            const ref = db.collection('appointments').doc(id);
            batch.update(ref, {
                paymentStatus: 'paid',
                paidAt: new Date().toISOString(),
                payoutId: payout.id,
            });
        });
        await batch.commit();
        // Record payout in caregiver's history
        await db.collection('caregivers').doc(uid).collection('payouts').add({
            amount: netAmount,
            grossAmount: totalEarnings,
            fee: fee,
            type: 'instant',
            status: payout.status,
            stripePayoutId: payout.id,
            appointmentIds: appointmentIds,
            createdAt: new Date().toISOString(),
            arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        });
        return {
            success: true,
            amount: netAmount,
            fee: fee,
            payoutId: payout.id,
            arrivalDate: payout.arrival_date,
            message: 'Instant payout initiated successfully!',
        };
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Instant payout error:', error);
        }
        // Handle specific Stripe errors
        if (error.type === 'StripeCardError') {
            throw new functions.https.HttpsError('failed-precondition', 'Bank account issue: ' + error.message);
        }
        else if (error.type === 'StripeInvalidRequestError') {
            throw new functions.https.HttpsError('invalid-argument', error.message);
        }
        throw new functions.https.HttpsError('internal', error.message || 'Payout failed');
    }
});
//# sourceMappingURL=instantPayout.js.map