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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateCheckrCandidate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Production API Key from Secrets
const CHECKR_API_KEY = process.env.CHECKR_API_KEY;
const CHECKR_BASE_URL = "https://api.checkr.com/v1";
exports.initiateCheckrCandidate = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    if (!CHECKR_API_KEY) {
        throw new functions.https.HttpsError("internal", "Checkr API Key not configured.");
    }
    const { legalFirstName, legalLastName, dob, ssn, zipCode } = data;
    const email = context.auth.token.email;
    const uid = context.auth.uid;
    // Input validation
    if (!ssn || !dob || !legalFirstName || !legalLastName) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: ssn, dob, legalFirstName, legalLastName");
    }
    // Validate SSN format (XXX-XX-XXXX or XXXXXXXXX)
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnRegex.test(ssn)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid SSN format");
    }
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid DOB format. Use YYYY-MM-DD");
    }
    // Validate name lengths
    if (legalFirstName.length > 50 || legalLastName.length > 50) {
        throw new functions.https.HttpsError("invalid-argument", "Name fields must be 50 characters or less");
    }
    // Validate zip code (5 digits or ZIP+4)
    if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid ZIP code format");
    }
    try {
        // 1. Create Candidate
        const candidateResponse = await axios_1.default.post(`${CHECKR_BASE_URL}/candidates`, {
            first_name: legalFirstName,
            last_name: legalLastName,
            email: email,
            dob: dob,
            ssn: ssn,
            zipcode: zipCode,
            no_middle_name: true
        }, {
            auth: { username: CHECKR_API_KEY, password: '' }
        });
        const candidateId = candidateResponse.data.id;
        // 2. Create Invitation/Report
        await axios_1.default.post(`${CHECKR_BASE_URL}/invitations`, {
            candidate_id: candidateId,
            package: 'driver_pro',
        }, {
            auth: { username: CHECKR_API_KEY, password: '' }
        });
        // 3. Update Firestore
        await db.collection("caregivers").doc(uid).set({
            backgroundCheckStatus: 'pending',
            backgroundCheckId: candidateId,
            legalNameConfirmed: `${legalFirstName} ${legalLastName}`
        }, { merge: true });
        return { success: true, candidateId };
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Checkr Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        }
        throw new functions.https.HttpsError("internal", "Background check initiation failed.");
    }
});
//# sourceMappingURL=checkr.js.map