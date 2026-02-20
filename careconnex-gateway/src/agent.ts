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
      
      // Get final response after tool execution
      const followUpPrompt = buildFollowUpPrompt(userMessage, parsed.toolCall, result, session);
      const followUpResponse = await callLLM([
        { role: 'system', content: 'You are Cara, a care coordinator.' },
        { role: 'user', content: followUpPrompt }
      ]);
      
      const finalParsed = parseLLMResponse(followUpResponse);
      
      // Update conversation history
      addToHistory(userPhone, 'user', userMessage);
      addToHistory(userPhone, 'assistant', finalParsed.response || finalParsed.raw);
      
      return {
        response: finalParsed.response || finalParsed.raw,
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
  return `${CARA_SOUL}

---

TOOL EXECUTED:
Tool: ${toolCall.tool}
Parameters: ${JSON.stringify(toolCall.parameters)}
Result: ${JSON.stringify(toolResult)}

---

USER ORIGINAL MESSAGE:
"${userMessage}"

---

INSTRUCTIONS:
Now respond to the user with the tool result. Be natural and conversational.
If caregivers were found, present them nicely and ask which they want to interview.
If interview was scheduled, confirm the details.

RESPOND:`;
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
