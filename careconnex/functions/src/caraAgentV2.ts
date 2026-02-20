import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';
import { CARA_SOUL } from './caraBootstrap';

const db = admin.firestore();

// ============================================================
// CARA AGENT v2.0 - OpenClaw-Inspired Architecture
// ============================================================

// Tool definitions with JSON schemas for LLM
const TOOL_SCHEMAS = {
  search_caregivers: {
    name: 'search_caregivers',
    description: 'Search for caregivers in a specific zip code. Use when user provides a zip code or mentions a location.',
    parameters: {
      type: 'object',
      properties: {
        zip_code: {
          type: 'string',
          description: 'The 5-digit zip code to search in'
        },
        care_type: {
          type: 'string',
          description: 'Optional: type of care needed (dementia, companionship, meal prep, mobility)'
        }
      },
      required: ['zip_code']
    }
  },
  
  schedule_interview: {
    name: 'schedule_interview',
    description: 'Schedule a video interview between user and selected caregiver. Use when user picks a caregiver and proposes a time.',
    parameters: {
      type: 'object',
      properties: {
        caregiver_id: {
          type: 'string',
          description: 'ID of the selected caregiver'
        },
        caregiver_name: {
          type: 'string',
          description: 'Name of the caregiver'
        },
        proposed_time: {
          type: 'string',
          description: 'When the interview should happen (e.g., "Tomorrow 2pm", "Friday morning")'
        }
      },
      required: ['caregiver_id', 'caregiver_name', 'proposed_time']
    }
  },
  
  store_memory: {
    name: 'store_memory',
    description: 'Store important information about the user for future reference. Use when learning names, preferences, needs.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'What to remember (e.g., "zip_code", "who_needs_care", "care_type")'
        },
        value: {
          type: 'string',
          description: 'The information to store'
        }
      },
      required: ['key', 'value']
    }
  },
  
  request_human: {
    name: 'request_human',
    description: 'Escalate to human care team. Use for crises, complex medical needs, or complaints.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Why human help is needed'
        }
      },
      required: ['reason']
    }
  }
};

// ============================================================
// MAIN AGENT LOOP
// ============================================================

export async function runCaraAgent(
  userMessage: string,
  context: {
    userId: string;
    userPhone: string;
    userName?: string;
    conversationHistory: Array<{role: string; content: string}>;
    memory: Record<string, any>;
  }
): Promise<{
  response: string;
  toolCalls: Array<{tool: string; params: any; result?: any}>;
  updatedMemory: Record<string, any>;
}> {
  
  console.log('========================================');
  console.log('🤖 CARA AGENT v2.0');
  console.log('📨 User:', userMessage);
  console.log('💾 Memory:', Object.keys(context.memory));
  console.log('📜 History length:', context.conversationHistory.length);
  console.log('========================================');

  const toolCalls: Array<{tool: string; params: any; result?: any}> = [];
  const updatedMemory = { ...context.memory };
  
  // Build the complete prompt with bootstrap context
  const prompt = buildAgentPrompt(userMessage, context);
  
  try {
    // Call Kimi K2.5
    console.log('🧠 Calling Kimi K2.5...');
    const llmResponse = await callKimiLLM(prompt);
    console.log('📝 LLM response:', llmResponse.substring(0, 200));
    
    // Parse response - check for tool calls
    const parsed = parseLLMResponse(llmResponse);
    
    // If tool call requested, execute it
    if (parsed.toolCall) {
      console.log('🔧 Executing tool:', parsed.toolCall.tool);
      const result = await executeTool(parsed.toolCall.tool, parsed.toolCall.params, context);
      toolCalls.push({
        tool: parsed.toolCall.tool,
        params: parsed.toolCall.params,
        result
      });
      
      // Update memory if needed
      if (parsed.toolCall.tool === 'store_memory') {
        updatedMemory[parsed.toolCall.params.key] = parsed.toolCall.params.value;
      }
      
      // Get final response after tool execution
      const followUpPrompt = buildFollowUpPrompt(userMessage, parsed.toolCall, result, context);
      const followUpResponse = await callKimiLLM(followUpPrompt);
      const finalParsed = parseLLMResponse(followUpResponse);
      
      return {
        response: finalParsed.response || finalParsed.raw,
        toolCalls,
        updatedMemory
      };
    }
    
    // No tool call, just return the response
    return {
      response: parsed.response || parsed.raw,
      toolCalls,
      updatedMemory
    };
    
  } catch (error) {
    console.error('❌ Agent error:', error);
    // Graceful degradation
    return {
      response: "I'm having a moment. Let me try again - what were you looking for help with?",
      toolCalls,
      updatedMemory
    };
  }
}

// ============================================================
// BUILD AGENT PROMPT (Bootstrap Context Injection)
// ============================================================

