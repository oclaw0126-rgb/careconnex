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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredRateLimits = exports.sendTestSMS = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Initialize Admin globally if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
// Export Stripe Functions
__exportStar(require("./stripe"), exports);
// Export Notification Functions
__exportStar(require("./notifications"), exports);
// Export Email Functions
__exportStar(require("./email"), exports);
// Export Push Notification Functions
__exportStar(require("./pushNotifications"), exports);
// Export Caregiver Callout / Backup Matching Functions
__exportStar(require("./caregiverCallout"), exports);
// Export SMS Functions
var sms_1 = require("./sms");
Object.defineProperty(exports, "sendTestSMS", { enumerable: true, get: function () { return sms_1.sendTestSMS; } });
// Export Instant Payout Function
__exportStar(require("./instantPayout"), exports);
// Export Twilio Video Functions
__exportStar(require("./twilio"), exports);
// Export Telegram Bot Functions
__exportStar(require("./telegramBot"), exports);
// Export Cara Agent Connection Functions
// export * from './caraConnection';
// Export WhatsApp Functions (Legacy - Phase 0)
// export * from './whatsapp';
// Export Phase 1: LLM-Powered Cara Agent
// export * from './caraAgentLLM';
// export * from './caraTools';
// export * from './whatsappV2';
// Export Phase 2: Proactive Cron Jobs
__exportStar(require("./caraCron"), exports);
// Export Phase 3: Advanced Intelligence
__exportStar(require("./caraMemory"), exports);
__exportStar(require("./caraCalendar"), exports);
__exportStar(require("./caraMatching"), exports);
__exportStar(require("./caraFamily"), exports);
// Export Phase 4: OpenClaw-Inspired Agent Core
__exportStar(require("./caraAgentCore"), exports);
__exportStar(require("./caraWhatsApp"), exports);
// Export test data population
__exportStar(require("./populateTestData"), exports);
// Export Rate Limit cleanup (scheduled)
const rateLimit_1 = require("./rateLimit");
/**
 * Scheduled cleanup of expired rate limit entries
 * Runs daily at 3 AM
 */
exports.cleanupExpiredRateLimits = functions.pubsub
    .schedule('0 3 * * *') // Daily at 3 AM
    .timeZone('America/Los_Angeles')
    .onRun(async () => {
    const deleted = await (0, rateLimit_1.cleanupRateLimits)();
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Rate limit cleanup complete. Deleted ${deleted} entries.`);
    }
    return null;
});
//# sourceMappingURL=index.js.map