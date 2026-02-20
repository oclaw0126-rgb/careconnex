// Main Express Server - CareConnex Gateway
// Handles WhatsApp webhooks and runs the agent

import express from 'express';
import * as admin from 'firebase-admin';
import { logger } from './logger';
import { runAgent } from './agent';
import { initializeTools } from './tools';
import { getSessionStats } from './session';

// Initialize Firebase Admin
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
if (firebaseProjectId) {
  admin.initializeApp({
    projectId: firebaseProjectId,
    credential: admin.credential.applicationDefault()
  });
  logger.info('[Firebase] Initialized', { projectId: firebaseProjectId });
} else {
  logger.warn('[Firebase] No project ID configured');
}

const db = admin.firestore();
initializeTools(db);

// Express app
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'CareConnex Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/whatsapp',
      stats: '/stats'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = getSessionStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    sessions: stats
  });
});

// WhatsApp webhook endpoint (Twilio)
app.post('/webhook/whatsapp', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { From, Body, ProfileName } = req.body;
    
    logger.info('[Webhook] Received message', {
      from: From,
      body: Body,
      name: ProfileName
    });
    
    // Extract phone number
    const phoneNumber = From?.replace('whatsapp:', '') || '';
    
    if (!phoneNumber || !Body) {
      logger.warn('[Webhook] Invalid request', { body: req.body });
      res.status(400).send('Invalid request');
      return;
    }
    
    // Run the agent
    const result = await runAgent(Body, phoneNumber, ProfileName);
    
    logger.info('[Webhook] Agent response', {
      response: result.response.substring(0, 100),
      toolCalls: result.toolCalls.length
    });
    
    // Send TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(result.response)}</Message>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
    
    const duration = Date.now() - startTime;
    logger.info('[Webhook] Completed', { duration: `${duration}ms` });
    
  } catch (error) {
    logger.error('[Webhook] Error', { error });
    
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I apologize, I'm having a moment. Please try again!</Message>
</Response>`);
  }
});

// Stats endpoint
app.get('/stats', (req, res) => {
  const stats = getSessionStats();
  res.json({
    gateway: 'CareConnex',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    sessions: stats
  });
});

// XML escape helper
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Start server
app.listen(PORT, () => {
  logger.info(`[Server] CareConnex Gateway running on port ${PORT}`);
  logger.info(`[Server] Webhook URL: https://your-railway-url.railway.app/webhook/whatsapp`);
});

export default app;
