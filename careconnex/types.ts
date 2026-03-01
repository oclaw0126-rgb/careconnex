
export type ViewType =
  | 'landing'
  | 'how-it-works'
  | 'subscription'
  | 'client-signup'
  | 'caregiver-signup'
  | 'client-login'
  | 'caregiver-login'
  | 'forgot-password-client'
  | 'forgot-password-caregiver'
  | 'client'
  | 'client-profile'
  | 'client-inbox'
  | 'care-plan'
  | 'caregiver'
  | 'caregiver-profile'
  | 'caregiver-inbox'
  | 'admin'
  | 'stripe-callback'
  | 'payment-success'
  | 'payment-cancel'
  | 'insurance'
  | 'express-booking';

export interface Senior {
  id: number;
  uid?: string;
  name: string;
  age: number;
  imageUrl?: string;
  needs: string[];
  personality: 'Introvert' | 'Extrovert' | 'Ambivert';
  location: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;  // For SMS notifications
  scheduleNeeded?: string[];
  genderPreference?: 'Female' | 'Male' | 'No Preference';
  excludedTags?: string[];
  familyMembers?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  status: 'active' | 'pending';
}


// Define WeeklySchedule type
export interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string;  // "09:00" (24-hour format)
  end: string;    // "17:00" (24-hour format)
}

// Caregiver Document Types
export interface CaregiverDocument {
  url: string;
  path: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  fileName?: string;
  fileType?: string;
}

export interface CaregiverDocuments {
  driversLicense?: CaregiverDocument;
  driversLicenseBack?: CaregiverDocument;
  insurance?: CaregiverDocument;
  registration?: CaregiverDocument;
}

export interface Caregiver {
  id: string;
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  photo?: string;
  imageUrl?: string; // Legacy field
  hourlyRate: number;
  verified: boolean;
  onboardingStep?: number;
  verificationStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  onboardingStatus?: 'incomplete' | 'complete';
  documents?: CaregiverDocuments;
  backgroundCheckData?: {
    // SECURITY: We NEVER store full SSN in our database
    // SSN is handled by Checkr's embedded flow and tokenized
    checkrCandidateId?: string;  // Checkr's candidate ID (tokenized reference)
    checkrReportId?: string;     // Checkr's report ID
    ssnLastFour?: string;        // Last 4 digits only, if needed for verification
    consentGiven?: boolean;
    legalFirstName?: string;
    legalLastName?: string;
    dob?: string;                // Format: YYYY-MM-DD
    zip?: string;                // ZIP only, not full address
    submittedAt?: string;
    status?: 'pending' | 'clear' | 'consider' | 'suspended';
    completedAt?: string;
  };

  // NEW: Skills & Services
  skills?: string[];  // e.g., ["Driving", "Meal Preparation", "Medical Assistance"]
  certifications?: string[];  // e.g., ["CPR", "First Aid", "CNA"]

  // NEW: Availability
  weeklyAvailability?: WeeklySchedule;

  // NEW: Rate Suggestions
  suggestedRate?: number;  // AI-suggested competitive rate

  // NEW: Gender for preference matching
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';

  instantPayAvailable: boolean;
  personalityTags: string[];
  matchScore: number;
  rating?: number;
  reviewCount?: number;
  distance: number;
  availability: string[];  // Legacy field, will migrate to weeklyAvailability
  backgroundCheckStatus?: 'none' | 'pending' | 'clear' | 'flagged' | 'consider';
  backgroundCheckId?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  latitude?: number;
  longitude?: number;
  location?: string;
  userType?: 'caregiver';
  totalEarnings?: number;
  completedJobs?: number;
  experience?: number;
  hasTransportation?: boolean;
  isSmoker?: boolean;
  medicalSkills?: string[];
  reliabilityScore?: number;
  retentionRate?: number;        // % of clients who rebook (0-100)
  matchReasoning?: string;
  matchFlags?: string[];

  // Micro-Visit
  acceptsMicroVisits?: boolean;
}

// --- JOB BOARD TYPES ---
export interface JobPost {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  rate: number;
  date: string; // "2024-01-01"
  startTime: string; // "09:00 AM"
  endTime: string; // "05:00 PM"
  location: string; // Zip or Neighborhood
  distance?: number; // Calculated relative to caregiver
  requirements: string[]; // ["Dementia", "Driving"]
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

// --- MICRO-VISIT TYPES ---
export interface MicroTask {
  id: string;
  name: string;
  durationMin: number;
  flatRate: number;
  category?: 'hygiene' | 'medical' | 'household' | 'wellness';
}

export const MICRO_TASKS: MicroTask[] = [
  { id: 'bath', name: 'Bath Visit', durationMin: 45, flatRate: 40, category: 'hygiene' },
  { id: 'meds', name: 'Medication Reminder', durationMin: 30, flatRate: 30, category: 'medical' },
  { id: 'meal', name: 'Meal Prep & Drop-off', durationMin: 60, flatRate: 45, category: 'household' },
  { id: 'wound', name: 'Wound Care', durationMin: 45, flatRate: 50, category: 'medical' }
];

// --- ADMIN TYPES ---
export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  userType: 'client' | 'caregiver';
  createdAt: string;
  isBanned?: boolean;
  verified?: boolean;
}