function buildAgentPrompt(
  userMessage: string,
  context: {
    userId: string;
    userPhone: string;
    userName?: string;
    conversationHistory: Array<{role: string; content: string}>;
    memory: Record<string, any>;
  }
): string {
  
  // Build memory context
  const memoryContext = Object.entries(context.memory)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n') || '- No previous memory';
  
  // Build conversation context (last 5 messages)
  const recentHistory = context.conversationHistory
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
${recentHistory}

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

// ============================================================
// BUILD FOLLOW-UP PROMPT (After Tool Execution)
// ============================================================

function buildFollowUpPrompt(
  userMessage: string,
  toolCall: {tool: string; params: any},
  toolResult: any,
  context: any
): string {
  return `${CARA_SOUL}

---

TOOL EXECUTED:
Tool: ${toolCall.tool}
Parameters: ${JSON.stringify(toolCall.params)}
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

// ============================================================
// CALL KIMI K2.5
// ============================================================

async function callKimiLLM(prompt: string): Promise<string> {
  const apiKey = functions.config().kimi?.key;
  
  if (!apiKey) {
    throw new Error('Kimi API key not configured');
  }
  
  const postData = JSON.stringify({
    model: 'kimi-k2.5',
    messages: [
      { role: 'system', content: 'You are Cara, a care coordinator. Respond naturally or with JSON tool calls.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.moonshot.cn',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed.choices?.[0]?.message?.content || '');
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ============================================================
// PARSE LLM RESPONSE
// ============================================================

function parseLLMResponse(response: string): {
  response?: string;
  toolCall?: {tool: string; params: any};
  raw: string;
} {
  const trimmed = response.trim();
  
  // Check for JSON tool call
  if (trimmed.startsWith('{') && trimmed.includes('"tool"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.tool) {
        return {
          toolCall: {
            tool: parsed.tool,
            params: parsed.parameters || parsed.params || {}
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

// ============================================================
// EXECUTE TOOL
// ============================================================

async function executeTool(
  toolName: string,
  params: any,
  context: any
): Promise<any> {
  console.log(`🔧 Executing ${toolName}:`, params);
  
  switch (toolName) {
    case 'search_caregivers':
      return await toolSearchCaregivers(params, context);
    case 'schedule_interview':
      return await toolScheduleInterview(params, context);
    case 'store_memory':
      return await toolStoreMemory(params, context);
    case 'request_human':
      return await toolRequestHuman(params, context);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool implementations
async function toolSearchCaregivers(params: any, context: any): Promise<any> {
  const { zip_code } = params;
  
  const snapshot = await db.collection('caregivers')
    .where('verified', '==', true)
    .where('available', '==', true)
    .where('serviceZipCodes', 'array-contains', zip_code)
    .limit(10)
    .get();
  
  if (snapshot.empty) {
    return { found: false, count: 0, message: `No caregivers found in ${zip_code}` };
  }
  
  const caregivers = snapshot.docs.map((doc, i) => {
    const data = doc.data();
    return {
      rank: i + 1,
      id: doc.id,
      name: data.name,
      hourly_rate: data.hourlyRate,
      rating: data.rating || 4.8,
      specialties: data.specialties?.slice(0, 3) || [],
      years_experience: data.yearsExperience || 5
    };
  }).slice(0, 3);
  
  return { found: true, count: caregivers.length, caregivers };
}

async function toolScheduleInterview(params: any, context: any): Promise<any> {
  const { caregiver_id, caregiver_name, proposed_time } = params;
  
  const interviewRef = await db.collection('interviews').add({
    userId: context.userId,
    userPhone: context.userPhone,
    caregiverId: caregiver_id,
    caregiverName: caregiver_name,
    proposedTime: proposed_time,
    status: 'pending_caregiver_response',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    success: true,
    interview_id: interviewRef.id,
    message: `Interview request sent to ${caregiver_name} for ${proposed_time}`
  };
}

async function toolStoreMemory(params: any, context: any): Promise<any> {
  const { key, value } = params;
  
  await db.collection('cara_memories').add({
    userId: context.userId,
    userPhone: context.userPhone,
    key,
    value,
    category: 'general',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, key, value };
}

async function toolRequestHuman(params: any, context: any): Promise<any> {
  const { reason } = params;
  
  // Store escalation request
  await db.collection('escalations').add({
    userId: context.userId,
    userPhone: context.userPhone,
    reason,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, message: 'Human team notified' };
}

// ============================================================
// MEMORY MANAGEMENT
// ============================================================

export async function loadUserMemory(userId: string, userPhone: string): Promise<Record<string, any>> {
  try {
    const memories = await db.collection('cara_memories')
      .where('userPhone', '==', userPhone)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const memory: Record<string, any> = {};
    memories.docs.forEach(doc => {
      const data = doc.data();
      // Keep only the most recent value for each key
      if (!(data.key in memory)) {
        memory[data.key] = data.value;
      }
    });
    
    return memory;
  } catch (error) {
    console.error('Memory load error:', error);
    return {};
  }
}

export async function loadConversationHistory(userPhone: string): Promise<Array<{role: string; content: string}>> {
  try {
    const snapshot = await db.collection('cara_conversations')
      .doc(userPhone)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    return snapshot.docs
      .reverse()
      .map(doc => ({
        role: doc.data().role,
        content: doc.data().content
      }));
  } catch (error) {
    console.error('History load error:', error);
    return [];
  }
}
