import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Cara Proactive Cron Jobs
 * These run automatically to keep users engaged and cared for
 */

/**
 * Daily morning check - 9 AM
 * Sends reminders for today's appointments
 */
export const caraDailyCheck = functions.pubsub
  .schedule('0 9 * * *')  // 9 AM daily
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('🌅 Running Cara daily check...');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's appointments
      const appointments = await db.collection('appointments')
        .where('schedule.date', '==', today)
        .where('status', 'in', ['confirmed', 'pending_confirmation'])
        .get();

      console.log(`Found ${appointments.size} appointments for today`);

      for (const doc of appointments.docs) {
        const appt = doc.data();

        // Send reminder to client
        await sendWhatsAppMessage(
          appt.userPhone,
          `Good morning! ☀️ ${appt.caregiverName} arrives at ${appt.schedule.timeSlot} today. ` +
          `Reply CONFIRM to confirm or RESCHEDULE if you need to change.`
        );

        // Send reminder to caregiver
        if (appt.caregiverPhone) {
          await sendWhatsAppMessage(
            appt.caregiverPhone,
            `Reminder: You have a shift with ${appt.clientName} at ${appt.schedule.timeSlot} today. ` +
            `Location: ${appt.schedule.location || 'Client home'}`
          );
        }

        // Mark reminder sent
        await doc.ref.update({
          'reminders.morningSent': true,
          'reminders.morningSentAt': admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true, remindersSent: appointments.size };
    } catch (error) {
      console.error('❌ Daily check error:', error);
      return { success: false, error };
    }
  });

/**
 * Post-interview follow-up - runs every hour
 * Sends follow-up 30 minutes after interview completion
 */
export const caraInterviewFollowup = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    console.log('💬 Checking for interview follow-ups...');

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find completed interviews from 30-90 minutes ago that haven't been followed up
      const interviews = await db.collection('interviews')
        .where('status', '==', 'completed')
        .where('completedAt', '>=', thirtyMinutesAgo)
        .where('followupSent', '!=', true)
        .get();

      console.log(`Found ${interviews.size} interviews needing follow-up`);

      for (const doc of interviews.docs) {
        const interview = doc.data();

        await sendWhatsAppMessage(
          interview.userPhone,
          `How did your interview with ${interview.caregiverName} go? 🤔\n\n` +
          `Reply BOOK to hire them\n` +
          `Reply NEXT to see other caregivers\n` +
          `Reply MORE to schedule another interview`
        );

        await doc.ref.update({
          followupSent: true,
          followupSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true, followupsSent: interviews.size };
    } catch (error) {
      console.error('❌ Interview followup error:', error);
      return { success: false, error };
    }
  });

/**
 * Weekly check-in - Sundays at 6 PM
 * Asks how care is going
 */
export const caraWeeklyCheckin = functions.pubsub
  .schedule('0 18 * * 0')  // 6 PM Sundays
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('📅 Running weekly check-in...');

    try {
      // Get active clients (have had appointments in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const activeUsers = await db.collection('cara_users')
        .where('lastAppointmentAt', '>=', thirtyDaysAgo)
        .get();

      console.log(`Found ${activeUsers.size} active users for weekly check-in`);

      for (const doc of activeUsers.docs) {
        const user = doc.data();

        await sendWhatsAppMessage(
          user.phoneNumber,
          `Hi ${user.whatsappName?.split(' ')[0] || 'there'}! 👋\n\n` +
          `Just checking in - how is everything going with your caregiver? ` +
          `Any concerns or adjustments needed?\n\n` +
          `Reply GREAT if things are good\n` +
          `Reply ISSUE if you need help`
        );

        await doc.ref.update({
          'checkIns.lastWeekly': admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true, checkinsSent: activeUsers.size };
    } catch (error) {
      console.error('❌ Weekly check-in error:', error);
      return { success: false, error };
    }
  });

/**
 * Re-engage dormant users - Wednesdays at 11 AM
 * Reaches out to users who haven't booked in 14 days
 */
export const caraReengageDormant = functions.pubsub
  .schedule('0 11 * * 3')  // 11 AM Wednesdays
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('💤 Re-engaging dormant users...');

    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const dormantUsers = await db.collection('cara_users')
        .where('lastMessageAt', '<=', fourteenDaysAgo)
        .where('status', '!=', 'completed')
        .limit(50)
        .get();

      console.log(`Found ${dormantUsers.size} dormant users`);

      for (const doc of dormantUsers.docs) {
        const user = doc.data();

        await sendWhatsAppMessage(
          user.phoneNumber,
          `Hi ${user.whatsappName?.split(' ')[0] || 'there'}! 👋\n\n` +
          `We noticed you haven't found a caregiver yet. Can I help with:\n\n` +
          `• More caregiver options\n` +
          `• Answering questions about care\n` +
          `• Scheduling another interview\n\n` +
          `Just reply what you need!`
        );

        await doc.ref.update({
          'reengagement.lastSent': admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true, reengagementsSent: dormantUsers.size };
    } catch (error) {
      console.error('❌ Re-engagement error:', error);
      return { success: false, error };
    }
  });

