// Tool Implementations
// Execute actions based on LLM tool calls

import { logger } from './logger';
import { ToolCall, SearchCaregiversResult, ScheduleInterviewResult } from './types';

// Firestore reference (initialized in server.ts)
let db: FirebaseFirestore.Firestore;

export function initializeTools(firestoreDb: FirebaseFirestore.Firestore): void {
  db = firestoreDb;
}

export async function executeTool(
  toolCall: ToolCall,
  context: { userId: string; userPhone: string; userName?: string }
): Promise<any> {
  logger.info(`[Tool] Executing ${toolCall.tool}`, { params: toolCall.parameters });

  switch (toolCall.tool) {
    case 'search_caregivers':
      return await toolSearchCaregivers(toolCall.parameters, context);
    case 'schedule_interview':
      return await toolScheduleInterview(toolCall.parameters, context);
    case 'store_memory':
      return await toolStoreMemory(toolCall.parameters, context);
    case 'request_human':
      return await toolRequestHuman(toolCall.parameters, context);
    default:
      throw new Error(`Unknown tool: ${toolCall.tool}`);
  }
}

async function toolSearchCaregivers(
  params: { zip_code: string; care_type?: string },
  context: { userId: string; userPhone: string }
): Promise<SearchCaregiversResult> {
  const { zip_code } = params;
  
  logger.info(`[Tool] Searching caregivers in ${zip_code}`);
  
  try {
    const snapshot = await db.collection('caregivers')
      .where('verified', '==', true)
      .where('available', '==', true)
      .where('serviceZipCodes', 'array-contains', zip_code)
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      return {
        found: false,
        count: 0,
        caregivers: [],
        message: `No caregivers found in ${zip_code}. I'll notify our team to find matches.`
      };
    }
    
    const caregivers = snapshot.docs.map((doc, i) => {
      const data = doc.data();
      return {
        rank: i + 1,
        id: doc.id,
        name: data.name,
        hourlyRate: data.hourlyRate,
        rating: data.rating || 4.8,
        specialties: data.specialties?.slice(0, 3) || [],
        yearsExperience: data.yearsExperience || 5,
        bio: data.bio || 'Experienced caregiver'
      };
    }).slice(0, 3);
    
    return {
      found: true,
      count: caregivers.length,
      caregivers,
      message: `Found ${caregivers.length} caregivers in ${zip_code}`
    };
    
  } catch (error) {
    logger.error('[Tool] Search error', { error });
    return {
      found: false,
      count: 0,
      caregivers: [],
      message: 'Error searching caregivers. Please try again.'
    };
  }
}

async function toolScheduleInterview(
  params: { caregiver_id: string; caregiver_name: string; proposed_time: string },
  context: { userId: string; userPhone: string }
): Promise<ScheduleInterviewResult> {
  const { caregiver_id, caregiver_name, proposed_time } = params;
  
  logger.info(`[Tool] Scheduling interview with ${caregiver_name} for ${proposed_time}`);
  
  try {
    const interviewRef = await db.collection('interviews').add({
      userId: context.userId,
      userPhone: context.userPhone,
      caregiverId: caregiver_id,
      caregiverName: caregiver_name,
      proposedTime: proposed_time,
      status: 'pending_caregiver_response',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      interviewId: interviewRef.id,
      message: `✅ Interview request sent to ${caregiver_name} for ${proposed_time}. You'll receive confirmation within 2 hours.`
    };
    
  } catch (error) {
    logger.error('[Tool] Schedule error', { error });
    return {
      success: false,
      message: 'Error scheduling interview. Please try again.'
    };
  }
}

async function toolStoreMemory(
  params: { key: string; value: string },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean }> {
  const { key, value } = params;
  
  logger.info(`[Tool] Storing memory: ${key} = ${value}`);
  
  try {
    await db.collection('cara_memories').add({
      userId: context.userId,
      userPhone: context.userPhone,
      key,
      value,
      category: 'general',
      createdAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    logger.error('[Tool] Memory store error', { error });
    return { success: false };
  }
}

async function toolRequestHuman(
  params: { reason: string },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean; message: string }> {
  logger.info(`[Tool] Requesting human help: ${params.reason}`);
  
  try {
    await db.collection('escalations').add({
      userId: context.userId,
      userPhone: context.userPhone,
      reason: params.reason,
      status: 'pending',
      createdAt: new Date()
    });
    
    return {
      success: true,
      message: `I've connected you with our care team. They'll reach out within 30 minutes to help with: ${params.reason}`
    };
  } catch (error) {
    logger.error('[Tool] Escalation error', { error });
    return {
      success: false,
      message: 'Error requesting human support. Please call our support line.'
    };
  }
}
