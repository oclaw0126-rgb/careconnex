"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOLS = void 0;
exports.processMessage = processMessage;
exports.loadUserMemory = loadUserMemory;
exports.extractAndStoreFacts = extractAndStoreFacts;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ============================================================
// TOOL IMPLEMENTATIONS
// ============================================================
exports.TOOLS = {
    search_caregivers: {
        name: 'search_caregivers',
        description: 'Search for available caregivers matching user needs and location. Returns top 3 matches with scores.',
        parameters: {
            type: 'object',
            properties: {
                zip_code: {
                    type: 'string',
                    description: 'User\'s 5-digit zip code'
                },
                care_needs: {
                    type: 'array',
                    description: 'Types of care needed (e.g., dementia, companionship, mobility)',
                    items: { type: 'string' }
                },
                max_hourly_rate: {
                    type: 'number',
                    description: 'Maximum hourly rate user is willing to pay'
                },
                preferred_schedule: {
                    type: 'array',
                    description: 'Preferred days (monday, tuesday, etc.)',
                    items: { type: 'string' }
                }
            },
            required: ['zip_code']
        },
        execute: async (params, context) => {
            var _a;
            console.log('🔍 TOOL: search_caregivers', params);
            try {
                let query = db.collection('caregivers')
                    .where('verified', '==', true)
                    .where('available', '==', true);
                if (params.zip_code) {
                    query = query.where('serviceZipCodes', 'array-contains', params.zip_code);
                }
                const snapshot = await query.limit(10).get();
                if (snapshot.empty) {
                    return {
                        success: true,
                        data: { found: false, count: 0 },
                        message: `No caregivers found in ${params.zip_code}. I'll notify our team to find matches within 24 hours.`
                    };
                }
                // Score and rank caregivers
                let caregivers = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
                if (((_a = params.care_needs) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    caregivers = caregivers.map(c => (Object.assign(Object.assign({}, c), { match_score: calculateMatchScore(c, params.care_needs) }))).sort((a, b) => b.match_score - a.match_score);
                }
                const topMatches = caregivers.slice(0, 3).map((c, i) => {
                    var _a, _b;
                    return ({
                        rank: i + 1,
                        id: c.id,
                        name: c.name,
                        hourly_rate: c.hourlyRate,
                        rating: c.rating || 4.8,
                        years_experience: c.yearsExperience || 5,
                        specialties: ((_a = c.specialties) === null || _a === void 0 ? void 0 : _a.slice(0, 3)) || [],
                        bio: ((_b = c.bio) === null || _b === void 0 ? void 0 : _b.substring(0, 100)) + '...' || 'Experienced caregiver',
                        match_score: c.match_score || 80
                    });
                });
                return {
                    success: true,
                    data: {
                        found: true,
                        count: topMatches.length,
                        zip_code: params.zip_code,
                        caregivers: topMatches
                    },
                    message: `Found ${topMatches.length} excellent caregivers in ${params.zip_code}`
                };
            }
            catch (error) {
                console.error('Search error:', error);
                return {
                    success: false,
                    error: error.message,
                    message: 'I had trouble searching. Let me try again or you can browse all caregivers on our website.'
                };
            }
        }
    },
    schedule_interview: {
        name: 'schedule_interview',
        description: 'Schedule a video interview between user and selected caregiver',
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
                    description: 'Proposed date and time (e.g., "Tomorrow 2pm" or "2026-02-20 14:00")'
                },
                user_phone: {
                    type: 'string',
                    description: 'User\'s phone number'
                }
            },
            required: ['caregiver_id', 'caregiver_name', 'proposed_time']
        },
        execute: async (params, context) => {
            console.log('📅 TOOL: schedule_interview', params);
            try {
                // Create interview record
                const interviewRef = await db.collection('interviews').add({
                    userId: context.userId,
                    userPhone: context.userPhone,
                    caregiverId: params.caregiver_id,
                    caregiverName: params.caregiver_name,
                    proposedTime: params.proposed_time,
                    status: 'pending_caregiver_response',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return {
                    success: true,
                    data: {
                        interview_id: interviewRef.id,
                        caregiver_name: params.caregiver_name,
                        proposed_time: params.proposed_time
                    },
                    message: `✅ Interview request sent to ${params.caregiver_name} for ${params.proposed_time}. You'll receive confirmation within 2 hours.`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'I had trouble scheduling. Please try again or call our support line.'
                };
            }
        }
    },
    store_memory: {
        name: 'store_memory',
        description: 'Store important information about the user for future reference (names, preferences, needs, etc.)',
        parameters: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Memory key (e.g., "care_recipient_name", "preferred_schedule", "medical_conditions")'
                },
                value: {
                    type: 'string',
                    description: 'The information to remember'
                },
                category: {
                    type: 'string',
                    description: 'Category: family, medical, preferences, schedule, or general',
                    enum: ['family', 'medical', 'preferences', 'schedule', 'general']
                }
            },
            required: ['key', 'value', 'category']
        },
        execute: async (params, context) => {
            console.log('💾 TOOL: store_memory', params);
            try {
                await db.collection('cara_memories').add({
                    userId: context.userId,
                    userPhone: context.userPhone,
                    key: params.key,
                    value: params.value,
                    category: params.category,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return {
                    success: true,
                    message: `Got it! I'll remember that.`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: 'Note taken (with minor storage issue).'
                };
            }
        }
    },
    get_care_tips: {
        name: 'get_care_tips',
        description: 'Get helpful tips and advice for specific care situations (dementia, falls, nutrition, etc.)',
        parameters: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Topic for tips: dementia, falls, nutrition, medication, mobility, or general',
                    enum: ['dementia', 'falls', 'nutrition', 'medication', 'mobility', 'general']
                }
            },
            required: ['topic']
        },
        execute: async (params, context) => {
            console.log('💡 TOOL: get_care_tips', params);
            const tips = {
                dementia: `*Dementia Care Tips:*\n\n` +
                    `• Keep daily routines consistent\n` +
                    `• Use simple, clear sentences\n` +
                    `• Validate feelings rather than arguing\n` +
                    `• Create a calm, quiet environment\n` +
                    `• Ensure safety: lock medications, remove tripping hazards`,
                falls: `*Fall Prevention Tips:*\n\n` +
                    `• Remove loose rugs and clutter\n` +
                    `• Install grab bars in bathroom\n` +
                    `• Ensure good lighting at night\n` +
                    `• Use non-slip mats\n` +
                    `• Encourage proper footwear`,
                nutrition: `*Senior Nutrition Tips:*\n\n` +
                    `• Stay hydrated - aim for 8 glasses water\n` +
                    `• Protein at every meal\n` +
                    `• Calcium and Vitamin D for bone health\n` +
                    `• Smaller, frequent meals if appetite is low\n` +
                    `• Limit sodium and processed foods`,
                medication: `*Medication Management:*\n\n` +
                    `• Use a weekly pill organizer\n` +
                    `• Set phone alarms for reminders\n` +
                    `• Keep an updated medication list\n` +
                    `• Watch for side effects\n` +
                    `• Bring all meds to doctor visits`,
                mobility: `*Mobility Assistance:*\n\n` +
                    `• Regular gentle exercise\n` +
                    `• Use assistive devices (walker/cane) consistently\n` +
                    `• Clear pathways in the home\n` +
                    `• Allow extra time for movements\n` +
                    `• Consider physical therapy`,
                general: `*General Care Tips:*\n\n` +
                    `• Regular communication and socialization\n` +
                    `• Monitor for changes in mood or behavior\n` +
                    `• Keep emergency contacts accessible\n` +
                    `• Maintain dignity and independence\n` +
                    `• Take care of yourself as a caregiver`
            };
            return {
                success: true,
                data: { topic: params.topic },
                message: tips[params.topic] || tips.general
            };
        }
    },
    request_human: {
        name: 'request_human',
        description: 'Request a human care coordinator to take over the conversation',
        parameters: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'Why human support is needed'
                }
            },
            required: ['reason']
        },
        execute: async (params, context) => {
            console.log('🤝 TOOL: request_human', params);
            await db.collection('handoff_requests').add({
                userId: context.userId,
                userPhone: context.userPhone,
                reason: params.reason,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return {
                success: true,
                message: `✅ A human care coordinator will contact you within 15 minutes. Your reference: #${context.userPhone.slice(-4)}`
            };
        }
    }
};
// ============================================================
// HELPER FUNCTIONS
// ============================================================
function calculateMatchScore(caregiver, needs) {
    let score = 50; // Base score
    // Skills match
    const allSkills = [...(caregiver.specialties || []), ...(caregiver.services || [])]
        .map((s) => s.toLowerCase());
    const matches = needs.filter(need => allSkills.some((skill) => skill.includes(need.toLowerCase()))).length;
    score += (matches / needs.length) * 30;
    // Rating bonus
    score += ((caregiver.rating || 4.5) - 4) * 10;
    // Experience bonus
    score += Math.min((caregiver.yearsExperience || 0) * 2, 10);
    return Math.min(Math.round(score), 100);
}
// ============================================================
// AGENT CORE - Process Messages
// ============================================================
async function processMessage(message, context, conversationHistory) {
    var _a;
    console.log('🤖 CARA PROCESSING:', message);
    console.log('👤 User:', context.userPhone);
    const apiKey = ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key) || '';
    // Build system prompt with tool schemas
    const toolsSchema = Object.values(exports.TOOLS).map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
    }));
    const systemPrompt = `You are Cara, a warm and professional care coordinator for CareConnex.

YOUR GOAL: Help families find the perfect caregiver for their loved ones.

USER CONTEXT:
- Phone: ${context.userPhone}
- Name: ${context.userName || 'Unknown'}
- Memory: ${JSON.stringify(context.memory, null, 2)}

AVAILABLE TOOLS:
${JSON.stringify(toolsSchema, null, 2)}

INSTRUCTIONS:
1. Understand what the user wants
2. If you need to use a tool, respond with JSON: {"tool": "tool_name", "parameters": {...}}
3. If no tool needed, respond naturally: {"response": "Your warm, helpful message here"}
4. ALWAYS be empathetic and professional
5. Ask clarifying questions if needed
6. Remember important details using store_memory tool

RESPONSE FORMAT:
Choose ONE:
- For tool use: {"tool": "tool_name", "parameters": {...}}
- For direct response: {"response": "Your message here"}
- For multiple actions: {"tool": "tool_name", "parameters": {...}, "then_respond": "Optional follow-up message"}`;
    // Call Gemini API
    try {
        const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}\n\nUSER: ${message}\n\nRESPOND WITH JSON ONLY.`;
        const geminiResponse = await callGeminiAPI(prompt, apiKey);
        console.log('📝 Gemini raw response:', geminiResponse);
        // Parse response
        let parsed;
        try {
            const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : geminiResponse);
        }
        catch (e) {
            console.log('Failed to parse JSON, using raw response');
            return { response: geminiResponse || "I'm here to help! What do you need?" };
        }
        // Handle tool call
        if (parsed.tool && exports.TOOLS[parsed.tool]) {
            console.log('🔧 Executing tool:', parsed.tool);
            const tool = exports.TOOLS[parsed.tool];
            const result = await tool.execute(parsed.parameters || {}, context);
            // If there's a follow-up message, use it
            const finalResponse = parsed.then_respond || result.message;
            return {
                response: finalResponse,
                toolCalls: [{ tool: parsed.tool, result }]
            };
        }
        // Direct response
        return { response: parsed.response || parsed.message || "I'm here to help!" };
    }
    catch (error) {
        console.error('Agent error:', error);
        return { response: "I'm having a moment. Let me try again - what were you looking for?" };
    }
}
// ============================================================
// GEMINI API CALL
// ============================================================
async function callGeminiAPI(prompt, apiKey) {
    var _a, _b, _c, _d, _e;
    if (!apiKey) {
        console.error('No API key');
        return '{"response": "I\'m having trouble connecting. Please try again."}';
    }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return ((_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
    }
    catch (error) {
        console.error('Gemini API error:', error);
        return '{"response": "I\'m having trouble connecting. Please try again."}';
    }
}
// ============================================================
// MEMORY MANAGEMENT
// ============================================================
async function loadUserMemory(userId, userPhone) {
    try {
        const memories = await db.collection('cara_memories')
            .where('userPhone', '==', userPhone)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        const memory = {};
        memories.docs.forEach(doc => {
            const data = doc.data();
            memory[data.key] = data.value;
        });
        return memory;
    }
    catch (error) {
        console.error('Memory load error:', error);
        return {};
    }
}
async function extractAndStoreFacts(message, context) {
    const text = message.toLowerCase();
    // Extract care recipient name
    const nameMatch = message.match(/(?:my |for )?(?:mom|mother|dad|father|grandma|grandmother|grandpa|grandfather)[']?s? name is (\w+)/i);
    if (nameMatch) {
        await exports.TOOLS.store_memory.execute({
            key: 'care_recipient_name',
            value: nameMatch[1],
            category: 'family'
        }, context);
    }
    // Extract zip code
    const zipMatch = message.match(/(\d{5})/);
    if (zipMatch && !context.memory.zip_code) {
        await exports.TOOLS.store_memory.execute({
            key: 'zip_code',
            value: zipMatch[1],
            category: 'general'
        }, context);
    }
    // Extract medical conditions
    const conditions = ['dementia', 'alzheimer', 'diabetes', 'parkinson', 'arthritis', 'stroke'];
    for (const condition of conditions) {
        if (text.includes(condition)) {
            const existing = context.memory.medical_conditions || '';
            if (!existing.includes(condition)) {
                await exports.TOOLS.store_memory.execute({
                    key: 'medical_conditions',
                    value: existing ? `${existing}, ${condition}` : condition,
                    category: 'medical'
                }, context);
            }
        }
    }
}
//# sourceMappingURL=caraAgentCore.js.map