/**
 * Appointment completion check - runs every 15 minutes
 * Checks if appointments ended and requests feedback
 */
export const caraAppointmentCompletion = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    console.log('✅ Checking for completed appointments...');

    try {
      // Find confirmed appointments that likely ended (2+ hours ago)
      const appointments = await db.collection('appointments')
        .where('status', '==', 'confirmed')
        .where('schedule.date', '==', new Date().toISOString().split('T')[0])
        .get();

      for (const doc of appointments.docs) {
        const appt = doc.data();
        const apptTime = parseTimeSlot(appt.schedule.timeSlot);
        const now = new Date();

        // If appointment likely ended
        if (apptTime && now.getHours() > apptTime + 2) {
          // Request feedback
          await sendWhatsAppMessage(
            appt.userPhone,
            `How did today's care go with ${appt.caregiverName}? ⭐\n\n` +
            `Please rate 1-5 (5 = excellent)\n` +
            `Or reply SKIP if you'd rather not rate today`
          );

          await doc.ref.update({
            status: 'awaiting_feedback',
            feedbackRequestedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Appointment completion error:', error);
      return { success: false, error };
    }
  });

/**
 * Birthday/Anniversary check - daily at 10 AM
 * Sends warm wishes for caregiver/client milestones
 */
export const caraMilestoneGreetings = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('🎉 Checking for milestones...');

    try {
      const today = new Date();
      const monthDay = `${today.getMonth() + 1}-${today.getDate()}`;

      // Find users with birthdays today
      const birthdayUsers = await db.collection('cara_users')
        .where('birthday', '==', monthDay)
        .get();

      for (const doc of birthdayUsers.docs) {
        const user = doc.data();

        await sendWhatsAppMessage(
          user.phoneNumber,
          `🎂 Happy Birthday${user.whatsappName ? ' ' + user.whatsappName.split(' ')[0] : ''}!\n\n` +
          `Wishing you a wonderful day filled with joy. ` +
          `If you need any care support today, we're here for you! 💜`
        );
      }

      return { success: true, greetingsSent: birthdayUsers.size };
    } catch (error) {
      console.error('❌ Milestone greeting error:', error);
      return { success: false, error };
    }
  });

/**
 * Caregiver availability reminder - daily at 8 AM
 * Reminds caregivers to update their availability
 */
export const caraCaregiverAvailabilityReminder = functions.pubsub
  .schedule('0 8 * * 1')  // 8 AM Mondays
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('📋 Reminding caregivers to update availability...');

    try {
      // Get caregivers who haven't updated availability in 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const caregivers = await db.collection('caregivers')
        .where('availabilityLastUpdated', '<=', sevenDaysAgo)
        .where('available', '==', true)
        .limit(100)
        .get();

      console.log(`Found ${caregivers.size} caregivers needing availability update`);

      for (const doc of caregivers.docs) {
        const caregiver = doc.data();

        await sendWhatsAppMessage(
          caregiver.phone,
          `Good morning ${caregiver.name}! ☀️\n\n` +
          `Quick reminder to update your availability for next week. ` +
          `This helps us match you with more clients.\n\n` +
          `Reply UPDATE to update your schedule`
        );
      }

      return { success: true, remindersSent: caregivers.size };
    } catch (error) {
      console.error('❌ Caregiver reminder error:', error);
      return { success: false, error };
    }
  });

// Helper functions

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const twilioSid = functions.config().twilio?.sid || process.env.TWILIO_SID;
  const twilioToken = functions.config().twilio?.token || process.env.TWILIO_TOKEN;
  const twilioWhatsAppNumber = functions.config().twilio?.whatsapp_number || process.env.TWILIO_WHATSAPP_NUMBER;

  if (!twilioSid || !twilioToken) {
    console.log('Would send WhatsApp:', { phone, message });
    return;
  }

  try {
    const twilio = require('twilio')(twilioSid, twilioToken);

    await twilio.messages.create({
      body: message,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${phone}`
    });

    console.log('WhatsApp sent to:', phone);
  } catch (error) {
    console.error('Failed to send WhatsApp:', error);
  }
}

/**
 * Parse time slot to hour
 */
function parseTimeSlot(timeSlot: string): number | null {
  const times: Record<string, number> = {
    'morning': 9,
    'afternoon': 14,
    'evening': 18,
    '6am': 6,
    '7am': 7,
    '8am': 8,
    '9am': 9,
    '10am': 10,
    '11am': 11,
    '12pm': 12,
    '1pm': 13,
    '2pm': 14,
    '3pm': 15,
    '4pm': 16,
    '5pm': 17,
    '6pm': 18,
    '7pm': 19,
    '8pm': 20,
    '9pm': 21
  };

  return times[timeSlot.toLowerCase()] || null;
}
