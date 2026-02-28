// Cara AI v4 - OpenClaw-Inspired Architecture
// Reliable, accurate, and always responsive

import { CARA_SOUL } from './config';
import { callLLM } from './llm';
import { executeTool } from './tools';
import { Session, getOrCreateSession, addToHistory, updateMemory } from './session';
import { AgentResult, ToolCall } from './types';
import { logger } from './logger';
import * as admin from 'firebase-admin';

const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Intent types
enum IntentType {
  SEARCH_CAREGIVERS = 'SEARCH_CAREGIVERS',
  SCHEDULE_INTERVIEW = 'SCHEDULE_INTERVIEW',
  STORE_MEMORY = 'STORE_MEMORY',
  REQUEST_HUMAN = 'REQUEST_HUMAN',
  GENERAL_CHAT = 'GENERAL_CHAT',
  UNKNOWN = 'UNKNOWN'
}

interface Intent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  requiresTool: boolean;
}

export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<AgentResult> {
  
  logger.info('[Cara v4] Processing message', { userPhone, message: userMessage });
  
  const session = getOrCreateSession(userPhone, userName);
  
  try {
    // STEP 1: Persist message to Firestore immediately
    await persistMessage(userPhone, 'user', userMessage);
    
    // STEP 2: Extract all information from message
    const extractedInfo = extractInformation(userMessage, session);
    logger.info('[Cara v4] Extracted info', extractedInfo);
    
    // STEP 3: Update session memory with new info
    await updateSessionMemory(userPhone, extractedInfo, session);
    
    // STEP 4: Classify intent (rule-based, not LLM-dependent)
    const intent = classifyIntent(userMessage, extractedInfo, session);
    logger.info('[Cara v4] Intent classified', { intent: intent.type, confidence: intent.confidence });
    
    // STEP 5: Execute based on intent
    let response: string;
    let toolCalls: ToolCall[] = [];
    
    switch (intent.type) {
      case IntentType.SEARCH_CAREGIVERS:
        const searchResult = await executeWithRetry(
          () => executeSearchCaregivers(intent.parameters, session),
          'search_caregivers'
        );
        response = generateSearchResponse(searchResult, session);
        toolCalls = [{ tool: 'search_caregivers', parameters: intent.parameters }];
        break;
        
      case IntentType.SCHEDULE_INTERVIEW:
        const scheduleResult = await executeWithRetry(
          () => executeScheduleInterview(intent.parameters, session),
          'schedule_interview'
        );
        response = generateScheduleResponse(scheduleResult, session);
        toolCalls = [{ tool: 'schedule_interview', parameters: intent.parameters }];
        break;
        
      case IntentType.STORE_MEMORY:
        response = `✅ Got it! I've noted that: ${JSON.stringify(intent.parameters)}`;
        toolCalls = [{ tool: 'store_memory', parameters: intent.parameters }];
        break;
        
      case IntentType.REQUEST_HUMAN:
        const humanResult = await executeWithRetry(
          () => executeRequestHuman(intent.parameters, session),
          'request_human'
        );
        response = humanResult.message || "I've connected you with our care team. They'll reach out within 30 minutes.";
        toolCalls = [{ tool: 'request_human', parameters: intent.parameters }];
        break;
        
      case IntentType.GENERAL_CHAT:
      default:
        response = await generateNaturalResponse(userMessage, extractedInfo, session);
        break;
    }
    
    // STEP 6: Guarantee response (never empty)
    response = guaranteeResponse(response, userMessage, session);
    
    // STEP 7: Persist response
    await persistMessage(userPhone, 'assistant', response);
    addToHistory(userPhone, 'user', userMessage);
    addToHistory(userPhone, 'assistant', response);
    
    logger.info('[Cara v4] Response generated', { 
      responseLength: response.length, 
      intent: intent.type,
      toolCalls: toolCalls.length 
    });
    
    return {
      response,
      toolCalls,
      updatedMemory: session.memory
    };
    
  } catch (error) {
    logger.error('[Cara v4] Critical error:', error);
    
    // Guaranteed fallback response
    const fallback = generateCriticalErrorResponse(userMessage, session);
    
    await persistMessage(userPhone, 'assistant', fallback);
    addToHistory(userPhone, 'user', userMessage);
    addToHistory(userPhone, 'assistant', fallback);
    
    return {
      response: fallback,
      toolCalls: [],
      updatedMemory: session.memory
    };
  }
}

