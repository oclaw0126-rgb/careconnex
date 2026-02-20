const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Cara Agent Tools
 * Each tool performs a real action in the CareConnex system
 */
const tools = {
  /**
   * Search for caregivers matching user criteria
   */
  searchCaregivers: async ({ zipCode, needs, maxPrice, specialties }) => {
    console.log('🔍 Searching caregivers:', { zipCode, needs, maxPrice });

    try {
      let query = db.collection('caregivers')
        .where('verified', '==', true)
        .where('available', '==', true);

      // If zipCode provided, filter by service area
      if (zipCode) {
        query = query.where('serviceZipCodes', 'array-contains', zipCode);
      }

      // If maxPrice provided, filter by hourly rate
      if (maxPrice) {
        query = query.where('hourlyRate', '<=', parseInt(maxPrice));
      }

      const snapshot = await query.limit(5).get();

      if (snapshot.empty) {
        return {
          found: false,
          count: 0,
          caregivers: [],
          message: `No caregivers found${zipCode ? ` in ${zipCode}` : ''}. Expanding search...`
        };
      }

      // Filter by needs/specialties client-side for flexibility
      let caregivers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Score by matching needs
      if (needs && needs.length > 0) {
        caregivers = caregivers.map(c => ({
          ...c,
          matchScore: calculateMatchScore(c, needs, specialties)
        })).sort((a, b) => b.matchScore - a.matchScore);
      }

      return {
        found: true,
        count: caregivers.length,
        caregivers: caregivers.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          hourlyRate: c.hourlyRate,
          rating: c.rating || 4.8,
          yearsExperience: c.yearsExperience || 5,
          specialties: c.specialties || [],
          languages: c.languages || ['English'],
          bio: c.bio?.substring(0, 150) + '...' || 'Experienced caregiver',
          matchScore: c.matchScore
        }))
      };
    } catch (error) {
      console.error('❌ searchCaregivers error:', error);
      return {
        found: false,
        error: error.message
      };
    }
  },

  /**
   * Check caregiver availability for specific date/time
   */
  checkAvailability: async ({ caregiverId, date, timeSlot }) => {
    console.log('📅 Checking availability:', { caregiverId, date, timeSlot });

    try {
      // Check existing appointments
      const booked = await db.collection('appointments')
        .where('caregiverId', '==', caregiverId)
        .where('date', '==', date)
        .where('timeSlot', '==', timeSlot)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();

      // Check recurring schedule
      const caregiverDoc = await db.collection('caregivers').doc(caregiverId).get();
      const caregiver = caregiverDoc.data();

      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
      const isRecurringAvailable = caregiver?.recurringSchedule?.[dayOfWeek]?.includes(timeSlot);

      return {
        available: booked.empty && isRecurringAvailable,
        caregiverName: caregiver?.name,
        alternativeSlots: isRecurringAvailable ? [] : caregiver?.recurringSchedule?.[dayOfWeek] || []
      };
    } catch (error) {
      console.error('❌ checkAvailability error:', error);
      return { available: false, error: error.message };
    }
  },

  /**
   * Schedule a video interview
   */
  scheduleInterview: async ({ userId, userPhone, caregiverId, proposedTimes }) => {
    console.log('📞 Scheduling interview:', { userId, caregiverId });

    try {
      // Get caregiver details
      const caregiverDoc = await db.collection('caregivers').doc(caregiverId).get();
      const caregiver = caregiverDoc.data();

      if (!caregiver) {
        return { success: false, error: 'Caregiver not found' };
      }

      // Create interview record
      const interviewRef = await db.collection('interviews').add({
        userId: userId || null,
        userPhone,
        caregiverId,
        caregiverName: caregiver.name,
        caregiverPhone: caregiver.phone,
        proposedTimes: proposedTimes || [],
        status: 'pending_caregiver_response',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Notify caregiver via their preferred channel
      await notifyCaregiver(caregiver, {
        type: 'interview_request',
        interviewId: interviewRef.id,
        message: `New interview request from a client. Times proposed: ${proposedTimes?.join(', ')}`
      });

      return {
        success: true,
        interviewId: interviewRef.id,
        caregiverName: caregiver.name,
        status: 'pending',
        nextStep: 'Waiting for caregiver to confirm time'
      };
    } catch (error) {
      console.error('❌ scheduleInterview error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a booking/appointment
   */
  createBooking: async ({ userId, caregiverId, schedule, needs, notes }) => {
    console.log('📋 Creating booking:', { userId, caregiverId });

    try {
      // Check if caregiver is still available
      const availability = await tools.checkAvailability({
        caregiverId,
        date: schedule.date,
        timeSlot: schedule.timeSlot
      });

      if (!availability.available) {
        return {
          success: false,
          error: 'Caregiver no longer available for this time slot'
        };
      }

      // Create appointment
      const appointmentRef = await db.collection('appointments').add({
        userId,
        caregiverId,
        status: 'pending_confirmation',
        schedule,
        needs: needs || [],
        notes: notes || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update caregiver's booked slots
      await db.collection('caregivers').doc(caregiverId).update({
        [`bookedSlots.${schedule.date}`]: admin.firestore.FieldValue.arrayUnion(schedule.timeSlot)
      });

      return {
        success: true,
        appointmentId: appointmentRef.id,
        status: 'pending_confirmation',
        message: 'Booking created! Waiting for caregiver confirmation.'
      };
    } catch (error) {
      console.error('❌ createBooking error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get user's current bookings/appointments
   */
  getUserBookings: async ({ userId, userPhone }) => {
    console.log('📋 Getting bookings:', { userId, userPhone });

    try {
      let query = db.collection('appointments')
        .where('status', 'in', ['confirmed', 'pending_confirmation']);

      if (userId) {
        query = query.where('userId', '==', userId);
      } else if (userPhone) {
        query = query.where('userPhone', '==', userPhone);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const bookings = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const caregiverDoc = await db.collection('caregivers').doc(data.caregiverId).get();
        const caregiver = caregiverDoc.data();

        return {
          id: doc.id,
          status: data.status,
          schedule: data.schedule,
          caregiverName: caregiver?.name || 'Unknown',
          caregiverPhone: caregiver?.phone
        };
      }));

      return {
        count: bookings.length,
        bookings
      };
    } catch (error) {
      console.error('❌ getUserBookings error:', error);
      return { count: 0, bookings: [], error: error.message };
    }
  },

  /**
   * Update user profile/context
   */
  updateUserContext: async ({ userId, userPhone, key, value }) => {
    console.log('💾 Updating context:', { userId, userPhone, key });

    try {
      const ref = db.collection('cara_users').doc(userPhone || userId);

      await ref.set({
        [key]: value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('❌ updateUserContext error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a notification via preferred channel
   */
  sendNotification: async ({ userPhone, message, type = 'info' }) => {
    console.log('📨 Sending notification:', { userPhone, type });

    try {
      // Store in messages collection for history
      await db.collection('messages').add({
        to: userPhone,
        body: message,
        type,
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Actual sending is handled by the webhook response
      return { success: true, message: 'Message queued' };
    } catch (error) {
      console.error('❌ sendNotification error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Request human support handoff
   */
  requestHumanHandoff: async ({ userId, userPhone, reason }) => {
    console.log('🤝 Human handoff requested:', { userId, userPhone, reason });

    try {
      await db.collection('handoff_requests').add({
        userId,
        userPhone,
        reason,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Notify support team (you'd integrate with your support system)
      return {
        success: true,
        message: 'A support specialist will contact you within 15 minutes.'
      };
    } catch (error) {
      console.error('❌ requestHumanHandoff error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Calculate match score between caregiver and user needs
 */
function calculateMatchScore(caregiver, needs, specialties) {
  let score = 0;

  // Base score from rating
  score += (caregiver.rating || 4.5) * 10;

  // Experience bonus
  score += (caregiver.yearsExperience || 0) * 2;

  // Matching specialties
  if (caregiver.specialties && specialties) {
    const matches = caregiver.specialties.filter(s =>
      specialties.some(need => s.toLowerCase().includes(need.toLowerCase()))
    );
    score += matches.length * 15;
  }

  // Matching needs
  if (caregiver.services && needs) {
    const matches = caregiver.services.filter(s =>
      needs.some(need => s.toLowerCase().includes(need.toLowerCase()))
    );
    score += matches.length * 10;
  }

  return Math.round(score);
}

/**
 * Notify caregiver of interview request
 */
async function notifyCaregiver(caregiver, notification) {
  // TODO: Implement via Twilio/WhatsApp to caregiver
  console.log('📱 Would notify caregiver:', caregiver.name, notification);

  // Store notification for in-app display
  await db.collection('caregiver_notifications').add({
    caregiverId: caregiver.id,
    ...notification,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = { tools };
