const functions = require('firebase-functions');
const { GoogleGenAI } = require('@google/genai');
const { tools } = require('./caraTools');

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Tool definitions for LLM
 */
const TOOL_DEFINITIONS = [
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
  }
];

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
${JSON.stringify(TOOL_DEFINITIONS, null, 2)}

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
  const history = conversationHistory.slice(-5).map(h => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history,
        { role: 'user', parts: [{ text: `User message: "${message}"\n\nRespond with JSON only.` }] }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    const text = response.text;
    console.log('📝 LLM response:', text);

    // Parse JSON response
    let action;
    try {
      // Extract JSON if wrapped in markdown
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      action = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
      // Fallback to simple response
      return {
        message: text,
        tool: null,
        contextUpdate: null
      };
    }

    // Execute tool if specified
    if (action.tool && tools[action.tool]) {
      console.log('🔧 Executing tool:', action.tool, action.toolArgs);

      // Add user context to tool args
      const toolArgs = {
        ...action.toolArgs,
        userId: userData.userId,
        userPhone: userData.phoneNumber
      };

      const result = await tools[action.tool](toolArgs);
      console.log('✅ Tool result:', result);

      // Enhance message with tool result if needed
      if (result.found === false) {
        action.message = result.message || `I couldn't find any caregivers matching those criteria. Let me broaden the search or would you like to adjust your requirements?`;
      } else if (result.caregivers) {
        // Format caregiver results
        const caregiverList = result.caregivers.map((c, i) =>
          `${i + 1}️⃣ **${c.name}** - $${c.hourlyRate}/hr, ⭐ ${c.rating}\n   ${c.specialties.slice(0, 2).join(', ')}\n   "${c.bio}"`
        ).join('\n\n');

        action.message = `${action.message}\n\n${caregiverList}\n\nWhich caregiver would you like to interview? Reply with their number (1, 2, or 3) or ask for more details.`;
      }

      return {
        message: action.message,
        tool: action.tool,
        toolResult: result,
        contextUpdate: action.contextUpdate
      };
    }

    return {
      message: action.message,
      tool: null,
      contextUpdate: action.contextUpdate
    };

  } catch (error) {
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
  if (zipMatch) info.zipCode = zipMatch[1];

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
  if (days.length > 0) info.scheduleDays = days;

  // Extract budget
  const priceMatch = text.match(/\$(\d+)/);
  if (priceMatch) info.maxPrice = parseInt(priceMatch[1]);

  // Extract relationship
  if (text.includes('mom') || text.includes('mother')) {
    info.careRecipient = { relationship: 'mother' };
  } else if (text.includes('dad') || text.includes('father')) {
    info.careRecipient = { relationship: 'father' };
  } else if (text.includes('grandma') || text.includes('grandmother')) {
    info.careRecipient = { relationship: 'grandmother' };
  } else if (text.includes('grandpa') || text.includes('grandfather')) {
    info.careRecipient = { relationship: 'grandfather' };
  }

  return info;
}

module.exports = {
  processWithLLM,
  classifyIntent,
  extractInfo,
  TOOL_DEFINITIONS
};
