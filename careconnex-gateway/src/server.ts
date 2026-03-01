// Main Express Server - CareConnex Gateway
// Handles WhatsApp webhooks and runs the agent

import express from 'express';
import * as admin from 'firebase-admin';
import { logger } from './logger';
import { Agent, runAgent } from './agent';
import { initializeTools } from './tools';
import { getSessionStats } from './session';
import { spawnSubAgent, runOvernightJobs } from './subagents';
import { analyzeSeniorHealth, runHealthAnalysisForAllSeniors, sendDailyHealthSummary } from './healthPredictor';
import { getSmartMatches, calculateSmartMatchScore, collectFamilyFeedback, learnFromMatches, runWeeklyLearning } from './matchingLearner';
import { startHeartbeatScheduler, runHeartbeat } from './heartbeat';

// Initialize Firebase Admin
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (firebaseProjectId) {
  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail,
        privateKey
      })
    });
    logger.info('[Firebase] Initialized with cert', { projectId: firebaseProjectId });
  } else {
    admin.initializeApp({
      projectId: firebaseProjectId,
      credential: admin.credential.applicationDefault()
    });
    logger.info('[Firebase] Initialized with Application Default', { projectId: firebaseProjectId });
  }
} else {
  logger.warn('[Firebase] No project ID configured');
}

