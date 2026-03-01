import * as admin from 'firebase-admin';
import { runHeartbeat } from './heartbeat';

// Initialize Firebase Admin (adjust project ID as needed)
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
});

const db = admin.firestore();

async function createTestData() {
  console.log('Creating test data...');
  const now = new Date();
  
  // 1. Stuck family (searched 8 days ago)
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  await db.collection('search_logs').add({
    userId: 'user-stuck-family',
    timestamp: admin.firestore.Timestamp.fromDate(eightDaysAgo),
  });
  await db.collection('users').doc('user-stuck-family').set({
    phone: '+15551234567',
    name: 'Test Family',
    status: 'active'
  });

  // 2. Incomplete caregiver
  await db.collection('caregivers').doc('cg-incomplete').set({
    name: 'Maria Test',
    phone: '+15559876543',
    status: 'incomplete'
  });

  // 3. Overdue interview
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  await db.collection('interviews').add({
    familyId: 'user-interview-family',
    caregiverName: 'Sarah Care',
    scheduledAt: admin.firestore.Timestamp.fromDate(threeDaysAgo),
    status: 'scheduled',
    followUpSent: false
  });
  await db.collection('users').doc('user-interview-family').set({
    phone: '+15552223333',
    name: 'Interview Family',
    status: 'active'
  });

  // 4. Inactive user (15 days ago)
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  await db.collection('users').doc('user-inactive').set({
    phone: '+15554445555',
    name: 'Inactive User',
    status: 'active',
    lastActivityAt: admin.firestore.Timestamp.fromDate(fifteenDaysAgo)
  });

  // 5. Caregiver checkin (active placement, no checkin for 8 days)
  await db.collection('placements').add({
    caregiverId: 'cg-active',
    familyName: 'Johnson Test',
    status: 'active',
    lastCheckInAt: admin.firestore.Timestamp.fromDate(eightDaysAgo)
  });
  await db.collection('caregivers').doc('cg-active').set({
    name: 'Active Care',
    phone: '+15556667777',
    status: 'active'
  });

  console.log('Test data created. Running heartbeat...');
  await runHeartbeat();
  console.log('Heartbeat run complete. Test check finished.');
}

createTestData().catch(console.error);