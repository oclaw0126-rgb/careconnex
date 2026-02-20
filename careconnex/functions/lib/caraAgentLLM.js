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
exports.TOOL_DEFINITIONS = void 0;
exports.processWithLLM = processWithLLM;
exports.classifyIntent = classifyIntent;
exports.extractInfo = extractInfo;
const functions = __importStar(require("firebase-functions"));
/**
 * Tool definitions for LLM
 */
exports.TOOL_DEFINITIONS = [
    {
        name: 'searchCaregivers',
        description: 'Search for available caregivers matching user needs',
        parameters: {
            zipCode: 'User zip code (5 digits)',
            needs: 'Array of care needs (e.g., ["dementia", "mobility"])',
            maxPrice: 'Maximum hourly rate user is willing to pay',
            specialties: 'Array of required specialties'
        }
    },
    {
        name: 'checkAvailability',
        description: 'Check if a specific caregiver is available at a date/time',
        parameters: {
            caregiverId: 'ID of the caregiver',
            date: 'Date in YYYY-MM-DD format',
            timeSlot: 'Time slot (e.g., "morning", "afternoon", "evening")'
        }
    },
    {
        name: 'scheduleInterview',
        description: 'Schedule a video interview with a caregiver',
        parameters: {
            userId: 'User ID from Firestore',
            userPhone: 'User phone number',
            caregiverId: 'ID of selected caregiver',
            proposedTimes: 'Array of proposed times (e.g., ["Tomorrow 2pm", "Thursday 10am"])'
        }
    },
    {
        name: 'createBooking',
        description: 'Create a booking/appointment with a caregiver',
        parameters: {
            userId: 'User ID',
            caregiverId: 'ID of selected caregiver',
            schedule: 'Object with date, timeSlot, duration',
            needs: 'Array of care needs',
            notes: 'Additional notes for the caregiver'
        }
    },
    {
        name: 'getUserBookings',
        description: 'Get user current bookings/appointments',
        parameters: {
            userId: 'User ID',
            userPhone: 'User phone number'
        }
    },
    {
        name: 'updateUserContext',
        description: 'Save information about the user for future reference',
        parameters: {
            userId: 'User ID',
            userPhone: 'User phone number',
            key: 'Context key (e.g., "careRecipient.name")',
            value: 'Value to store'
        }
    },
    {
        name: 'requestHumanHandoff',
        description: 'Request a human support specialist to take over',
        parameters: {
            userId: 'User ID',
            userPhone: 'User phone number',
            reason: 'Why human support is needed'
        }
    },
    // Phase 2 Tools
    {
        name: 'cancelBooking',
        description: 'Cancel an existing booking/appointment',
        parameters: {
            appointmentId: 'ID of the appointment to cancel',
            reason: 'Optional reason for cancellation',
            userPhone: 'User phone number'
        }
    },
    {
        name: 'rescheduleBooking',
        description: 'Reschedule an existing booking to a new date/time',
        parameters: {
            appointmentId: 'ID of the appointment to reschedule',
            newDate: 'New date in YYYY-MM-DD format',
            newTimeSlot: 'New time slot (e.g., "afternoon", "2pm")',
            userPhone: 'User phone number'
        }
    },
    {
        name: 'rateCaregiver',
        description: 'Rate a caregiver after service (1-5 stars)',
        parameters: {
            appointmentId: 'ID of the completed appointment',
            caregiverId: 'ID of the caregiver being rated',
            rating: 'Rating from 1-5',
            feedback: 'Optional written feedback',
            userPhone: 'User phone number'
        }
    },
    {
        name: 'getCaregiverProfile',
        description: 'Get detailed profile of a specific caregiver including reviews',
        parameters: {
            caregiverId: 'ID of the caregiver'
        }
    },
    {
        name: 'requestBackupCaregiver',
        description: 'Request a backup caregiver when regular caregiver calls out',
        parameters: {
            appointmentId: 'ID of the affected appointment',
            reason: 'Reason backup is needed',
            userPhone: 'User phone number'
        }
    },
    {
        name: 'getCareTips',
        description: 'Get care tips and advice for specific conditions or situations',
        parameters: {
            topic: 'Topic (e.g., "dementia", "falls", "nutrition", "medication")',
            condition: 'Optional specific condition'
        }
    }
];
/**
 * Call Gemini API via REST
 */
async function callGeminiAPI(prompt) {
    var _a, _b, _c, _d, _e, _f;
    // Get API key from Firebase config or environment variable
    const apiKey = ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key) || process.env.GEMINI_API_KEY || '';
    console.log('🔑 API Key check:', apiKey ? `Key present (length: ${apiKey.length})` : 'NO KEY FOUND');
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not set in config or environment');
        return JSON.stringify({
            thought: 'No API key available',
            tool: null,
            toolArgs: {},
            message: "I'm having trouble connecting right now. Please try again in a moment.",
            contextUpdate: null
        });
    }
    try {
        console.log('📤 Sending request to Gemini API...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                        parts: [{ text: prompt }]
                    }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800
                }
            })
        });
        console.log('📥 Gemini API response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const text = ((_f = (_e = (_d = (_c = (_b = data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) || '';
        console.log('✅ Gemini API success, response length:', text.length);
        return text;
    }
    catch (error) {
        console.error('❌ Gemini API error:', error.message || error);
        return JSON.stringify({
            thought: 'API call failed: ' + (error.message || 'Unknown error'),
            tool: null,
            toolArgs: {},
            message: "I'm having a little trouble thinking right now. Let me try again - what were you looking for?",
            contextUpdate: null
        });
    }
}
/**
 * Process user message with LLM-powered intent recognition and tool selection
 */
