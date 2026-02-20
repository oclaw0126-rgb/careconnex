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
exports.getCaraStats = exports.whatsappHealth = exports.sendWhatsAppWelcome = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const caraAgentLLM_1 = require("./caraAgentLLM");
const caraTools_1 = require("./caraTools");
const db = admin.firestore();
/**
 * WhatsApp Webhook Handler via Twilio
 * Receives WhatsApp messages and routes to Cara Agent
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    try {
        // Twilio sends form data for WhatsApp
        const { From, // WhatsApp number: whatsapp:+1234567890
        Body, // Message text
        // To,          // Your Twilio WhatsApp number - unused
        ProfileName, // User's WhatsApp name
        // MessageSid   // Unique message ID - unused
         } = req.body;
        console.log('📱 WhatsApp message received:', {
            from: From,
            body: Body,
            profileName: ProfileName
        });
        // Extract phone number (remove "whatsapp:" prefix)
        const phoneNumber = From.replace('whatsapp:', '');
        // Get or create user session
        const userRef = db.collection('cara_users').doc(phoneNumber);
        const userDoc = await userRef.get();
        let userData;
        let isNewUser = false;
        if (!userDoc.exists) {
            // New user - create profile
            isNewUser = true;
            userData = {
                phoneNumber,
                whatsappName: ProfileName || undefined,
                context: {},
            };
            await userRef.set(Object.assign(Object.assign({}, userData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), conversationState: 'welcome', messageCount: 0 }));
        }
        else {
            const data = userDoc.data();
            userData = {
                phoneNumber,
                userId: data.userId,
                whatsappName: data.whatsappName,
                context: data.context || {},
            };
        }
        // Get recent conversation history
        const historySnapshot = await db.collection('cara_conversations')
            .doc(phoneNumber)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        const conversationHistory = historySnapshot.docs
            .reverse()
            .map(doc => ({
            role: doc.data().role,
            content: doc.data().content
        }));
        let response;
        // Process based on conversation state
        if (isNewUser) {
            response = await handleNewUser(ProfileName);
        }
        else {
            // Try LLM-powered agent processing first
            try {
                response = await (0, caraAgentLLM_1.processWithLLM)(Body, userData, conversationHistory);
                // Check if LLM returned error message
                if (response.message.includes("having trouble") || response.message.includes("having a little trouble")) {
                    throw new Error('LLM returned error message');
                }
            }
            catch (error) {
                console.log('⚠️ LLM failed, using fallback handler');
                response = await handleFallbackResponse(Body, userData);
            }
        }
        // Store the conversation
        await db.collection('cara_conversations')
            .doc(phoneNumber)
            .collection('messages')
            .add({
            role: 'user',
            content: Body,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('cara_conversations')
            .doc(phoneNumber)
            .collection('messages')
            .add({
            role: 'model',
            content: response.message,
            tool: response.tool || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update user context if provided
        if (response.contextUpdate && response.contextUpdate.key) {
            await userRef.update({
                [`context.${response.contextUpdate.key}`]: response.contextUpdate.value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Update message count
        await userRef.update({
            messageCount: admin.firestore.FieldValue.increment(1),
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessage: Body
        });
        // Send WhatsApp response via Twilio
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response.message)}</Message>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
        console.log('✅ WhatsApp response sent');
    }
    catch (error) {
        console.error('❌ WhatsApp webhook error:', error);
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble right now. Please try again in a moment, or type "help" for assistance.</Message>
</Response>`);
    }
});
/**
 * Handle new user welcome
 */
async function handleNewUser(profileName) {
    const firstName = profileName ? profileName.split(' ')[0] : 'there';
    return {
        message: `👋 Hi ${firstName}! I'm Cara, your CareConnex care coordinator.

I help families find the perfect caregivers for their loved ones. I can:

• Find qualified caregivers in your area
• Schedule video interviews
• Handle booking and scheduling
• Answer questions about care options

To get started, tell me:
1. Who needs care? (mom, dad, grandparent, etc.)
2. What's your zip code?
3. What type of care do they need?

Or just tell me about your situation and I'll help!`,
        tool: null
    };
}
/**
 * Send welcome message to new WhatsApp user
 * Called from signup flow
 */