// RULE-BASED INTENT CLASSIFICATION (not LLM-dependent)
function classifyIntent(userMessage: string, extractedInfo: any, session: Session): Intent {
  const msg = userMessage.toLowerCase();
  const hasZip = !!session.memory['zip_code'] || !!extractedInfo.zipCode;
  const zipCode = session.memory['zip_code'] || extractedInfo.zipCode;
  
  // Priority 1: Explicit search requests
  if (hasZip && (
    msg.includes('search') ||
    msg.includes('find') ||
    msg.includes('look for') ||
    msg.includes('show me') ||
    msg.includes('who is available') ||
    msg.includes('who can help') ||
    msg.includes('caregiver') ||
    msg.includes('anyone available')
  )) {
    return {
      type: IntentType.SEARCH_CAREGIVERS,
      confidence: 0.95,
      parameters: { zip_code: zipCode, care_type: extractedInfo.careType },
      requiresTool: true
    };
  }
  
  // Priority 2: Schedule interview
  if (
    msg.includes('schedule') ||
    msg.includes('book') ||
    msg.includes('interview') ||
    msg.includes('meet') ||
    msg.includes('talk to') ||
    msg.includes('video call')
  ) {
    // Extract caregiver name/ID from context
    const caregiverId = session.memory['selected_caregiver_id'];
    const caregiverName = session.memory['selected_caregiver_name'];
    
    if (caregiverId || caregiverName) {
      return {
        type: IntentType.SCHEDULE_INTERVIEW,
        confidence: 0.9,
        parameters: {
          caregiver_id: caregiverId,
          caregiver_name: caregiverName,
          proposed_time: extractTimeFromMessage(msg)
        },
        requiresTool: true
      };
    }
  }
  
  // Priority 3: Store memory (explicit)
  if (
    msg.includes('remember') ||
    msg.includes('my zip is') ||
    msg.includes('i live in') ||
    msg.includes('my mom has') ||
    msg.includes('my dad has') ||
    msg.includes('she needs') ||
    msg.includes('he needs')
  ) {
    const memoriesToStore: any = {};
    
    if (extractedInfo.zipCode) memoriesToStore.zip_code = extractedInfo.zipCode;
    if (extractedInfo.careType) memoriesToStore.care_type = extractedInfo.careType;
    if (extractedInfo.needs?.length) memoriesToStore.needs = extractedInfo.needs;
    
    if (Object.keys(memoriesToStore).length > 0) {
      return {
        type: IntentType.STORE_MEMORY,
        confidence: 0.85,
        parameters: memoriesToStore,
        requiresTool: false
      };
    }
  }
  
  // Priority 4: Request human
  if (
    msg.includes('talk to a person') ||
    msg.includes('human') ||
    msg.includes('representative') ||
    msg.includes('care team') ||
    msg.includes('emergency') ||
    msg.includes('urgent')
  ) {
    return {
      type: IntentType.REQUEST_HUMAN,
      confidence: 0.9,
      parameters: { reason: userMessage },
      requiresTool: true
    };
  }
  
  // Default: General chat
  return {
    type: IntentType.GENERAL_CHAT,
    confidence: 0.7,
    parameters: {},
    requiresTool: false
  };
}

// Extract information from message
function extractInformation(userMessage: string, session: Session): {
  zipCode?: string;
  careType?: string;
  needs?: string[];
  time?: string;
} {
  const msg = userMessage.toLowerCase();
  const info: any = {};
  
  // Extract zip code (5 digits)
  const zipMatch = userMessage.match(/\b\d{5}\b/);
  if (zipMatch) {
    info.zipCode = zipMatch[0];
  }
  
  // Detect care type
  if (msg.includes('dementia') || msg.includes('alzheimer')) {
    info.careType = 'dementia';
  } else if (msg.includes('mobility') || msg.includes('lifting') || msg.includes('transfer')) {
    info.careType = 'mobility';
  } else if (msg.includes('companionship')) {
    info.careType = 'companionship';
  } else if (msg.includes('personal care') || msg.includes('bathing') || msg.includes('hygiene')) {
    info.careType = 'personal_care';
  } else if (msg.includes('meal')) {
    info.careType = 'meal_prep';
  }
  
  // Extract needs array
  info.needs = [];
  if (msg.includes('meal')) info.needs.push('meal_prep');
  if (msg.includes('transport')) info.needs.push('transportation');
  if (msg.includes('medication')) info.needs.push('medication_reminders');
  if (msg.includes('housekeeping') || msg.includes('clean')) info.needs.push('housekeeping');
  
  // Extract time mentions
  info.time = extractTimeFromMessage(msg);
  
  return info;
}

