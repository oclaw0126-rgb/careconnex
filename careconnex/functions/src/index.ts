import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Initialize Admin globally if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}

// Export Stripe Functions
export * from './stripe';

// Export Notification Functions
export * from './notifications';

// Export Email Functions
export * from './email';

// Export Push Notification Functions
export * from './pushNotifications';

// Export Caregiver Callout / Backup Matching Functions
export * from './caregiverCallout';

// Export SMS Functions
export { sendTestSMS } from './sms';

// Export Instant Payout Function
export * from './instantPayout';

// Export Twilio Video Functions
export * from './twilio';

// Export Telegram Bot Functions
export * from './telegramBot';

// Export Cara Agent Connection Functions (Railway)
export * from './caraRailway';

// Export WhatsApp Functions (Legacy - Phase 0)
// export * from './whatsapp';

// Export Phase 1: LLM-Powered Cara Agent
// export * from './caraAgentLLM';
// export * from './caraTools';
// export * from './whatsappV2';

// Export Phase 2: Proactive Cron Jobs
export * from './caraCron';

// Export Phase 3: Advanced Intelligence
export * from './caraMemory';
export * from './caraCalendar';
export * from './caraMatching';
export * from './caraFamily';

// Export Phase 4: OpenClaw-Inspired Agent Core
export * from './caraAgentCore';
export * from './caraWhatsApp';

// Export test data population
export * from './populateTestData';

// Export Rate Limit cleanup (scheduled)
import { cleanupRateLimits } from './rateLimit';

/**
 * Scheduled cleanup of expired rate limit entries
 * Runs daily at 3 AM
 */
export const cleanupExpiredRateLimits = functions.pubsub
    .schedule('0 3 * * *')  // Daily at 3 AM
    .timeZone('America/Los_Angeles')
    .onRun(async () => {
        const deleted = await cleanupRateLimits();
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Rate limit cleanup complete. Deleted ${deleted} entries.`);
        }
        return null;
    });
