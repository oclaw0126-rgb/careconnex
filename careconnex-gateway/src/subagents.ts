// Sub-Agent System - Cara can spawn specialized agents for complex tasks
// Each sub-agent handles a specific domain

import { logger } from './logger';
import { callLLM } from './llm';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Sub-Agent Types
export type SubAgentType = 'matcher' | 'scheduler' | 'reporter' | 'overnight';

interface SubAgentTask {
  id: string;
  type: SubAgentType;
  familyId: string;
  seniorId: string;
  instructions: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: any;
}

// Spawn a sub-agent to handle a specific task
export async function spawnSubAgent(
  type: SubAgentType,
  familyId: string,
  seniorId: string,
  instructions: string
): Promise<string> {
  const taskId = db.collection('subagent_tasks').doc().id;
  
  const task: SubAgentTask = {
    id: taskId,
    type,
    familyId,
    seniorId,
    instructions,
    status: 'pending',
    createdAt: new Date()
  };
  
  await db.collection('subagent_tasks').doc(taskId).set(task);
  
  logger.info(`[SubAgent] Spawned ${type} agent`, { taskId, familyId, seniorId });
  
  // Execute immediately (in production, this could be a background job)
  executeSubAgent(taskId, type, instructions, familyId, seniorId);
  
  return taskId;
}

// Execute sub-agent logic
async function executeSubAgent(
  taskId: string,
  type: SubAgentType,
  instructions: string,
  familyId: string,
  seniorId: string
): Promise<void> {
  await db.collection('subagent_tasks').doc(taskId).update({ status: 'running' });
  
  try {
    let result: any;
    
    switch (type) {
      case 'matcher':
        result = await runMatcherAgent(instructions, seniorId);
        break;
      case 'scheduler':
        result = await runSchedulerAgent(instructions, familyId, seniorId);
        break;
      case 'reporter':
        result = await runReporterAgent(instructions, familyId, seniorId);
        break;
      case 'overnight':
        result = await runOvernightAgent(familyId, seniorId);
        break;
      default:
        throw new Error(`Unknown sub-agent type: ${type}`);
    }
    
    await db.collection('subagent_tasks').doc(taskId).update({
      status: 'completed',
      completedAt: new Date(),
      result
    });
    
    logger.info(`[SubAgent] ${type} completed`, { taskId });
    
  } catch (error) {
    logger.error(`[SubAgent] ${type} failed`, { taskId, error });
    await db.collection('subagent_tasks').doc(taskId).update({
      status: 'failed',
      completedAt: new Date(),
      result: { error: error.message }
    });
  }
}

