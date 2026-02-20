const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { CaraAgent } = require('./caraAgent');

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * WhatsApp Webhook - Powered by TRUE Cara Agent
 * Cara can now execute actions, not just chat
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      From,
      Body,
      To,
      ProfileName,
      MessageSid
    } = req.body;

    console.log('📱 WhatsApp message:', { from: From, body: Body });

    // Extract phone number
    const phoneNumber = From.replace('whatsapp:', '');

    // Get or create user
    const userRef = db.collection('users').where('phone', '==', phoneNumber);
    const userSnapshot = await userRef.get();
    
    let userId = null;
    let userData = null;

    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      userId = userDoc.id;
      userData = userDoc.data();
    } else {
      // Create temporary user for non-registered users
      const tempUser = await db.collection('temp_users').add({
        phone: phoneNumber,
        whatsappName: ProfileName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'whatsapp'
      });
      userId = tempUser.id;
    }

    // Create conversation ID
    const conversationId = `wa-${phoneNumber}-${Date.now()}`;

    // Initialize TRUE Cara Agent
    const cara = new CaraAgent(userId, phoneNumber, conversationId);

    // Process message with agent (can execute actions!)
    const agentResponse = await cara.processMessage(Body);

    // Send response via Twilio
    const twilioAccountSid = functions.config().twilio?.sid;
    const twilioAuthToken = functions.config().twilio?.token;
    
    let responseSent = false;

    if (twilioAccountSid && twilioAuthToken) {
      const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
      
      await twilio.messages.create({
        body: agentResponse.text,
        from: To,
        to: From
      });
      
      responseSent = true;
    }

    // Return TwiML as backup
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentResponse.text)}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

    console.log('✅ Cara agent responded:', { responseSent, hasActions: agentResponse.actions?.length > 0 });

  } catch (error) {
    console.error('❌ WhatsApp/Cara error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble. Please try again or use the CareConnex app.</Message>
</Response>`);
  }
});

/**
 * SMS Webhook - Also powered by Cara Agent
 * Same agent, different channel
 */
exports.smsWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const { From, Body, To } = req.body;
    
    console.log('📱 SMS message:', { from: From, body: Body });

    // Same logic as WhatsApp
    const phoneNumber = From;
    const userRef = db.collection('users').where('phone', '==', phoneNumber);
    const userSnapshot = await userRef.get();
    
    let userId = null;
    if (!userSnapshot.empty) {
      userId = userSnapshot.docs[0].id;
    }

    const conversationId = `sms-${phoneNumber}-${Date.now()}`;
    const cara = new CaraAgent(userId, phoneNumber, conversationId);
    const agentResponse = await cara.processMessage(Body);

    // Send SMS response
    const twilioAccountSid = functions.config().twilio?.sid;
    const twilioAuthToken = functions.config().twilio?.token;
    
    if (twilioAccountSid && twilioAuthToken) {
      const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
      
      await twilio.messages.create({
        body: agentResponse.text,
        from: To,
        to: From
      });
    }

    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);

  } catch (error) {
    console.error('❌ SMS/Cara error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);
  }
});

/**
 * Send welcome message to new users
 */
exports.sendAgentWelcome = functions.https.onCall(async (data, context) => {
  const { phoneNumber, name, channel = 'whatsapp' } = data;

  try {
    const twilioAccountSid = functions.config().twilio?.sid;
    const twilioAuthToken = functions.config().twilio?.token;
    const twilioNumber = functions.config().twilio?.[channel === 'whatsapp' ? 'whatsapp_number' : 'phone_number'];

    if (!twilioAccountSid || !twilioAuthToken) {
      return { success: false, error: 'Twilio not configured' };
    }

    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

    const welcomeMessage = `👋 Hi ${name.split(' ')[0]}! I'm Cara, your CareConnex care coordinator.

I can help you:
• Find caregivers
• Book appointments  
• Schedule interviews
• Check your schedule
• Update care plans
• Find backup caregivers

Just text me anytime! What care do you need?`;

    const message = await twilio.messages.create({
      body: welcomeMessage,
      from: channel === 'whatsapp' ? `whatsapp:${twilioNumber}` : twilioNumber,
      to: channel === 'whatsapp' ? `whatsapp:${phoneNumber}` : phoneNumber
    });

    return { success: true, messageSid: message.sid };

  } catch (error) {
    console.error('Welcome message failed:', error);
    return { success: false, error: error.message };
  }
});

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

exports.agentHealth = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    service: 'Cara Agent (WhatsApp/SMS)',
    capabilities: [
      'query_caregivers',
      'create_booking',
      'check_appointments',
      'schedule_interviews',
      'cancel_appointments',
      'find_backup_caregivers',
      'update_care_plans',
      'update_preferences'
    ],
    timestamp: new Date().toISOString()
  });
});
