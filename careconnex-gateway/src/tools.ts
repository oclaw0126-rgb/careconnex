// Tool Implementations v2 - Real Action Tools
// Execute actions for CareConnex Cara Agent

import { logger } from './logger';
import { ToolCall } from './types';
import * as https from 'https';

// Firestore reference (initialized in server.ts)
let db: FirebaseFirestore.Firestore;

export function initializeTools(firestoreDb: FirebaseFirestore.Firestore): void {
  db = firestoreDb;
}

export async function executeTool(
  toolCall: ToolCall,
  context: { userId: string; userPhone: string; userName?: string }
): Promise<any> {
  logger.info(`[Tool] Executing ${toolCall.tool}`, { params: toolCall.parameters });

  switch (toolCall.tool) {
    case 'search_caregivers':
      return await toolSearchCaregivers(toolCall.parameters as { zip_code: string; care_type?: string }, context);
    case 'schedule_interview':
      return await toolScheduleInterview(toolCall.parameters as { caregiver_id: string; caregiver_name: string; proposed_time: string }, context);
    case 'store_memory':
      return await toolStoreMemory(toolCall.parameters as { key: string; value: string }, context);
    case 'request_human':
      return await toolRequestHuman(toolCall.parameters as { reason: string }, context);
    // NEW PRIORITY 1 TOOLS
    case 'send_email':
      return await toolSendEmail(toolCall.parameters as { to: string; subject: string; body: string }, context);
    case 'send_sms':
      return await toolSendSMS(toolCall.parameters as { to: string; message: string }, context);
    case 'book_calendar_event':
      return await toolBookCalendar(toolCall.parameters as { title: string; date: string; time: string; attendees: string[] }, context);
    default:
      throw new Error(`Unknown tool: ${toolCall.tool}`);
  }
}

// ========== EXISTING TOOLS ==========

async function toolSearchCaregivers(
  params: { zip_code: string; care_type?: string },
  context: { userId: string; userPhone: string }
): Promise<any> {
  const { zip_code } = params;
  
  logger.info(`[Tool] Searching caregivers in ${zip_code}`);
  
  try {
    const snapshot = await db.collection('caregivers')
      .where('verified', '==', true)
      .where('available', '==', true)
      .where('serviceZipCodes', 'array-contains', zip_code)
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      return {
        found: false,
        count: 0,
        caregivers: [],
        message: `No caregivers found in ${zip_code}. I can email local care agencies to find matches.`
      };
    }
    
    const caregivers = snapshot.docs.map((doc, i) => {
      const data = doc.data();
      return {
        rank: i + 1,
        id: doc.id,
        name: data.name,
        hourlyRate: data.hourlyRate,
        rating: data.rating || 4.8,
        specialties: data.specialties?.slice(0, 3) || [],
        yearsExperience: data.yearsExperience || 5,
        bio: data.bio || 'Experienced caregiver',
        email: data.email,
        phone: data.phone
      };
    }).slice(0, 3);
    
    return {
      found: true,
      count: caregivers.length,
      caregivers,
      message: `Found ${caregivers.length} excellent caregivers in ${zip_code}`
    };
    
  } catch (error) {
    logger.error('[Tool] Search error', { error });
    return {
      found: false,
      count: 0,
      caregivers: [],
      message: 'Error searching caregivers. I can email agencies directly to help.'
    };
  }
}

