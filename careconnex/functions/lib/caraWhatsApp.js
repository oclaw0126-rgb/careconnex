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
exports.getCaraStats = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const caraAgentV2_1 = require("./caraAgentV2");
const db = admin.firestore();
// SECURITY: Input sanitization helper to prevent XSS and injection attacks
function sanitizeInput(input) {
    if (!input)
        return '';
    return input
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML/JS injection
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers (onclick, onerror, etc.)
        .substring(0, 4000); // Limit length to prevent DoS
}
function sanitizePhoneNumber(phone) {
    // Only allow digits, +, and -
    return phone.replace(/[^\d+\-]/g, '').substring(0, 20);
}
function sanitizeProfileName(name) {
    if (!name)
        return null;
    // Remove control characters and limit length
    return name
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/[<>]/g, '') // Remove HTML tags
        .trim()
        .substring(0, 100) || null; // Limit to 100 chars
}
/**
 * ============================================================
 * CARA WHATSAPP WEBHOOK v4.0 - OpenClaw Architecture
 * ============================================================
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    const startTime = Date.now();
    try {
        // Parse and sanitize Twilio request inputs
        const rawFrom = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.From) || '';
        const rawBody = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.Body) || '';
        const rawProfileName = (_c = req.body) === null || _c === void 0 ? void 0 : _c.ProfileName;
        // SECURITY: Sanitize all user inputs to prevent XSS and injection
        const From = sanitizePhoneNumber(rawFrom);
        const Body = sanitizeInput(rawBody);
        const ProfileName = sanitizeProfileName(rawProfileName);
        // Log sanitized inputs (never log raw body for privacy)
        functions.logger.info('WhatsApp message received', {
            from: From.substring(0, 10) + '...', // Partial phone for privacy
            name: ProfileName,
            bodyLength: Body.length
        });
        // Extract phone
        const phoneNumber = From.replace('whatsapp:', '');
        // Get or create user
        const userRef = db.collection('cara_users').doc(phoneNumber);
        const userDoc = await userRef.get();
        let userData = userDoc.data();
        const isNewUser = !userDoc.exists;
        if (isNewUser) {
            functions.logger.info('Creating new user', { phoneNumber: phoneNumber.substring(0, 6) + '...' });
            await userRef.set({
                phoneNumber,
                whatsappName: ProfileName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                messageCount: 0,
                sanitizedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            userData = { phoneNumber, whatsappName: ProfileName };
        }
        // Load memory and conversation history
        const [memory, conversationHistory] = await Promise.all([
            (0, caraAgentV2_1.loadUserMemory)(userDoc.id || phoneNumber, phoneNumber),
            (0, caraAgentV2_1.loadConversationHistory)(phoneNumber)
        ]);
        console.log('💾 Memory loaded:', Object.keys(memory));
        console.log('📜 History loaded:', conversationHistory.length, 'messages');
        // Run the Cara Agent
        const agentResult = await (0, caraAgentV2_1.runCaraAgent)(Body, {
            userId: userDoc.id || phoneNumber,
            userPhone: phoneNumber,
            userName: ProfileName || (userData === null || userData === void 0 ? void 0 : userData.whatsappName),
            conversationHistory,
            memory
        });
        console.log('📝 Agent response:', agentResult.response.substring(0, 100));
        console.log('🔧 Tool calls:', agentResult.toolCalls.length);
        // Store conversation
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
            role: 'assistant',
            content: agentResult.response,
            tool_calls: agentResult.toolCalls.map(t => t.tool),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update user stats
        await userRef.update({
            messageCount: admin.firestore.FieldValue.increment(1),
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessage: Body
        });
        // Send WhatsApp response
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentResult.response)}</Message>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
        const duration = Date.now() - startTime;
        console.log(`✅ Response sent in ${duration}ms`);
        console.log('📱 ========================================');
    }
    catch (error) {
        console.error('❌ Webhook error:', error);
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I apologize, I'm having a moment. Please try again!</Message>
</Response>`);
    }
});
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
/**
 * Get Cara stats
 */
exports.getCaraStats = functions.https.onCall(async (data, context) => {
    const [users, activeToday, interviews] = await Promise.all([
        db.collection('cara_users').get(),
        db.collection('cara_users')
            .where('lastMessageAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .get(),
        db.collection('interviews').get()
    ]);
    return {
        totalUsers: users.size,
        activeToday: activeToday.size,
        totalInterviews: interviews.size
    };
});
//# sourceMappingURL=caraWhatsApp.js.map