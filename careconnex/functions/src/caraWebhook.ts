import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CaraAgent } from './caraAgent';

const db = admin.firestore();

/**
 * WhatsApp Webhook - Powered by TRUE Cara Agent
 * Cara can now execute actions, not just chat
 */
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      From,
      Body,
      ProfileName
    } = req.body;

    console.log('📱 WhatsApp message:', { from: From, body: Body });

    const phoneNumber = From.replace('whatsapp:', '');

    const userRef = db.collection('users').where('phone', '==', phoneNumber);
    const userSnapshot = await userRef.get();
    
    let userId = null;

    if (!userSnapshot.empty) {
      userId = userSnapshot.docs[0].id;
    } else {
      const tempUser = await db.collection('temp_users').add({
        phone: phoneNumber,
        whatsappName: ProfileName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'whatsapp'
      });
      userId = tempUser.id;
    }

    const conversationId = `wa-${phoneNumber}-${Date.now()}`;
    const cara = new CaraAgent(userId, phoneNumber, conversationId);
    const agentResponse = await cara.processMessage(Body);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentResponse.text)}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

    console.log('✅ Cara agent responded:', { hasActions: agentResponse.actions?.length > 0 });

  } catch (error) {
    console.error('❌ WhatsApp/Cara error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble. Please try again or use the CareConnex app.</Message>
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

export const agentHealth = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    service: 'Cara Agent (WhatsApp)',
    capabilities: [
      'query_caregivers',
      'create_booking',
      'check_appointments'
    ],
    timestamp: new Date().toISOString()
  });
});