// MATCHER AGENT: Find best caregivers for a senior
async function runMatcherAgent(instructions: string, seniorId: string): Promise<any> {
  logger.info('[MatcherAgent] Starting', { seniorId, instructions });
  
  // Get senior profile
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  if (!seniorDoc.exists) {
    throw new Error('Senior not found');
  }
  const senior = seniorDoc.data();
  
  // Get all available caregivers
  const caregiversSnapshot = await db.collection('caregivers')
    .where('available', '==', true)
    .where('verified', '==', true)
    .get();
  
  const caregivers = caregiversSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Use LLM to rank matches
  const prompt = `You are a matching specialist. Given this senior's needs and available caregivers, rank the top 3 matches.

SENIOR PROFILE:
- Name: ${senior?.name}
- Needs: ${senior?.careNeeds?.join(', ') || 'General care'}
- Location: ${senior?.zipCode}
- Preferences: ${senior?.preferences || 'None specified'}

AVAILABLE CAREGIVERS (${caregivers.length}):
${caregivers.map((c: any) => `- ${c.name}: ${c.specialties?.join(', ')}, ${c.yearsExperience} years exp, ${c.hourlyRate}/hr, location: ${c.zipCode}`).join('\n')}

TASK: ${instructions}

Return JSON: {"rankings": [{"caregiverId": "...", "caregiverName": "...", "matchScore": 95, "reason": "..."}], "summary": "..."}`;

  const response = await callLLM([
    { role: 'system', content: 'You are a care matching specialist. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ]);
  
  try {
    const result = JSON.parse(response);
    
    // Store match results
    await db.collection('care_matches').add({
      seniorId,
      matches: result.rankings,
      generatedAt: new Date(),
      agent: 'matcher'
    });
    
    return result;
  } catch (e) {
    return { rankings: [], summary: 'Could not generate rankings', raw: response };
  }
}

// SCHEDULER AGENT: Coordinate schedules between families and caregivers
async function runSchedulerAgent(instructions: string, familyId: string, seniorId: string): Promise<any> {
  logger.info('[SchedulerAgent] Starting', { familyId, seniorId });
  
  // Get family's availability
  const familyDoc = await db.collection('families').doc(familyId).get();
  const family = familyDoc.data();
  
  // Get upcoming appointments
  const appointmentsSnapshot = await db.collection('appointments')
    .where('seniorId', '==', seniorId)
    .where('status', 'in', ['pending', 'confirmed'])
    .get();
  
  const appointments = appointmentsSnapshot.docs.map(doc => doc.data());
  
  // Find optimal slots
  const prompt = `You are a scheduling specialist. Find optimal appointment times.

FAMILY PREFERENCES:
- Preferred times: ${family?.preferredTimes || 'Flexible'}
- Avoid: ${family?.availabilityConstraints || 'None'}

EXISTING APPOINTMENTS:
${appointments.map((a: any) => `- ${a.date} ${a.time} with ${a.caregiverName}`).join('\n')}

TASK: ${instructions}

Suggest 3 optimal time slots. Return JSON: {"suggestions": [{"date": "...", "time": "...", "reason": "..."}], "summary": "..."}`;

  const response = await callLLM([
    { role: 'system', content: 'You are a scheduling specialist. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ]);
  
  try {
    return JSON.parse(response);
  } catch (e) {
    return { suggestions: [], summary: 'Could not generate schedule', raw: response };
  }
}

// REPORTER AGENT: Generate care reports for families
async function runReporterAgent(instructions: string, familyId: string, seniorId: string): Promise<any> {
  logger.info('[ReporterAgent] Starting', { familyId, seniorId });
  
  // Get recent care journal entries
  const journalSnapshot = await db.collection('care_journal')
    .where('seniorId', '==', seniorId)
    .where('date', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    .orderBy('date', 'desc')
    .get();
  
  const entries = journalSnapshot.docs.map(doc => doc.data());
  
  // Get senior info
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  // Generate report
  const prompt = `You are a care reporter. Create a summary of care for the family.

SENIOR: ${senior?.name}

CARE JOURNAL ENTRIES (Last 7 days):
${entries.map((e: any) => `- ${e.date}: ${e.caregiverName} - ${e.notes || 'No notes'}`).join('\n')}

TASK: ${instructions}

Write a warm, professional summary for the family. Include:
1. Overall wellbeing
2. Key activities
3. Any concerns
4. Positive moments

Return JSON: {"summary": "...", "highlights": ["..."], "concerns": ["..."], "nextSteps": "..."}`;

  const response = await callLLM([
    { role: 'system', content: 'You are a care reporter. Be warm and professional. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ]);
  
  try {
    const result = JSON.parse(response);
    
    // Send to family
    await sendFamilyUpdate(familyId, seniorId, result);
    
    return result;
  } catch (e) {
    return { summary: 'Report generation failed', raw: response };
  }
}

// OVERNIGHT AGENT: Works while families sleep
async function runOvernightAgent(familyId: string, seniorId: string): Promise<any> {
  logger.info('[OvernightAgent] Running overnight tasks', { familyId, seniorId });
  
  const results = {
    matcherRan: false,
    scheduleOptimized: false,
    reportGenerated: false,
    notificationsSent: []
  };
  
  // 1. Run matcher if no caregiver assigned
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  if (!senior?.assignedCaregiverId) {
    await runMatcherAgent('Find best caregiver match for this senior', seniorId);
    results.matcherRan = true;
  }
  
  // 2. Check for upcoming appointments and optimize
  const upcomingAppointments = await db.collection('appointments')
    .where('seniorId', '==', seniorId)
    .where('status', '==', 'pending')
    .where('date', '<=', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) // Next 3 days
    .get();
  
  if (upcomingAppointments.size > 0) {
    await runSchedulerAgent('Optimize upcoming appointments', familyId, seniorId);
    results.scheduleOptimized = true;
  }
  
  // 3. Generate daily report if caregivers checked in today
  const todayCheckins = await db.collection('care_journal')
    .where('seniorId', '==', seniorId)
    .where('date', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
    .get();
  
  if (todayCheckins.size > 0) {
    await runReporterAgent('Generate daily care summary', familyId, seniorId);
    results.reportGenerated = true;
  }
  
  // 4. Log completion
  await db.collection('overnight_runs').add({
    familyId,
    seniorId,
    results,
    runAt: new Date(),
    status: 'completed'
  });
  
  logger.info('[OvernightAgent] Completed', { familyId, seniorId, results });
  
  return results;
}

// Send automated family update
async function sendFamilyUpdate(familyId: string, seniorId: string, report: any): Promise<void> {
  // Get family contact info
  const familyDoc = await db.collection('families').doc(familyId).get();
  const family = familyDoc.data();
  
  if (!family?.notificationPreferences?.careUpdates) {
    logger.info('[ReporterAgent] Family opted out of updates', { familyId });
    return;
  }
  
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  // Build message
  const message = `👋 Care Update for ${senior?.name}

${report.summary}

✨ Highlights:
${report.highlights?.map((h: string) => `• ${h}`).join('\n') || '• No highlights recorded'}

${report.concerns?.length > 0 ? `⚠️ Notes:\n${report.concerns.map((c: string) => `• ${c}`).join('\n')}` : ''}

${report.nextSteps ? `📋 Next Steps: ${report.nextSteps}` : ''}

Reply STOP to pause updates, or CALL to speak with someone.`;

  // Send via preferred channel
  if (family?.whatsappNumber) {
    await sendWhatsAppMessage(family.whatsappNumber, message);
  } else if (family?.phone) {
    await sendSMSMessage(family.phone, message);
  }
  
  if (family?.email) {
    await sendEmailMessage(family.email, `Care Update: ${senior?.name}`, message);
  }
  
  logger.info('[ReporterAgent] Update sent to family', { familyId, channels: family?.whatsappNumber ? ['whatsapp'] : family?.phone ? ['sms'] : [], email: !!family?.email });
}

// Helper functions for sending messages
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  // Implementation using Twilio
  const TWILIO_SID = process.env.TWILIO_SID;
  const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER;
  
  if (!TWILIO_SID || !TWILIO_TOKEN) return;
  
  const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
  await twilio.messages.create({
    body: message,
    from: `whatsapp:${TWILIO_WHATSAPP}`,
    to: `whatsapp:${to}`
  });
}

async function sendSMSMessage(to: string, message: string): Promise<void> {
  const TWILIO_SID = process.env.TWILIO_SID;
  const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
  
  if (!TWILIO_SID || !TWILIO_TOKEN) return;
  
  const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
  await twilio.messages.create({
    body: message,
    from: TWILIO_PHONE,
    to: to
  });
}

async function sendEmailMessage(to: string, subject: string, body: string): Promise<void> {
  // Implementation using Resend
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return;
  
  // Email sending logic here
  logger.info('[Email] Would send email', { to, subject });
}

// Cron job to run overnight agent
export async function runOvernightJobs(): Promise<void> {
  logger.info('[Overnight] Starting overnight jobs');
  
  // Get all active families
  const familiesSnapshot = await db.collection('families')
    .where('active', '==', true)
    .get();
  
  for (const familyDoc of familiesSnapshot.docs) {
    const family = familyDoc.data();
    
    // Get seniors in this family
    const seniorsSnapshot = await db.collection('seniors')
      .where('familyId', '==', familyDoc.id)
      .where('active', '==', true)
      .get();
    
    for (const seniorDoc of seniorsSnapshot.docs) {
      // Spawn overnight agent for each senior
      await spawnSubAgent('overnight', familyDoc.id, seniorDoc.id, 'Run all overnight tasks');
    }
  }
  
  logger.info('[Overnight] All overnight jobs spawned');
}
