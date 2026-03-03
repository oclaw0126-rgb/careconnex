import * as admin from 'firebase-admin';
import { logger } from './logger';
import { sendProactiveMessage } from './messaging';

const getDb = () => admin.firestore();

// Helper to determine if we should message (don't spam if contacted < 48h ago)
async function shouldMessageUser(userId: string): Promise<boolean> {
  const userDoc = await getDb().collection('users').doc(userId).get();
  if (!userDoc.exists) return true;
  
  const data = userDoc.data();
  if (data?.optOutProactive) return false;
  
  if (data?.lastContactedAt) {
    const lastContact = data.lastContactedAt.toDate();
    const hoursSinceContact = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60);
    if (hoursSinceContact < 48) {
      return false; // Don't spam, contacted recently
    }
  }
  return true;
}

export const heartbeatChecks = {
  // Check 1: Families stuck in search
  stuckFamilies: async () => {
    logger.info('[Heartbeat] Checking stuck families...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Simplification: query users who recently searched but haven't booked an interview.
    // In a production environment, this would likely be more sophisticated.
    const recentSearches = await getDb().collection('search_logs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
      
    const checkedUsers = new Set<string>();
    
    for (const doc of recentSearches.docs) {
      const userId = doc.data().userId;
      if (!userId || checkedUsers.has(userId)) continue;
      checkedUsers.add(userId);
      
      const interviews = await getDb().collection('interviews')
        .where('familyId', '==', userId)
        .limit(1)
        .get();
        
      if (interviews.empty) {
        if (await shouldMessageUser(userId)) {
          const userDoc = await getDb().collection('users').doc(userId).get();
          const phone = userDoc.data()?.phone;
          if (phone) {
            await sendProactiveMessage(
              phone,
              "Hi there! Cara from CareConnex here. Still looking for care? 3 new great caregivers joined this week in your area. Let me know if you want to see their profiles!",
              { userId, checkType: 'stuck_family' }
            );
          }
        }
      }
    }
  },
  
  // Check 2: Incomplete caregiver profiles
  incompleteCaregivers: async () => {
    logger.info('[Heartbeat] Checking incomplete caregivers...');
    const caregivers = await getDb().collection('caregivers')
      .where('status', '==', 'incomplete')
      .get();
      
    for (const doc of caregivers.docs) {
      const cgId = doc.id;
      const data = doc.data();
      
      if (await shouldMessageUser(cgId) && data.phone) {
        const name = data.name?.split(' ')[0] || 'there';
        await sendProactiveMessage(
          data.phone,
          `Hi ${name}! Cara here. Just a reminder to complete your profile with a photo and your certifications so we can start matching you with families! Need any help?`,
          { userId: cgId, checkType: 'incomplete_caregiver' }
        );
      }
    }
  },
  
  // Check 3: Overdue interview follow-ups
  overdueInterviews: async () => {
    logger.info('[Heartbeat] Checking overdue interviews...');
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    // We assume there's a status='scheduled' and followUpSent wasn't set to true yet
    const overdue = await getDb().collection('interviews')
      .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(fortyEightHoursAgo))
      .where('status', '==', 'scheduled')
      .get();
      
    for (const doc of overdue.docs) {
      const interview = doc.data();
      if (interview.followUpSent) continue;
      
      const familyId = interview.familyId;
      if (familyId && await shouldMessageUser(familyId)) {
        const userDoc = await getDb().collection('users').doc(familyId).get();
        const phone = userDoc.data()?.phone;
        if (phone) {
          const caregiverName = interview.caregiverName || 'the caregiver';
          await sendProactiveMessage(
            phone,
            `Hi! How did your interview with ${caregiverName} go? Are you ready to book them, or would you like to see other options?`,
            { userId: familyId, checkType: 'overdue_interview' }
          );
          // Mark as follow-up sent
          await doc.ref.update({ followUpSent: true });
        }
      }
    }
  },
  
  // Check 4: Inactive re-engagement
  inactiveUsers: async () => {
    logger.info('[Heartbeat] Checking inactive users...');
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    // Assuming lastActivityAt is tracked on the user document
    const inactive = await getDb().collection('users')
      .where('lastActivityAt', '<=', admin.firestore.Timestamp.fromDate(fourteenDaysAgo))
      .where('status', '==', 'active')
      .get();
      
    for (const doc of inactive.docs) {
      const userId = doc.id;
      const data = doc.data();
      
      if (await shouldMessageUser(userId) && data.phone) {
        await sendProactiveMessage(
          data.phone,
          "Hi! Cara from CareConnex here. Just checking in—how's your mom doing? Have there been any changes in her care needs lately?",
          { userId, checkType: 'inactive_user' }
        );
      }
    }
  },
  
  // Check 5: Caregiver check-in reminders
  caregiverCheckins: async () => {
    logger.info('[Heartbeat] Checking caregiver active placements...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const placements = await getDb().collection('placements')
      .where('status', '==', 'active')
      .where('lastCheckInAt', '<=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
      
    for (const doc of placements.docs) {
      const placement = doc.data();
      const cgId = placement.caregiverId;
      
      if (cgId && await shouldMessageUser(cgId)) {
        const cgDoc = await getDb().collection('caregivers').doc(cgId).get();
        const phone = cgDoc.data()?.phone;
        if (phone) {
          const familyName = placement.familyName || 'family';
          await sendProactiveMessage(
            phone,
            `Quick check-in! How are things going with the ${familyName} family? Everything running smoothly?`,
            { userId: cgId, checkType: 'caregiver_checkin' }
          );
          // Update last check-in to prevent re-sending immediately
          await doc.ref.update({ lastCheckInAt: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
    }
  }
};

export async function runHeartbeat(): Promise<void> {
  logger.info('[Heartbeat] Starting proactive checks');
  
  try {
    await heartbeatChecks.stuckFamilies();
    await heartbeatChecks.incompleteCaregivers();
    await heartbeatChecks.overdueInterviews();
    await heartbeatChecks.inactiveUsers();
    await heartbeatChecks.caregiverCheckins();
    logger.info('[Heartbeat] All checks completed successfully');
  } catch (error) {
    logger.error('[Heartbeat] Error running checks:', error);
  }
}

export function startHeartbeatScheduler(): void {
  // Run every 6 hours
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      await runHeartbeat();
    } catch (error) {
      logger.error('[Heartbeat] Scheduler error:', error);
    }
  }, INTERVAL_MS);
  
  // Run once shortly after server startup
  setTimeout(() => runHeartbeat(), 30000);
  
  logger.info('[Heartbeat] Scheduler started (every 6 hours)');
}
