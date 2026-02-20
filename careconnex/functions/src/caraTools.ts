import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Tool execution result type
 */
export interface ToolResult {
  success?: boolean;
  found?: boolean;
  count?: number;
  error?: string;
  message?: string;
  caregivers?: any[];
  [key: string]: any;
}

/**
 * Tool parameter types
 */
export interface SearchCaregiversParams {
  zipCode?: string;
  needs?: string[];
  maxPrice?: number;
  specialties?: string[];
}

export interface CheckAvailabilityParams {
  caregiverId: string;
  date: string;
  timeSlot: string;
}

export interface ScheduleInterviewParams {
  userId?: string;
  userPhone?: string;
  caregiverId: string;
  proposedTimes?: string[];
}

export interface CreateBookingParams {
  userId?: string;
  caregiverId: string;
  schedule: {
    date: string;
    timeSlot: string;
    duration?: number;
  };
  needs?: string[];
  notes?: string;
}

export interface GetUserBookingsParams {
  userId?: string;
  userPhone?: string;
}

export interface UpdateUserContextParams {
  userId?: string;
  userPhone?: string;
  key: string;
  value: any;
}

export interface SendNotificationParams {
  userPhone: string;
  message: string;
  type?: 'info' | 'urgent' | 'reminder';
}

export interface RequestHumanHandoffParams {
  userId?: string;
  userPhone?: string;
  reason: string;
}

/**
 * Cara Agent Tools
 * Each tool performs a real action in the CareConnex system
 */
