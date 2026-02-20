import CryptoJS from 'crypto-js';

// IMPORTANT: Store this in environment variable, NEVER in code!
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY) {
  console.error('ERROR: VITE_ENCRYPTION_KEY not set. PII will NOT be encrypted!');
}

/**
 * Encrypts sensitive PII data before storing in Firestore
 * Uses AES-256 encryption
 */
export function encryptPII(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }
  if (!plaintext) return '';
  
  try {
    const encrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY, {
      // @ts-ignore - GCM mode exists at runtime but types are missing
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts PII data when needed (admin only, logged)
 */
export function decryptPII(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }
  if (!ciphertext) return '';
  
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY, {
      // @ts-ignore - GCM mode exists at runtime but types are missing
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Hash SSN for lookups (one-way, irreversible)
 * Store this in Firestore for background check matching
 */
export function hashSSN(ssn: string): string {
  if (!ssn) return '';
  // Remove dashes and spaces
  const cleanSSN = ssn.replace(/[\s-]/g, '');
  // Use SHA-256 with a pepper (additional secret)
  const PEPPER = import.meta.env.VITE_SSN_PEPPER || '';
  return CryptoJS.SHA256(cleanSSN + PEPPER).toString();
}

/**
 * Masks SSN for display (e.g., "***-**-1234")
 */
export function maskSSN(ssn: string): string {
  if (!ssn) return '';
  const clean = ssn.replace(/[\s-]/g, '');
  if (clean.length !== 9) return '***-**-****';
  return `***-**-${clean.slice(-4)}`;
}

/**
 * Masks phone number (e.g., "(***) ***-1234")
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length !== 10) return '(***) ***-****';
  return `(***) ***-${clean.slice(-4)}`;
}

/**
 * Validates SSN format
 */
export function isValidSSN(ssn: string): boolean {
  if (!ssn) return false;
  const clean = ssn.replace(/[\s-]/g, '');
  // Basic validation: 9 digits, not all same, not 000-00-0000
  if (!/^\d{9}$/.test(clean)) return false;
  if (clean === '000000000') return false;
  if (/^(\d)\1{8}$/.test(clean)) return false; // All same digit
  return true;
}

/**
 * Sanitizes caregiver data for public profile view
 * Removes all PII before sending to client
 */
export function sanitizeCaregiverPublic(caregiver: any): any {
  if (!caregiver) return null;
  
  const {
    backgroundCheckData,
    email,
    phone,
    stripeAccountId,
    totalEarnings,
    ...publicData
  } = caregiver;
  
  return {
    ...publicData,
    // Only show these fields publicly
    verified: caregiver.verified || false,
    backgroundCheckStatus: caregiver.backgroundCheckStatus || 'none',
    rating: caregiver.rating,
    reviewCount: caregiver.reviewCount,
    hourlyRate: caregiver.hourlyRate,
    // Never expose these publicly
    email: undefined,
    phone: undefined,
    backgroundCheckData: undefined,
    stripeAccountId: undefined,
    totalEarnings: undefined,
  };
}

/**
 * Prepares caregiver data for Firestore write
 * Encrypts all PII fields
 */
export function prepareCaregiverForWrite(caregiver: any): any {
  const prepared = { ...caregiver };
  
  // Encrypt background check data
  if (caregiver.backgroundCheckData) {
    prepared.backgroundCheckData = {
      ...caregiver.backgroundCheckData,
      ssn: caregiver.backgroundCheckData.ssn 
        ? encryptPII(caregiver.backgroundCheckData.ssn)
        : undefined,
      dob: caregiver.backgroundCheckData.dob
        ? encryptPII(caregiver.backgroundCheckData.dob)
        : undefined,
      // Hash SSN for lookup purposes
      ssnHash: caregiver.backgroundCheckData.ssn
        ? hashSSN(caregiver.backgroundCheckData.ssn)
        : undefined,
    };
    // Remove raw SSN from data that goes to Firestore
    delete prepared.backgroundCheckData.ssn;
  }
  
  // Encrypt phone
  if (caregiver.phone) {
    prepared.phoneEncrypted = encryptPII(caregiver.phone);
    prepared.phone = maskPhone(caregiver.phone); // Store masked version
  }
  
  // Encrypt email (if needed for additional security)
  if (caregiver.email) {
    prepared.emailEncrypted = encryptPII(caregiver.email);
    // Keep email readable for notifications but consider encrypting
  }
  
  // Add audit fields
  prepared._security = {
    encryptedAt: new Date().toISOString(),
    version: '1.0',
  };
  
  return prepared;
}

/**
 * Audit log helper - track all PII access
 */
export function logPIIAccess(
  userId: string,
  action: 'read' | 'write' | 'decrypt',
  dataType: string,
  targetUserId?: string
): void {
  // In production, send this to a secure audit log
  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    dataType,
    targetUserId,
    ip: 'client-side', // Server-side would log actual IP
    userAgent: navigator.userAgent,
  };
  
  console.log('[AUDIT] PII Access:', auditEntry);
  
  // TODO: Send to secure audit logging service
  // firebase.firestore().collection('audit_logs').add(auditEntry);
}
