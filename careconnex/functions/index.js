const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Create payment intent for client checkout
 * Triggered when client books a caregiver
 */
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { amount, caregiverStripeAccountId, appointmentId, clientId } = data;

  try {
    // Create payment intent with transfer to caregiver
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: caregiverStripeAccountId,
        amount: Math.round(amount * 0.8 * 100), // 80% to caregiver, 20% platform fee
      },
      metadata: {
        appointmentId,
        clientId,
        caregiverStripeAccountId,
        platform: 'careconnex'
      }
    });

    // Store payment intent in Firestore
    await db.collection('payments').doc(paymentIntent.id).set({
      appointmentId,
      clientId,
      caregiverStripeAccountId,
      amount,
      platformFee: amount * 0.2,
      caregiverPayout: amount * 0.8,
      status: 'requires_confirmation',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'usd'
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment');
  }
});

/**
 * Create Stripe Connect account for caregiver
 */
exports.createStripeConnectAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { caregiverId, email } = data;

  try {
    // Create Express Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      metadata: {
        caregiverId,
        platform: 'careconnex'
      }
    });

    // Store account ID in caregiver profile
    await db.collection('caregivers').doc(caregiverId).update({
      stripeAccountId: account.id,
      stripeOnboardingComplete: false,
      stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://careconnex-d4c8b.web.app/caregiver?stripe=refresh`,
      return_url: `https://careconnex-d4c8b.web.app/caregiver?stripe=success`,
      type: 'account_onboarding'
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
      onboardingComplete: false
    };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create account');
  }
});

/**
 * Get onboarding link for existing account
 */
exports.getStripeOnboardingLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accountId } = data;

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `https://careconnex-d4c8b.web.app/caregiver?stripe=refresh`,
      return_url: `https://careconnex-d4c8b.web.app/caregiver?stripe=success`,
      type: 'account_onboarding'
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create link');
  }
});

/**
 * Check Stripe account onboarding status
 */
exports.checkStripeAccountStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accountId } = data;

  try {
    const account = await stripe.accounts.retrieve(accountId);
    const onboardingComplete = account.details_submitted && account.charges_enabled;

    // Update caregiver profile if complete
    if (onboardingComplete) {
      const caregiverSnapshot = await db.collection('caregivers')
        .where('stripeAccountId', '==', accountId)
        .limit(1)
        .get();
      
      if (!caregiverSnapshot.empty) {
        await caregiverSnapshot.docs[0].ref.update({
          stripeOnboardingComplete: true,
          stripeOnboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { onboardingComplete };
  } catch (error) {
    console.error('Error checking account status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check status');
  }
});

/**
 * Webhook handler for Stripe events
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update payment status in Firestore
      await db.collection('payments').doc(paymentIntent.id).update({
        status: 'succeeded',
        paidAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update appointment payment status
      const appointmentId = paymentIntent.metadata.appointmentId;
      if (appointmentId) {
        await db.collection('appointments').doc(appointmentId).update({
          paymentStatus: 'paid',
          stripePaymentIntentId: paymentIntent.id,
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      await db.collection('payments').doc(failedPayment.id).update({
        status: 'failed',
        failureMessage: failedPayment.last_payment_error?.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      break;

    case 'transfer.paid':
      // Caregiver payout successful
      const transfer = event.data.object;
      console.log('Caregiver payout successful:', transfer.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ==========================================
// PUSH NOTIFICATION FUNCTIONS
// ==========================================

/**
 * Send push notification when new message is created
 */
exports.sendPushNotification = functions.firestore
  .document('chatRooms/{chatRoomId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { chatRoomId } = context.params;
    
    // Don't send push for system messages
    if (message.type === 'system') return null;
    
    try {
      // Get chat room details
      const chatRoomDoc = await db.collection('chatRooms').doc(chatRoomId).get();
      
      if (!chatRoomDoc.exists) return null;
      
      const chatRoom = chatRoomDoc.data();
      const participants = chatRoom.participants || [];
      
      // Find recipient (not the sender)
      const senderId = message.senderId;
      const recipientId = participants.find(id => id !== senderId);
      
      if (!recipientId) return null;
      
      // Get recipient's FCM tokens
      const userDoc = await db.collection('users').doc(recipientId).get();
      
      if (!userDoc.exists) return null;
      
      const userData = userDoc.data();
      const fcmTokens = userData.fcmTokens || [];
      
      if (fcmTokens.length === 0) {
        console.log(`No FCM tokens for user ${recipientId}`);
        return null;
      }
      
      // Prepare notification
      const senderName = message.senderName || 'CareConnex';
      const notification = {
        title: `New message from ${senderName}`,
        body: message.text.length > 100 
          ? message.text.substring(0, 97) + '...' 
          : message.text,
        icon: '/icon-192.png'
      };
      
      // Send to all tokens
      const sendPromises = fcmTokens.map(async (token) => {
        try {
          await admin.messaging().send({
            token,
            notification,
            data: {
              chatRoomId,
              senderId,
              click_action: '/inbox'
            }
          });
          return { success: true };
        } catch (error) {
          // Remove invalid tokens
          if (error.code === 'messaging/invalid-registration-token') {
            await db.collection('users').doc(recipientId).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
            });
          }
          return { success: false, error: error.message };
        }
      });
      
      await Promise.all(sendPromises);
      console.log(`Push notification sent for chat ${chatRoomId}`);
      
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  });

/**
 * Send appointment reminder notification
 */
exports.sendAppointmentReminder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { userId, title, body } = data;
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmTokens = userDoc.data()?.fcmTokens || [];
    
    if (fcmTokens.length === 0) {
      return { success: false, message: 'No FCM tokens' };
    }
    
    const promises = fcmTokens.map(token => 
      admin.messaging().send({
        token,
        notification: { title, body, icon: '/icon-192.png' }
      }).catch(() => null)
    );
    
    await Promise.all(promises);
    return { success: true };
    
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
