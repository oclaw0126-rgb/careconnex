// Cara AI - Natural Conversation Agent v3
// FIXED: Actually executes searches and returns results immediately

import { CARA_SOUL } from './config';
import { callLLM } from './llm';
import { executeTool } from './tools';
import { Session, getOrCreateSession, addToHistory, updateMemory } from './session';
import { AgentResult, ToolCall } from './types';
import { logger } from './logger';

export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<AgentResult> {
  
  logger.info('[Cara] Processing', { userPhone, message: userMessage });
  
  const session = getOrCreateSession(userPhone, userName);
  
  try {
    // STEP 1: Extract information from message
    const extractedInfo = extractInformation(userMessage, session);
    
    // Update session memory with any new info
    if (extractedInfo.zipCode) {
      updateMemory(userPhone, 'zip_code', extractedInfo.zipCode);
      session.memory['zip_code'] = extractedInfo.zipCode;
    }
    if (extractedInfo.careType) {
      updateMemory(userPhone, 'care_type', extractedInfo.careType);
      session.memory['care_type'] = extractedInfo.careType;
    }
    
    // STEP 2: Decide what to do
    const shouldSearch = shouldSearchCaregivers(userMessage, session);
    const hasZip = !!session.memory['zip_code'];
    
    // CASE 1: Have zip and should search → EXECUTE SEARCH IMMEDIATELY
    if (shouldSearch && hasZip) {
      logger.info('[Cara] Executing search', { zip: session.memory['zip_code'] });
      
      const result = await executeTool(
        { 
          tool: 'search_caregivers', 
          parameters: { 
            zip_code: session.memory['zip_code'],
            care_type: session.memory['care_type'] || undefined
          } 
        },
        { userId: session.userId, userPhone: session.userPhone, userName: session.userName }
      );
      
      // Generate natural response with results
      const response = generateSearchResponse(result, session);
      
      addToHistory(userPhone, 'user', userMessage);
      addToHistory(userPhone, 'assistant', response);
      
      return {
        response,
        toolCalls: [{ tool: 'search_caregivers', parameters: { zip_code: session.memory['zip_code'] } }],
        updatedMemory: session.memory
      };
    }
    
    // CASE 2: Need zip code → ASK FOR IT
    if (!hasZip) {
      const response = askForZipCode(extractedInfo, session);
      
      addToHistory(userPhone, 'user', userMessage);
      addToHistory(userPhone, 'assistant', response);
      
      return {
        response,
        toolCalls: [],
        updatedMemory: session.memory
      };
    }
    
    // CASE 3: Just chatting → NATURAL RESPONSE
    const response = generateNaturalResponse(userMessage, extractedInfo, session);
    
    addToHistory(userPhone, 'user', userMessage);
    addToHistory(userPhone, 'assistant', response);
    
    return {
      response,
      toolCalls: [],
      updatedMemory: session.memory
    };
    
  } catch (error) {
    logger.error('[Cara] Error:', error);
    
    return {
      response: "I'm so sorry, I'm having a moment. Can you tell me again what you're looking for? I want to make sure I help you find the perfect care for your loved one.",
      toolCalls: [],
      updatedMemory: session.memory
    };
  }
}

// Extract key info from message
function extractInformation(userMessage: string, session: Session): {
  zipCode?: string;
  careType?: string;
  needs?: string[];
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
  }
  
  // Extract needs array
  info.needs = [];
  if (msg.includes('meal')) info.needs.push('meal_prep');
  if (msg.includes('transport')) info.needs.push('transportation');
  if (msg.includes('medication')) info.needs.push('medication_reminders');
  if (msg.includes('housekeeping') || msg.includes('clean')) info.needs.push('housekeeping');
  
  return info;
}

