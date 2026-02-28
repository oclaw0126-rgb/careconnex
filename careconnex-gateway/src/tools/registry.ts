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
