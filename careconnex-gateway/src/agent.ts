// Core Agent Loop - OpenClaw-style architecture
// The brain of the CareConnex Gateway

import { CARA_SOUL } from './config';
import { callLLM } from './llm';
import { executeTool } from './tools';
import { Session, getOrCreateSession, addToHistory, updateMemory } from './session';
import { AgentResult, ToolCall, Message } from './types';
import { logger } from './logger';

// Tool schemas for LLM context
const TOOL_SCHEMAS = {
  search_caregivers: {
    name: 'search_caregivers',
    description: 'Search for caregivers in a specific zip code',
    parameters: {
      zip_code: { type: 'string', description: '5-digit zip code' },
      care_type: { type: 'string', description: 'Type of care needed (optional)' }
    }
  },
  schedule_interview: {
    name: 'schedule_interview',
    description: 'Schedule a video interview with a caregiver',
    parameters: {
      caregiver_id: { type: 'string', description: 'ID of selected caregiver' },
      caregiver_name: { type: 'string', description: 'Name of caregiver' },
      proposed_time: { type: 'string', description: 'When to schedule (e.g., "Tomorrow 2pm")' }
    }
  },
  store_memory: {
    name: 'store_memory',
    description: 'Store important information about the user',
    parameters: {
      key: { type: 'string', description: 'What to remember (e.g., "zip_code")' },
      value: { type: 'string', description: 'The information' }
    }
  },
  request_human: {
    name: 'request_human',
    description: 'Escalate to human care team',
    parameters: {
      reason: { type: 'string', description: 'Why human help is needed' }
    }
  },
  send_email: {
    name: 'send_email',
    description: 'Send an email to caregivers, agencies, or families',
    parameters: {
      to: { type: 'string', description: 'Email address' },
      subject: { type: 'string', description: 'Email subject line' },
      body: { type: 'string', description: 'Email body text' }
    }
  },
  send_sms: {
    name: 'send_sms',
    description: 'Send SMS text message to phone numbers',
    parameters: {
      to: { type: 'string', description: 'Phone number (e.g., +14155551234)' },
      message: { type: 'string', description: 'SMS message text' }
    }
  },
  book_calendar_event: {
    name: 'book_calendar_event',
    description: 'Schedule a calendar event and send invites',
    parameters: {
      title: { type: 'string', description: 'Event title' },
      date: { type: 'string', description: 'Date (e.g., "2026-02-25")' },
      time: { type: 'string', description: 'Time (e.g., "2:00 PM")' },
      attendees: { type: 'array', description: 'List of email addresses' }
    }
  }
};

export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<AgentResult> {
  
  logger.info('[Agent] Processing message', { userPhone, message: userMessage });
  
  // Get or create session
  const session = getOrCreateSession(userPhone, userName);
  
  // Build the complete prompt
  const prompt = buildAgentPrompt(userMessage, session);
  
  try {
    // Call LLM
    const llmResponse = await callLLM([
      { role: 'system', content: 'You are Cara, a care coordinator. Respond naturally or with JSON tool calls.' },
      { role: 'user', content: prompt }
    ]);
    
    logger.info('[Agent] LLM response received', { response: llmResponse.substring(0, 200) });
    
    // Parse response
    const parsed = parseLLMResponse(llmResponse);
    
    // If tool call, execute it
    if (parsed.toolCall) {
      logger.info('[Agent] Tool call detected', { tool: parsed.toolCall.tool });
      
      const result = await executeTool(parsed.toolCall, {
        userId: session.userId,
        userPhone: session.userPhone,
        userName: session.userName
      });
      
      // If memory was stored, update session
      if (parsed.toolCall.tool === 'store_memory') {
        updateMemory(userPhone, parsed.toolCall.parameters.key, parsed.toolCall.parameters.value);
      }
      
      // Get final response after tool execution - CRITICAL FIX: Always respond naturally
      const followUpPrompt = buildFollowUpPrompt(userMessage, parsed.toolCall, result, session);
      const followUpResponse = await callLLM([
        { role: 'system', content: 'You are Cara, a care coordinator. CRITICAL: Always respond in natural, conversational language. NEVER respond with JSON, code, or technical formatting.' },
        { role: 'user', content: followUpPrompt }
      ]);
      
      const finalParsed = parseLLMResponse(followUpResponse);
      
      // Ensure we have a natural response, not JSON
      let finalResponse = finalParsed.response || finalParsed.raw;
      
      // Extra safety: if response starts with {, it's JSON - replace with friendly message
      if (finalResponse.trim().startsWith('{')) {
        finalResponse = formatResultNaturally(parsed.toolCall.tool, result);
      }
      
      // Update conversation history
      addToHistory(userPhone, 'user', userMessage);
      addToHistory(userPhone, 'assistant', finalResponse);
      
      return {
        response: finalResponse,
        toolCalls: [parsed.toolCall],
        updatedMemory: session.memory
      };
    }
    
    // No tool call, just response
    addToHistory(userPhone, 'user', userMessage);
    addToHistory(userPhone, 'assistant', parsed.response || parsed.raw);
    
    return {
      response: parsed.response || parsed.raw,
      toolCalls: [],
      updatedMemory: session.memory
    };
    
  } catch (error) {
    logger.error('[Agent] Error', { error });
    
    return {
      response: "I'm having a moment. Let me try again - what can I help you with?",
      toolCalls: [],
      updatedMemory: session.memory
    };
  }
}

