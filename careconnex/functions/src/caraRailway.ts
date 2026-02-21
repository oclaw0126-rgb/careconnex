import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// CORS headers for web app access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Connect New Client to Railway Cara AI
 * Called after user signs up and chooses to connect with Cara
 */
export const connectCaraAgent = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set(corsHeaders);

  try {
    const { 
      name, 
      phone, 
      email,
      telegramUsername,
      messagingPreference = 'whatsapp',
      zipCode,
      needs,
      schedule,
      userId 
    } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, error: 'Phone number required' });
      return;
    }

    // 1. Create family/senior record in Firestore
    const familyRef = await db.collection('families').add({
      name: name || 'New Family',
      phone: phone,
      email: email || null,
      telegramUsername: telegramUsername || null,
      messagingPreference: messagingPreference,
      zipCode: zipCode || null,
      careNeeds: needs || [],
      schedulePreferences: schedule || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notificationPreferences: {
        careUpdates: true,
        healthAlerts: true,
        appointmentReminders: true
      },
      caraConnected: true,
      caraConnectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Create senior record
    const seniorRef = await db.collection('seniors').add({
      familyId: familyRef.id,
      name: name?.split(' ')[0] || 'Senior',
      careNeeds: needs || [],
      zipCode: zipCode || null,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Create Cara user session
    await db.collection('cara_users').doc(phone).set({
      familyId: familyRef.id,
      seniorId: seniorRef.id,
      phoneNumber: phone,
      name: name,
      messagingPreference: messagingPreference,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
      lastMessage: null,
      status: 'active'
    });

    // 4. Send welcome message via Railway Cara
    const RAILWAY_URL = 'https://careconnex-production.up.railway.app';
    
    const welcomeMessage = messagingPreference === 'whatsapp' 
      ? `👋 Hi ${name?.split(' ')[0] || 'there'}! I'm Cara, your CareConnex care coordinator.\n\nI can help you:\n• Find caregivers in ${zipCode || 'your area'}\n• Schedule interviews\n• Get care updates\n• Book appointments\n\nWhat type of care do you need? (e.g., companionship, dementia care, mobility assistance)`
      : `Hi ${name?.split(' ')[0] || 'there'}! I'm Cara from CareConnex. I'm here to help you find the perfect caregiver. What care do you need?`;

    // Send through Twilio
    const twilioSid = functions.config().twilio?.sid;
    const twilioToken = functions.config().twilio?.token;
    const twilioWhatsApp = functions.config().twilio?.whatsapp_number;

    if (twilioSid && twilioToken) {
      const twilio = require('twilio')(twilioSid, twilioToken);
      
      if (messagingPreference === 'whatsapp') {
        await twilio.messages.create({
          body: welcomeMessage,
          from: `whatsapp:${twilioWhatsApp}`,
          to: `whatsapp:${phone}`
        });
      } else {
        await twilio.messages.create({
          body: welcomeMessage,
          from: functions.config().twilio?.phone_number,
          to: phone
        });
      }

      console.log('✅ Welcome message sent to', phone);
    }

    // 5. Log the connection
    await db.collection('cara_connections').add({
      familyId: familyRef.id,
      seniorId: seniorRef.id,
      phone: phone,
      messagingPreference: messagingPreference,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'signup_flow'
    });

    // 6. Trigger initial health analysis (if data exists)
    try {
      await fetch(`${RAILWAY_URL}/health/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniorId: seniorRef.id })
      });
    } catch (e) {
      console.log('Health analysis not triggered (no data yet)');
    }

    res.json({ 
      success: true, 
      familyId: familyRef.id,
      seniorId: seniorRef.id,
      message: 'Cara connected successfully! Check your phone for a welcome message.'
    });

  } catch (error) {
    console.error('❌ Failed to connect Cara:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Webhook from Railway Cara to update Firebase
 * When Cara processes a message, update the family record
 */
export const caraWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  res.set(corsHeaders);

  try {
    const { 
      phoneNumber, 
      message, 
      response, 
      toolCalls,
      familyId,
      seniorId 
    } = req.body;

    // Update Cara user record
    await db.collection('cara_users').doc(phoneNumber).update({
      messageCount: admin.firestore.FieldValue.increment(1),
      lastMessage: message,
      lastResponse: response,
      lastInteractionAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Store conversation
    await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .add({
        role: 'user',
        content: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .add({
        role: 'assistant',
        content: response,
        tool_calls: toolCalls || [],
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    // If tools were used, log them
    if (toolCalls && toolCalls.length > 0) {
      for (const tool of toolCalls) {
        await db.collection('cara_tool_usage').add({
          phoneNumber,
          familyId,
          seniorId,
          tool: tool.tool,
          parameters: tool.parameters,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Cara webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Cara conversation history for a family
 */
export const getCaraHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { familyId } = data;
  
  // Get family record to find phone
  const familyDoc = await db.collection('families').doc(familyId).get();
  if (!familyDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Family not found');
  }
  
  const family = familyDoc.data();
  const phone = family?.phone;
  
  if (!phone) {
    return { messages: [] };
  }

  // Get last 50 messages
  const messagesSnapshot = await db.collection('cara_conversations')
    .doc(phone)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  const messages = messagesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })).reverse();

  return { messages };
});

/**
 * Disconnect Cara for a family
 */
export const disconnectCara = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { familyId } = data;
  
  await db.collection('families').doc(familyId).update({
    caraConnected: false,
    caraDisconnectedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});
