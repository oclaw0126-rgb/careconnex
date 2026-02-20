/**
 * Twilio Webhook Handler
 * Receives SMS messages and routes to Care Agent
 */

const { CareAgent } = require('../agent/agent');

// In-memory store for active agents (use Firestore in production)
const activeAgents = new Map();

/**
 * Main webhook handler
 */
exports.twilioWebhook = async (req, res) => {
  try {
    // Twilio sends form data
    const { From, Body, To } = req.body;
    
    console.log('📩 Received SMS:', { from: From, body: Body, to: To });
    
    // Get or create agent for this user
    let agent = activeAgents.get(From);
    if (!agent) {
      agent = new CareAgent(
        `user-${Date.now()}`,
        From,
        generateAgentName()
      );
      activeAgents.set(From, agent);
      console.log('🆕 Created new agent for:', From);
    }
    
    // Process message
    const response = await agent.processMessage(Body);
    
    // Send Twilio response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response)}</Message>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
    
    console.log('📤 Sent response:', response.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble right now. Please try again in a moment.</Message>
</Response>`);
  }
};

/**
 * Generate friendly agent name
 */
function generateAgentName() {
  const names = ['Sarah', 'Maria', 'Jennifer', 'Lisa', 'Emily', 'Jessica', 'Amanda', 'Michelle'];
  return names[Math.floor(Math.random() * names.length)];
}

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

/**
 * Health check endpoint
 */
exports.health = (req, res) => {
  res.json({
    status: 'healthy',
    activeConversations: activeAgents.size,
    timestamp: new Date().toISOString()
  });
};