function buildAgentPrompt(userMessage: string, session: Session): string {
  // Build memory context
  const memoryContext = Object.entries(session.memory)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n') || '- No previous memory';
  
  // Build conversation history
  const historyContext = session.conversationHistory
    .slice(-5)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');
  
  return `${CARA_SOUL}

---

AVAILABLE TOOLS:
${JSON.stringify(TOOL_SCHEMAS, null, 2)}

---

MEMORY (What you already know):
${memoryContext}

---

CONVERSATION HISTORY:
${historyContext}

---

USER MESSAGE:
"${userMessage}"

---

INSTRUCTIONS:
1. Understand what the user wants
2. If you need to use a tool, respond ONLY with JSON: {"tool": "tool_name", "parameters": {...}}
3. If no tool needed, respond naturally as Cara
4. Use memory - don't ask for info you already have
5. Be warm, professional, and proactive

RESPOND:`;
}

function buildFollowUpPrompt(
  userMessage: string,
  toolCall: ToolCall,
  toolResult: any,
  session: Session
): string {
  // Format result naturally for the prompt
  const naturalResult = formatResultNaturally(toolCall.tool, toolResult);
  
  return `${CARA_SOUL}

---

SEARCH/TOOL RESULTS (use this to respond):
${naturalResult}

---

ORIGINAL USER MESSAGE:
"${userMessage}"

---

CRITICAL INSTRUCTIONS:
1. Respond ONLY in natural, warm conversational text
2. NEVER show JSON, code, or technical formatting
3. Present results as if talking to a family member
4. Be proactive - suggest next steps
5. If caregivers found, introduce each warmly with their details
6. Ask which caregiver they'd like to interview

EXAMPLE GOOD RESPONSE:
"Great news! I found 2 wonderful caregivers near you:

Maria has 8 years of experience with dementia care and charges $28/hour. Families love her compassionate approach.

John specializes in mobility assistance with 5 years experience at $25/hour. He's known for his patience.

Which one would you like to meet? I can schedule a video interview for you."

YOUR NATURAL RESPONSE (no JSON, no code):`;
}

// Helper function to format tool results naturally
function formatResultNaturally(toolName: string, result: any): string {
  if (toolName === 'search_caregivers') {
    if (result.found && result.caregivers?.length > 0) {
      let summary = `✅ Found ${result.count} caregiver(s):\n\n`;
      result.caregivers.forEach((c: any, i: number) => {
        summary += `${i+1}. ${c.name}\n`;
        summary += `   Rate: $${c.hourlyRate}/hour\n`;
        summary += `   Experience: ${c.yearsExperience} years\n`;
        summary += `   Rating: ${c.rating}/5 stars\n`;
        summary += `   Specialties: ${c.specialties?.join(', ') || 'General care'}\n`;
        summary += `   Bio: ${c.bio}\n\n`;
      });
      return summary;
    } else {
      return `❌ No caregivers found: ${result.message}`;
    }
  }
  
  if (toolName === 'schedule_interview') {
    return result.success 
      ? `✅ ${result.message}`
      : `❌ ${result.message}`;
  }
  
  if (toolName === 'store_memory') {
    return result.success ? '✅ Information saved' : '❌ Failed to save';
  }
  
  // Default: return simple string representation
  return JSON.stringify(result, null, 2);
}

function parseLLMResponse(response: string): {
  response?: string;
  toolCall?: ToolCall;
  raw: string;
} {
  const trimmed = response.trim();
  
  // Check for JSON tool call
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.tool) {
        return {
          toolCall: {
            tool: parsed.tool,
            parameters: parsed.parameters || {}
          },
          raw: trimmed
        };
      }
    } catch (e) {
      // Not valid JSON, treat as text
    }
  }
  
  // Regular text response
  return {
    response: trimmed,
    raw: trimmed
  };
}
