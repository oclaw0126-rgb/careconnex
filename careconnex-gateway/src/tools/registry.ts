import { ToolDefinition, ToolExecutor } from '../types';
import { 
  toolSearchCaregivers, 
  toolScheduleInterview, 
  toolStoreMemory, 
  toolRequestHuman, 
  toolSendEmail, 
  toolSendSMS, 
  toolBookCalendar 
} from '../tools';
import * as admin from 'firebase-admin';

export const toolRegistry: Map<string, ToolExecutor> = new Map();
export const toolDefinitions: ToolDefinition[] = [];

function registerTool(def: ToolDefinition, executeFn: (args: any, context?: any) => Promise<any>) {
  toolDefinitions.push(def);
  toolRegistry.set(def.name, { name: def.name, execute: executeFn });
}

// 1. Search Caregivers
registerTool({
  name: "search_caregivers",
  description: "Searches Firestore for caregivers matching required criteria.",
  parameters: {
    type: "object",
    properties: {
      zip_code: { type: "string", description: "City or zip code" },
      care_type: { type: "string" }
    },
    required: ["zip_code"]
  }
}, async (args, context) => {
  return await toolSearchCaregivers(args, context || { userId: 'default', userPhone: 'default' });
});

// 2. Schedule Interview
registerTool({
  name: "schedule_interview",
  description: "Schedules a phone or video interview between a family and a caregiver.",
  parameters: {
    type: "object",
    properties: {
      caregiver_id: { type: "string" },
      caregiver_name: { type: "string" },
      proposed_time: { type: "string", description: "Time of interview" }
    },
    required: ["caregiver_id", "caregiver_name", "proposed_time"]
  }
}, async (args, context) => {
  return await toolScheduleInterview(args, context || { userId: 'default', userPhone: 'default' });
});

// 3. Store Memory
registerTool({
  name: "store_memory",
  description: "Saves a preference, detail, or need to the user's session memory.",
  parameters: {
    type: "object",
    properties: {
      key: { type: "string" },
      value: { type: "string" }
    },
    required: ["key", "value"]
  }
}, async (args, context) => {
  return await toolStoreMemory(args, context || { userId: 'default', userPhone: 'default' });
});

// 4. Request Human
registerTool({
  name: "request_human",
  description: "Connects the user to a human care team member.",
  parameters: {
    type: "object",
    properties: {
      reason: { type: "string" }
    },
    required: ["reason"]
  }
}, async (args, context) => {
  return await toolRequestHuman(args, context || { userId: 'default', userPhone: 'default' });
});

// 5. Send SMS
registerTool({
  name: "send_sms",
  description: "Sends an SMS message directly to a user.",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string" },
      message: { type: "string" }
    },
    required: ["to", "message"]
  }
}, async (args, context) => {
  return await toolSendSMS(args, context || { userId: 'default', userPhone: 'default' });
});

// rank_caregivers - ranks caregivers by criteria
registerTool({
  name: 'rank_caregivers',
  description: 'Ranks caregivers by experience, rating, or other criteria',
  parameters: {
    type: 'object',
    properties: {
      caregivers: { type: 'array', description: 'List of caregivers to rank' },
      criteria: { type: 'string', enum: ['experience', 'rating', 'hourlyRate'] },
      limit: { type: 'number', default: 3 }
    },
    required: ['caregivers', 'criteria']
  }
}, async (args) => {
  const { caregivers, criteria, limit = 3 } = args;
  const sorted = [...caregivers].sort((a, b) => {
    if (criteria === 'experience') return b.yearsExperience - a.yearsExperience;
    if (criteria === 'rating') return b.rating - a.rating;
    if (criteria === 'hourlyRate') return a.hourlyRate - b.hourlyRate;
    return 0;
  });
  return sorted.slice(0, limit);
});

// get_user_availability - gets family's available times
registerTool({
  name: 'get_user_availability',
  description: 'Gets the family\'s available time slots for interviews',
  parameters: {
    type: 'object',
    properties: {}
  }
}, async (args, context) => {
  // Mock implementation - in production, query user profile
  return {
    slots: [
      new Date(Date.now() + 86400000).toISOString(), // tomorrow
      new Date(Date.now() + 172800000).toISOString(), // day after
      new Date(Date.now() + 259200000).toISOString()  // 3 days
    ]
  };
});

// check_profile_completion - checks if caregiver profile is complete
registerTool({
  name: 'check_profile_completion',
  description: 'Checks if a caregiver profile has all required fields',
  parameters: {
    type: 'object',
    properties: {
      caregiverId: { type: 'string' }
    },
    required: ['caregiverId']
  }
}, async (args) => {
  const { caregiverId } = args;
  // Mock - in production query Firestore
  return {
    caregiverId,
    hasPhoto: false,
    hasCertifications: false,
    hasAvailability: true,
    isComplete: false
  };
});

