// Cara AI - Natural Conversation Agent
// Redesigned to have natural conversations first, use tools only when needed

import { CARA_SOUL } from './config';
import { callLLM } from './llm';
import { executeTool } from './tools';
import { Session, getOrCreateSession, addToHistory, updateMemory } from './session';
import { AgentResult, ToolCall } from './types';
import { logger } from './logger';

// Available tools reference (for context, not forced usage)
const TOOLS_CONTEXT = `
Available Actions:
- search_caregivers: Find caregivers by zip code
- schedule_interview: Book interview with caregiver  
- store_memory: Remember user preferences
- request_human: Escalate to care team

Use these ONLY when the user explicitly asks to search, book, or needs human help.
`;

export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<AgentResult> {
  
  logger.info('[Cara] Processing message', { userPhone, message: userMessage });
  
  const session = getOrCreateSession(userPhone, userName);
  
  try {
    // STEP 1: Have a natural conversation first
    // Build conversation context
    const conversationContext = buildConversationContext(session);
    
    // Call LLM with natural conversation prompt
    const llmResponse = await callLLM([
      { 
        role: 'system', 
        content: `${CARA_SOUL}

${TOOLS_CONTEXT}

CONVERSATION GUIDELINES:
1. ALWAYS respond in warm, natural conversational text
2. Listen to what the user is telling you
3. Ask clarifying questions to understand their needs
4. Only mention tools if user explicitly asks to search/book
5. Build rapport - don't rush to search immediately
6. Remember details they've shared and reference them

Think of yourself as a helpful friend who happens to know about senior care.` 
      },
      { role: 'user', content: buildNaturalPrompt(userMessage, conversationContext, session) }
    ]);
    
    logger.info('[Cara] LLM response', { response: llmResponse.substring(0, 200) });
    
    // STEP 2: Check if user explicitly wants us to take action
    const intent = detectUserIntent(userMessage, llmResponse, session.memory);
    
    if (intent.shouldUseTool && intent.toolName) {
      logger.info('[Cara] User wants action:', { tool: intent.toolName });
      
      // Execute the tool
      const result = await executeTool(
        { tool: intent.toolName, parameters: intent.parameters },
        { userId: session.userId, userPhone: session.userPhone, userName: session.userName }
      );
      
      // Update memory if needed
      if (intent.toolName === 'store_memory') {
        updateMemory(userPhone, intent.parameters.key, intent.parameters.value);
      }
      
      // Have natural conversation about the results
      const followUpResponse = await callLLM([
        { 
          role: 'system', 
          content: `${CARA_SOUL}\n\nPresent these results warmly and conversationally. Be excited about what you found!` 
        },
        { 
          role: 'user', 
          content: `The user asked me to ${intent.toolName}. Here are the results:\n${formatResultsNaturally(intent.toolName, result)}\n\nRespond naturally as Cara, sharing the good news and asking what they'd like to do next.` 
        }
      ]);
      
      const finalResponse = followUpResponse.trim();
      addToHistory(userPhone, 'user', userMessage);
      addToHistory(userPhone, 'assistant', finalResponse);
      
      return {
        response: finalResponse,
        toolCalls: [{ tool: intent.toolName, parameters: intent.parameters }],
        updatedMemory: session.memory
      };
    }
    
    // STEP 3: Just a natural conversation - respond as-is
    const naturalResponse = llmResponse.trim() || generateWarmFallback(userMessage, session);
    
    addToHistory(userPhone, 'user', userMessage);
    addToHistory(userPhone, 'assistant', naturalResponse);
    
    return {
      response: naturalResponse,
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

// Build natural conversation context
function buildConversationContext(session: Session): string {
  const memoryItems = Object.entries(session.memory)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n') || 'No previous context';
  
  const recentHistory = session.conversationHistory
    .slice(-3)
    .map(m => `${m.role === 'user' ? 'Family' : 'Cara'}: ${m.content}`)
    .join('\n');
  
  return `What I know about this family:\n${memoryItems}\n\nRecent conversation:\n${recentHistory}`;
}

// Build natural conversation prompt
function buildNaturalPrompt(userMessage: string, context: string, session: Session): string {
  return `${context}

Family just said: "${userMessage}"

As Cara, respond naturally and warmly. Think about:
- What are they really telling me?
- What do they need right now?
- Have they shared their zip code yet?
- What would a helpful friend say?

Your natural response:`;
}

// Detect if user wants us to take action
function detectUserIntent(userMessage: string, llmResponse: string, memory: Record<string, any> = {}): {
  shouldUseTool: boolean;
  toolName?: string;
  parameters?: any;
} {
  const msg = userMessage.toLowerCase();
  const response = llmResponse.toLowerCase();
  
  // Check if user explicitly wants to search
  if (
    msg.includes('search') ||
    msg.includes('find') || 
    msg.includes('look for') ||
    msg.includes('show me') ||
    msg.includes('who is available') ||
    response.includes('let me search') ||
    response.includes('i\'ll search') ||
    (msg.includes('caregiver') && (msg.includes('need') || msg.includes('want')))
  ) {
    // Extract zip if mentioned
    const zipMatch = msg.match(/\b\d{5}\b/);
    const zipCode = zipMatch ? zipMatch[0] : memory['zip_code'];
    
    if (zipCode) {
      return {
        shouldUseTool: true,
        toolName: 'search_caregivers',
        parameters: { zip_code: zipCode }
      };
    }
  }
  
  // Check if scheduling interview
  if (
    msg.includes('schedule') ||
    msg.includes('book') ||
    msg.includes('interview') ||
    msg.includes('meet')
  ) {
    // Would need caregiver ID from context
    return { shouldUseTool: false }; // Handle separately with more context
  }
  
  // Check if storing memory
  if (
    msg.includes('remember') ||
    msg.includes('my zip is') ||
    msg.includes('i live in') ||
    msg.includes('my mom has')
  ) {
    // Extract what to remember
    return { shouldUseTool: false }; // Handle memory separately
  }
  
  return { shouldUseTool: false };
}

// Format results in natural language
function formatResultsNaturally(toolName: string, result: any): string {
  if (toolName === 'search_caregivers') {
    if (result.found && result.caregivers?.length > 0) {
      let text = `I found ${result.count} wonderful caregiver(s)!\n\n`;
      result.caregivers.forEach((c: any, i: number) => {
        text += `**${c.name}** - $${c.hourlyRate}/hour, ${c.yearsExperience} years experience, rated ${c.rating}/5 stars. Specializes in: ${c.specialties?.join(', ') || 'general care'}. ${c.bio}\n\n`;
      });
      return text;
    }
    return `I searched but couldn't find any caregivers in that area right now. Let me check nearby zip codes or I can notify you when someone becomes available.`;
  }
  
  return JSON.stringify(result, null, 2);
}

// Warm fallback if LLM fails
function generateWarmFallback(userMessage: string, session: Session): string {
  const msg = userMessage.toLowerCase();
  const zipCode = session.memory['zip_code'];
  
  // Acknowledge what they shared
  if (msg.includes('companionship') || msg.includes('personal care')) {
    if (zipCode) {
      return `Thank you for sharing that with me. It sounds like you're looking for companionship and personal care, which is so important for quality of life. I have your zip code as ${zipCode}. Would you like me to search for caregivers who specialize in that type of care?`;
    }
    return `Thank you for sharing that with me. It sounds like you're looking for companionship and personal care, which is so important. To find the best caregivers for your needs, could you share your zip code? Then I can search for people who specialize in exactly that type of care.`;
  }
  
  if (msg.includes('dementia') || msg.includes('alzheimer')) {
    return `I really appreciate you sharing that. Caring for someone with dementia requires such special patience and understanding. I want to make sure we find caregivers who have specific training and experience in this area. What's your zip code so I can search for the right people?`;
  }
  
  if (msg.includes('mobility') || msg.includes('lifting')) {
    return `Mobility assistance is so important for safety and dignity. I completely understand. Let me find caregivers who are trained in safe transfers and mobility support. What's your zip code?`;
  }
  
  if (msg.includes('zip') || msg.includes('code')) {
    return `Perfect, thank you! Now I know where to look. Tell me more about what kind of care you're looking for - is it companionship, personal care, help with mobility, or something specific like dementia care?`;
  }
  
  // Generic warm response
  if (zipCode) {
    return `I really appreciate you sharing that with me. I want to make sure I understand exactly what you're looking for so I can find the perfect match. Tell me more about your situation - what type of care does your loved one need most?`;
  }
  
  return `Thank you for reaching out. I'm here to help you find the perfect caregiver for your loved one. To get started, could you share your zip code? Then tell me a bit about what kind of care you're looking for.`;
}