function extractTimeFromMessage(msg: string): string | undefined {
  const timePatterns = [
    /tomorrow\s+(at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /(morning|afternoon|evening)/i
  ];
  
  for (const pattern of timePatterns) {
    const match = msg.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return undefined;
}

// Update session memory
async function updateSessionMemory(
  userPhone: string, 
  extractedInfo: any, 
  session: Session
): Promise<void> {
  if (extractedInfo.zipCode) {
    await updateMemory(userPhone, 'zip_code', extractedInfo.zipCode);
    session.memory['zip_code'] = extractedInfo.zipCode;
  }
  if (extractedInfo.careType) {
    await updateMemory(userPhone, 'care_type', extractedInfo.careType);
    session.memory['care_type'] = extractedInfo.careType;
  }
  if (extractedInfo.needs?.length) {
    const existingNeeds = session.memory['needs'] || [];
    const newNeeds = [...new Set([...existingNeeds, ...extractedInfo.needs])];
    await updateMemory(userPhone, 'needs', newNeeds);
    session.memory['needs'] = newNeeds;
  }
}

// Execute with retry logic
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[Cara v4] Executing ${operationName}, attempt ${attempt}`);
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`[Cara v4] ${operationName} failed (attempt ${attempt})`, { error });
      
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
      }
    }
  }
  
  logger.error(`[Cara v4] ${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute search caregivers
async function executeSearchCaregivers(
  parameters: any, 
  session: Session
): Promise<any> {
  const result = await executeTool(
    { tool: 'search_caregivers', parameters },
    { userId: session.userId, userPhone: session.userPhone, userName: session.userName }
  );
  return result;
}

// Execute schedule interview
async function executeScheduleInterview(
  parameters: any,
  session: Session
): Promise<any> {
  const result = await executeTool(
    { tool: 'schedule_interview', parameters },
    { userId: session.userId, userPhone: session.userPhone, userName: session.userName }
  );
  return result;
}

// Execute request human
async function executeRequestHuman(
  parameters: any,
  session: Session
): Promise<any> {
  const result = await executeTool(
    { tool: 'request_human', parameters },
    { userId: session.userId, userPhone: session.userPhone, userName: session.userName }
  );
  return result;
}

// Generate search response
function generateSearchResponse(result: any, session: Session): string {
  const zipCode = session.memory['zip_code'];
  const careType = session.memory['care_type'];
  
  if (!result || !result.found || !result.caregivers || result.caregivers.length === 0) {
    return `I searched for caregivers in ${zipCode}${careType ? ` who specialize in ${careType.replace('_', ' ')}` : ''}, but I don't have anyone available there right now. Let me check nearby zip codes, or I can notify you as soon as someone becomes available. Would that help?`;
  }
  
  let response = `🎉 Great news! I found ${result.caregivers.length} excellent caregiver${result.caregivers.length > 1 ? 's' : ''} in ${zipCode}`;
  
  if (careType) {
    response += ` who can help with ${careType.replace('_', ' ')}`;
  }
  
  response += `:\n\n`;
  
  result.caregivers.forEach((c: any, i: number) => {
    response += `**${c.name}**\n`;
    response += `💰 $${c.hourlyRate}/hour\n`;
    response += `⭐ ${c.yearsExperience} years experience, ${c.rating}/5 rating\n`;
    if (c.specialties?.length > 0) {
      response += `🎯 Specializes in: ${c.specialties.join(', ')}\n`;
    }
    response += `📝 ${c.bio}\n\n`;
  });
  
  response += `Which caregiver interests you? I can schedule a video interview so you can meet them. Just let me know!`;
  
  return response;
}

// Generate schedule response
function generateScheduleResponse(result: any, session: Session): string {
  if (result?.success) {
    return `✅ Perfect! I've scheduled your interview. ${result.message}`;
  }
  return `I wasn't able to schedule that interview. ${result?.message || 'Please try again or let me know if you need help.'}`;
}

// Generate natural response
async function generateNaturalResponse(
  userMessage: string, 
  extractedInfo: any, 
  session: Session
): Promise<string> {
  const msg = userMessage.toLowerCase();
  const zipCode = session.memory['zip_code'];
  const careType = session.memory['care_type'];
  
  // Use LLM for natural response (with fallback)
  try {
    const prompt = buildNaturalPrompt(userMessage, session);
    const llmResponse = await callLLM([
      { role: 'system', content: `${CARA_SOUL}\n\nRespond naturally and warmly. Ask clarifying questions to understand their needs.` },
      { role: 'user', content: prompt }
    ]);
    
    if (llmResponse && llmResponse.trim().length > 10) {
      return llmResponse.trim();
    }
  } catch (error) {
    logger.warn('[Cara v4] LLM response failed, using fallback');
  }
  
  // Fallback responses
  return generateWarmFallback(userMessage, extractedInfo, session);
}

function buildNaturalPrompt(userMessage: string, session: Session): string {
  const memory = Object.entries(session.memory)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  
  return `What I know about this family:\n${memory || 'Nothing yet'}\n\nFamily just said: "${userMessage}"\n\nRespond naturally as Cara, a warm care coordinator. Ask questions to understand their needs better.`;
}

// Warm fallback responses
function generateWarmFallback(
  userMessage: string, 
  extractedInfo: any, 
  session: Session
): string {
  const msg = userMessage.toLowerCase();
  const zipCode = session.memory['zip_code'];
  const careType = session.memory['care_type'];
  
  if (careType && zipCode) {
    return `Thank you for sharing that with me. It sounds like you're looking for ${careType.replace('_', ' ')} care in ${zipCode}, which is so important for quality of life. Would you like me to search for caregivers who specialize in that?`;
  }
  
  if (msg.includes('mom') || msg.includes('dad') || msg.includes('mother') || msg.includes('father')) {
    return `I can hear how much you care about your loved one. That's really wonderful. Tell me more about what kind of help you're looking for - is it companionship, help with personal care, assistance with mobility, or something else?`;
  }
  
  if (msg.includes('price') || msg.includes('cost') || msg.includes('rate')) {
    return `Caregiver rates typically range from $22-$35 per hour depending on experience and the type of care needed. Once I know your zip code and what kind of care you're looking for, I can show you specific caregivers with their exact rates. What's your zip code?`;
  }
  
  if (!zipCode) {
    return `Thank you for reaching out. I'm here to help you find the perfect caregiver for your loved one. To get started, could you share your zip code? Then tell me a bit about what kind of care you're looking for.`;
  }
  
  return `Thank you for sharing that with me. I want to make sure I understand exactly what you're looking for so I can find the perfect match. Tell me more about your situation and what type of care would be most helpful?`;
}

// Guarantee response (never empty)
function guaranteeResponse(
  response: string, 
  userMessage: string, 
  session: Session
): string {
  if (!response || response.trim().length < 5) {
    logger.warn('[Cara v4] Empty response detected, using guarantee fallback');
    return `I'm here to help you find the perfect caregiver. Could you tell me more about what you're looking for? Your zip code and the type of care needed would be a great start.`;
  }
  return response;
}

// Critical error response
function generateCriticalErrorResponse(
  userMessage: string, 
  session: Session
): string {
  return `I'm so sorry, I'm having a moment. Can you tell me again what you're looking for? I want to make sure I help you find the perfect care for your loved one. You can also call us at (555) 123-4567 if you prefer to talk to someone directly.`;
}

// Persist message to Firestore for continuity
async function persistMessage(
  userPhone: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    await db.collection('cara_conversations')
      .doc(userPhone)
      .collection('messages')
      .add({
        role,
        content,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    logger.error('[Cara v4] Failed to persist message', { error });
    // Non-critical, don't throw
  }
}
