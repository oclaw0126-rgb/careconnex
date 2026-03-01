import * as admin from 'firebase-admin';
import { logger } from './logger';
import twilio from 'twilio';

const db = admin.firestore();

export async function sendProactiveMessage(
  to: string, 
  message: string,
  context: { userId: string; checkType: string }
): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioNumber) {
      logger.warn('[Messaging] Twilio credentials missing, simulating message', { to, checkType: context.checkType });
    } else {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: message,
        from: `whatsapp:${twilioNumber}`,
        to: `whatsapp:${to}` // Assuming WhatsApp format
      });
    }

    // Log to Firestore for tracking
    await db.collection('proactive_messages').add({
      userId: context.userId,
      checkType: context.checkType,
      message,
      to,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });
    
    // Update last contacted time for the user to prevent spam
    await db.collection('users').doc(context.userId).set({
      lastContactedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    logger.info(`[Messaging] Proactive message sent to ${to} for ${context.checkType}`);
  } catch (error) {
    logger.error(`[Messaging] Error sending message to ${to}:`, error);
  }
}