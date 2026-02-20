import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';

const db = admin.firestore();

// ============================================================
// KIMI K2.5 REAL AGENT - Not a chatbot, a true AI agent
// ============================================================

interface ConversationState {
  stage: 'greeting' | 'gathering_info' | 'showing_caregivers' | 'scheduling' | 'confirmed';
  zipCode?: string;
  careType?: string;
  whoNeedsCare?: string;
  caregivers?: any[];
  selectedCaregiver?: any;
  proposedTime?: string;
}

interface AgentContext {
  userId: string;
  userPhone: string;
  userName?: string;
  memory: Record<string, any>;
  conversationHistory: Array<{role: string; content: string}>;
  state: ConversationState;
}

const KIMI_API_KEY = functions.config().kimi?.key || '';

// ============================================================
// MAIN AGENT FUNCTION
// ============================================================

export async function processWithKimiAgent(
  message: string,
  context: AgentContext
): Promise<{response: string; state: ConversationState; actions: any[]}> {
  
  console.log('========================================');
  console.log('🤖 KIMI AGENT PROCESSING');
  console.log('📨 Message:', message);
  console.log('📍 State:', context.state.stage);
  console.log('💾 Memory:', Object.keys(context.memory));
  console.log('========================================');

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(context);
  
  // Build conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...context.conversationHistory.slice(-10), // Last 10 messages
    { role: 'user', content: message }
  ];

  try {
    // Call Kimi K2.5
    const response = await callKimiAPI(messages);
    console.log('📝 Kimi raw response:', response);
    
    // Parse the response
    const parsed = parseAgentResponse(response, context);
    
    return parsed;
  } catch (error) {
    console.error('❌ Kimi API error:', error);
    // Fallback to local handling
    return handleLocally(message, context);
  }
}

// ============================================================
// BUILD SYSTEM PROMPT
// ============================================================

function buildSystemPrompt(context: AgentContext): string {
  const { state, memory } = context;
  
  return `You are Cara, a warm, professional, and intelligent care coordinator for CareConnex. You help families find the perfect caregivers for their loved ones.

YOUR PERSONALITY:
- Warm and empathetic (families are stressed)
- Professional but not robotic
- Conversational and natural
- Proactive (suggest next steps)
- Never repetitive (don't ask for info you already have)

CURRENT CONVERSATION STATE: ${state.stage}

WHAT YOU KNOW ABOUT THE USER:
${memory.zip_code ? `- Zip code: ${memory.zip_code}` : '- Zip code: Not yet known'}
${memory.who_needs_care ? `- Who needs care: ${memory.who_needs_care}` : '- Who needs care: Not yet known'}
${memory.care_type ? `- Care type: ${memory.care_type}` : '- Care type: Not yet known'}
${state.caregivers ? `- Caregivers shown: ${state.caregivers.length}` : ''}
${state.selectedCaregiver ? `- Selected caregiver: ${state.selectedCaregiver.name}` : ''}

AVAILABLE ACTIONS (respond with JSON):
1. Search caregivers: {"action": "search_caregivers", "zip_code": "...", "care_needs": [...]}
2. Select caregiver: {"action": "select_caregiver", "rank": 1|2|3}
3. Schedule interview: {"action": "schedule_interview", "caregiver_name": "...", "time": "..."}
4. Store memory: {"action": "store_memory", "key": "...", "value": "..."}
5. Just respond: {"response": "Your natural message here"}
6. Combined: {"action": "search_caregivers", "zip_code": "...", "then_respond": "I found..."}

RULES:
1. NEVER ask for information you already know (check memory above)
2. If zip code known → Search caregivers immediately
3. If user says "1", "2", or "3" and caregivers were shown → Select that caregiver
4. If user proposes a time ("tomorrow 2pm") and caregiver selected → Schedule interview
5. Be conversational, not robotic
6. Always suggest the next step

RESPOND WITH JSON ONLY.`;
}

// ============================================================
// CALL KIMI API (using https module)
// ============================================================

