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
exports.sendSMSWelcome = exports.sendWhatsAppWelcome = void 0;
const functions = __importStar(require("firebase-functions"));
// CORS headers for web app access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
/**
 * Send WhatsApp Welcome Message
 * Called after user signs up and chooses to connect with Cara
 */
exports.sendWhatsAppWelcome = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.set(corsHeaders);
        res.status(204).send('');
        return;
    }
    // Set CORS headers for actual request
    res.set(corsHeaders);
    try {
        const { name, phone } = req.body;
        if (!phone) {
            res.status(400).json({ success: false, error: 'Phone number required' });
            return;
        }
        // Get Twilio credentials
        const twilioSid = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.sid;
        const twilioToken = (_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.token;
        const twilioNumber = (_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.whatsapp_number;
        if (!twilioSid || !twilioToken) {
            console.log('Twilio not configured, skipping welcome message');
            res.json({ success: true, message: 'Twilio not configured, but signup successful' });
            return;
        }
        const twilio = require('twilio')(twilioSid, twilioToken);
        const welcomeMessage = `👋 Hi ${(name === null || name === void 0 ? void 0 : name.split(' ')[0]) || 'there'}! I'm Cara, your CareConnex care coordinator.\n\nI can help you:\n• Find caregivers\n• Book appointments  \n• Schedule interviews\n• Check your schedule\n• Update care plans\n• Find backup caregivers\n\nJust text me anytime! What care do you need?`;
        // Send WhatsApp message
        const message = await twilio.messages.create({
            body: welcomeMessage,
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phone}`
        });
        console.log('✅ WhatsApp welcome sent:', message.sid);
        res.json({
            success: true,
            messageSid: message.sid,
            message: 'Welcome message sent successfully'
        });
    }
    catch (error) {
        console.error('❌ Failed to send WhatsApp welcome:', error);
        // Don't fail the signup if message fails
        res.json({
            success: true,
            warning: 'Account created but welcome message failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Send SMS Welcome Message (fallback)
 */
exports.sendSMSWelcome = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    // Handle CORS
    if (req.method === 'OPTIONS') {
        res.set(corsHeaders);
        res.status(204).send('');
        return;
    }
    res.set(corsHeaders);
    try {
        const { name, phone } = req.body;
        if (!phone) {
            res.status(400).json({ success: false, error: 'Phone number required' });
            return;
        }
        const twilioSid = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.sid;
        const twilioToken = (_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.token;
        const twilioNumber = (_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.phone_number;
        if (!twilioSid || !twilioToken) {
            res.json({ success: true, message: 'Twilio not configured' });
            return;
        }
        const twilio = require('twilio')(twilioSid, twilioToken);
        const welcomeMessage = `CareConnex: Hi ${(name === null || name === void 0 ? void 0 : name.split(' ')[0]) || 'there'}! I'm Cara, your care coordinator. Text me anytime to find caregivers, book appointments, or get help. Reply HELP for options.`;
        const message = await twilio.messages.create({
            body: welcomeMessage,
            from: twilioNumber,
            to: phone
        });
        res.json({ success: true, messageSid: message.sid });
    }
    catch (error) {
        console.error('SMS welcome failed:', error);
        res.json({ success: true, warning: 'SMS failed but signup successful' });
    }
});
//# sourceMappingURL=caraWelcome.js.map