// send_message - workflow tool
registerTool({
  name: 'send_message',
  description: 'Sends a message to a user or caregiver',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      channel: { type: 'string' }
    },
    required: ['message']
  }
}, async (args, context) => {
  const { message } = args;
  return await toolSendSMS({ to: context?.userPhone || 'default', message }, context || { userId: 'default', userPhone: 'default' });
});

// update_profile - workflow tool
registerTool({
  name: 'update_profile',
  description: 'Updates a user profile',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      template: { type: 'string' }
    }
  }
}, async (args) => {
  return { success: true, updatedFields: args };
});

// wait_for_input - workflow tool
registerTool({
  name: 'wait_for_input',
  description: 'Pauses workflow to wait for user input',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string' }
    }
  }
}, async (args) => {
  return { status: 'waiting' };
});

// complete - workflow tool
registerTool({
  name: 'complete',
  description: 'Marks workflow as complete',
  parameters: {
    type: 'object',
    properties: {}
  }
}, async () => {
  return { status: 'completed' };
});

// query_checkins - queries caregiver check-in data
registerTool({
  name: 'query_checkins',
  description: 'Queries recent caregiver check-ins for a senior',
  parameters: {
    type: 'object',
    properties: {
      seniorId: { type: 'string' },
      days: { type: 'number', default: 7 }
    },
    required: ['seniorId']
  }
}, async (args, context) => {
  const { seniorId, days = 7 } = args;
  // Query Firestore for check-ins
  const db = admin.firestore();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const snapshot = await db.collection('checkins')
    .where('seniorId', '==', seniorId)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
    .orderBy('timestamp', 'desc')
    .get();
    
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }));
});

// analyze_health_trends - analyzes health data from check-ins
registerTool({
  name: 'analyze_health_trends',
  description: 'Analyzes health trends from caregiver check-ins',
  parameters: {
    type: 'object',
    properties: {
      checkins: { type: 'array', description: 'Array of check-in data' },
      seniorId: { type: 'string' }
    },
    required: ['checkins', 'seniorId']
  }
}, async (args, context) => {
  const { checkins, seniorId } = args;
  
  // Simple analysis - in production this could use LLM or ML
  const moodScores = checkins.map((c: any) => c.mood || 3);
  const avgMood = moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length;
  
  const concerns = [];
  if (avgMood < 3) concerns.push('mood_decline');
  
  // Check for missed medications
  const missedMeds = checkins.filter((c: any) => c.medicationSkipped).length;
  if (missedMeds > 0) concerns.push('medication_adherence');
  
  return {
    seniorId,
    periodDays: checkins.length,
    averageMood: avgMood,
    totalCheckins: checkins.length,
    concerns,
    summary: concerns.length === 0 
      ? 'Overall stable week with consistent care.' 
      : `Areas of concern: ${concerns.join(', ')}`
  };
});

// generate_report - generates family report
registerTool({
  name: 'generate_report',
  description: 'Generates a care report for the family',
  parameters: {
    type: 'object',
    properties: {
      analysis: { type: 'object', description: 'Health trend analysis' },
      seniorId: { type: 'string' },
      template: { type: 'string', enum: ['weekly_family', 'daily_summary'] }
    },
    required: ['analysis', 'seniorId']
  }
}, async (args, context) => {
  const { analysis, seniorId, template = 'weekly_family' } = args;
  
  // Get senior info
  const db = admin.firestore();
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const seniorName = seniorDoc.exists ? seniorDoc.data()?.name : 'your loved one';
  
  // Generate report content
  const report = {
    seniorId,
    seniorName,
    generatedAt: new Date().toISOString(),
    template,
    summary: `${seniorName} had ${analysis.totalCheckins} care visits this week. ${analysis.summary}`,
    highlights: [
      `Average mood: ${analysis.averageMood.toFixed(1)}/5`,
      `${analysis.totalCheckins} caregiver check-ins`,
      analysis.concerns.length === 0 ? 'No major concerns' : `Needs attention: ${analysis.concerns.join(', ')}`
    ],
    concerns: analysis.concerns,
    recommendations: analysis.concerns.includes('mood_decline') 
      ? ['Consider scheduling a wellness check', 'Discuss with primary care physician']
      : ['Continue current care routine']
  };
  
  // Store report
  await db.collection('reports').add(report);
  
  return report;
});

export async function executeTool(name: string, args: any, context?: any): Promise<any> {
  const executor = toolRegistry.get(name);
  if (!executor) {
    throw new Error(`Tool ${name} not found`);
  }
  try {
    console.log(`[Tool Registry] Executing ${name} with params:`, args);
    return await executor.execute(args, context);
  } catch (error: any) {
    console.error(`[Tool Registry] Error in ${name}:`, error);
    return { error: error.message };
  }
}
