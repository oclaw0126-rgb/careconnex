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
exports.agentHealth = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const caraAgent_1 = require("./caraAgent");
const db = admin.firestore();
/**
 * WhatsApp Webhook - Powered by TRUE Cara Agent
 * Cara can now execute actions, not just chat
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
    try {
        const { From, Body, ProfileName } = req.body;
        console.log('📱 WhatsApp message:', { from: From, body: Body });
        const phoneNumber = From.replace('whatsapp:', '');
        const userRef = db.collection('users').where('phone', '==', phoneNumber);
        const userSnapshot = await userRef.get();
        let userId = null;
        if (!userSnapshot.empty) {
            userId = userSnapshot.docs[0].id;
        }
        else {
            const tempUser = await db.collection('temp_users').add({
                phone: phoneNumber,
                whatsappName: ProfileName || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'whatsapp'
            });
            userId = tempUser.id;
        }
        const conversationId = `wa-${phoneNumber}-${Date.now()}`;
        const cara = new caraAgent_1.CaraAgent(userId, phoneNumber, conversationId);
        const agentResponse = await cara.processMessage(Body);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentResponse.text)}</Message>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
        console.log('✅ Cara agent responded:', { hasActions: ((_a = agentResponse.actions) === null || _a === void 0 ? void 0 : _a.length) > 0 });
    }
    catch (error) {
        console.error('❌ WhatsApp/Cara error:', error);
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble. Please try again or use the CareConnex app.</Message>
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
exports.agentHealth = functions.https.onRequest((req, res) => {
    res.json({
        status: 'healthy',
        service: 'Cara Agent (WhatsApp)',
        capabilities: [
            'query_caregivers',
            'create_booking',
            'check_appointments'
        ],
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=caraWebhook.js.map