const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;
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
  try {
    const { From, Body, ProfileName } = req.body;
    const phoneNumber = From?.replace('whatsapp:', '') || '';
    
    if (!phoneNumber || !Body) {
      res.status(400).send('Invalid request');
      return;
    }
    
    // Use new Agent class
    const agent = new Agent(phoneNumber, `session_${Date.now()}`);
    const result = await agent.processMessage(Body);
    
    // Send TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(result.response)}</Message>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
    
  } catch (error) {
    logger.error('[Webhook] Error', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I apologize, I'm having trouble right now. Please try again!</Message>
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

// Sub-Agent Endpoints

// Spawn a specialized sub-agent
app.post('/agents/spawn', async (req, res) => {
  try {
    const { type, familyId, seniorId, instructions } = req.body;
    
    if (!type || !familyId || !seniorId) {
      res.status(400).json({ error: 'Missing required fields: type, familyId, seniorId' });
      return;
    }
    
    const taskId = await spawnSubAgent(type, familyId, seniorId, instructions || '');
    
    res.json({
      success: true,
      taskId,
      message: `Spawned ${type} agent for family ${familyId}`,
      status: 'running'
    });
  } catch (error) {
    logger.error('[API] Spawn agent error', { error });
    res.status(500).json({ error: 'Failed to spawn agent' });
  }
});

// Trigger overnight jobs (cron endpoint)
app.post('/agents/overnight', async (req, res) => {
  try {
    // Run in background
    runOvernightJobs();
    
    res.json({
      success: true,
      message: 'Overnight jobs started',
      status: 'running'
    });
  } catch (error) {
    logger.error('[API] Overnight jobs error', { error });
    res.status(500).json({ error: 'Failed to start overnight jobs' });
  }
});

// Send care update to family (manual trigger)
app.post('/agents/send-update', async (req, res) => {
  try {
    const { familyId, seniorId, type = 'daily' } = req.body;
    
    if (!familyId || !seniorId) {
      res.status(400).json({ error: 'Missing familyId or seniorId' });
      return;
    }
    
    const taskId = await spawnSubAgent('reporter', familyId, seniorId, `Generate ${type} care report`);
    
    res.json({
      success: true,
      taskId,
      message: `Care update being sent to family ${familyId}`,
      type
    });
  } catch (error) {
    logger.error('[API] Send update error', { error });
    res.status(500).json({ error: 'Failed to send update' });
  }
});

// Get sub-agent task status
app.get('/agents/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskDoc = await db.collection('subagent_tasks').doc(taskId).get();
    
    if (!taskDoc.exists) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    res.json({
      taskId,
      ...taskDoc.data()
    });
  } catch (error) {
    logger.error('[API] Get task error', { error });
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// ========== PREDICTIVE HEALTH ALERTS ==========

// Analyze a senior's health data
app.post('/health/analyze', async (req, res) => {
  try {
    const { seniorId } = req.body;
    
    if (!seniorId) {
      res.status(400).json({ error: 'Missing seniorId' });
      return;
    }
    
    const alerts = await analyzeSeniorHealth(seniorId);
    
    res.json({
      success: true,
      seniorId,
      alerts,
      alertCount: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical').length
    });
  } catch (error) {
    logger.error('[API] Health analysis error', { error });
    res.status(500).json({ error: 'Failed to analyze health data' });
  }
});

// Run health analysis for all seniors (cron endpoint)
app.post('/health/analyze-all', async (req, res) => {
  try {
    // Run in background
    runHealthAnalysisForAllSeniors();
    
    res.json({
      success: true,
      message: 'Health analysis started for all seniors',
      status: 'running'
    });
  } catch (error) {
    logger.error('[API] Health analysis all error', { error });
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Send daily health summary to family
app.post('/health/send-summary', async (req, res) => {
  try {
    const { seniorId } = req.body;
    
    if (!seniorId) {
      res.status(400).json({ error: 'Missing seniorId' });
      return;
    }
    
    await sendDailyHealthSummary(seniorId);
    
    res.json({
      success: true,
      message: 'Health summary sent to family'
    });
  } catch (error) {
    logger.error('[API] Send summary error', { error });
    res.status(500).json({ error: 'Failed to send summary' });
  }
});

// ========== SELF-IMPROVING MATCHING ==========

// Get smart caregiver matches for a senior
app.get('/matching/smart/:seniorId', async (req, res) => {
  try {
    const { seniorId } = req.params;
    const limit = parseInt(req.query.limit as string) || 3;
    
    const matches = await getSmartMatches(seniorId, limit);
    
    res.json({
      success: true,
      seniorId,
      matches,
      count: matches.length
    });
  } catch (error) {
    logger.error('[API] Smart matching error', { error });
    res.status(500).json({ error: 'Failed to get smart matches' });
  }
});

// Calculate match score between senior and caregiver
app.get('/matching/score', async (req, res) => {
  try {
    const { seniorId, caregiverId } = req.query;
    
    if (!seniorId || !caregiverId) {
      res.status(400).json({ error: 'Missing seniorId or caregiverId' });
      return;
    }
    
    const result = await calculateSmartMatchScore(seniorId as string, caregiverId as string);
    
    res.json({
      success: true,
      seniorId,
      caregiverId,
      ...result
    });
  } catch (error) {
    logger.error('[API] Match score error', { error });
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

// Collect family feedback on a match
app.post('/matching/feedback', async (req, res) => {
  try {
    const { seniorId, caregiverId, rating, satisfaction, wouldRecommend, comments } = req.body;
    
    if (!seniorId || !caregiverId) {
      res.status(400).json({ error: 'Missing seniorId or caregiverId' });
      return;
    }
    
    await collectFamilyFeedback(seniorId, caregiverId, {
      rating,
      satisfaction,
      wouldRecommend,
      comments
    });
    
    res.json({
      success: true,
      message: 'Feedback collected successfully'
    });
  } catch (error) {
    logger.error('[API] Feedback error', { error });
    res.status(500).json({ error: 'Failed to collect feedback' });
  }
});

// Trigger learning from matches (cron endpoint)
app.post('/matching/learn', async (req, res) => {
  try {
    // Run in background
    learnFromMatches();
    
    res.json({
      success: true,
      message: 'Learning cycle started',
      status: 'running'
    });
  } catch (error) {
    logger.error('[API] Learn error', { error });
    res.status(500).json({ error: 'Failed to start learning' });
  }
});

// Run weekly learning cycle
app.post('/matching/weekly-learning', async (req, res) => {
  try {
    runWeeklyLearning();
    
    res.json({
      success: true,
      message: 'Weekly learning cycle started',
      status: 'running'
    });
  } catch (error) {
    logger.error('[API] Weekly learning error', { error });
    res.status(500).json({ error: 'Failed to start weekly learning' });
  }
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

// ========== ADMIN ENDPOINTS ==========

// Manual trigger for heartbeat
app.post('/admin/heartbeat', async (req, res) => {
  await runHeartbeat();
  res.json({ success: true, message: 'Heartbeat executed' });
});

// Auto-start proactive heartbeat
startHeartbeatScheduler();

// Start server
app.listen(PORT, () => {
  logger.info(`[Server] CareConnex Gateway running on port ${PORT}`);
  // BUG FIX: Use actual Railway URL from environment
  const webhookUrl = process.env.RAILWAY_STATIC_URL 
    ? `${process.env.RAILWAY_STATIC_URL}/webhook/whatsapp`
    : `http://localhost:${PORT}/webhook/whatsapp`;
  logger.info(`[Server] Webhook URL: ${webhookUrl}`);
});

export default app;
