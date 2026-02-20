const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { processWithLLM, classifyIntent, extractInfo } = require('./caraAgent');
const { tools } = require('./caraTools');

const db = admin.firestore();

/**
 * WhatsApp Webhook Handler via Twilio
 * Receives WhatsApp messages and routes to Cara Agent
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Twilio sends form data for WhatsApp
    const {
      From,           // WhatsApp number: whatsapp:+1234567890
      Body,           // Message text
      To,             // Your Twilio WhatsApp number
      ProfileName,    // User's WhatsApp name
      MessageSid      // Unique message ID
    } = req.body;

    console.log('📱 WhatsApp message received:', {
      from: From,
      body: Body,
      profileName: ProfileName
    });

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = From.replace('whatsapp:', '');

    // Get or create user session
    const userRef = db.collection('cara_users').doc(phoneNumber);
    const userDoc = await userRef.get();

    let userData;
    let isNewUser = false;

    if (!userDoc.exists) {
      // New user - create profile
      isNewUser = true;
      userData = {
        phoneNumber,
        whatsappName: ProfileName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        conversationState: 'welcome',
        context: {},
        messageCount: 0
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data();
    }

    // Get recent conversation history
    const historySnapshot = await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const conversationHistory = historySnapshot.docs
      .reverse()
      .map(doc => ({
        role: doc.data().role,
        content: doc.data().content
      }));

    let response;

    // Process based on conversation state
    if (isNewUser) {
      response = await handleNewUser(ProfileName);
    } else {
      // Use LLM-powered agent processing
      response = await processWithLLM(Body, userData, conversationHistory);
    }

    // Store the conversation
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
        role: 'model',
        content: response.message,
        tool: response.tool || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update user context if provided
    if (response.contextUpdate) {
      await userRef.update({
        [`context.${response.contextUpdate.key}`]: response.contextUpdate.value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Update message count
    await userRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: Body
    });

    // Send WhatsApp response via Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response.message)}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

    console.log('✅ WhatsApp response sent');

  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble right now. Please try again in a moment, or type "help" for assistance.</Message>
</Response>`);
  }
});

/**
 * Handle new user welcome
 */
async function handleNewUser(profileName) {
  const firstName = profileName ? profileName.split(' ')[0] : 'there';

  return {
    message: `👋 Hi ${firstName}! I'm Cara, your CareConnex care coordinator.

I help families find the perfect caregivers for their loved ones. I can:

• Find qualified caregivers in your area
• Schedule video interviews
• Handle booking and scheduling
• Answer questions about care options

To get started, tell me:
1. Who needs care? (mom, dad, grandparent, etc.)
2. What's your zip code?
3. What type of care do they need?

Or just tell me about your situation and I'll help!`,
    tool: null
  };
}

/**
 * Send welcome message to new WhatsApp user
 * Called from signup flow
 */
exports.sendWhatsAppWelcome = functions.https.onCall(async (data, context) => {
  const {
    phoneNumber,
    name,
    zipCode,
    needs,
    schedule,
    userId
  } = data;

  // Get Twilio credentials from Firebase config
  const twilioAccountSid = functions.config().twilio?.sid || process.env.TWILIO_SID;
  const twilioAuthToken = functions.config().twilio?.token || process.env.TWILIO_TOKEN;
  const twilioWhatsAppNumber = functions.config().twilio?.whatsapp_number || process.env.TWILIO_WHATSAPP_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken) {
    console.error('Twilio credentials not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

    // Store user in Cara system
    await db.collection('cara_users').doc(phoneNumber).set({
      phoneNumber,
      name,
      userId: userId || null,
      zipCode,
      needs: needs || [],
      schedule: schedule || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      conversationState: 'post_signup',
      context: {
        zipCode,
        needs,
        schedule
      }
    }, { merge: true });

    const welcomeMessage = `👋 Hi ${name.split(' ')[0]}! I'm Cara, your CareConnex care coordinator.

I see you need care in ${zipCode} for:
${needs?.slice(0, 3).join(', ') || 'senior care'}
Schedule: ${schedule?.join(', ') || 'flexible'}

I'll find the perfect caregivers for you! Let me search...`;

    const message = await twilio.messages.create({
      body: welcomeMessage,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${phoneNumber}`
    });

    // Store the welcome message
    await db.collection('cara_conversations')
      .doc(phoneNumber)
      .collection('messages')
      .add({
        role: 'model',
        content: welcomeMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    // Trigger initial caregiver search
    setTimeout(async () => {
      try {
        const searchResult = await tools.searchCaregivers({
          zipCode,
          needs: needs || [],
          maxPrice: 50
        });

        if (searchResult.found && searchResult.caregivers.length > 0) {
          const caregiverList = searchResult.caregivers.map((c, i) =>
            `${i + 1}️⃣ *${c.name}* - $${c.hourlyRate}/hr, ⭐ ${c.rating}\n   ${c.specialties?.slice(0, 2).join(', ')}`
          ).join('\n\n');

          const followUpMessage = `Great news! I found ${searchResult.count} excellent caregivers in your area:\n\n${caregiverList}\n\nWhich would you like to interview? Reply with 1, 2, or 3, or tell me more about what you're looking for!`;

          await twilio.messages.create({
            body: followUpMessage,
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${phoneNumber}`
          });

          await db.collection('cara_conversations')
            .doc(phoneNumber)
            .collection('messages')
            .add({
              role: 'model',
              content: followUpMessage,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      } catch (err) {
        console.error('Follow-up search error:', err);
      }
    }, 2000);

    console.log('✅ WhatsApp welcome sent:', message.sid);

    return {
      success: true,
      messageId: message.sid
    };

  } catch (error) {
    console.error('❌ WhatsApp welcome failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Health check endpoint
 */
exports.whatsappHealth = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    service: 'WhatsApp via Twilio',
    version: '2.0.0',
    features: ['LLM-powered agent', 'Real caregiver search', 'Interview scheduling'],
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Cara user stats (for admin)
 */
exports.getCaraStats = functions.https.onCall(async (data, context) => {
  try {
    const usersSnapshot = await db.collection('cara_users').get();
    const totalUsers = usersSnapshot.size;

    const activeToday = await db.collection('cara_users')
      .where('lastMessageAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .get();

    const interviewsSnapshot = await db.collection('interviews').get();

    return {
      totalUsers,
      activeToday: activeToday.size,
      totalInterviews: interviewsSnapshot.size
    };
  } catch (error) {
    console.error('Stats error:', error);
    return { error: error.message };
  }
});

/**
 * Escape XML for Twilio
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