export interface MatchFeedback {
  id?: string;
  seniorId: string;
  caregiverId: string;
  action: 'hired' | 'rejected' | 'viewed';
  reason?: string;
  timestamp: string;
}

export interface Review {
  id: string;
  caregiverId: string;
  clientId?: string;
  clientName: string;
  caregiverName?: string;
  rating: number;
  comment: string;
  date: string;
  categories?: {
    punctuality: number;
    professionalism: number;
    communication: number;
    careQuality: number;
  };
  wouldRecommend?: boolean;
  wouldRehire?: boolean;
  response?: {
    text: string;
    respondedAt: string;
  };
}

export interface SystemLog {
  id: number;
  timestamp: string;
  event: string;
  type: 'info' | 'warning' | 'success';
}

export interface Gig {
  id: number;
  title: string;
  time: string;
  rate: number;
  distance: number;
  clientName: string;
}

export interface Appointment {
  id: string;
  clientId?: string;
  caregiverId: string;
  caregiverName: string;
  clientName: string;
  date: string;
  isoDate: string;
  time: string;
  duration: number; // Duration in hours
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  cost: number;
  hasReview?: boolean;
  cancelledBy?: 'client' | 'caregiver';
  cancellationReason?: string;
  cancelledAt?: string;
  clockInTime?: string;
  clockOutTime?: string;
  clockInLocation?: { lat: number; lng: number };

  // Micro-Visit Fields
  bookingType?: 'hourly' | 'task';
  taskName?: string;
  isMicroVisit?: boolean;

  // Insurance Fields
  hasInsurance?: boolean;
  insuranceProvider?: string; // e.g. 'Bunker'
  insurancePolicyId?: string;
  insuranceFee?: number;
  insurancePremium?: number;
  insuranceCertificateUrl?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export type AddToastFunction = (message: string, type: ToastType) => void;

// Care Journal Types - Family Command Center
export interface CareJournalEntry {
  id: string;
  appointmentId: string;
  caregiverId: string;
  seniorId: string;
  timestamp: string;
  checkInTime: string;
  checkOutTime?: string;
  photos: string[];
  notes: string;
  wellness: {
    ateWell: boolean;
    tookMeds: boolean;
    wasActive: boolean;
    mood: 'great' | 'good' | 'ok' | 'poor';
  };
  activities: string[];
}

// AI Matching Types
export interface MatchScore {
  caregiverId: string;
  overallScore: number;
  breakdown: {
    skillsMatch: number;
    availabilityMatch: number;
    personalityMatch: number;
    distanceScore: number;
    ratingScore: number;
    rebookingRate: number;
  };
  reasoning: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  recommendedCaregivers?: Caregiver[];
  suggestions?: string[];
  isEmergency?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  createdAt?: any;
  isRead: boolean;
}

export interface Thread {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: DirectMessage[];
  participants?: string[];
}

// --- CARE PLAN INTERFACES ---
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  isPrimary: boolean;
}

export interface RoutineTask {
  id: string;
  time: string;
  description: string;
  category: 'meal' | 'medication' | 'activity' | 'hygiene';
  isCompleted?: boolean;
}

export interface CarePlan {
  medications: Medication[];
  emergencyContacts: EmergencyContact[];
  dailyRoutine: RoutineTask[];
  accessCodes?: string;
  dietaryRestrictions?: string;
}

// --- SUPPORT INTERFACES ---
export interface SupportTicket {
  id?: string;
  userId: string;
  userName?: string;
  userType?: 'client' | 'caregiver';
  type: 'dispute' | 'refund' | 'safety' | 'technical' | 'other';
  subject?: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
}

// --- NOTIFICATION HISTORY ---
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'system' | 'message' | 'alert';
  isRead: boolean;
  createdAt: string;
}

// --- BACKGROUND CHECK PII ---
export interface BackgroundCheckData {
  legalFirstName: string;
  legalLastName: string;
  dob: string;
  ssn: string;
  zipCode: string;
}

// Predefined skill options
export const CAREGIVER_SKILLS = [
  'Driving & Transportation',
  'Meal Preparation',
  'Light Housekeeping',
  'Medication Reminders',
  'Medical Assistance',
  'Companionship',
  'Mobility Support',
  'Personal Care',
  'Dementia Care',
  'Physical Therapy Support'
] as const;

export type CaregiverSkill = typeof CAREGIVER_SKILLS[number];

// --- EMERGENCY ALERT ---
export interface EmergencyAlert {
  id: string;
  initiatorId: string;
  initiatorType: 'client' | 'caregiver';
  timestamp: string;
  location?: { lat: number; lng: number };
  status: 'active' | 'resolved';
  notifiedContacts: string[];
}

// --- VIDEO INTERVIEW TYPES ---
export type VideoInterviewStatus = 'requested' | 'accepted' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'missed';

export interface VideoInterview {
  id: string;
  clientId: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  scheduledTime: string; // ISO timestamp
  duration?: number; // in minutes
  status: VideoInterviewStatus;
  roomSid?: string; // Twilio room SID
  roomName?: string;
  recordingUrl?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
}

/**
 * Firebase Auth User - use this instead of `any`
 */
export type User = import('firebase/auth').User | null;

/**
 * Extended user profile stored in Firestore
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  userType: 'client' | 'caregiver' | 'admin';
  createdAt: string;
  updatedAt?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  smsOptIn?: boolean;
  pushOptIn?: boolean;
  timezone?: string;
}
