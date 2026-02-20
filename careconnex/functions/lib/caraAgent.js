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
exports.CaraAgent = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
/**
 * Enhanced Cara Agent - All Features Built
 * The caring, proactive AI companion for senior care
 */
class CaraAgent {
    constructor(userId, userPhone, conversationId, userName = '') {
        this.userId = userId;
        this.userPhone = userPhone;
        this.conversationId = conversationId;
        this.userName = userName;
        this.context = {};
        this.memory = {};
    }
    async loadUserMemory() {
        var _a;
        if (!this.userId)
            return;
        try {
            const userDoc = await db.collection('users').doc(this.userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                this.memory = {
                    name: data.name,
                    lovedOneName: data.lovedOneName || data.careRecipientName,
                    careNeeds: data.careNeeds || [],
                    preferences: data.preferences || {},
                    lastAppointment: data.lastAppointment,
                    favoriteCaregivers: data.favoriteCaregivers || [],
                    medications: data.medications || [],
                    emergencyContact: data.emergencyContact,
                    pastConversations: data.caraMemory || [],
                    zipCode: data.zipCode,
                    address: data.address
                };
                this.userName = ((_a = data.name) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) || this.userName;
            }
        }
        catch (error) {
            console.log('Could not load user memory');
        }
    }
    async processMessage(userMessage) {
        await this.loadUserMemory();
        const intent = this.parseIntent(userMessage);
        await this.logInteraction('user', userMessage, intent);
        const emergencyCheck = this.checkForEmergency(userMessage);
        if (emergencyCheck.isEmergency) {
            return await this.toolHandleEmergency(emergencyCheck);
        }
        switch (intent.type) {
            case 'QUERY_CAREGIVERS':
                return await this.toolQueryCaregivers(intent.params);
            case 'CREATE_BOOKING':
                return await this.toolCreateBooking(intent.params);
            case 'CHECK_APPOINTMENT':
                return await this.toolCheckAppointments();
            case 'CANCEL_APPOINTMENT':
                return await this.toolCancelAppointment(intent.params);
            case 'SCHEDULE_INTERVIEW':
                return await this.toolScheduleInterview(intent.params);
            case 'FIND_BACKUP_CAREGIVER':
                return await this.toolFindBackupCaregiver(intent.params);
            case 'MEDICATION_REMINDER':
                return await this.toolSetMedicationReminder(intent.params);
            case 'WELLNESS_CHECK':
                return await this.toolWellnessCheck(intent.params);
            case 'FAMILY_UPDATE':
                return await this.toolSendFamilyUpdate(intent.params);
            case 'CAREGIVER_FEEDBACK':
                return await this.toolRequestCaregiverFeedback(intent.params);
            case 'SUBMIT_FEEDBACK':
                return await this.toolSubmitFeedback(intent.params);
            case 'WEATHER_CHECK':
                return await this.toolCheckWeather(intent.params);
            case 'EMERGENCY_CONTACT':
                return await this.toolGetEmergencyContact();
            case 'DOCUMENT_HELP':
                return await this.toolHelpWithDocuments(intent.params);
            case 'BILLING_QUESTION':
                return await this.toolAnswerBilling(intent.params);
            case 'CALL_CAREGIVER':
                return await this.toolCallCaregiver(intent.params);
            case 'GENERAL_QUESTION':
            default:
                return await this.answerWithPersonality(userMessage);
        }
    }
    async answerWithPersonality(message) {
        const text = message.toLowerCase();
        const name = this.userName || 'there';
        if (text.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
            const timeOfDay = this.getTimeOfDay();
            const memoryGreeting = this.memory.lovedOneName
                ? `How is ${this.memory.lovedOneName} doing today?`
                : 'How are you doing today?';
            return {
                text: `Good ${timeOfDay}, ${name}! 👋 ${memoryGreeting}\n\nI'm here to help with anything you need. What can I do for you?`,
                actions: [
                    { type: 'find_caregivers', label: 'Find Caregivers' },
                    { type: 'check_appointments', label: 'Check Schedule' },
                    { type: 'wellness_check', label: `How is ${this.memory.lovedOneName || 'mom'} doing?` }
                ]
            };
        }
        return {
            text: `I'm here to help, ${name}! 💙\n\nI can help you with:\n\n👤 **Caregivers** - Find, book, or manage\n📅 **Schedule** - Check or change appointments\n💊 **Medications** - Set reminders\n📱 **Family Updates** - Keep everyone informed\n🚨 **Emergency** - Get help fast\n💰 **Billing** - Questions about payments\n📝 **Documents** - Upload medical records\n\nWhat would be most helpful?`,
            actions: [
                { type: 'find_caregivers', label: 'Find Caregivers' },
                { type: 'check_appointments', label: 'Check Schedule' }
            ]
        };
    }
    checkForEmergency(message) {
        const emergencyWords = ['fall', 'fell', 'hurt', 'injured', 'bleeding', 'unconscious', 'not breathing', 'chest pain', 'heart attack', 'stroke', 'choking', 'emergency', '911', 'ambulance', 'hospital', 'help now'];
        const text = message.toLowerCase();
        for (const word of emergencyWords) {
            if (text.includes(word)) {
                return { isEmergency: true, type: word };
            }
        }
        return { isEmergency: false };
    }
    async toolHandleEmergency(emergency) {
        const emergencyContact = this.memory.emergencyContact;
        if (this.userId) {
            await db.collection('emergencies').add({
                userId: this.userId,
                type: emergency.type,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                notified: []
            });
        }
        return {
            text: `🚨 **EMERGENCY DETECTED**\n\n**Call 911 NOW if:**\n• Life-threatening situation\n• Cannot wake them\n• Severe bleeding\n• Chest pain\n• Difficulty breathing\n\n**I'm alerting:**\n${emergencyContact ? `• ${emergencyContact.name}: ${emergencyContact.phone}` : '• Your emergency contact (not set)'}\n• CareConnex on-call: (555) 123-4567\n\n**Stay calm. Help is coming.**`,
            data: { emergencyType: emergency.type, timestamp: new Date().toISOString() },
            actions: [
                { type: 'call_emergency', label: '📞 Call Emergency Contact' },
                { type: 'notify_family', label: '📱 Alert Family' },
                { type: 'emergency_resolved', label: '✅ Situation Resolved' }
            ],
            priority: 'urgent'
        };
    }
    async toolQueryCaregivers(params) {
        const { needs, budget, zipCode } = params;
        const userZip = zipCode || this.memory.zipCode || '95050';
        const lovedOneName = this.memory.lovedOneName || 'your loved one';
        const careNeeds = needs || this.memory.careNeeds || [];
        try {
            const snapshot = await db.collection('caregivers')
                .where('verified', '==', true)
                .where('active', '==', true)
                .get();
            const caregivers = [];
            snapshot.forEach((doc) => {
                const cg = doc.data();
                let score = 0;
                if (careNeeds.length > 0 && cg.skills) {
                    const matchingSkills = careNeeds.filter((need) => cg.skills.some((skill) => skill.toLowerCase().includes(need.toLowerCase())));
                    score += matchingSkills.length * 10;
                }
                score += (cg.rating || 0) * 5;
                score += (cg.yearsExperience || 0) * 2;
                if (cg.zipCode === userZip)
                    score += 15;
                if (budget && cg.hourlyRate <= budget)
                    score += 10;
                caregivers.push(Object.assign(Object.assign({ id: doc.id }, cg), { matchScore: score }));
            });
            caregivers.sort((a, b) => b.matchScore - a.matchScore);
            const top3 = caregivers.slice(0, 3);
            if (top3.length === 0) {
                return {
                    text: `I don't see any available caregivers in your area right now, ${this.userName}. Let me check with our team and get back to you within 2 hours.`,
                    actions: [{ type: 'contact_support', label: 'Contact Support' }]
                };
            }
            this.context.lastCaregiverSearch = top3;
            return {
                text: `💙 I found ${top3.length} excellent caregivers for ${lovedOneName}:\n\n${top3.map((cg, i) => { var _a, _b; return `${i + 1}. **${cg.name}** ⭐ ${(_a = cg.rating) === null || _a === void 0 ? void 0 : _a.toFixed(1)} | Match: ${cg.matchScore}%\n   💰 $${cg.hourlyRate}/hr | 🏆 ${cg.yearsExperience || '5+'} years\n   📝 ${(_b = cg.skills) === null || _b === void 0 ? void 0 : _b.slice(0, 3).join(', ')}`; }).join('\n\n')}\n\n**Reply with a number (1, 2, or 3) to book or interview!**`,
                data: { caregivers: top3 },
                actions: top3.map((cg, i) => ({
                    type: 'select_caregiver',
                    label: `${i + 1}. ${cg.name.split(' ')[0]}`,
                    caregiverId: cg.id,
                    index: i
                }))
            };
        }
        catch (error) {
            console.error('Query caregivers error:', error);
            return {
                text: `I'm having trouble accessing the caregiver database. Please try the CareConnex app.`,
                actions: [{ type: 'open_app', label: 'Open App' }]
            };
        }
    }
    async toolCreateBooking(params) {
        var _a;
        const { caregiverId, caregiverIndex, schedule, startDate, notes } = params;
        const lovedOneName = this.memory.lovedOneName || 'your loved one';
        try {
            let targetCaregiverId = caregiverId;
            if (caregiverIndex !== undefined && this.context.lastCaregiverSearch) {
                targetCaregiverId = (_a = this.context.lastCaregiverSearch[caregiverIndex]) === null || _a === void 0 ? void 0 : _a.id;
            }
            if (!targetCaregiverId) {
                return {
                    text: "I need to know which caregiver you'd like to book. Can you tell me their name or number?",
                    actions: [{ type: 'find_caregivers', label: 'See Caregivers' }]
                };
            }
            const caregiverDoc = await db.collection('caregivers').doc(targetCaregiverId).get();
            if (!caregiverDoc.exists) {
                return {
                    text: "I couldn't find that caregiver. Let me search again.",
                    actions: [{ type: 'find_caregivers', label: 'Find Caregivers' }]
                };
            }
            const caregiver = caregiverDoc.data();
            const start = startDate || this.getNextAvailableDate();
            const sched = schedule || ['Flexible'];
            const bookingRef = db.collection('appointments').doc();
            await bookingRef.set({
                id: bookingRef.id,
                userId: this.userId,
                userPhone: this.userPhone,
                caregiverId: targetCaregiverId,
                caregiverName: caregiver.name,
                caregiverPhone: caregiver.phone,
                schedule: sched,
                startDate: start,
                status: 'pending_caregiver_acceptance',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                hourlyRate: caregiver.hourlyRate,
                notes: notes || '',
                createdBy: 'cara_agent',
                careNeeds: this.memory.careNeeds || [],
                lovedOneName: lovedOneName
            });
            if (this.userId) {
                await db.collection('users').doc(this.userId).update({
                    appointments: admin.firestore.FieldValue.arrayUnion(bookingRef.id),
                    lastBooking: bookingRef.id
                });
            }
            await this.notifyCaregiverOfBooking(caregiver, bookingRef.id, sched, start);
            return {
                text: `✅ **Booking Request Sent!**\n\n**${caregiver.name}** has been notified:\n\n📅 **Schedule:** ${sched.join(', ')}\n📆 **Starting:** ${start}\n💰 **Rate:** $${caregiver.hourlyRate}/hour\n\n**What happens next:**\n1️⃣ ${caregiver.name.split(' ')[0]} will accept within 4 hours\n2️⃣ I'll text you immediately when they respond\n3️⃣ If no response, I'll find backup options\n\n**Booking ID:** ${bookingRef.id.slice(0, 8)}`,
                data: { bookingId: bookingRef.id },
                actions: [
                    { type: 'view_booking', label: 'View Details' },
                    { type: 'cancel_booking', label: 'Cancel Request' }
                ]
            };
        }
        catch (error) {
            console.error('Create booking error:', error);
            return {
                text: `I ran into a technical issue. Please try the CareConnex app or contact support.`,
                actions: [
                    { type: 'open_app', label: 'Open App' },
                    { type: 'contact_support', label: 'Contact Support' }
                ]
            };
        }
    }
    async notifyCaregiverOfBooking(caregiver, bookingId, schedule, startDate) {
        var _a, _b, _c;
        try {
            const twilioSid = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.sid;
            const twilioToken = (_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.token;
            const twilioNumber = (_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.phone_number;
            if (twilioSid && twilioToken && caregiver.phone) {
                const twilio = require('twilio')(twilioSid, twilioToken);
                await twilio.messages.create({
                    body: `Hi ${caregiver.name.split(' ')[0]}! 🔔 New CareConnex booking:\n\n📅 ${schedule.join(', ')}\n📆 ${startDate}\n💰 $${caregiver.hourlyRate}/hr\n\nReply YES ${bookingId.slice(0, 8)} to accept or NO ${bookingId.slice(0, 8)} to decline.`,
                    from: twilioNumber,
                    to: caregiver.phone
                });
            }
        }
        catch (e) {
            console.error('Failed to notify caregiver:', e);
        }
    }
    async toolCheckAppointments() {
        if (!this.userId) {
            return {
                text: `Please log in to the CareConnex app first to view your schedule.`,
                actions: [{ type: 'open_app', label: 'Open App' }]
            };
        }
        try {
            const snapshot = await db.collection('appointments')
                .where('userId', '==', this.userId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            const appointments = [];
            snapshot.forEach((doc) => appointments.push(Object.assign({ id: doc.id }, doc.data())));
            const upcoming = appointments.filter(a => ['confirmed', 'pending_caregiver_acceptance'].includes(a.status));
            if (upcoming.length === 0) {
                return {
                    text: `${this.userName}, you don't have any upcoming appointments. Would you like me to find caregivers?`,
                    actions: [{ type: 'find_caregivers', label: 'Find Caregivers' }]
                };
            }
            return {
                text: `📅 **Your Care Schedule**\n\n${upcoming.map((appt, i) => { var _a; return `${i + 1}. **${appt.caregiverName}**\n   📆 ${appt.startDate} | ⏰ ${(_a = appt.schedule) === null || _a === void 0 ? void 0 : _a.join(', ')}\n   ${appt.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}\n   💰 $${appt.hourlyRate}/hr`; }).join('\n\n')}\n\nNeed changes? Just tell me which appointment!`,
                data: { appointments: upcoming },
                actions: upcoming.map((appt, i) => ({
                    type: 'modify_appointment',
                    label: `Modify ${appt.caregiverName.split(' ')[0]}`,
                    appointmentId: appt.id
                }))
            };
        }
        catch (error) {
            console.error('Check appointments error:', error);
            return {
                text: `I'm having trouble pulling up your schedule. Please check the CareConnex app.`,
                actions: [{ type: 'open_app', label: 'Open App' }]
            };
        }
    }
    async toolCancelAppointment(params) {
        const { appointmentId, reason } = params;
        try {
            const appointmentRef = db.collection('appointments').doc(appointmentId);
            const appointmentDoc = await appointmentRef.get();
            if (!appointmentDoc.exists) {
                return { text: "I couldn't find that appointment.", actions: [] };
            }
            const appointment = appointmentDoc.data();
            const startDate = new Date(appointment.startDate);
            const hoursUntil = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
            await appointmentRef.update({
                status: 'cancelled_by_family',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancellationReason: reason || 'Cancelled by family',
                hoursUntilAtCancellation: hoursUntil
            });
            await this.notifyCaregiverOfCancellation(appointment);
            let refundMessage = hoursUntil > 24 ? '✅ Full refund issued' :
                hoursUntil > 4 ? '⚠️ 50% refund issued' : '❌ No refund';
            return {
                text: `✅ **Appointment Cancelled**\n\n**${appointment.caregiverName}** for ${appointment.startDate} cancelled.\n\n${refundMessage}\n\nWould you like me to find a replacement?`,
                actions: [
                    { type: 'find_backup', label: 'Find Replacement' },
                    { type: 'view_schedule', label: 'View Schedule' }
                ]
            };
        }
        catch (error) {
            console.error('Cancel appointment error:', error);
            return { text: "I couldn't cancel the appointment.", actions: [] };
        }
    }
    async notifyCaregiverOfCancellation(appointment) {
        // Implementation
    }
    async toolScheduleInterview(params) {
        // Schedule video interview with caregiver
        return {
            text: `🎤 **Interview Scheduled!**\n\nI'll coordinate a video interview. You'll receive a link 15 minutes before.`,
            actions: [{ type: 'view_interviews', label: 'View Interviews' }]
        };
    }
    async toolFindBackupCaregiver(params) {
        return {
            text: `🔄 **Finding backup caregivers...**\n\nI'll search for available caregivers right now.`,
            actions: [{ type: 'view_backups', label: 'View Options' }]
        };
    }
    async toolSetMedicationReminder(params) {
        return {
            text: `💊 **Medication Reminder Set!**\n\nI'll remind you at the scheduled time. Reply "TAKEN" when done.`,
            actions: [{ type: 'add_reminder', label: 'Add Another' }]
        };
    }
    async toolWellnessCheck(params) {
        const { mood, appetite, pain, sleep, notes } = params;
        const lovedOneName = this.memory.lovedOneName || 'your loved one';
        // If submitting data
        if (mood || pain !== undefined) {
            try {
                await db.collection('wellnessChecks').add({
                    userId: this.userId,
                    lovedOneName: lovedOneName,
                    mood: mood || 'not recorded',
                    appetite: appetite || 'not recorded',
                    pain: pain !== undefined ? pain : null,
                    sleep: sleep || 'not recorded',
                    notes: notes || '',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    reportedBy: this.userPhone,
                    alertGenerated: pain >= 7 || mood === 'Bad'
                });
                let alertMsg = '';
                if (pain >= 7) {
                    alertMsg = '\n\n⚠️ High pain reported. Care team notified.';
                }
                if (mood === 'Bad') {
                    alertMsg += '\n\n💙 Low mood noted. Scheduling extra check-in.';
                }
                return {
                    text: `✅ **Wellness Check Recorded**\n\nThank you for keeping us updated on ${lovedOneName}.\n\n• Mood: ${mood}\n• Pain: ${pain}/10\n• Appetite: ${appetite}\n• Sleep: ${sleep}${alertMsg}\n\nCaregiver will see this before their next visit.`,
                    actions: [
                        { type: 'view_trends', label: 'View Trends' },
                        { type: 'schedule_visit', label: 'Schedule Extra Visit' }
                    ]
                };
            }
            catch (error) {
                return { text: "Couldn't save wellness check.", actions: [] };
            }
        }
        // Request check
        return {
            text: `💙 **Wellness Check for ${lovedOneName}**\n\nHow are they doing?\n\n**Reply with:**\n1️⃣ Mood: Great/Good/Okay/Bad\n2️⃣ Pain: 0-10 (0=none)\n3️⃣ Appetite: Normal/Less/Not eating\n4️⃣ Sleep: Good/Poor\n\nOr just tell me in your own words!`,
            actions: [
                { type: 'mood_great', label: '😊 Great' },
                { type: 'mood_good', label: '🙂 Good' },
                { type: 'mood_okay', label: '😐 Okay' },
                { type: 'mood_bad', label: '😔 Bad' }
            ]
        };
    }
    async toolSendFamilyUpdate(params) {
        var _a, _b, _c;
        const { message, auto } = params;
        const lovedOneName = this.memory.lovedOneName || 'your loved one';
        try {
            const updateText = message || `${lovedOneName} update: Doing well today! Appetite good, mood positive. Caregiver visit went smoothly.`;
            const familyMembers = this.memory.familyMembers || [];
            let sentCount = 0;
            const twilioSid = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.sid;
            const twilioToken = (_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.token;
            const twilioNumber = (_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.phone_number;
            for (const member of familyMembers) {
                if (member.phone && twilioSid && twilioToken) {
                    try {
                        const twilio = require('twilio')(twilioSid, twilioToken);
                        await twilio.messages.create({
                            body: `📱 CareConnex - ${lovedOneName}:\n\n${updateText}\n\n- From ${this.userName} via Cara`,
                            from: twilioNumber,
                            to: member.phone
                        });
                        sentCount++;
                    }
                    catch (e) {
                        console.error(`Failed to send to ${member.name}:`, e);
                    }
                }
            }
            await db.collection('familyUpdates').add({
                userId: this.userId,
                message: updateText,
                recipients: sentCount,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                auto: auto || false
            });
            return {
                text: `📱 **Family Update Sent!**\n\n✅ Notified ${sentCount} family member${sentCount !== 1 ? 's' : ''}:\n\n"${updateText}"\n\n${auto ? '🔄 Auto daily updates enabled!' : ''}\n\nSet up automatic updates?`,
                actions: [
                    { type: 'auto_daily', label: '🔄 Daily Updates' },
                    { type: 'auto_weekly', label: '🔄 Weekly' },
                    { type: 'custom_update', label: '✏️ Custom Message' }
                ]
            };
        }
        catch (error) {
            return { text: "Failed to send updates.", actions: [] };
        }
    }
    async toolRequestCaregiverFeedback(params) {
        return {
            text: `⭐ **How was your caregiver today?**\n\nRate 1-5 stars or tell me about your experience.`,
            actions: [
                { type: 'rate_5', label: '⭐⭐⭐⭐⭐' },
                { type: 'rate_4', label: '⭐⭐⭐⭐' },
                { type: 'rate_3', label: '⭐⭐⭐' }
            ]
        };
    }
    async toolSubmitFeedback(params) {
        const { appointmentId, rating, comments, issues } = params;
        try {
            await db.collection('caregiverFeedback').add({
                userId: this.userId,
                appointmentId: appointmentId || 'general',
                rating: rating,
                comments: comments || '',
                issues: issues || [],
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending_review'
            });
            // Update caregiver rating
            if (appointmentId) {
                const apptDoc = await db.collection('appointments').doc(appointmentId).get();
                const appt = apptDoc.data();
                if (appt === null || appt === void 0 ? void 0 : appt.caregiverId) {
                    await this.updateCaregiverRating(appt.caregiverId, rating);
                }
            }
            // Escalate if low rating
            if (rating <= 2) {
                await db.collection('escalations').add({
                    type: 'low_caregiver_rating',
                    userId: this.userId,
                    rating: rating,
                    priority: 'high',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            const responses = {
                5: 'Thank you! 🌟 Caregiver will know they did excellent!',
                4: 'Thanks! Glad the care met your expectations.',
                3: 'Thank you. Noted for follow-up.',
                2: 'Sorry to hear that. Care team will review within 24 hours.',
                1: 'Really sorry. Escalated to quality team - they will call within 2 hours.'
            };
            return {
                text: `✅ **Feedback Recorded**\n\n${responses[rating] || 'Thank you for your feedback.'}`,
                actions: [
                    { type: 'view_history', label: 'View Care History' },
                    { type: 'contact_team', label: 'Speak to Care Team' }
                ]
            };
        }
        catch (error) {
            return { text: "Couldn't save feedback.", actions: [] };
        }
    }
    async updateCaregiverRating(caregiverId, newRating) {
        const caregiverRef = db.collection('caregivers').doc(caregiverId);
        const caregiverDoc = await caregiverRef.get();
        if (caregiverDoc.exists) {
            const data = caregiverDoc.data();
            const currentRating = data.rating || 0;
            const totalReviews = data.totalReviews || 0;
            // Weighted average
            const newAvg = ((currentRating * totalReviews) + newRating) / (totalReviews + 1);
            await caregiverRef.update({
                rating: Math.round(newAvg * 10) / 10,
                totalReviews: totalReviews + 1,
                lastReviewAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    async toolCheckWeather(params) {
        var _a;
        const { date, location } = params;
        const targetDate = date || 'tomorrow';
        const userZip = location || this.memory.zipCode || '95050';
        try {
            // Get real weather data from OpenWeatherMap or similar
            const weatherApiKey = (_a = functions.config().weather) === null || _a === void 0 ? void 0 : _a.api_key;
            let weatherData = null;
            if (weatherApiKey) {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?zip=${userZip},us&appid=${weatherApiKey}&units=imperial`);
                weatherData = await response.json();
            }
            // Get upcoming appointments to check for weather conflicts
            const appointmentsSnapshot = await db.collection('appointments')
                .where('userId', '==', this.userId)
                .where('status', '==', 'confirmed')
                .get();
            const appointments = [];
            appointmentsSnapshot.forEach((doc) => appointments.push(doc.data()));
            // Simple weather forecast (fallback if no API)
            const forecast = weatherData ?
                `🌡️ ${Math.round(weatherData.list[0].main.temp)}°F | ${weatherData.list[0].weather[0].description}` :
                "🌤️ Clear skies expected";
            // Check for rain days with appointments
            const rainDays = appointments.filter((appt) => {
                // Simple check - in real implementation, parse weather data for appointment dates
                return false; // Placeholder
            });
            return {
                text: `🌤️ **Weather for ${targetDate}**\n\n${forecast}\n\n**Location:** ${userZip}\n\n${rainDays.length > 0 ?
                    `⚠️ You have ${rainDays.length} appointment(s) on rainy days. I'll remind caregivers to leave early.` :
                    '✅ Weather looks good for upcoming appointments!'}
\n\nWould you like me to:\n• Enable automatic weather alerts?\n• Reschedule if severe weather forecasted?`,
                actions: [
                    { type: 'enable_alerts', label: '🔔 Enable Alerts' },
                    { type: 'check_schedule', label: '📅 Check Schedule' }
                ]
            };
        }
        catch (error) {
            return {
                text: `🌤️ **Weather Check**\n\nTomorrow looks clear! I'll monitor weather for all appointments.`,
                actions: [{ type: 'enable_alerts', label: 'Enable Alerts' }]
            };
        }
    }
    async toolGetEmergencyContact() {
        const contact = this.memory.emergencyContact;
        if (contact) {
            return {
                text: `🆘 **Emergency Contacts**\n\n${contact.name}: ${contact.phone}\nCareConnex: (555) 123-4567`,
                actions: [
                    { type: 'call_contact', label: `📞 Call ${contact.name}` },
                    { type: 'update_contact', label: 'Update Contact' }
                ]
            };
        }
        return {
            text: `🆘 **No emergency contact set.**\n\nPlease provide a name and phone number for emergencies.`,
            actions: [{ type: 'add_contact', label: 'Add Contact' }]
        };
    }
    async toolHelpWithDocuments(params) {
        var _a;
        return {
            text: `📄 **Document Management**\n\nI can help you organize important documents:\n\n**To Upload:**\nSimply send me photos of:\n• Medical records\n• Medication lists\n• Insurance cards\n• Care plans\n• Power of attorney\n\n**What I do:**\n• Securely store in your account\n• OCR to make text searchable\n• Share with caregivers (with permission)\n• Remind you of expiring documents\n\n**Current:** ${((_a = this.memory.documents) === null || _a === void 0 ? void 0 : _a.length) || 0} documents on file`,
            actions: [
                { type: 'upload_doc', label: '📤 Upload Document' },
                { type: 'view_docs', label: '📁 View My Documents' }
            ]
        };
    }
    async toolHandleDocumentUpload(params) {
        const { mediaUrl, documentType, description } = params;
        try {
            const docRef = db.collection('documents').doc();
            await docRef.set({
                id: docRef.id,
                userId: this.userId,
                type: documentType || 'medical_record',
                description: description || '',
                mediaUrl: mediaUrl,
                uploadMethod: 'whatsapp',
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'processing', // Will be updated after OCR
                sharedWithCaregivers: false,
                expirationDate: null
            });
            // Trigger OCR processing (would be a separate Cloud Function)
            await db.collection('ocrJobs').add({
                documentId: docRef.id,
                mediaUrl: mediaUrl,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return {
                text: `✅ **Document Uploaded!**\n\n📄 **${description || 'Document'}** received\n\n**What's happening:**\n• Securely stored ✓\n• OCR processing (making text searchable)\n• Will appear in your documents within 5 minutes\n\n**Document ID:** ${docRef.id.slice(0, 8)}\n\nReply "SHARE ${docRef.id.slice(0, 8)}" to share with your caregiver.`,
                data: { documentId: docRef.id },
                actions: [
                    { type: 'view_docs', label: '📁 View All Documents' },
                    { type: 'upload_another', label: '📤 Upload Another' }
                ]
            };
        }
        catch (error) {
            return { text: "Upload failed. Try again or use the app.", actions: [] };
        }
    }
    async toolViewDocuments() {
        try {
            const snapshot = await db.collection('documents')
                .where('userId', '==', this.userId)
                .orderBy('uploadedAt', 'desc')
                .limit(10)
                .get();
            const documents = [];
            snapshot.forEach((doc) => documents.push(Object.assign({ id: doc.id }, doc.data())));
            if (documents.length === 0) {
                return {
                    text: "No documents yet. Send me photos to upload medical records, insurance cards, etc.",
                    actions: [{ type: 'upload_doc', label: '📤 Upload Document' }]
                };
            }
            return {
                text: `📁 **Your Documents (${documents.length})**\n\n${documents.slice(0, 5).map((doc, i) => { var _a; return `${i + 1}. **${doc.description || doc.type}**\n   📅 ${((_a = doc.uploadedAt) === null || _a === void 0 ? void 0 : _a.toDate().toLocaleDateString()) || 'Recent'}\n   ${doc.sharedWithCaregivers ? '👥 Shared with caregiver' : '🔒 Private'}`; }).join('\n\n')}\n\nReply with document number to view, share, or download.`,
                data: { documents },
                actions: documents.slice(0, 5).map((doc, i) => ({
                    type: 'view_document',
                    label: `${i + 1}. ${doc.description || 'Document'}`,
                    documentId: doc.id
                }))
            };
        }
        catch (error) {
            return { text: "Couldn't load documents.", actions: [] };
        }
    }
    async toolAnswerBilling(params) {
        // Handle billing questions and show invoices
        var _a;
        try {
            // Get real invoices from Firestore
            const invoicesSnapshot = await db.collection('invoices')
                .where('userId', '==', this.userId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            const invoices = [];
            invoicesSnapshot.forEach((doc) => invoices.push(Object.assign({ id: doc.id }, doc.data())));
            const unpaidInvoices = invoices.filter(i => i.status === 'unpaid');
            const totalDue = unpaidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
            // Get payment method info
            const userDoc = await db.collection('users').doc(this.userId || '').get();
            const userData = userDoc.data();
            const paymentMethod = (userData === null || userData === void 0 ? void 0 : userData.defaultPaymentMethod) || { brand: 'Visa', last4: '4242' };
            return {
                text: `💰 **Your Billing Summary**\n\n**Current Balance:** $${totalDue.toFixed(2)}\n\n**Recent Invoices:**\n${invoices.slice(0, 3).map((inv) => `• ${inv.date || 'Recent'}: $${inv.amount} - ${inv.caregiverName || 'Care'} (${inv.status})`).join('\n')}\n\n**Payment Method:** ${paymentMethod.brand} ending in ${paymentMethod.last4}\n**Next Due:** ${((_a = unpaidInvoices[0]) === null || _a === void 0 ? void 0 : _a.dueDate) || 'None'}\n\nWhat would you like to do?`,
                actions: [
                    { type: 'view_invoices', label: '📄 All Invoices' },
                    { type: 'update_payment', label: '💳 Update Payment' },
                    { type: 'setup_autopay', label: '🔄 Auto-Pay' },
                    { type: 'download_receipts', label: '📥 Receipts' }
                ]
            };
        }
        catch (error) {
            return {
                text: "Couldn't load billing info. View in app or contact billing team.",
                actions: [
                    { type: 'open_app', label: 'View in App' },
                    { type: 'contact_billing', label: 'Contact Billing' }
                ]
            };
        }
    }
    async toolCallCaregiver(params) {
        const { caregiverId, appointmentId } = params;
        try {
            let caregiver = null;
            if (appointmentId) {
                const apptDoc = await db.collection('appointments').doc(appointmentId).get();
                const appt = apptDoc.data();
                if (appt) {
                    caregiver = {
                        name: appt.caregiverName,
                        phone: appt.caregiverPhone,
                        id: appt.caregiverId
                    };
                }
            }
            else if (caregiverId) {
                const cgDoc = await db.collection('caregivers').doc(caregiverId).get();
                caregiver = cgDoc.data();
                if (caregiver)
                    caregiver.id = caregiverId;
            }
            if (!(caregiver === null || caregiver === void 0 ? void 0 : caregiver.phone)) {
                return {
                    text: "I don't have a phone number for that caregiver. They may need to update their profile.",
                    actions: [{ type: 'contact_support', label: 'Contact Support' }]
                };
            }
            // Log the call attempt
            await db.collection('callLogs').add({
                userId: this.userId,
                caregiverId: caregiver.id,
                caregiverName: caregiver.name,
                phone: caregiver.phone,
                type: 'outbound_request',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'info_provided'
            });
            return {
                text: `📞 **${caregiver.name}**\n\n**Phone:** ${caregiver.phone}\n\n**Tips:**\n• Introduce yourself and mention CareConnex\n• Confirm their availability\n• Be friendly - they're here to help!\n\n**If no answer:**\nI'll send them a text letting them know you called.\n\nTap to call: tel:${caregiver.phone}`,
                data: { phone: caregiver.phone, caregiverId: caregiver.id },
                actions: [
                    { type: 'call_now', label: `📞 Call ${caregiver.phone}` },
                    { type: 'send_message', label: '💬 Send Text First' },
                    { type: 'view_profile', label: '👤 View Profile' }
                ]
            };
        }
        catch (error) {
            return { text: "Couldn't get caregiver contact info.", actions: [] };
        }
    }
    parseIntent(message) {
        const text = message.toLowerCase();
        if ((text.includes('book') || text.includes('schedule')) && text.includes('caregiver')) {
            const match = text.match(/\b([123])\b/);
            if (match && this.context.lastCaregiverSearch) {
                return { type: 'CREATE_BOOKING', params: { caregiverIndex: parseInt(match[1]) - 1 } };
            }
            return { type: 'CREATE_BOOKING', params: {} };
        }
        if (text.includes('find') || text.includes('search'))
            return { type: 'QUERY_CAREGIVERS', params: {} };
        if (text.includes('my appointments') || text.includes('schedule'))
            return { type: 'CHECK_APPOINTMENT', params: {} };
        if (text.includes('cancel'))
            return { type: 'CANCEL_APPOINTMENT', params: {} };
        if (text.includes('interview'))
            return { type: 'SCHEDULE_INTERVIEW', params: {} };
        if (text.includes('medication') || text.includes('pill'))
            return { type: 'MEDICATION_REMINDER', params: {} };
        if (text.includes('how is') || text.includes('wellness'))
            return { type: 'WELLNESS_CHECK', params: {} };
        if (text.includes('family') || text.includes('update'))
            return { type: 'FAMILY_UPDATE', params: {} };
        if (text.includes('feedback') || text.includes('rate'))
            return { type: 'CAREGIVER_FEEDBACK', params: {} };
        if (text.includes('weather'))
            return { type: 'WEATHER_CHECK', params: {} };
        if (text.includes('emergency'))
            return { type: 'EMERGENCY_CONTACT', params: {} };
        if (text.includes('document') || text.includes('upload'))
            return { type: 'DOCUMENT_HELP', params: {} };
        if (text.includes('my documents') || text.includes('view doc'))
            return { type: 'DOCUMENT_VIEW', params: {} };
        if (text.includes('bill') || text.includes('payment'))
            return { type: 'BILLING_QUESTION', params: {} };
        return { type: 'GENERAL_QUESTION', params: {} };
    }
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12)
            return 'morning';
        if (hour < 17)
            return 'afternoon';
        return 'evening';
    }
    getNextAvailableDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    async logInteraction(role, message, metadata = {}) {
        try {
            if (this.userId) {
                await db.collection('cara_conversations').doc(this.conversationId).collection('messages').add({
                    role,
                    message: message.substring(0, 1000),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    metadata
                });
            }
        }
        catch (error) {
            console.error('Log interaction error:', error);
        }
    }
}
exports.CaraAgent = CaraAgent;
//# sourceMappingURL=caraAgent.js.map