async function processWithLLM(message, userData, conversationHistory) {
    console.log('🤖 Processing with LLM:', message);
    // Build system prompt
    const systemPrompt = `You are Cara, a compassionate care coordinator for CareConnex, a senior care matching service.

Your personality:
- Warm, professional, and patient
- You care deeply about finding the right match for families
- You ask clarifying questions when needed
- You celebrate small wins and show empathy

Current user context:
${JSON.stringify(userData.context || {}, null, 2)}

Available tools:
${JSON.stringify(exports.TOOL_DEFINITIONS, null, 2)}

Instructions:
1. Understand what the user wants
2. If you have enough information, call the appropriate tool
3. If you need more info, ask a specific question
4. Always be helpful and guide them to the next step

Respond in this JSON format:
{
  "thought": "Your thinking process",
  "tool": "toolName or null if no tool needed",
  "toolArgs": { /* arguments for the tool */ },
  "message": "What to say to the user (warm, natural language)",
  "contextUpdate": { /* optional: key-value pairs to remember */ }
}`;
    // Build conversation history for context
    const history = conversationHistory.slice(-5).map(h => `${h.role === 'user' ? 'User' : 'Cara'}: ${h.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${history}\n\nUser message: "${message}"\n\nRespond with JSON only.`;
    try {
        const text = await callGeminiAPI(fullPrompt);
        console.log('📝 LLM response:', text);
        // Parse JSON response
        let action;
        try {
            // Extract JSON if wrapped in markdown
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
            const jsonStr = jsonMatch ? jsonMatch[1] : text;
            action = JSON.parse(jsonStr);
        }
        catch (e) {
            console.error('Failed to parse LLM response:', e);
            // Fallback to simple response
            return {
                message: text || "I'm not sure how to respond to that. Could you rephrase?",
                tool: null,
                contextUpdate: null
            };
        }
        return {
            message: action.message,
            tool: action.tool,
            contextUpdate: action.contextUpdate
        };
    }
    catch (error) {
        console.error('❌ LLM processing error:', error);
        return {
            message: "I'm having a little trouble thinking right now. Let me try again - what were you looking for?",
            tool: null
        };
    }
}
/**
 * Simple intent classification (fallback if LLM fails)
 */
function classifyIntent(message) {
    const text = message.toLowerCase();
    // Caregiver search intent
    if (text.includes('find') || text.includes('search') || text.includes('looking for') ||
        text.includes('need a caregiver') || text.includes('caregiver') || text.includes('help with')) {
        return 'search_caregivers';
    }
    // Interview scheduling
    if (text.includes('interview') || text.includes('meet') || text.includes('talk to') ||
        text.includes('video call') || text.match(/^[123]$/)) {
        return 'schedule_interview';
    }
    // Booking
    if (text.includes('book') || text.includes('hire') || text.includes('schedule') ||
        text.includes('appointment')) {
        return 'create_booking';
    }
    // Check bookings
    if (text.includes('my booking') || text.includes('my appointment') ||
        text.includes('when is') || text.includes('upcoming')) {
        return 'check_bookings';
    }
    // Information gathering
    if (text.includes('my mom') || text.includes('my dad') || text.includes('my mother') ||
        text.includes('my father') || text.includes('need care for')) {
        return 'gather_info';
    }
    // Human handoff
    if (text.includes('speak to someone') || text.includes('human') ||
        text.includes('representative') || text.includes('support')) {
        return 'human_handoff';
    }
    return 'general';
}
/**
 * Extract information from user message
 */
function extractInfo(message) {
    const info = {};
    const text = message.toLowerCase();
    // Extract zip code
    const zipMatch = message.match(/(\d{5}(-\d{4})?)/);
    if (zipMatch)
        info.zipCode = zipMatch[1];
    // Extract care needs
    const needKeywords = {
        dementia: ['dementia', 'alzheimer', 'memory'],
        mobility: ['mobility', 'wheelchair', 'walking', 'fall'],
        personal_care: ['bathing', 'dressing', 'hygiene', 'toilet'],
        companionship: ['companionship', 'lonely', 'company', 'conversation'],
        medication: ['medication', 'medicine', 'pills', 'rx'],
        meals: ['meal', 'cooking', 'food', 'eat'],
        transportation: ['drive', 'transport', 'appointment', 'errands']
    };
    info.needs = [];
    for (const [need, keywords] of Object.entries(needKeywords)) {
        if (keywords.some(k => text.includes(k))) {
            info.needs.push(need);
        }
    }
    // Extract schedule preferences
    const days = [];
    const dayKeywords = {
        monday: 'mon',
        tuesday: 'tue',
        wednesday: 'wed',
        thursday: 'thu',
        friday: 'fri',
        saturday: 'sat',
        sunday: 'sun'
    };
    for (const [day, keyword] of Object.entries(dayKeywords)) {
        if (text.includes(day) || text.includes(keyword)) {
            days.push(day);
        }
    }
    if (days.length > 0)
        info.scheduleDays = days;
    // Extract budget
    const priceMatch = text.match(/\$(\d+)/);
    if (priceMatch)
        info.maxPrice = parseInt(priceMatch[1]);
    // Extract relationship
    if (text.includes('mom') || text.includes('mother')) {
        info.careRecipient = { relationship: 'mother' };
    }
    else if (text.includes('dad') || text.includes('father')) {
        info.careRecipient = { relationship: 'father' };
    }
    else if (text.includes('grandma') || text.includes('grandmother')) {
        info.careRecipient = { relationship: 'grandmother' };
    }
    else if (text.includes('grandpa') || text.includes('grandfather')) {
        info.careRecipient = { relationship: 'grandfather' };
    }
    return info;
}
//# sourceMappingURL=caraAgentLLM.js.map