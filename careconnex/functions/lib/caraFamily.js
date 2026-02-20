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
exports.cleanupExpiredInvites = exports.notifyFamilyOfEvent = void 0;
exports.createFamilyGroup = createFamilyGroup;
exports.inviteFamilyMember = inviteFamilyMember;
exports.acceptFamilyInvite = acceptFamilyInvite;
exports.getFamilyContext = getFamilyContext;
exports.broadcastToFamily = broadcastToFamily;
exports.requestFamilyDecision = requestFamilyDecision;
exports.castFamilyVote = castFamilyVote;
exports.getFamilyActivitySummary = getFamilyActivitySummary;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Cara Family Collaboration
 * Multiple family members can coordinate care together
 * Shared context, notifications, and decision-making
 */
/**
 * Create a family group
 */
async function createFamilyGroup(creatorUserId, familyName, careRecipientInfo) {
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
async function inviteFamilyMember(groupId, invitedBy, inviteePhone, inviteeName, role = 'caregiver') {
    var _a;
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
        `${(inviter === null || inviter === void 0 ? void 0 : inviter.whatsappName) || 'Someone'} invited you to join the CareConnex family group ` +
        `for caring for ${(_a = group === null || group === void 0 ? void 0 : group.careRecipient) === null || _a === void 0 ? void 0 : _a.name}.\n\n` +
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
async function acceptFamilyInvite(inviteCode, userId, userPhone) {
    const inviteDoc = await db.collection('family_invites').doc(inviteCode).get();
    if (!inviteDoc.exists) {
        return { success: false, error: 'Invalid invite code' };
    }
    const invite = inviteDoc.data();
    if ((invite === null || invite === void 0 ? void 0 : invite.status) !== 'pending') {
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
    await sendWhatsAppMessage(invite.invitedBy, `✅ ${invite.inviteeName} has joined your family group!`);
    return { success: true, groupId: invite.groupId };
}
/**
 * Get family group context for Cara
 */
async function getFamilyContext(userId) {
    const userDoc = await db.collection('cara_users').doc(userId).get();
    const userData = userDoc.data();
    if (!(userData === null || userData === void 0 ? void 0 : userData.familyGroupId)) {
        return { isFamilyGroup: false };
    }
    const groupDoc = await db.collection('family_groups').doc(userData.familyGroupId).get();
    const group = groupDoc.data();
    if (!group)
        return null;
    // Get shared memories
    const memories = await db.collection('cara_memories')
        .where('userId', 'in', group.members.map((m) => m.userId))
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
async function broadcastToFamily(groupId, fromUserId, message, excludeUserId) {
    const groupDoc = await db.collection('family_groups').doc(groupId).get();
    const group = groupDoc.data();
    if (!group)
        return;
    for (const member of group.members) {
        if (member.userId === excludeUserId)
            continue;
        const userDoc = await db.collection('cara_users').doc(member.userId).get();
        const user = userDoc.data();
        if (user === null || user === void 0 ? void 0 : user.phoneNumber) {
            await sendWhatsAppMessage(user.phoneNumber, message);
        }
    }
}
/**
 * Request family decision (e.g., which caregiver to hire)
 */
async function requestFamilyDecision(groupId, requestedBy, decisionType, options, deadline) {
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
async function castFamilyVote(decisionId, userId, vote) {
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
    const totalMembers = (group === null || group === void 0 ? void 0 : group.members.length) || 0;
    const votesCast = Object.keys(decision.votes || {}).length + 1; // +1 for current vote
    if (votesCast >= totalMembers) {
        // All voted - determine winner
        const voteCounts = {};
        Object.values(decision.votes || {}).forEach((v) => {
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
        await broadcastToFamily(decision.groupId, decision.requestedBy, `✅ Decision reached!\n\n` +
            `"${decision.decisionType}"\n\n` +
            `Winner: ${winningOption.name || winningOption}\n` +
            `Votes: ${winner[1]}/${totalMembers}`, undefined);
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
exports.notifyFamilyOfEvent = functions.firestore
    .document('appointments/{appointmentId}')
    .onWrite(async (change, context) => {
    const after = change.after.data();
    if (!after)
        return;
    // Get user's family group
    const userDoc = await db.collection('cara_users').doc(after.userId).get();
    const user = userDoc.data();
    if (!(user === null || user === void 0 ? void 0 : user.familyGroupId))
        return;
    const before = change.before.data();
    let message = '';
    // Determine what changed
    if (!before) {
        // New appointment
        message = `📅 New care scheduled!\n\n` +
            `Caregiver: ${after.caregiverName}\n` +
            `Date: ${after.schedule.date}\n` +
            `Time: ${after.schedule.timeSlot}`;
    }
    else if (before.status !== after.status) {
        // Status changed
        if (after.status === 'confirmed') {
            message = `✅ Care appointment confirmed!\n\n` +
                `${after.caregiverName} on ${after.schedule.date} at ${after.schedule.timeSlot}`;
        }
        else if (after.status === 'cancelled') {
            message = `❌ Care appointment cancelled.\n\n` +
                `${after.caregiverName} on ${after.schedule.date}`;
        }
    }
    if (message) {
        await broadcastToFamily(user.familyGroupId, after.userId, message, after.userId // Don't notify the person who made the change
        );
    }
});
/**
 * Cloud Function: Clean up expired invites
 */
exports.cleanupExpiredInvites = functions.pubsub
    .schedule('0 0 * * *') // Daily at midnight
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
async function sendWhatsAppMessage(phone, message) {
    console.log(`Would send to ${phone}:`, message);
}
/**
 * Tool: Get family member activity summary
 */
async function getFamilyActivitySummary(groupId, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Get all appointments for family members
    const groupDoc = await db.collection('family_groups').doc(groupId).get();
    const group = groupDoc.data();
    const memberIds = (group === null || group === void 0 ? void 0 : group.members.map((m) => m.userId)) || [];
    const appointments = await db.collection('appointments')
        .where('userId', 'in', memberIds)
        .where('createdAt', '>=', since)
        .get();
    const byMember = {};
    appointments.docs.forEach(doc => {
        var _a;
        const data = doc.data();
        if (!byMember[data.userId]) {
            byMember[data.userId] = { appointments: 0, hours: 0 };
        }
        byMember[data.userId].appointments++;
        byMember[data.userId].hours += ((_a = data.schedule) === null || _a === void 0 ? void 0 : _a.duration) || 4;
    });
    return {
        period: `Last ${days} days`,
        totalAppointments: appointments.size,
        byMember
    };
}
//# sourceMappingURL=caraFamily.js.map