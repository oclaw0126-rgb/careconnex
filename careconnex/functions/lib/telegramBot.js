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
exports.keepAlive = exports.telegramWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const telegraf_1 = require("telegraf");
// Initialize bot with your token
const bot = new telegraf_1.Telegraf('8243348623:AAEcGNcEl8R_HvWr-wWEVGPNszwCy00QpBM');
// Simple response for now - we'll connect to CareConnex agent later
bot.start((ctx) => {
    ctx.reply('👋 Hi! I\'m Cara, your CareConnex care coordinator.\n\nI can help you find the perfect caregiver for your loved one.\n\nWhat type of care do you need?\n• Companionship\n• Personal care (bathing, dressing)\n• Dementia/Alzheimer\'s care\n• Medication management\n• Post-surgery care\n\nJust tell me what you need!');
});
bot.help((ctx) => {
    ctx.reply('I can help you:\n\n1. Find caregivers\n2. Schedule interviews\n3. Book care\n4. Answer questions\n\nJust text me naturally!');
});
// Echo for now - replace with agent logic
bot.on('text', (ctx) => {
    const message = ctx.message.text.toLowerCase();
    if (message.includes('hi') || message.includes('hello')) {
        ctx.reply('Hi there! 👋 I\'m Cara. Tell me about the care you need and I\'ll find the perfect caregiver for you.');
    }
    else if (message.includes('care') || message.includes('help')) {
        ctx.reply('I\'d love to help! Can you tell me:\n\n1. Who needs care? (mom, dad, etc.)\n2. What type of care? (dementia, companionship, etc.)\n3. How many days per week?');
    }
    else if (message.includes('mom') || message.includes('mother')) {
        ctx.reply('Got it - care for your mom. What type of care does she need?\n\n• Companionship & supervision\n• Personal care (bathing, dressing)\n• Dementia/Alzheimer\'s care\n• Medication reminders');
    }
    else if (message.includes('dementia') || message.includes('alzheimer')) {
        ctx.reply('I understand - dementia care requires special expertise. I\'ll find caregivers certified in dementia care.\n\nWhat days do you need care? (e.g., Mon, Wed, Fri)');
    }
    else {
        ctx.reply('Thanks for that info! I\'m learning about your needs.\n\nTo give you the best matches, could you also tell me:\n\n• Your zip code/location?\n• Preferred schedule?\n• Budget range?');
    }
});
// Webhook handler
exports.telegramWebhook = functions.https.onRequest((req, res) => {
    console.log('Received Telegram update:', req.body);
    bot.handleUpdate(req.body, res);
});
// Keep bot alive (warmup function)
exports.keepAlive = functions.https.onRequest((req, res) => {
    res.json({ status: 'ok', bot: 'online' });
});
//# sourceMappingURL=telegramBot.js.map