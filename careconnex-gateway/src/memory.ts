import * as admin from 'firebase-admin';
import { UserProfile, ConversationMessage } from './types';
import dotenv from 'dotenv';

dotenv.config();

export class MemoryManager {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;
    if (!db) return null;
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as UserProfile;
  }

  async getRecentHistory(userId: string, limit = 10): Promise<ConversationMessage[]> {
    const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;
    if (!db) return [];
    const snapshot = await db.collection('messages')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.reverse().map(doc => doc.data().message as ConversationMessage);
  }

  async saveMessage(userId: string, sessionId: string, message: ConversationMessage): Promise<void> {
    const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;
    if (!db) return;
    
    // Simple mask for PII logs
    const safeMessage = { ...message };
    if (safeMessage.content) {
      safeMessage.content = safeMessage.content.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
    }
    
    await db.collection('messages').add({
      userId,
      sessionId,
      message: safeMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
