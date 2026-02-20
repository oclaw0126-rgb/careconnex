import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Cara Family Collaboration
 * Multiple family members can coordinate care together
 * Shared context, notifications, and decision-making
 */

/**
 * Create a family group
 */
export async function createFamilyGroup(
  creatorUserId: string,
  familyName: string,
  careRecipientInfo: {
    name: string;
    relationship: string;
    age?: number;
    conditions?: string[];
  }
): Promise<string> {
  const groupRef = await db.collection('family_groups').add({
    name: familyName,
    createdBy: creatorUserId,
    careRecipient: careRecipientInfo,
    members: [{
      userId: creatorUserId,
      role: 'admin',
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    }],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update creator's user doc
  await db.collection('cara_users').doc(creatorUserId).update({
    familyGroupId: groupRef.id,
    familyRole: 'admin'
  });

  return groupRef.id;
}

/**
 * Invite family member to group
 */
export async function inviteFamilyMember(
  groupId: string,
  invitedBy: string,
  inviteePhone: string,
  inviteeName: string,
  role: 'admin' | 'caregiver' | 'observer' = 'caregiver'
): Promise<{ inviteCode: string; message: string }> {
  // Generate invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Store invite
  await db.collection('family_invites').doc(inviteCode).set({
    groupId,
    invitedBy,
    inviteePhone,
    inviteeName,
    role,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // Get group info
  const groupDoc = await db.collection('family_groups').doc(groupId).get();
  const group = groupDoc.data();

  // Send invite via WhatsApp
  const inviterDoc = await db.collection('cara_users').doc(invitedBy).get();
  const inviter = inviterDoc.data();

  const message = `👋 Hi ${inviteeName}!\n\n` +
    `${inviter?.whatsappName || 'Someone'} invited you to join the CareConnex family group ` +
    `for caring for ${group?.careRecipient?.name}.\n\n` +
    `Your invite code: *${inviteCode}*\n\n` +
    `Reply JOIN ${inviteCode} to accept the invitation.`;

  await sendWhatsAppMessage(inviteePhone, message);

  return {
    inviteCode,
    message: `Invitation sent to ${inviteeName} at ${inviteePhone}`
  };
}

/**
 * Accept family invitation
 */
export async function acceptFamilyInvite(
  inviteCode: string,
  userId: string,
  userPhone: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  const inviteDoc = await db.collection('family_invites').doc(inviteCode).get();

  if (!inviteDoc.exists) {
    return { success: false, error: 'Invalid invite code' };
  }

  const invite = inviteDoc.data();

  if (invite?.status !== 'pending') {
    return { success: false, error: 'Invite already used or expired' };
  }

  if (invite.expiresAt.toDate() < new Date()) {
    return { success: false, error: 'Invite has expired' };
  }

  if (invite.inviteePhone !== userPhone) {
    return { success: false, error: 'Phone number does not match invite' };
  }

  // Add to family group
  await db.collection('family_groups').doc(invite.groupId).update({
    members: admin.firestore.FieldValue.arrayUnion({
      userId,
      role: invite.role,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  });

  // Update user's family info
  await db.collection('cara_users').doc(userId).update({
    familyGroupId: invite.groupId,
    familyRole: invite.role
  });

  // Mark invite as accepted
  await inviteDoc.ref.update({
    status: 'accepted',
    acceptedBy: userId,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify inviter
  await sendWhatsAppMessage(
    invite.invitedBy,
    `✅ ${invite.inviteeName} has joined your family group!`
  );

  return { success: true, groupId: invite.groupId };
}

/**
 * Get family group context for Cara
 */
export async function getFamilyContext(
  userId: string
): Promise<{
  isFamilyGroup: boolean;
  groupId?: string;
  members?: any[];
  careRecipient?: any;
  sharedMemories?: any[];
} | null> {
  const userDoc = await db.collection('cara_users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.familyGroupId) {
    return { isFamilyGroup: false };
  }

  const groupDoc = await db.collection('family_groups').doc(userData.familyGroupId).get();
  const group = groupDoc.data();

  if (!group) return null;

  // Get shared memories
  const memories = await db.collection('cara_memories')
    .where('userId', 'in', group.members.map((m: any) => m.userId))
    .where('shareWithFamily', '==', true)
    .limit(20)
    .get();

  return {
    isFamilyGroup: true,
    groupId: userData.familyGroupId,
    members: group.members,
    careRecipient: group.careRecipient,
    sharedMemories: memories.docs.map(d => d.data())
  };
}

/**
 * Broadcast message to all family members
 */
export async function broadcastToFamily(
  groupId: string,
  fromUserId: string,
  message: string,
  excludeUserId?: string
): Promise<void> {
  const groupDoc = await db.collection('family_groups').doc(groupId).get();
  const group = groupDoc.data();

  if (!group) return;

  for (const member of group.members) {
    if (member.userId === excludeUserId) continue;

    const userDoc = await db.collection('cara_users').doc(member.userId).get();
    const user = userDoc.data();

    if (user?.phoneNumber) {
      await sendWhatsAppMessage(user.phoneNumber, message);
    }
  }
}

/**
 * Request family decision (e.g., which caregiver to hire)
 */
export async function requestFamilyDecision(
  groupId: string,
  requestedBy: string,
  decisionType: string,
  options: any[],
  deadline?: Date
): Promise<string> {
  const decisionRef = await db.collection('family_decisions').add({
    groupId,
    requestedBy,
    decisionType,
    options,
    votes: {},
    status: 'pending',
    deadline: deadline || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Format options for message
  const optionsList = options.map((opt, i) => `${i + 1}. ${opt.name || opt}`).join('\n');

  const message = `🗳️ Family Decision Needed!\n\n` +
    `Decision: ${decisionType}\n\n` +
    `Options:\n${optionsList}\n\n` +
    `Reply VOTE ${decisionRef.id} [1-${options.length}] to cast your vote.\n` +
    `Voting closes in 24 hours.`;

  await broadcastToFamily(groupId, requestedBy, message, requestedBy);

  return decisionRef.id;
}

/**
 * Cast vote in family decision
 */
export async function castFamilyVote(
  decisionId: string,
  userId: string,
  vote: number
): Promise<{ success: boolean; result?: string; error?: string }> {
  const decisionDoc = await db.collection('family_decisions').doc(decisionId).get();
  const decision = decisionDoc.data();

  if (!decision) {
    return { success: false, error: 'Decision not found' };
  }

  if (decision.status !== 'pending') {
    return { success: false, error: 'Voting is closed' };
  }

  if (decision.deadline.toDate() < new Date()) {
    return { success: false, error: 'Voting deadline has passed' };
  }

  if (vote < 1 || vote > decision.options.length) {
    return { success: false, error: 'Invalid vote option' };
  }

  // Record vote
  await decisionDoc.ref.update({
    [`votes.${userId}`]: {
      vote,
      votedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  });

  // Check if all members have voted
  const groupDoc = await db.collection('family_groups').doc(decision.groupId).get();
  const group = groupDoc.data();
  const totalMembers = group?.members.length || 0;
  const votesCast = Object.keys(decision.votes || {}).length + 1; // +1 for current vote

  if (votesCast >= totalMembers) {
    // All voted - determine winner
    const voteCounts: Record<number, number> = {};
    Object.values(decision.votes || {}).forEach((v: any) => {
      voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
    });
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;

    const winner = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
    const winningOption = decision.options[parseInt(winner[0]) - 1];

    await decisionDoc.ref.update({
      status: 'completed',
      winner: winningOption,
      finalVotes: voteCounts,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify everyone
    await broadcastToFamily(
      decision.groupId,
      decision.requestedBy,
      `✅ Decision reached!\n\n` +
      `"${decision.decisionType}"\n\n` +
      `Winner: ${winningOption.name || winningOption}\n` +
      `Votes: ${winner[1]}/${totalMembers}`,
      undefined
    );

    return {
      success: true,
      result: `Decision complete! Winner: ${winningOption.name || winningOption}`
    };
  }

  return {
    success: true,
    result: `Vote recorded! ${votesCast}/${totalMembers} have voted.`
  };
}

/**
 * Cloud Function: Notify family of important events
 */
export const notifyFamilyOfEvent = functions.firestore
  .document('appointments/{appointmentId}')
  .onWrite(async (change, context) => {
    const after = change.after.data();
    if (!after) return;

    // Get user's family group
    const userDoc = await db.collection('cara_users').doc(after.userId).get();
    const user = userDoc.data();

    if (!user?.familyGroupId) return;

    const before = change.before.data();
    let message = '';

    // Determine what changed
    if (!before) {
      // New appointment
      message = `📅 New care scheduled!\n\n` +
        `Caregiver: ${after.caregiverName}\n` +
        `Date: ${after.schedule.date}\n` +
        `Time: ${after.schedule.timeSlot}`;
    } else if (before.status !== after.status) {
      // Status changed
      if (after.status === 'confirmed') {
        message = `✅ Care appointment confirmed!\n\n` +
          `${after.caregiverName} on ${after.schedule.date} at ${after.schedule.timeSlot}`;
      } else if (after.status === 'cancelled') {
        message = `❌ Care appointment cancelled.\n\n` +
          `${after.caregiverName} on ${after.schedule.date}`;
      }
    }

    if (message) {
      await broadcastToFamily(
        user.familyGroupId,
        after.userId,
        message,
        after.userId // Don't notify the person who made the change
      );
    }
  });

/**
 * Cloud Function: Clean up expired invites
 */
export const cleanupExpiredInvites = functions.pubsub
  .schedule('0 0 * * *')  // Daily at midnight
  .onRun(async (context) => {
    const expired = await db.collection('family_invites')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', new Date())
      .get();

    const batch = db.batch();
    expired.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    await batch.commit();

    console.log(`Cleaned up ${expired.size} expired invites`);
    return { expired: expired.size };
  });

/**
 * Send WhatsApp message helper
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  console.log(`Would send to ${phone}:`, message);
}

/**
 * Tool: Get family member activity summary
 */
export async function getFamilyActivitySummary(
  groupId: string,
  days: number = 7
): Promise<any> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all appointments for family members
  const groupDoc = await db.collection('family_groups').doc(groupId).get();
  const group = groupDoc.data();

  const memberIds = group?.members.map((m: any) => m.userId) || [];

  const appointments = await db.collection('appointments')
    .where('userId', 'in', memberIds)
    .where('createdAt', '>=', since)
    .get();

  const byMember: Record<string, { appointments: number; hours: number }> = {};

  appointments.docs.forEach(doc => {
    const data = doc.data();
    if (!byMember[data.userId]) {
      byMember[data.userId] = { appointments: 0, hours: 0 };
    }
    byMember[data.userId].appointments++;
    byMember[data.userId].hours += data.schedule?.duration || 4;
  });

  return {
    period: `Last ${days} days`,
    totalAppointments: appointments.size,
    byMember
  };
}