export const tools = {
  /**
   * Search for caregivers matching user criteria
   */
  async searchCaregivers(params: SearchCaregiversParams): Promise<ToolResult> {
    const { zipCode, needs, maxPrice, specialties } = params;
    console.log('🔍 Searching caregivers:', { zipCode, needs, maxPrice });

    try {
      let query: admin.firestore.Query = db.collection('caregivers')
        .where('verified', '==', true)
        .where('available', '==', true);

      // If zipCode provided, filter by service area
      if (zipCode) {
        query = query.where('serviceZipCodes', 'array-contains', zipCode);
      }

      // If maxPrice provided, filter by hourly rate
      if (maxPrice) {
        query = query.where('hourlyRate', '<=', maxPrice);
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
        caregivers = caregivers.map((c: any) => ({
          ...c,
          matchScore: calculateMatchScore(c, needs, specialties)
        })).sort((a: any, b: any) => b.matchScore - a.matchScore);
      }

      return {
        found: true,
        count: caregivers.length,
        caregivers: caregivers.slice(0, 3).map((c: any) => ({
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
    } catch (error: any) {
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
  async checkAvailability(params: CheckAvailabilityParams): Promise<ToolResult> {
    const { caregiverId, date, timeSlot } = params;
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

      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isRecurringAvailable = caregiver?.recurringSchedule?.[dayOfWeek]?.includes(timeSlot);

      return {
        available: booked.empty && isRecurringAvailable,
        caregiverName: caregiver?.name,
        alternativeSlots: isRecurringAvailable ? [] : caregiver?.recurringSchedule?.[dayOfWeek] || []
      };
    } catch (error: any) {
      console.error('❌ checkAvailability error:', error);
      return { available: false, error: error.message };
    }
  },

  /**
   * Schedule a video interview
   */
  async scheduleInterview(params: ScheduleInterviewParams): Promise<ToolResult> {
    const { userId, userPhone, caregiverId, proposedTimes } = params;
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
    } catch (error: any) {
      console.error('❌ scheduleInterview error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a booking/appointment
   */
  async createBooking(params: CreateBookingParams): Promise<ToolResult> {
    const { userId, caregiverId, schedule, needs, notes } = params;
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
    } catch (error: any) {
      console.error('❌ createBooking error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get user's current bookings/appointments
   */
  async getUserBookings(params: GetUserBookingsParams): Promise<ToolResult> {
    const { userId, userPhone } = params;
    console.log('📋 Getting bookings:', { userId, userPhone });

    try {
      let query: admin.firestore.Query = db.collection('appointments')
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
    } catch (error: any) {
      console.error('❌ getUserBookings error:', error);
      return { count: 0, bookings: [], error: error.message };
    }
  },

  /**
   * Update user profile/context
   */
  async updateUserContext(params: UpdateUserContextParams): Promise<ToolResult> {
    const { userId, userPhone, key, value } = params;
    console.log('💾 Updating context:', { userId, userPhone, key });

    try {
      const ref = db.collection('cara_users').doc(userPhone || userId || 'unknown');

      await ref.set({
        [key]: value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error: any) {
      console.error('❌ updateUserContext error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a notification via preferred channel
   */
  async sendNotification(params: SendNotificationParams): Promise<ToolResult> {
    const { userPhone, message, type = 'info' } = params;
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
    } catch (error: any) {
      console.error('❌ sendNotification error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Request human support handoff
   */
  async requestHumanHandoff(params: RequestHumanHandoffParams): Promise<ToolResult> {
    const { userId, userPhone, reason } = params;
    console.log('🤝 Human handoff requested:', { userId, userPhone, reason });

    try {
      await db.collection('handoff_requests').add({
        userId,
        userPhone,
        reason,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'A support specialist will contact you within 15 minutes.'
      };
    } catch (error: any) {
      console.error('❌ requestHumanHandoff error:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // PHASE 2: Additional Tools
  // ==========================================

  /**
   * Cancel a booking/appointment
   */
  async cancelBooking(params: { appointmentId: string; reason?: string; userPhone?: string }): Promise<ToolResult> {
    const { appointmentId, reason, userPhone } = params;
    console.log('❌ Cancelling booking:', { appointmentId, reason });

    try {
      const appointmentRef = db.collection('appointments').doc(appointmentId);
      const appointment = await appointmentRef.get();

      if (!appointment.exists) {
        return { success: false, error: 'Appointment not found' };
      }

      const data = appointment.data();

      // Update appointment status
      await appointmentRef.update({
        status: 'cancelled',
        cancellationReason: reason || 'User requested',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledBy: userPhone || 'user'
      });

      // Free up caregiver's slot
      await db.collection('caregivers').doc(data?.caregiverId).update({
        [`bookedSlots.${data?.schedule.date}`]: admin.firestore.FieldValue.arrayRemove(data?.schedule.timeSlot)
      });

      // Notify caregiver
      await notifyCaregiver(
        { id: data?.caregiverId, name: data?.caregiverName, phone: data?.caregiverPhone },
        {
          type: 'cancellation',
          message: `Appointment on ${data?.schedule.date} at ${data?.schedule.timeSlot} has been cancelled.`
        }
      );

      return {
        success: true,
        message: 'Your appointment has been cancelled. Looking for a replacement caregiver?'
      };
    } catch (error: any) {
      console.error('❌ cancelBooking error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Reschedule a booking to new date/time
   */
  async rescheduleBooking(params: {
    appointmentId: string;
    newDate: string;
    newTimeSlot: string;
    userPhone?: string;
  }): Promise<ToolResult> {
    const { appointmentId, newDate, newTimeSlot } = params;
    console.log('📅 Rescheduling booking:', { appointmentId, newDate, newTimeSlot });

    try {
      const appointmentRef = db.collection('appointments').doc(appointmentId);
      const appointment = await appointmentRef.get();

      if (!appointment.exists) {
        return { success: false, error: 'Appointment not found' };
      }

      const data = appointment.data();
      const oldSchedule = data?.schedule;

      // Check caregiver availability for new time
      const availability = await tools.checkAvailability({
        caregiverId: data?.caregiverId,
        date: newDate,
        timeSlot: newTimeSlot
      });

      if (!availability.available) {
        return {
          success: false,
          error: 'Caregiver not available at the new time',
          alternativeSlots: availability.alternativeSlots
        };
      }

      // Free up old slot
      await db.collection('caregivers').doc(data?.caregiverId).update({
        [`bookedSlots.${oldSchedule.date}`]: admin.firestore.FieldValue.arrayRemove(oldSchedule.timeSlot)
      });

      // Book new slot
      await db.collection('caregivers').doc(data?.caregiverId).update({
        [`bookedSlots.${newDate}`]: admin.firestore.FieldValue.arrayUnion(newTimeSlot)
      });

      // Update appointment
      await appointmentRef.update({
        'schedule.date': newDate,
        'schedule.timeSlot': newTimeSlot,
        status: 'rescheduled',
        rescheduledAt: admin.firestore.FieldValue.serverTimestamp(),
        previousSchedule: oldSchedule
      });

      return {
        success: true,
        message: `Appointment rescheduled to ${newDate} at ${newTimeSlot}`
      };
    } catch (error: any) {
      console.error('❌ rescheduleBooking error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Rate a caregiver after service
   */
  async rateCaregiver(params: {
    appointmentId: string;
    caregiverId: string;
    rating: number;
    feedback?: string;
    userPhone?: string;
  }): Promise<ToolResult> {
    const { appointmentId, caregiverId, rating, feedback, userPhone } = params;
    console.log('⭐ Rating caregiver:', { caregiverId, rating });

    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      // Store rating
      await db.collection('ratings').add({
        appointmentId,
        caregiverId,
        rating,
        feedback: feedback || '',
        userPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update caregiver's average rating
      const caregiverRef = db.collection('caregivers').doc(caregiverId);
      const caregiver = await caregiverRef.get();
      const caregiverData = caregiver.data();

      const currentRating = caregiverData?.rating || 4.5;
      const totalRatings = caregiverData?.totalRatings || 0;
      const newRating = ((currentRating * totalRatings) + rating) / (totalRatings + 1);

      await caregiverRef.update({
        rating: Math.round(newRating * 10) / 10,
        totalRatings: totalRatings + 1,
        lastRatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update appointment
      await db.collection('appointments').doc(appointmentId).update({
        rating,
        ratedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: rating >= 4
          ? 'Thanks for the great feedback! We\'re glad you had a good experience.'
          : 'Thanks for your feedback. We\'ll use it to improve our service.'
      };
    } catch (error: any) {
      console.error('❌ rateCaregiver error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get caregiver detailed profile
   */
  async getCaregiverProfile(params: { caregiverId: string }): Promise<ToolResult> {
    const { caregiverId } = params;
    console.log('👤 Getting caregiver profile:', caregiverId);

    try {
      const caregiverDoc = await db.collection('caregivers').doc(caregiverId).get();

      if (!caregiverDoc.exists) {
        return { success: false, error: 'Caregiver not found' };
      }

      const caregiver = caregiverDoc.data();

      // Get recent ratings
      const ratingsSnapshot = await db.collection('ratings')
        .where('caregiverId', '==', caregiverId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const recentRatings = ratingsSnapshot.docs.map(d => ({
        rating: d.data().rating,
        feedback: d.data().feedback,
        date: d.data().createdAt?.toDate()?.toISOString()
      }));

      return {
        success: true,
        caregiver: {
          id: caregiverId,
          name: caregiver?.name,
          bio: caregiver?.bio,
          hourlyRate: caregiver?.hourlyRate,
          rating: caregiver?.rating,
          yearsExperience: caregiver?.yearsExperience,
          specialties: caregiver?.specialties,
          certifications: caregiver?.certifications,
          languages: caregiver?.languages,
          availability: caregiver?.recurringSchedule,
          recentRatings
        }
      };
    } catch (error: any) {
      console.error('❌ getCaregiverProfile error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Request backup caregiver (for callouts)
   */
  async requestBackupCaregiver(params: {
    appointmentId: string;
    reason?: string;
    userPhone?: string;
  }): Promise<ToolResult> {
    const { appointmentId, reason, userPhone } = params;
    console.log('🆘 Requesting backup caregiver:', { appointmentId, reason });

    try {
      const appointmentRef = db.collection('appointments').doc(appointmentId);
      const appointment = await appointmentRef.get();

      if (!appointment.exists) {
        return { success: false, error: 'Appointment not found' };
      }

      const data = appointment.data();

      // Trigger the caregiver callout flow
      await db.collection('callout_requests').add({
        appointmentId,
        originalCaregiverId: data?.caregiverId,
        userPhone,
        reason: reason || 'Caregiver unavailable',
        status: 'searching_backup',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Find backup caregivers
      const backups = await tools.searchCaregivers({
        zipCode: data?.schedule.zipCode,
        needs: data?.needs,
        maxPrice: data?.hourlyRate + 5 // Allow slightly higher rate for urgency
      });

      return {
        success: true,
        message: 'We\'re searching for a backup caregiver right away. I\'ll notify you within 30 minutes with options.',
        backups: backups.caregivers
      };
    } catch (error: any) {
      console.error('❌ requestBackupCaregiver error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get care tips and advice
   */
  async getCareTips(params: { topic: string; condition?: string }): Promise<ToolResult> {
    const { topic, condition } = params;
    console.log('💡 Getting care tips:', { topic, condition });

    const careTips: Record<string, string> = {
      dementia: `Here are some dementia care tips:\n\n` +
        `• Keep a routine - consistency helps reduce confusion\n` +
        `• Use simple, clear sentences\n` +
        `• Validate their feelings rather than correcting\n` +
        `• Create a calm environment - reduce noise and clutter\n` +
        `• Ensure safety - lock away medications and hazardous items`,

      falls: `Fall prevention tips:\n\n` +
        `• Remove tripping hazards (rugs, cords)\n` +
        `• Install grab bars in bathroom\n` +
        `• Ensure good lighting throughout the home\n` +
        `• Encourage use of assistive devices\n` +
        `• Regular exercise to improve strength and balance`,

      nutrition: `Senior nutrition tips:\n\n` +
        `• Ensure adequate hydration\n` +
        `• Include protein at every meal\n` +
        `• Foods rich in calcium and vitamin D\n` +
        `• Smaller, more frequent meals if appetite is low\n` +
        `• Consider meal delivery services if cooking is difficult`,

      medication: `Medication management tips:\n\n` +
        `• Use a pill organizer\n` +
        `• Set alarms or reminders\n` +
        `• Keep an up-to-date medication list\n` +
        `• Watch for side effects and drug interactions\n` +
        `• Dispose of expired medications safely`
    };

    const topicKey = Object.keys(careTips).find(k => topic.toLowerCase().includes(k));

    if (topicKey) {
      return {
        success: true,
        tips: careTips[topicKey],
        topic: topicKey
      };
    }

    return {
      success: true,
      tips: `I'd be happy to help with ${topic}. Could you tell me more about the specific situation? ` +
        `Common topics I can help with: dementia care, fall prevention, nutrition, medication management.`,
      topic: 'general'
    };
  }
};

/**
 * Calculate match score between caregiver and user needs
 */
function calculateMatchScore(caregiver: any, needs: string[], specialties?: string[]): number {
  let score = 0;

  // Base score from rating
  score += (caregiver.rating || 4.5) * 10;

  // Experience bonus
  score += (caregiver.yearsExperience || 0) * 2;

  // Matching specialties
  if (caregiver.specialties && specialties) {
    const matches = caregiver.specialties.filter((s: string) =>
      specialties.some(need => s.toLowerCase().includes(need.toLowerCase()))
    );
    score += matches.length * 15;
  }

  // Matching needs
  if (caregiver.services && needs) {
    const matches = caregiver.services.filter((s: string) =>
      needs.some(need => s.toLowerCase().includes(need.toLowerCase()))
    );
    score += matches.length * 10;
  }

  return Math.round(score);
}

/**
 * Notify caregiver of interview request
 */
async function notifyCaregiver(caregiver: any, notification: any): Promise<void> {
  // TODO: Implement via Twilio/WhatsApp to caregiver
  console.log('📱 Would notify caregiver:', caregiver.name, notification);

  // Store notification for in-app display
  await db.collection('caregiver_notifications').add({
    caregiverId: caregiver.id,
    ...notification,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
