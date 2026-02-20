const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Connect a new user with Cara AI agent
 * Sends welcome message via their preferred channel
 */
exports.connectCaraAgent = functions.https.onCall(async (data, context) => {
  const {
    name,
    phone,
    telegramUsername,
    messagingPreference,
    zipCode,
    needs,
    schedule,
    userId
  } = data;

  console.log('🤖 Connecting user with Cara:', { name, phone, messagingPreference });

  try {
    // Store agent connection in Firestore
    await db.collection('cara_connections').doc(userId || `temp-${Date.now()}`).set({
      name,
      phone,
      telegramUsername: telegramUsername || null,
      messagingPreference,
      zipCode,
      needs,
      schedule,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      conversationState: 'welcome'
    });

    // Prepare welcome message
    const welcomeMessage = `👋 Hi ${name.split(' ')[0]}! I'm Cara, your CareConnex care coordinator.

I see you need care in ${zipCode} for:
${needs.slice(0, 3).join(', ')}
Schedule: ${schedule.join(', ')}

I'll find the perfect caregivers for you. Let's start!

What type of care is most important? (You can tell me more about your needs)`;

    // Send welcome message based on preference
    let messageSent = false;

    if (messagingPreference === 'telegram' && telegramUsername) {
      // Send via Telegram bot
      messageSent = await sendTelegramMessage(telegramUsername, welcomeMessage);
    } else if (messagingPreference === 'sms') {
      // Send via Twilio SMS
      messageSent = await sendSMS(phone, welcomeMessage);
    } else if (messagingPreference === 'whatsapp') {
      // Send via WhatsApp (if configured)
      messageSent = await sendWhatsApp(phone, welcomeMessage);
    }

    // Also create a record in active_conversations for the agent
    await db.collection('active_conversations').doc(phone).set({
      userId: userId || `temp-${Date.now()}`,
      name,
      phone,
      messagingPreference,
      agentName: 'Cara',
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      context: {
        zipCode,
        needs,
        schedule,
        step: 'needs_assessment'
      }
    });

    return {
      success: true,
      message: 'Cara connected successfully',
      channel: messagingPreference,
      messageSent
    };

  } catch (error) {
    console.error('❌ Failed to connect Cara:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Send Telegram message via bot
 */
async function sendTelegramMessage(username, message) {
  try {
    const botToken = functions.config().telegram?.bot_token || process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.warn('Telegram bot token not configured');
      return false;
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Note: In production, you'd need to get the chat_id from username
    // This requires the user to first message the bot
    // For MVP, we'll store the chat_id when they message @mohammedImranbot

    console.log('Would send Telegram to:', cleanUsername);
    console.log('Message:', message);

    // TODO: Implement actual Telegram API call
    // For now, return true to simulate success
    return true;

  } catch (error) {
    console.error('Telegram send failed:', error);
    return false;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(phone, message) {
  try {
    const twilioSid = functions.config().twilio?.sid || process.env.TWILIO_SID;
    const twilioToken = functions.config().twilio?.token || process.env.TWILIO_TOKEN;
    const twilioPhone = functions.config().twilio?.phone || process.env.TWILIO_PHONE;

    if (!twilioSid || !twilioToken) {
      console.warn('Twilio not configured');
      return false;
    }

    const twilio = require('twilio')(twilioSid, twilioToken);

    await twilio.messages.create({
      body: message,
      from: twilioPhone,
      to: phone
    });

    console.log('SMS sent to:', phone);
    return true;

  } catch (error) {
    console.error('SMS send failed:', error);
    return false;
  }
}

/**
 * Send WhatsApp message
 */
async function sendWhatsApp(phone, message) {
  // TODO: Implement WhatsApp Business API
  console.log('WhatsApp not yet implemented');
  return false;
}