// Decide if we should search now
function shouldSearchCaregivers(userMessage: string, session: Session): boolean {
  const msg = userMessage.toLowerCase();
  
  // Explicit search requests
  if (
    msg.includes('search') ||
    msg.includes('find') ||
    msg.includes('look for') ||
    msg.includes('show me') ||
    msg.includes('who is available') ||
    msg.includes('who can help') ||
    (msg.includes('caregiver') && (msg.includes('need') || msg.includes('want')))
  ) {
    return true;
  }
  
  // If we just got zip and they mentioned care needs before
  if (session.memory['zip_code'] && 
      (session.memory['care_type'] || session.conversationHistory.some(m => 
        m.role === 'user' && 
        (m.content.toLowerCase().includes('care') || 
         m.content.toLowerCase().includes('help'))
      ))) {
    return true;
  }
  
  return false;
}

// Ask for zip code naturally
function askForZipCode(extractedInfo: any, session: Session): string {
  const careContext = extractedInfo.careType || session.memory['care_type'];
  
  if (careContext === 'dementia') {
    return `I really appreciate you sharing that. Caring for someone with dementia requires such special patience and understanding. I want to make sure we find caregivers who have specific training and experience in this area. What's your zip code so I can search for the right people?`;
  }
  
  if (careContext === 'mobility') {
    return `Mobility assistance is so important for safety and dignity. I completely understand. Let me find caregivers who are trained in safe transfers and mobility support. What's your zip code?`;
  }
  
  if (careContext === 'companionship') {
    return `Companionship care can make such a difference in quality of life. I'd love to help you find someone wonderful. What's your zip code so I can search for available caregivers in your area?`;
  }
  
  if (careContext === 'personal_care') {
    return `Personal care is such an important and sensitive need. I want to find caregivers who are experienced and gentle with these services. What's your zip code?`;
  }
  
  // Generic
  return `Thank you for sharing that with me. To find the best caregivers for your needs, could you share your zip code? Then I can search for available caregivers in your area.`;
}

// Generate response with search results
function generateSearchResponse(result: any, session: Session): string {
  const zipCode = session.memory['zip_code'];
  const careType = session.memory['care_type'];
  
  if (!result.found || !result.caregivers || result.caregivers.length === 0) {
    return `I searched for caregivers in ${zipCode}, but I don't have anyone available there right now. Let me check nearby zip codes, or I can notify you as soon as someone becomes available in your area. Would that help?`;
  }
  
  let response = `Great news! I found ${result.caregivers.length} excellent caregiver${result.caregivers.length > 1 ? 's' : ''} in ${zipCode}`;
  
  if (careType) {
    response += ` who can help with ${careType.replace('_', ' ')}`;
  }
  
  response += `:\n\n`;
  
  result.caregivers.forEach((c: any, i: number) => {
    response += `**${c.name}**\n`;
    response += `• $${c.hourlyRate}/hour\n`;
    response += `• ${c.yearsExperience} years experience\n`;
    response += `• ${c.rating}★ rating\n`;
    if (c.specialties && c.specialties.length > 0) {
      response += `• Specializes in: ${c.specialties.join(', ')}\n`;
    }
    response += `• ${c.bio}\n\n`;
  });
  
  response += `Which caregiver interests you? I can schedule a video interview so you can meet them and see if it's a good fit.`;
  
  return response;
}

// Generate natural chat response
function generateNaturalResponse(userMessage: string, extractedInfo: any, session: Session): string {
  const msg = userMessage.toLowerCase();
  const zipCode = session.memory['zip_code'];
  const careType = session.memory['care_type'];
  
  // Acknowledge what they shared
  if (careType && zipCode) {
    return `Thank you for sharing that with me. It sounds like you're looking for ${careType.replace('_', ' ')} care in ${zipCode}, which is so important. Would you like me to search for caregivers who specialize in that?`;
  }
  
  if (msg.includes('mom') || msg.includes('dad') || msg.includes('mother') || msg.includes('father')) {
    return `I can hear how much you care about your loved one. That's really wonderful. Tell me more about what kind of help you're looking for - is it companionship, help with personal care, assistance with mobility, or something else?`;
  }
  
  if (msg.includes('interview') || msg.includes('meet')) {
    return `I'd be happy to schedule an interview! Which caregiver would you like to meet? I can set up a video call at a time that works for you.`;
  }
  
  // Generic warm response
  return `Thank you for sharing that with me. I want to make sure I understand exactly what you're looking for so I can find the perfect match. Tell me more about your situation and what type of care would be most helpful?`;
}