exports.sendWhatsAppWelcome = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const { phoneNumber, name, zipCode, needs, schedule, userId } = data;
    // Get Twilio credentials from Firebase config
    const twilioAccountSid = ((_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.sid) || process.env.TWILIO_SID;
    const twilioAuthToken = ((_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.token) || process.env.TWILIO_TOKEN;
    const twilioWhatsAppNumber = ((_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.whatsapp_number) || process.env.TWILIO_WHATSAPP_NUMBER;
    if (!twilioAccountSid || !twilioAuthToken) {
        console.error('Twilio credentials not configured');
        return { success: false, error: 'Twilio not configured' };
    }
    try {
        const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
        // Store user in Cara system
        await db.collection('cara_users').doc(phoneNumber).set({
            phoneNumber,
            name,
            userId: userId || null,
            zipCode,
            needs: needs || [],
            schedule: schedule || [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            conversationState: 'post_signup',
            context: {
                zipCode,
                needs,
                schedule
            }
        }, { merge: true });
        const welcomeMessage = `👋 Hi ${name.split(' ')[0]}! I'm Cara, your CareConnex care coordinator.

I see you need care in ${zipCode} for:
${(needs === null || needs === void 0 ? void 0 : needs.slice(0, 3).join(', ')) || 'senior care'}
Schedule: ${(schedule === null || schedule === void 0 ? void 0 : schedule.join(', ')) || 'flexible'}

I'll find the perfect caregivers for you! Let me search...`;
        const message = await twilio.messages.create({
            body: welcomeMessage,
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${phoneNumber}`
        });
        // Store the welcome message
        await db.collection('cara_conversations')
            .doc(phoneNumber)
            .collection('messages')
            .add({
            role: 'model',
            content: welcomeMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Trigger initial caregiver search
        setTimeout(async () => {
            try {
                const searchResult = await caraTools_1.tools.searchCaregivers({
                    zipCode,
                    needs: needs || [],
                    maxPrice: 50
                });
                if (searchResult.found && searchResult.caregivers && searchResult.caregivers.length > 0) {
                    const caregiverList = searchResult.caregivers.map((c, i) => { var _a; return `${i + 1}️⃣ *${c.name}* - $${c.hourlyRate}/hr, ⭐ ${c.rating}\n   ${(_a = c.specialties) === null || _a === void 0 ? void 0 : _a.slice(0, 2).join(', ')}`; }).join('\n\n');
                    const followUpMessage = `Great news! I found ${searchResult.count} excellent caregivers in your area:\n\n${caregiverList}\n\nWhich would you like to interview? Reply with 1, 2, or 3, or tell me more about what you're looking for!`;
                    await twilio.messages.create({
                        body: followUpMessage,
                        from: `whatsapp:${twilioWhatsAppNumber}`,
                        to: `whatsapp:${phoneNumber}`
                    });
                    await db.collection('cara_conversations')
                        .doc(phoneNumber)
                        .collection('messages')
                        .add({
                        role: 'model',
                        content: followUpMessage,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            catch (err) {
                console.error('Follow-up search error:', err);
            }
        }, 2000);
        console.log('✅ WhatsApp welcome sent:', message.sid);
        return {
            success: true,
            messageId: message.sid
        };
    }
    catch (error) {
        console.error('❌ WhatsApp welcome failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
/**
 * Health check endpoint
 */
exports.whatsappHealth = functions.https.onRequest((req, res) => {
    res.json({
        status: 'healthy',
        service: 'WhatsApp via Twilio',
        version: '2.0.0',
        features: ['LLM-powered agent', 'Real caregiver search', 'Interview scheduling'],
        timestamp: new Date().toISOString()
    });
});
/**
 * Get Cara user stats (for admin)
 */
exports.getCaraStats = functions.https.onCall(async (data, context) => {
    try {
        const usersSnapshot = await db.collection('cara_users').get();
        const totalUsers = usersSnapshot.size;
        const activeToday = await db.collection('cara_users')
            .where('lastMessageAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .get();
        const interviewsSnapshot = await db.collection('interviews').get();
        return {
            totalUsers,
            activeToday: activeToday.size,
            totalInterviews: interviewsSnapshot.size
        };
    }
    catch (error) {
        console.error('Stats error:', error);
        return { error: error.message };
    }
});
/**
 * Fallback response handler - works without LLM API
 */
async function handleFallbackResponse(message, userData) {
    var _a;
    const text = message.toLowerCase();
    console.log('🔧 Fallback processing:', text);
    // Extract zip code
    const zipMatch = message.match(/(\d{5})/);
    const zipCode = zipMatch ? zipMatch[1] : (_a = userData.context) === null || _a === void 0 ? void 0 : _a.zipCode;
    // Check for caregiver search intent
    if (text.includes('find') || text.includes('search') || text.includes('looking for') ||
        text.includes('caregiver') || text.includes('need help')) {
        if (zipCode) {
            // Search for caregivers
            try {
                const result = await caraTools_1.tools.searchCaregivers({
                    zipCode,
                    needs: extractNeeds(text),
                    maxPrice: 50
                });
                if (result.found && result.caregivers && result.caregivers.length > 0) {
                    const caregiverList = result.caregivers.map((c, i) => { var _a; return `${i + 1}️⃣ *${c.name}* - $${c.hourlyRate}/hr, ⭐ ${c.rating}\n   ${(_a = c.specialties) === null || _a === void 0 ? void 0 : _a.slice(0, 2).join(', ')}`; }).join('\n\n');
                    return {
                        message: `I found ${result.count} excellent caregivers in ${zipCode}:\n\n${caregiverList}\n\nWhich would you like to interview? Reply with 1, 2, or 3.`,
                        tool: 'searchCaregivers'
                    };
                }
                else {
                    return {
                        message: `I don't have any caregivers in ${zipCode} yet. Let me notify our team and we'll find matches for you within 24 hours.\n\nIn the meantime, what's the main type of care you need? (e.g., dementia, companionship, mobility assistance)`,
                        tool: null
                    };
                }
            }
            catch (error) {
                console.error('Fallback search error:', error);
            }
        }
        return {
            message: `I'd be happy to help you find a caregiver! What's your zip code?`,
            tool: null
        };
    }
    // Check for interview/booking intent
    if (text.match(/^[123]$/) || text.includes('interview') || text.includes('book')) {
        return {
            message: `Great choice! I'll help you schedule an interview. What time works best for you?\n\n• Tomorrow 2pm\n• Thursday 10am\n• Friday 3pm`,
            tool: null
        };
    }
    // Check for scheduling
    if (text.includes('tomorrow') || text.includes('thursday') || text.includes('friday') ||
        text.includes('monday') || text.includes('schedule')) {
        return {
            message: `✅ Perfect! I've noted that time. You'll receive a confirmation with the video call link 15 minutes before the interview.\n\nIs there anything specific you'd like to discuss with the caregiver?`,
            tool: null
        };
    }
    // Extract care needs info
    if (text.includes('mom') || text.includes('mother') || text.includes('dad') || text.includes('father')) {
        const relationship = text.includes('mom') || text.includes('mother') ? 'mother' :
            text.includes('dad') || text.includes('father') ? 'father' : 'loved one';
        // Store in context
        await db.collection('cara_users').doc(userData.phoneNumber).update({
            'context.careRecipient': relationship,
            'context.lastTopic': 'care_needs'
        });
        return {
            message: `Got it. What type of care does your ${relationship} need?\n\n• Companionship & supervision\n• Personal care (bathing, dressing)\n• Medication reminders\n• Meal preparation\n• Mobility assistance\n• Dementia/Alzheimer's care`,
            tool: 'updateUserContext'
        };
    }
    // Help request
    if (text.includes('help') || text === 'hi' || text === 'hello') {
        return {
            message: `👋 Hi! I'm Cara, your CareConnex care coordinator. I can help you:\n\n• Find qualified caregivers in your area\n• Schedule video interviews\n• Book care appointments\n• Answer questions about care options\n
What would you like to do?`,
            tool: null
        };
    }
    // Default response
    return {
        message: `Thanks for that! To help you better, could you tell me:\n\n• Who needs care? (mom, dad, etc.)\n• Your zip code?\n• What type of care is needed?\n• Preferred schedule?`,
        tool: null
    };
}
/**
 * Extract care needs from message
 */
function extractNeeds(text) {
    const needs = [];
    const keywords = {
        dementia: ['dementia', 'alzheimer', 'memory'],
        mobility: ['mobility', 'walking', 'wheelchair', 'fall'],
        personal_care: ['bathing', 'dressing', 'hygiene', 'toilet'],
        companionship: ['companionship', 'lonely', 'company'],
        meals: ['meal', 'cooking', 'food', 'eat'],
        medication: ['medication', 'medicine', 'pills'],
        transportation: ['drive', 'transport', 'shopping', 'errands']
    };
    for (const [need, keywords_list] of Object.entries(keywords)) {
        if (keywords_list.some(k => text.includes(k))) {
            needs.push(need);
        }
    }
    return needs;
}
/**
 * Escape XML for Twilio
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=whatsappV2.js.map