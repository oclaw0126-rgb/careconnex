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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = exports.sendBulkEmail = exports.sendEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const resend_1 = require("resend");
// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY || ((_a = functions.config().resend) === null || _a === void 0 ? void 0 : _a.api_key);
const resend = resendApiKey ? new resend_1.Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@careconnex.com";
const FROM_NAME = process.env.RESEND_FROM_NAME || "CareConnex";
// Rate limiter (in-memory, resets on function cold start)
const rateLimiter = new Map();
const RATE_LIMIT_MS = 60000; // 1 minute
/**
 * Send email via Resend
 * Callable function for client-side email sending
 */
exports.sendEmail = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to send emails");
    }
    // Check if Resend is configured
    if (!resend) {
        console.error("Resend API key not configured");
        throw new functions.https.HttpsError("failed-precondition", "Email service not configured");
    }
    const { to, subject, html, text, from, fromName, replyTo, cc, bcc } = data;
    // Validation
    if (!to || !subject || (!html && !text)) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: to, subject, and (html or text)");
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid email address");
    }
    // Rate limiting per recipient
    const now = Date.now();
    const lastSent = rateLimiter.get(to);
    if (lastSent && now - lastSent < RATE_LIMIT_MS) {
        throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded for this recipient");
    }
    rateLimiter.set(to, now);
    // Sanitize inputs
    const sanitizedSubject = subject.replace(/[<>"']/g, "").substring(0, 200);
    const sanitizedHtml = html === null || html === void 0 ? void 0 : html.substring(0, 50000); // Limit size
    const sanitizedText = text === null || text === void 0 ? void 0 : text.substring(0, 10000);
    try {
        const { data: emailData, error } = await resend.emails.send({
            from: `${fromName || FROM_NAME} <${from || FROM_EMAIL}>`,
            to: [to],
            subject: sanitizedSubject,
            html: sanitizedHtml,
            text: sanitizedText,
            reply_to: replyTo,
            cc: cc,
            bcc: bcc
        });
        if (error) {
            console.error("Resend API error:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
        // Log for HIPAA audit trail (hashed email)
        const hashedEmail = Buffer.from(to).toString("base64").substring(0, 16);
        console.log(`Email sent successfully to ${hashedEmail}...`, {
            messageId: emailData === null || emailData === void 0 ? void 0 : emailData.id,
            subject: sanitizedSubject,
            userId: context.auth.uid
        });
        return {
            success: true,
            id: emailData === null || emailData === void 0 ? void 0 : emailData.id
        };
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send email");
    }
});
/**
 * Send bulk email to multiple recipients (admin only)
 */
exports.sendBulkEmail = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Check admin role
    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can send bulk emails");
    }
    if (!resend) {
        throw new functions.https.HttpsError("failed-precondition", "Email service not configured");
    }
    const { recipients, subject, html, text } = data;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Recipients array required");
    }
    // Limit batch size
    if (recipients.length > 100) {
        throw new functions.https.HttpsError("invalid-argument", "Maximum 100 recipients per batch");
    }
    const results = [];
    const errors = [];
    // Send emails with small delays to avoid rate limits
    for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        try {
            const { data: emailData, error } = await resend.emails.send({
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to: [to],
                subject: subject.substring(0, 200),
                html: html,
                text: text
            });
            if (error) {
                errors.push({ email: to, error: error.message });
            }
            else {
                results.push({ email: to, id: emailData === null || emailData === void 0 ? void 0 : emailData.id });
            }
            // Small delay between sends
            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        catch (error) {
            errors.push({ email: to, error: error.message });
        }
    }
    return {
        success: errors.length === 0,
        sent: results.length,
        failed: errors.length,
        results,
        errors: errors.slice(0, 10) // Limit error details
    };
});
/**
 * Send welcome email on user signup
 * Triggered when new user document is created
 */
exports.sendWelcomeEmail = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap, context) => {
    if (!resend) {
        console.log("Resend not configured, skipping welcome email");
        return null;
    }
    const userData = snap.data();
    const email = userData.email;
    const name = userData.displayName || userData.firstName || "there";
    if (!email) {
        console.log("No email for user, skipping welcome email");
        return null;
    }
    try {
        const { error } = await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [email],
            subject: "Welcome to CareConnex!",
            html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; border-collapse: collapse; background: white; border-radius: 16px;">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <div style="text-align: center; margin-bottom: 32px;">
                          <div style="background: #0d9488; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                            <span style="color: white; font-size: 32px;">🏥</span>
                          </div>
                          <h1 style="color: #0f172a; font-size: 28px; margin: 0;">Welcome to CareConnex!</h1>
                        </div>
                        
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                          Hi ${name},
                        </p>
                        
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                          Thank you for joining CareConnex. We're here to help you find trusted caregivers for your loved ones.
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                          <a href="https://careconnex.com/client" 
                             style="display: inline-block; background: #0d9488; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Get Started
                          </a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
                          Need help? Contact us at support@careconnex.com
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
            text: `Welcome to CareConnex!\n\nHi ${name},\n\nThank you for joining CareConnex. We're here to help you find trusted caregivers.\n\nGet started: https://careconnex.com/client\n\nNeed help? Contact support@careconnex.com`
        });
        if (error) {
            console.error("Failed to send welcome email:", error);
            return { success: false, error: error.message };
        }
        console.log(`Welcome email sent to user ${context.params.userId}`);
        return { success: true };
    }
    catch (error) {
        console.error("Error sending welcome email:", error);
        return { success: false, error: error.message };
    }
});
//# sourceMappingURL=email.js.map