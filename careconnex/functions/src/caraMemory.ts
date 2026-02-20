import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Cara Memory System
 * Persistent, searchable memory across all conversations
 * Inspired by OpenClaw's MEMORY.md system
 */

/**
 * Store a memory for a user
 */
export async function storeMemory(
  userId: string,
  category: string,
  key: string,
  value: any,
  importance: 'low' | 'medium' | 'high' = 'medium'
): Promise<void> {
  const memoryRef = db.collection('cara_memories').doc(`${userId}_${category}_${key}`);
  
  await memoryRef.set({
    userId,
    category,        // e.g., 'preferences', 'care_needs', 'family', 'medical'
    key,             // e.g., 'mom_name', 'preferred_time', 'allergies'
    value,
    importance,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    accessCount: 0
  });

  // Also update user's memory index
  await db.collection('cara_users').doc(userId).update({
    [`memoryIndex.${category}.${key}`]: {
      value: typeof value === 'object' ? JSON.stringify(value) : value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  });
}

/**
 * Retrieve memories for a user
 */
export async function getMemories(
  userId: string,
  category?: string,
  limit: number = 20
): Promise<any[]> {
  let query: admin.firestore.Query = db.collection('cara_memories')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc');

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.limit(limit).get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Search memories by content
 */
export async function searchMemories(
  userId: string,
  searchTerm: string
): Promise<any[]> {
  // Get all user memories
  const memories = await getMemories(userId, undefined, 100);
  
  // Simple text search (in production, use Algolia or similar)
  const term = searchTerm.toLowerCase();
  return memories.filter(m => 
    m.key?.toLowerCase().includes(term) ||
    JSON.stringify(m.value)?.toLowerCase().includes(term) ||
    m.category?.toLowerCase().includes(term)
  );
}

/**
 * Get relevant context for current conversation
 * Called before every LLM interaction
 */
export async function getRelevantContext(
  userId: string,
  currentMessage: string
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};
  
  // Get high-importance memories
  const importantMemories = await db.collection('cara_memories')
    .where('userId', '==', userId)
    .where('importance', '==', 'high')
    .get();
  
  importantMemories.docs.forEach(doc => {
    const data = doc.data();
    if (!context[data.category]) {
      context[data.category] = {};
    }
    context[data.category][data.key] = data.value;
  });

  // Search for message-related memories
  const relatedMemories = await searchMemories(userId, currentMessage);
  relatedMemories.slice(0, 5).forEach(m => {
    if (!context[m.category]) {
      context[m.category] = {};
    }
    context[m.category][m.key] = m.value;
  });

  // Increment access count for accessed memories
  const batch = db.batch();
  relatedMemories.slice(0, 5).forEach(m => {
    const ref = db.collection('cara_memories').doc(m.id);
    batch.update(ref, { 
      accessCount: admin.firestore.FieldValue.increment(1),
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit();

  return context;
}

/**
 * Extract and store memories from conversation
 * Called after LLM processing
 */
export async function extractAndStoreMemories(
  userId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  // Simple extraction rules (in production, use NLP/LLM)
  const message = userMessage.toLowerCase();

  // Extract care recipient name
  const nameMatch = message.match(/(?:my |for )?(mom|mother|dad|father|grandma|grandmother|grandpa|grandfather)['\s]?s?name is (\w+)/i);
  if (nameMatch) {
    await storeMemory(userId, 'family', 'care_recipient_name', nameMatch[2], 'high');
    await storeMemory(userId, 'family', 'care_recipient_relationship', nameMatch[1], 'high');
  }

  // Extract medical conditions
  const conditions = ['dementia', 'alzheimer', 'diabetes', 'parkinson', 'arthritis', 'stroke', 'cancer'];
  for (const condition of conditions) {
    if (message.includes(condition)) {
      const existingConditions = await getMemories(userId, 'medical');
      const hasCondition = existingConditions.some(m => m.key === 'conditions' && m.value?.includes(condition));
      
      if (!hasCondition) {
        const currentConditions = existingConditions.find(m => m.key === 'conditions')?.value || [];
        await storeMemory(userId, 'medical', 'conditions', [...currentConditions, condition], 'high');
      }
    }
  }

  // Extract preferences
  if (message.includes('prefer') || message.includes('like')) {
    const prefMatch = message.match(/(?:prefer|like) (\w+(?:\s+\w+){0,5})/i);
    if (prefMatch) {
      await storeMemory(userId, 'preferences', `pref_${Date.now()}`, prefMatch[1], 'medium');
    }
  }

  // Extract schedule preferences
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const preferredDays = days.filter(d => message.includes(d));
  if (preferredDays.length > 0) {
    await storeMemory(userId, 'preferences', 'preferred_days', preferredDays, 'medium');
  }

  // Extract budget
  const budgetMatch = message.match(/\$(\d+)/);
  if (budgetMatch) {
    await storeMemory(userId, 'preferences', 'max_budget', parseInt(budgetMatch[1]), 'medium');
  }
}

/**
 * Cloud Function: Sync memories across family members
 * When one family member updates info, others see it too
 */
export const syncFamilyMemories = functions.firestore
  .document('cara_memories/{memoryId}')
  .onWrite(async (change, context) => {
    const after = change.after.data();
    if (!after) return;

    // Find other family members
    const userDoc = await db.collection('cara_users').doc(after.userId).get();
    const userData = userDoc.data();
    
    if (!userData?.familyGroupId) return;

    // Sync to other family members
    const familyMembers = await db.collection('cara_users')
      .where('familyGroupId', '==', userData.familyGroupId)
      .get();

    const batch = db.batch();
    
    for (const member of familyMembers.docs) {
      if (member.id !== after.userId) {
        const syncRef = db.collection('cara_memories').doc();
        batch.set(syncRef, {
          ...after,
          userId: member.id,
          syncedFrom: after.userId,
          isSynced: true,
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await batch.commit();
  });

/**
 * Cloud Function: Memory consolidation
 * Runs weekly to summarize old memories and remove duplicates
 */
export const consolidateMemories = functions.pubsub
  .schedule('0 2 * * 0')  // Sundays at 2 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('🧠 Consolidating memories...');

    // Get all users
    const users = await db.collection('cara_users').get();

    for (const user of users.docs) {
      const userId = user.id;
      
      // Get all memories for user
      const memories = await getMemories(userId, undefined, 200);
      
      // Group by category
      const byCategory: Record<string, any[]> = {};
      memories.forEach(m => {
        if (!byCategory[m.category]) byCategory[m.category] = [];
        byCategory[m.category].push(m);
      });

      // Consolidate duplicates within each category
      for (const [_category, items] of Object.entries(byCategory)) {
        const seen = new Set();
        const duplicates: string[] = [];

        for (const item of items) {
          const key = `${item.key}:${JSON.stringify(item.value)}`;
          if (seen.has(key)) {
            duplicates.push(item.id);
          } else {
            seen.add(key);
          }
        }

        // Delete duplicates
        if (duplicates.length > 0) {
          const batch = db.batch();
          duplicates.forEach(id => {
            batch.delete(db.collection('cara_memories').doc(id));
          });
          await batch.commit();
          console.log(`Deleted ${duplicates.length} duplicate memories for user ${userId}`);
        }
      }
    }

    return { success: true };
  });

/**
 * Generate memory summary for LLM context
 */
export async function generateMemorySummary(userId: string): Promise<string> {
  const memories = await getMemories(userId, undefined, 50);
  
  if (memories.length === 0) {
    return 'No previous memories for this user.';
  }

  const summary: Record<string, string[]> = {};
  
  memories.forEach(m => {
    if (!summary[m.category]) summary[m.category] = [];
    summary[m.category].push(`${m.key}: ${JSON.stringify(m.value)}`);
  });

  let result = 'IMPORTANT USER CONTEXT:\n';
  for (const [category, items] of Object.entries(summary)) {
    result += `\n${category.toUpperCase()}:\n`;
    items.forEach(item => result += `- ${item}\n`);
  }

  return result;
}
