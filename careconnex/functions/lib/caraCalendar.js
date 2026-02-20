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
exports.weeklyScheduleSummary = exports.onAppointmentConfirmedCalendar = exports.onInterviewScheduledCalendar = void 0;
exports.generateGoogleCalendarLink = generateGoogleCalendarLink;
exports.generateICSContent = generateICSContent;
exports.createInterviewCalendarEvent = createInterviewCalendarEvent;
exports.createCareAppointmentCalendarEvent = createCareAppointmentCalendarEvent;
exports.getUpcomingSchedule = getUpcomingSchedule;
exports.checkScheduleConflict = checkScheduleConflict;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Cara Calendar Integration
 * Syncs with Google Calendar and Apple Calendar
 * Manages appointments, interviews, and care schedules
 */
/**
 * Generate Google Calendar event link
 */
function generateGoogleCalendarLink(eventParams) {
    const { title, description, location, startTime, endTime } = eventParams;
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const queryParams = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        details: description,
        dates: `${formatDate(startTime)}/${formatDate(endTime)}`
    });
    if (location) {
        queryParams.append('location', location);
    }
    return `https://calendar.google.com/calendar/render?${queryParams.toString()}`;
}
/**
 * Generate ICS file content for Apple/Outlook calendars
 */
function generateICSContent(params) {
    const { title, description, location, startTime, endTime, uid } = params;
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareConnex//Cara//EN
BEGIN:VEVENT
UID:${uid}@careconnex.ai
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
${location ? `LOCATION:${location}` : ''}
END:VEVENT
END:VCALENDAR`;
}
/**
 * Create calendar event for interview
 */
async function createInterviewCalendarEvent(userId, interviewId, caregiverName, scheduledTime, durationMinutes = 30) {
    const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60000);
    const title = `CareConnex Interview with ${caregiverName}`;
    const description = `Video interview with ${caregiverName} for senior care services.\n\n` +
        `Join the video call through the CareConnex app or website.\n\n` +
        `Interview ID: ${interviewId}`;
    const googleLink = generateGoogleCalendarLink({
        title,
        description,
        startTime: scheduledTime,
        endTime
    });
    const icsContent = generateICSContent({
        title,
        description,
        startTime: scheduledTime,
        endTime,
        uid: `interview-${interviewId}`
    });
    // Store in Firestore
    await db.collection('calendar_events').doc(interviewId).set({
        userId,
        type: 'interview',
        title,
        startTime: scheduledTime,
        endTime,
        googleLink,
        icsContent,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { googleLink, icsContent };
}
/**
 * Create calendar event for care appointment
 */
async function createCareAppointmentCalendarEvent(userId, appointmentId, caregiverName, date, timeSlot, durationHours, location) {
    // Parse time slot to actual time
    const startTime = parseTimeSlotToDate(date, timeSlot);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60000);
    const title = `Care: ${caregiverName}`;
    const description = `Caregiver ${caregiverName} will provide care services.\n\n` +
        `Appointment ID: ${appointmentId}\n` +
        `Duration: ${durationHours} hours`;
    const googleLink = generateGoogleCalendarLink({
        title,
        description,
        location,
        startTime,
        endTime
    });
    const icsContent = generateICSContent({
        title,
        description,
        location,
        startTime,
        endTime,
        uid: `appointment-${appointmentId}`
    });
    // Store in Firestore
    await db.collection('calendar_events').doc(appointmentId).set({
        userId,
        type: 'appointment',
        title,
        caregiverName,
        startTime,
        endTime,
        googleLink,
        icsContent,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { googleLink, icsContent };
}
/**
 * Parse time slot string to actual Date
 */
function parseTimeSlotToDate(dateStr, timeSlot) {
    const date = new Date(dateStr);
    const timeMap = {
        'morning': 9,
        'afternoon': 14,
        'evening': 18,
        '6am': 6, '7am': 7, '8am': 8, '9am': 9, '10am': 10, '11am': 11,
        '12pm': 12, '1pm': 13, '2pm': 14, '3pm': 15, '4pm': 16, '5pm': 17,
        '6pm': 18, '7pm': 19, '8pm': 20
    };
    const hour = timeMap[timeSlot.toLowerCase()] || 9;
    date.setHours(hour, 0, 0, 0);
    return date;
}
/**
 * Cloud Function: Send calendar invites when interviews are scheduled
 */
exports.onInterviewScheduledCalendar = functions.firestore
    .document('interviews/{interviewId}')
    .onCreate(async (snap, context) => {
    const interview = snap.data();
    const { interviewId } = context.params;
    if (!interview.proposedTimes || interview.proposedTimes.length === 0) {
        console.log('No proposed times, skipping calendar invite');
        return;
    }
    // Use first proposed time as tentative
    const scheduledTime = new Date(interview.proposedTimes[0]);
    const { googleLink, icsContent } = await createInterviewCalendarEvent(interview.userId, interviewId, interview.caregiverName, scheduledTime);
    // Send WhatsApp with calendar links
    const message = `📅 Interview scheduled with ${interview.caregiverName}!\n\n` +
        `Date: ${scheduledTime.toLocaleDateString()}\n` +
        `Time: ${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n` +
        `Add to your calendar:\n` +
        `📱 Google: ${googleLink}\n\n` +
        `You'll receive the video call link 15 minutes before the interview.`;
    await sendWhatsAppMessage(interview.userPhone, message);
    // Update interview with calendar info
    await snap.ref.update({
        calendarEvent: {
            googleLink,
            icsContent,
            scheduledTime
        }
    });
});
/**
 * Cloud Function: Send calendar invites when appointments are confirmed
 */