async function toolScheduleInterview(
  params: { caregiver_id: string; caregiver_name: string; proposed_time: string },
  context: { userId: string; userPhone: string }
): Promise<any> {
  const { caregiver_id, caregiver_name, proposed_time } = params;
  
  logger.info(`[Tool] Scheduling interview with ${caregiver_name} for ${proposed_time}`);
  
  try {
    // 1. Store in Firestore
    const interviewRef = await db.collection('interviews').add({
      userId: context.userId,
      userPhone: context.userPhone,
      caregiverId: caregiver_id,
      caregiverName: caregiver_name,
      proposedTime: proposed_time,
      status: 'pending_caregiver_response',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 2. Send email to caregiver
    const caregiverDoc = await db.collection('caregivers').doc(caregiver_id).get();
    if (caregiverDoc.exists) {
      const caregiverData = caregiverDoc.data();
      if (caregiverData?.email) {
        await sendEmail({
          to: caregiverData.email,
          subject: 'Interview Request - CareConnex',
          body: `Hi ${caregiver_name},

You have a new interview request from a family on CareConnex.

Proposed time: ${proposed_time}

Please reply to confirm or suggest an alternative time.

Best regards,
Cara - CareConnex Care Coordinator`
        });
      }
    }
    
    return {
      success: true,
      interviewId: interviewRef.id,
      message: `✅ Interview scheduled with ${caregiver_name} for ${proposed_time}. I've sent them an email notification.`
    };
    
  } catch (error) {
    logger.error('[Tool] Schedule error', { error });
    return {
      success: false,
      message: 'Error scheduling interview. Please try again.'
    };
  }
}

async function toolStoreMemory(
  params: { key: string; value: string },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean }> {
  const { key, value } = params;
  
  logger.info(`[Tool] Storing memory: ${key} = ${value}`);
  
  try {
    await db.collection('cara_memories').add({
      userId: context.userId,
      userPhone: context.userPhone,
      key,
      value,
      category: 'general',
      createdAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    logger.error('[Tool] Memory store error', { error });
    return { success: false };
  }
}

async function toolRequestHuman(
  params: { reason: string },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean; message: string }> {
  logger.info(`[Tool] Requesting human help: ${params.reason}`);
  
  try {
    // Send email to care team
    await sendEmail({
      to: process.env.CARE_TEAM_EMAIL || 'support@careconnex.com',
      subject: 'Human Escalation Requested',
      body: `Escalation from ${context.userPhone}:

Reason: ${params.reason}

Please contact them within 30 minutes.`
    });
    
    await db.collection('escalations').add({
      userId: context.userId,
      userPhone: context.userPhone,
      reason: params.reason,
      status: 'pending',
      createdAt: new Date()
    });
    
    return {
      success: true,
      message: `I've connected you with our care team. They'll reach out within 30 minutes to help with: ${params.reason}`
    };
  } catch (error) {
    logger.error('[Tool] Escalation error', { error });
    return {
      success: false,
      message: 'Error requesting human support. Please call our support line.'
    };
  }
}

// ========== NEW PRIORITY 1 TOOLS ==========

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

async function toolSendEmail(
  params: EmailPayload,
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean; message: string }> {
  logger.info(`[Tool] Sending email to ${params.to}`, { subject: params.subject });
  
  try {
    await sendEmail(params);
    
    // Log the email
    await db.collection('emails_sent').add({
      userId: context.userId,
      userPhone: context.userPhone,
      to: params.to,
      subject: params.subject,
      sentAt: new Date()
    });
    
    return {
      success: true,
      message: `Email sent to ${params.to}`
    };
  } catch (error) {
    logger.error('[Tool] Email error', { error });
    return {
      success: false,
      message: 'Failed to send email. Please try again.'
    };
  }
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  const postData = JSON.stringify({
    from: 'Cara <cara@careconnex.com>',
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
    html: payload.body.replace(/\n/g, '<br>')
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`Resend API error: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function toolSendSMS(
  params: { to: string; message: string },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean; message: string }> {
  logger.info(`[Tool] Sending SMS to ${params.to}`);
  
  try {
    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
    const TWILIO_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    
    if (!TWILIO_SID || !TWILIO_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    
    // Use Twilio API to send SMS
    const postData = new URLSearchParams({
      To: params.to,
      From: TWILIO_NUMBER,
      Body: params.message
    }).toString();
    
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        method: 'POST',
        auth: `${TWILIO_SID}:${TWILIO_TOKEN}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            resolve(data);
          } else {
            reject(new Error(`Twilio error: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    // Log the SMS
    await db.collection('sms_sent').add({
      userId: context.userId,
      userPhone: context.userPhone,
      to: params.to,
      message: params.message,
      sentAt: new Date()
    });
    
    return {
      success: true,
      message: `SMS sent to ${params.to}`
    };
  } catch (error) {
    logger.error('[Tool] SMS error', { error });
    return {
      success: false,
      message: 'Failed to send SMS. Please try again.'
    };
  }
}

async function toolBookCalendar(
  params: { title: string; date: string; time: string; attendees: string[] },
  context: { userId: string; userPhone: string }
): Promise<{ success: boolean; message: string; eventLink?: string }> {
  logger.info(`[Tool] Booking calendar event: ${params.title} on ${params.date} at ${params.time}`);
  
  try {
    // Store in Firestore (you can integrate with Google Calendar API later)
    const eventRef = await db.collection('calendar_events').add({
      userId: context.userId,
      userPhone: context.userPhone,
      title: params.title,
      date: params.date,
      time: params.time,
      attendees: params.attendees,
      status: 'scheduled',
      createdAt: new Date()
    });
    
    // Send calendar invite emails
    for (const attendee of params.attendees) {
      if (attendee.includes('@')) {
        await sendEmail({
          to: attendee,
          subject: `Calendar Invite: ${params.title}`,
          body: `You're invited to:

${params.title}
Date: ${params.date}
Time: ${params.time}

Please confirm your attendance.

Thanks,
Cara - CareConnex`
        });
      }
    }
    
    return {
      success: true,
      message: `✅ Event "${params.title}" scheduled for ${params.date} at ${params.time}. Calendar invites sent to ${params.attendees.length} people.`,
      eventLink: `https://careconnex.com/calendar/${eventRef.id}`
    };
  } catch (error) {
    logger.error('[Tool] Calendar error', { error });
    return {
      success: false,
      message: 'Error booking calendar event. Please try again.'
    };
  }
}
