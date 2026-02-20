
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Production API Key from Secrets
const CHECKR_API_KEY = process.env.CHECKR_API_KEY;
const CHECKR_BASE_URL = "https://api.checkr.com/v1";

export const initiateCheckrCandidate = functions.https.onCall(async (data, context) => {
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
    const candidateResponse = await axios.post(`${CHECKR_BASE_URL}/candidates`, {
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
    await axios.post(`${CHECKR_BASE_URL}/invitations`, {
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

  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Checkr Error:", error.response?.data || error.message);
    }
    throw new functions.https.HttpsError("internal", "Background check initiation failed.");
  }
});