exports.onAppointmentConfirmedCalendar = functions.firestore
    .document('appointments/{appointmentId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Only trigger when status changes to confirmed
    if (before.status !== 'confirmed' && after.status === 'confirmed') {
        const { appointmentId } = context.params;
        const { googleLink, icsContent } = await createCareAppointmentCalendarEvent(after.userId, appointmentId, after.caregiverName, after.schedule.date, after.schedule.timeSlot, after.schedule.duration || 4, after.schedule.location);
        // Send WhatsApp with calendar links
        const message = `✅ Your care appointment is confirmed!\n\n` +
            `Caregiver: ${after.caregiverName}\n` +
            `Date: ${after.schedule.date}\n` +
            `Time: ${after.schedule.timeSlot}\n` +
            `Duration: ${after.schedule.duration || 4} hours\n\n` +
            `Add to your calendar:\n` +
            `📱 Google: ${googleLink}`;
        await sendWhatsAppMessage(after.userPhone, message);
        // Update appointment with calendar info
        await change.after.ref.update({
            calendarEvent: {
                googleLink,
                icsContent
            }
        });
    }
});
/**
 * Cloud Function: Weekly schedule summary
 * Sends users their upcoming week's care schedule
 */
exports.weeklyScheduleSummary = functions.pubsub
    .schedule('0 18 * * 6') // Saturdays at 6 PM
    .timeZone('America/Los_Angeles')
    .onRun(async (context) => {
    console.log('📅 Sending weekly schedule summaries...');
    const nextWeekStart = new Date();
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date();
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 8);
    // Get all confirmed appointments for next week
    const appointments = await db.collection('appointments')
        .where('status', '==', 'confirmed')
        .where('schedule.date', '>=', nextWeekStart.toISOString().split('T')[0])
        .where('schedule.date', '<=', nextWeekEnd.toISOString().split('T')[0])
        .get();
    // Group by user
    const byUser = {};
    appointments.docs.forEach(doc => {
        const data = doc.data();
        if (!byUser[data.userId])
            byUser[data.userId] = [];
        byUser[data.userId].push(data);
    });
    // Send summaries
    for (const [userId, userAppointments] of Object.entries(byUser)) {
        const userDoc = await db.collection('cara_users').doc(userId).get();
        const userData = userDoc.data();
        if (!(userData === null || userData === void 0 ? void 0 : userData.phoneNumber))
            continue;
        // Sort by date
        userAppointments.sort((a, b) => new Date(a.schedule.date).getTime() - new Date(b.schedule.date).getTime());
        const scheduleList = userAppointments.map(a => `• ${a.schedule.date}: ${a.caregiverName} (${a.schedule.timeSlot})`).join('\n');
        const message = `📅 Your care schedule for next week:\n\n${scheduleList}\n\n` +
            `Need to make changes? Just reply!`;
        await sendWhatsAppMessage(userData.phoneNumber, message);
    }
    return { success: true, summariesSent: Object.keys(byUser).length };
});
/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(phone, message) {
    // This would integrate with your existing WhatsApp sending logic
    console.log(`Would send to ${phone}:`, message);
}
/**
 * Tool: Get user's upcoming schedule
 */
async function getUpcomingSchedule(userId, days = 7) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const appointments = await db.collection('appointments')
        .where('userId', '==', userId)
        .where('status', 'in', ['confirmed', 'pending_confirmation'])
        .where('schedule.date', '>=', startDate)
        .where('schedule.date', '<=', endDate)
        .orderBy('schedule.date')
        .get();
    return appointments.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
}
/**
 * Tool: Check for scheduling conflicts
 */
async function checkScheduleConflict(userId, date, timeSlot, durationHours) {
    const appointments = await db.collection('appointments')
        .where('userId', '==', userId)
        .where('schedule.date', '==', date)
        .where('status', 'in', ['confirmed', 'pending_confirmation'])
        .get();
    const requestedStart = parseTimeSlotToDate(date, timeSlot);
    const requestedEnd = new Date(requestedStart.getTime() + durationHours * 60 * 60000);
    const conflicts = appointments.docs.filter(doc => {
        const appt = doc.data();
        const apptStart = parseTimeSlotToDate(date, appt.schedule.timeSlot);
        const apptEnd = new Date(apptStart.getTime() + (appt.schedule.duration || 4) * 60 * 60000);
        // Check for overlap
        return (requestedStart < apptEnd && requestedEnd > apptStart);
    });
    return {
        hasConflict: conflicts.length > 0,
        conflictingAppointments: conflicts.map(d => (Object.assign({ id: d.id }, d.data())))
    };
}
//# sourceMappingURL=caraCalendar.js.map