async function callKimiAPI(messages: any[]): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('Kimi API key not configured');
  }

  const postData = JSON.stringify({
    model: 'kimi-k2.5',
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  const options = {
    hostname: 'api.moonshot.cn',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`Kimi API error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          } else {
            const content = parsed.choices?.[0]?.message?.content || '';
            resolve(content);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================
// PARSE AGENT RESPONSE
// ============================================================

function parseAgentResponse(response: string, context: AgentContext): {response: string; state: ConversationState; actions: any[]} {
  try {
    // Clean up response
    const cleanResponse = response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleanResponse);
    
    const actions: any[] = [];
    let newState = { ...context.state };
    let responseText = '';

    // Handle actions
    if (parsed.action) {
      actions.push({
        type: parsed.action,
        params: parsed
      });
      
      // Update state based on action
      switch (parsed.action) {
        case 'search_caregivers':
          newState.stage = 'showing_caregivers';
          break;
        case 'select_caregiver':
          newState.stage = 'scheduling';
          break;
        case 'schedule_interview':
          newState.stage = 'confirmed';
          break;
      }
    }
    
    // Handle response
    responseText = parsed.then_respond || parsed.response || parsed.message || '';
    
    return {
      response: responseText,
      state: newState,
      actions
    };
  } catch (error) {
    console.error('Parse error:', error);
    // Return raw response if parsing fails
    return {
      response: response,
      state: context.state,
      actions: []
    };
  }
}

// ============================================================
// LOCAL FALLBACK (When Kimi fails)
// ============================================================

function handleLocally(message: string, context: AgentContext): {response: string; state: ConversationState; actions: any[]} {
  const text = message.toLowerCase().trim();
  const { state, memory } = context;
  
  // Check for caregiver selection
  const selectionMatch = text.match(/^(1|2|3)$/);
  if (selectionMatch && state.caregivers) {
    const rank = parseInt(selectionMatch[1]);
    const caregiver = state.caregivers.find((c: any) => c.rank === rank);
    
    if (caregiver) {
      return {
        response: `Perfect! You selected *${caregiver.name}* ($${caregiver.hourly_rate}/hr, ⭐ ${caregiver.rating}).\n\nWhen would you like to schedule a video interview?\n\nExamples:\n• Tomorrow 2pm\n• Friday morning\n• Next Tuesday 10am`,
        state: { ...state, stage: 'scheduling', selectedCaregiver: caregiver },
        actions: [{ type: 'store_memory', key: 'selected_caregiver', value: JSON.stringify(caregiver) }]
      };
    }
  }
  
  // Check for time proposal
  if (state.selectedCaregiver && (text.includes('tomorrow') || text.includes('today') || text.includes('monday') || text.includes('tuesday') || text.includes('wednesday') || text.includes('thursday') || text.includes('friday') || text.includes('saturday') || text.includes('sunday') || text.match(/\d/))) {
    return {
      response: `✅ Interview request sent to ${state.selectedCaregiver.name} for ${message}. You'll receive confirmation within 2 hours.\n\nIs there anything else I can help you with?`,
      state: { ...state, stage: 'confirmed', proposedTime: message },
      actions: [{ type: 'schedule_interview', caregiver: state.selectedCaregiver, time: message }]
    };
  }
  
  // Default: Ask for zip if not known
  if (!memory.zip_code && !state.zipCode) {
    return {
      response: "I'd be happy to help you find a caregiver! What's your zip code so I can search for qualified caregivers in your area?",
      state: { ...state, stage: 'gathering_info' },
      actions: []
    };
  }
  
  // Have zip, search caregivers
  return {
    response: "",
    state: { ...state, stage: 'showing_caregivers' },
    actions: [{ type: 'search_caregivers', zip_code: memory.zip_code || state.zipCode }]
  };
}

// ============================================================
// EXECUTE ACTIONS
// ============================================================

export async function executeActions(
  actions: any[],
  context: AgentContext
): Promise<{caregivers?: any[]; success: boolean; message?: string}> {
  const results: any = { success: true };
  
  for (const action of actions) {
    switch (action.type) {
      case 'search_caregivers':
        // Import and call the search function from caraAgentCore
        const { TOOLS } = await import('./caraAgentCore');
        const searchResult = await TOOLS.search_caregivers.execute({
          zip_code: action.params?.zip_code || action.zip_code || context.memory.zip_code,
          care_needs: action.params?.care_needs || []
        }, {
          userId: context.userId,
          userPhone: context.userPhone,
          conversationId: `conv_${Date.now()}`,
          userName: context.userName,
          memory: context.memory
        });
        
        if (searchResult.success && searchResult.data?.found) {
          results.caregivers = searchResult.data.caregivers;
        }
        break;
        
      case 'store_memory':
        await db.collection('cara_memories').add({
          userId: context.userId,
          userPhone: context.userPhone,
          key: action.key || action.params?.key,
          value: action.value || action.params?.value,
          category: 'general',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
        
      case 'schedule_interview':
        const { TOOLS: tools2 } = await import('./caraAgentCore');
        await tools2.schedule_interview.execute({
          caregiver_id: action.caregiver?.id || action.params?.caregiver_id,
          caregiver_name: action.caregiver?.name || action.params?.caregiver_name,
          proposed_time: action.time || action.params?.time || action.params?.proposed_time
        }, {
          userId: context.userId,
          userPhone: context.userPhone,
          conversationId: `conv_${Date.now()}`,
          userName: context.userName,
          memory: context.memory
        });
        break;
    }
  }
  
  return results;
}

// ============================================================
// INITIALIZE CONVERSATION STATE
// ============================================================

export function initializeState(memory: Record<string, any>): ConversationState {
  // Determine starting state based on what we know
  if (memory.zip_code) {
    return { stage: 'gathering_info', zipCode: memory.zip_code };
  }
  return { stage: 'greeting' };
}

// ============================================================
// FORMAT CAREGIVERS FOR DISPLAY
// ============================================================

export function formatCaregivers(caregivers: any[]): string {
  const list = caregivers.map((c: any) =>
    `${c.rank}️⃣ *${c.name}* - $${c.hourly_rate}/hr, ⭐ ${c.rating}`
  ).join('\n');
  
  return `I found ${caregivers.length} excellent caregivers:\n\n${list}\n\nWhich would you like to interview? Reply 1, 2, or 3.`;
}

export { AgentContext, ConversationState };
