import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { runCaraAgent, loadUserMemory, loadConversationHistory } from './caraAgentV2';

const db = admin.firestore();

/**
 * ============================================================
 * CARA WHATSAPP WEBHOOK v4.0 - OpenClaw Architecture
 * ============================================================
 */

export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Parse Twilio request
    const { From, Body, ProfileName } = req.body;

    console.log('📱 ========================================');
    console.log('📱 WHATSAPP MESSAGE RECEIVED');
    console.log('📱 From:', From);
    console.log('📱 Body:', Body);
    console.log('📱 Name:', ProfileName);
    console.log('📱 ========================================');

    // Extract phone
    const phoneNumber = From.replace('whatsapp:', '');
    
    // Get or create user
    const userRef = db.collection('cara_users').doc(phoneNumber);
    const userDoc = await userRef.get();
    
    let userData = userDoc.data();
    const isNewUser = !userDoc.exists;

    if (isNewUser) {
      console.log('👤 Creating new user');
      await userRef.set({
        phoneNumber,
        whatsappName: ProfileName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: 0
      });
      userData = { phoneNumber, whatsappName: ProfileName };
    }

    // Load memory and conversation history
    const [memory, conversationHistory] = await Promise.all([
      loadUserMemory(userDoc.id || phoneNumber, phoneNumber),
      loadConversationHistory(phoneNumber)
    ]);

    console.log('💾 Memory loaded:', Object.keys(memory));
    console.log('📜 History loaded:', conversationHistory.length, 'messages');

    // Run the Cara Agent
    const agentResult = await runCaraAgent(Body, {
      userId: userDoc.id || phoneNumber,
      userPhone: phoneNumber,
      userName: ProfileName || userData?.whatsappName,
      conversationHistory,
      memory
    });

    console.log('📝 Agent response:', agentResult.response.substring(0, 100));
    console.log('🔧 Tool calls:', agentResult.toolCalls.length);

    // Store conversation
    await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .add({
        role: 'user',
        content: Body,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .add({
        role: 'assistant',
        content: agentResult.response,
        tool_calls: agentResult.toolCalls.map(t => t.tool),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update user stats
    await userRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: Body
    });

    // Send WhatsApp response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentResult.response)}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

    const duration = Date.now() - startTime;
    console.log(`✅ Response sent in ${duration}ms`);
    console.log('📱 ========================================');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I apologize, I'm having a moment. Please try again!</Message>
</Response>`);
  }
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Send welcome message to new users
 */
export const sendWhatsAppWelcome = functions.https.onCall(async (data, context) => {
  const { phoneNumber, name } = data;
  
  const twilioSid = functions.config().twilio?.sid || process.env.TWILIO_SID;
  const twilioToken = functions.config().twilio?.token || process.env.TWILIO_TOKEN;
  const twilioWhatsAppNumber = functions.config().twilio?.whatsapp_number || process.env.TWILIO_WHATSAPP_NUMBER;

  if (!twilioSid || !twilioToken) {
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const twilio = require('twilio')(twilioSid, twilioToken);

    const welcomeMessage = `👋 Hi${name ? ' ' + name : ''}! I'm Cara from CareConnex.\n\nI'm here to help you find the perfect caregiver for your loved one. Just reply with your zip code and I'll search for qualified caregivers in your area!`;

    await twilio.messages.create({
      body: welcomeMessage,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${phoneNumber}`
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending welcome:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get Cara stats
 */
export const getCaraStats = functions.https.onCall(async (data, context) => {
  const [users, activeToday, interviews] = await Promise.all([
    db.collection('cara_users').get(),
    db.collection('cara_users')
      .where('lastMessageAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .get(),
    db.collection('interviews').get()
  ]);

  return {
    totalUsers: users.size,
    activeToday: activeToday.size,
    totalInterviews: interviews.size
  };
});
