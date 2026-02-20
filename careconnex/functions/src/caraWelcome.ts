import * as functions from 'firebase-functions';

// CORS headers for web app access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Send WhatsApp Welcome Message
 * Called after user signs up and chooses to connect with Cara
 */
export const sendWhatsAppWelcome = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set(corsHeaders);

  try {
    const { name, phone } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, error: 'Phone number required' });
      return;
    }

    // Get Twilio credentials
    const twilioSid = functions.config().twilio?.sid;
    const twilioToken = functions.config().twilio?.token;
    const twilioNumber = functions.config().twilio?.whatsapp_number;

    if (!twilioSid || !twilioToken) {
      console.log('Twilio not configured, skipping welcome message');
      res.json({ success: true, message: 'Twilio not configured, but signup successful' });
      return;
    }

    const twilio = require('twilio')(twilioSid, twilioToken);

    const welcomeMessage = `👋 Hi ${name?.split(' ')[0] || 'there'}! I'm Cara, your CareConnex care coordinator.\n\nI can help you:\n• Find caregivers\n• Book appointments  \n• Schedule interviews\n• Check your schedule\n• Update care plans\n• Find backup caregivers\n\nJust text me anytime! What care do you need?`;

    // Send WhatsApp message
    const message = await twilio.messages.create({
      body: welcomeMessage,
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${phone}`
    });

    console.log('✅ WhatsApp welcome sent:', message.sid);

    res.json({ 
      success: true, 
      messageSid: message.sid,
      message: 'Welcome message sent successfully'
    });

  } catch (error) {
    console.error('❌ Failed to send WhatsApp welcome:', error);
    // Don't fail the signup if message fails
    res.json({ 
      success: true, 
      warning: 'Account created but welcome message failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Send SMS Welcome Message (fallback)
 */
export const sendSMSWelcome = functions.https.onRequest(async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  res.set(corsHeaders);

  try {
    const { name, phone } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, error: 'Phone number required' });
      return;
    }

    const twilioSid = functions.config().twilio?.sid;
    const twilioToken = functions.config().twilio?.token;
    const twilioNumber = functions.config().twilio?.phone_number;

    if (!twilioSid || !twilioToken) {
      res.json({ success: true, message: 'Twilio not configured' });
      return;
    }

    const twilio = require('twilio')(twilioSid, twilioToken);

    const welcomeMessage = `CareConnex: Hi ${name?.split(' ')[0] || 'there'}! I'm Cara, your care coordinator. Text me anytime to find caregivers, book appointments, or get help. Reply HELP for options.`;

    const message = await twilio.messages.create({
      body: welcomeMessage,
      from: twilioNumber,
      to: phone
    });

    res.json({ success: true, messageSid: message.sid });

  } catch (error) {
    console.error('SMS welcome failed:', error);
    res.json({ success: true, warning: 'SMS failed but signup successful' });
  }
});
