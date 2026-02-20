import { db } from '../lib/firebase';
import { Caregiver, Senior, JobPost, Appointment, Review, SupportTicket, AppNotification } from '../types';

// Mark all seed data with this flag for easy cleanup
const SEED_DATA_FLAG = { _seedData: true, seededAt: new Date().toISOString() };

// Sample data pools for realistic generation
const FIRST_NAMES = ['Maria', 'John', 'Sarah', 'David', 'Lisa', 'Michael', 'Jennifer', 'Robert', 'Emily', 'James', 'Emma', 'William', 'Olivia', 'Joseph', 'Sophia', 'Thomas', 'Isabella', 'Charles', 'Mia', 'Daniel'];
const LAST_NAMES = ['Garcia', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const SKILLS_POOL = ['Driving', 'Meal Preparation', 'Medication Management', 'Dementia Care', 'Mobility Assistance', 'Bathing', 'Grooming', 'Companionship', 'Exercise Support', 'Housekeeping', 'Laundry', 'Grocery Shopping', 'Pet Care', 'Wound Care', 'CPR Certified', 'First Aid'];
const CERTIFICATIONS_POOL = ['CPR', 'First Aid', 'CNA', 'LVN', 'RN', 'HHA', 'PCA', 'Dementia Specialist', 'Medication Aide'];
const LOCATIONS = [
  { city: 'Los Angeles', zip: '90210', lat: 34.0901, lng: -118.4065 },
  { city: 'Santa Monica', zip: '90401', lat: 34.0195, lng: -118.4912 },
  { city: 'Beverly Hills', zip: '90210', lat: 34.0736, lng: -118.4004 },
  { city: 'Pasadena', zip: '91101', lat: 34.1478, lng: -118.1445 },
  { city: 'Glendale', zip: '91201', lat: 34.1425, lng: -118.2551 },
  { city: 'Long Beach', zip: '90802', lat: 33.7701, lng: -118.1937 },
  { city: 'Torrance', zip: '90501', lat: 33.8358, lng: -118.3406 },
  { city: 'Anaheim', zip: '92801', lat: 33.8366, lng: -117.9143 },
];
const PERSONALITY_TAGS = ['Patient', 'Punctual', 'Friendly', 'Professional', 'Experienced', 'Caring', 'Detail-oriented', 'Reliable', 'Compassionate', 'Energetic'];
const SENIOR_NEEDS = ['Mobility Assistance', 'Medication Reminders', 'Meal Preparation', 'Companionship', 'Dementia Care', 'Bathing Assistance', 'Transportation', 'Housekeeping'];
const JOB_TITLES = ['Part-time Caregiver Needed', 'Weekend Companion Care', 'Overnight Care Specialist', 'Dementia Care Expert', 'Live-in Caregiver', 'Elderly Companion', 'Post-Surgery Care', 'Respite Care Provider'];
const REVIEW_COMMENTS = [
  'Amazing caregiver! Very patient and kind with my mother.',
  'Professional and always on time. Highly recommend!',
  'Great communication and really cares about their clients.',
  'Went above and beyond expectations. Will hire again.',
  'Very knowledgeable about dementia care. Made us feel at ease.',
  'Punctual, professional, and genuinely caring.',
  'Excellent with medication management. Very thorough.',
  'My father loves having them visit. Great companion.',
  'Helped with transportation to appointments. Very reliable.',
  'Wonderful meal preparation. Mom eats so much better now.'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateId(): string {
  return `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a caregiver with all required fields
export function generateCaregiver(index: number): Caregiver {
  const firstName = getRandomItem(FIRST_NAMES);
  const lastName = getRandomItem(LAST_NAMES);
  const location = getRandomItem(LOCATIONS);
  const experience = Math.floor(Math.random() * 15) + 1;
  const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
  const reviewCount = Math.floor(Math.random() * 50) + 5;
  
  return {
    id: `caregiver_seed_${index}`,
    uid: `caregiver_seed_${index}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    phone: `555-${String(Math.floor(Math.random() * 8999) + 1000).padStart(4, '0')}`,
    bio: `Experienced caregiver with ${experience} years of experience providing compassionate care for seniors. Specialized in ${getRandomItems(SKILLS_POOL, 3).join(', ')}.`,
    hourlyRate: Math.floor(Math.random() * 20) + 20, // $20-40/hr
    verified: true,
    verificationStatus: 'approved',
    onboardingStatus: 'complete',
    backgroundCheckStatus: 'clear',
    skills: getRandomItems(SKILLS_POOL, Math.floor(Math.random() * 5) + 3),
    certifications: getRandomItems(CERTIFICATIONS_POOL, Math.floor(Math.random() * 3) + 1),
    gender: getRandomItem(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
    instantPayAvailable: Math.random() > 0.3,
    personalityTags: getRandomItems(PERSONALITY_TAGS, 3),
    matchScore: Math.floor(Math.random() * 30) + 70,
    rating,
    reviewCount,
    distance: Math.round(Math.random() * 20 * 10) / 10,
    availability: ['Monday', 'Wednesday', 'Friday'],
    latitude: location.lat + (Math.random() - 0.5) * 0.1,
    longitude: location.lng + (Math.random() - 0.5) * 0.1,
    location: `${location.city}, CA ${location.zip}`,
    userType: 'caregiver',
    totalEarnings: Math.floor(Math.random() * 50000) + 5000,
    completedJobs: Math.floor(Math.random() * 100) + 10,
    experience,
    hasTransportation: Math.random() > 0.2,
    isSmoker: Math.random() > 0.9,
    medicalSkills: getRandomItems(['Wound Care', 'Diabetes Management', 'Blood Pressure Monitoring', 'Oxygen Therapy'], Math.floor(Math.random() * 2)),
    reliabilityScore: Math.floor(Math.random() * 20) + 80,
    acceptsMicroVisits: Math.random() > 0.5,
    ...SEED_DATA_FLAG,
  } as Caregiver;
}

// Generate a senior/client
export function generateSenior(index: number): { senior: Senior; userData: any } {
  const firstName = getRandomItem(FIRST_NAMES);
  const lastName = getRandomItem(LAST_NAMES);
  const location = getRandomItem(LOCATIONS);
  const age = Math.floor(Math.random() * 25) + 65;
  
  const senior: Senior = {
    id: index,
    uid: `client_seed_${index}`,
    name: `${firstName} ${lastName}`,
    age,
    needs: getRandomItems(SENIOR_NEEDS, Math.floor(Math.random() * 4) + 2),
    personality: getRandomItem(['Introvert', 'Extrovert', 'Ambivert']),
    location: `${location.city}, CA`,
    zipCode: location.zip,
    latitude: location.lat + (Math.random() - 0.5) * 0.05,
    longitude: location.lng + (Math.random() - 0.5) * 0.05,
    phone: `555-${String(Math.floor(Math.random() * 8999) + 1000).padStart(4, '0')}`,
    scheduleNeeded: getRandomItems(['Morning', 'Afternoon', 'Evening', 'Weekends'], Math.floor(Math.random() * 3) + 1),
    genderPreference: getRandomItem(['Female', 'Male', 'No Preference']),
    excludedTags: [],
    familyMembers: [{
      id: `family_${index}`,
      name: getRandomItem(FIRST_NAMES) + ' ' + lastName,
      email: `family${index}@example.com`,
      role: 'admin',
      status: 'active'
    }]
  };

  const userData = {
    uid: `client_seed_${index}`,
    name: senior.name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    userType: 'client',
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    isBanned: false,
    verified: true,
    zipCode: location.zip,
    location: `${location.city}, CA ${location.zip}`,
    latitude: senior.latitude,
    longitude: senior.longitude,
    ...SEED_DATA_FLAG,
  };

  return { senior, userData };
}

// Generate a job post
export function generateJobPost(index: number, clientId: string, clientName: string): JobPost {
  const location = getRandomItem(LOCATIONS);
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
  
  return {
    id: `job_seed_${index}`,
    clientId,
    clientName,
    title: getRandomItem(JOB_TITLES),
    description: `Looking for a compassionate caregiver to assist with ${getRandomItems(SENIOR_NEEDS, 2).join(' and ')}. Must be patient, reliable, and experienced with elderly care.`,
    rate: Math.floor(Math.random() * 15) + 25, // $25-40/hr
    date: date.toISOString().split('T')[0],
    startTime: `${Math.floor(Math.random() * 4) + 8}:00 AM`,
    endTime: `${Math.floor(Math.random() * 4) + 2}:00 PM`,
    location: `${location.city}, CA ${location.zip}`,
    distance: Math.round(Math.random() * 15 * 10) / 10,
    requirements: getRandomItems(SKILLS_POOL, Math.floor(Math.random() * 3) + 1),
    status: 'open',
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    ...SEED_DATA_FLAG,
  };
}

// Generate an appointment
export function generateAppointment(index: number, caregiverId: string, caregiverName: string, clientId: string, clientName: string): Appointment {
  const date = new Date();
  const isPast = Math.random() > 0.5;
  date.setDate(date.getDate() + (isPast ? -Math.floor(Math.random() * 30) : Math.floor(Math.random() * 30)));
  
  const statuses = ['scheduled', 'completed', 'cancelled'];
  const status = isPast ? getRandomItem(['completed', 'cancelled']) : 'scheduled';
  
  return {
    id: `appointment_seed_${index}`,
    caregiverId,
    caregiverName,
    clientId,
    clientName,
    date: date.toISOString().split('T')[0],
    isoDate: date.toISOString().split('T')[0],
    startTime: `${Math.floor(Math.random() * 4) + 8}:00 AM`,
    endTime: `${Math.floor(Math.random() * 4) + 12}:00 PM`,
    status: status as any,
    address: getRandomItem(LOCATIONS).zip,
    totalCost: Math.floor(Math.random() * 150) + 100,
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    paymentStatus: status === 'completed' ? 'paid' : 'pending',
    notes: 'Regular care visit. Client doing well.',
    ...SEED_DATA_FLAG,
  };
}

// Generate a review
export function generateReview(index: number, caregiverId: string, clientId: string, clientName: string): Review {
  const ratings = {
    overall: Math.floor(Math.random() * 2) + 4, // 4-5 stars
    punctuality: Math.floor(Math.random() * 3) + 3,
    professionalism: Math.floor(Math.random() * 2) + 4,
    communication: Math.floor(Math.random() * 2) + 4,
    careQuality: Math.floor(Math.random() * 2) + 4,
  };
  
  return {
    id: `review_seed_${index}`,
    caregiverId,
    clientId,
    clientName,
    appointmentId: `appointment_seed_${index}`,
    ratings,
    comment: getRandomItem(REVIEW_COMMENTS),
    wouldRecommend: Math.random() > 0.1,
    wouldRehire: Math.random() > 0.15,
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    helpful: Math.floor(Math.random() * 20),
    ...SEED_DATA_FLAG,
  };
}

// Generate a support ticket
export function generateTicket(index: number, userId: string, userName: string, userType: 'client' | 'caregiver'): SupportTicket {
  const subjects = [
    'Issue with payment processing',
    'Need to update availability',
    'Question about background check',
    'App not showing notifications',
    'Request for receipt',
    'How do I cancel an appointment?',
    'Profile verification issue',
    'Cannot message caregiver'
  ];
  
  const statuses = ['open', 'in_progress', 'resolved'];
  
  return {
    id: `ticket_seed_${index}`,
    userId,
    userName,
    userType,
    subject: getRandomItem(subjects),
    description: 'User reported this issue via the support form. Please assist.',
    status: getRandomItem(statuses) as any,
    priority: getRandomItem(['low', 'medium', 'high']),
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    updatedAt: new Date().toISOString(),
    responses: [],
    ...SEED_DATA_FLAG,
  };
}

// Generate a notification
export function generateNotification(index: number, userId: string): AppNotification {
  const types = ['booking', 'message', 'alert', 'system'] as const;
  const type = getRandomItem(types);
  
  const titles: Record<string, string> = {
    booking: 'New Booking Confirmed',
    message: 'New Message Received',
    alert: 'Important Alert',
    system: 'System Update'
  };
  
  const messages: Record<string, string> = {
    booking: 'Your appointment has been confirmed for tomorrow.',
    message: 'You have a new message from a client.',
    alert: 'Please update your availability for next week.',
    system: 'Your profile has been verified successfully.'
  };
  
  return {
    id: `notification_seed_${index}`,
    userId,
    type,
    title: titles[type],
    message: messages[type],
    read: Math.random() > 0.5,
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    actionUrl: type === 'booking' ? '/appointments' : type === 'message' ? '/inbox' : null,
    ...SEED_DATA_FLAG,
  };
}

// Main seed function
export async function seedDatabase(counts: {
  caregivers?: number;
  clients?: number;
  jobs?: number;
  appointments?: number;
  reviews?: number;
  tickets?: number;
  notifications?: number;
} = {}): Promise<{ success: boolean; message: string; created: Record<string, number> }> {
  if (!db) {
    throw new Error('Database not initialized - Firebase not connected');
  }

  const {
    caregivers = 10,
    clients = 5,
    jobs = 8,
    appointments = 15,
    reviews = 20,
    tickets = 5,
    notifications = 10
  } = counts;

  console.log(`[SEED] Starting database seeding: ${caregivers} caregivers, ${clients} clients...`);

  const created: Record<string, number> = {
    caregivers: 0,
    clients: 0,
    jobs: 0,
    appointments: 0,
    reviews: 0,
    tickets: 0,
    notifications: 0
  };

  try {
    // 1. Create caregivers individually to avoid batch limits
    console.log('[SEED] Creating caregivers...');
    const caregiverIds: string[] = [];
    for (let i = 0; i < caregivers; i++) {
      const caregiver = generateCaregiver(i);
      caregiverIds.push(caregiver.uid);
      await db.collection('caregivers').doc(caregiver.uid).set(caregiver);
      created.caregivers++;
      console.log(`[SEED] Created caregiver ${i + 1}/${caregivers}: ${caregiver.name}`);
    }

    // 2. Create clients/seniors
    console.log('[SEED] Creating clients...');
    const clientIds: string[] = [];
    for (let i = 0; i < clients; i++) {
      const { senior, userData } = generateSenior(i);
      clientIds.push(senior.uid!);
      await db.collection('users').doc(senior.uid!).set(userData);
      await db.collection('senior_profiles').doc(senior.uid!).set(senior);
      created.clients++;
      console.log(`[SEED] Created client ${i + 1}/${clients}: ${senior.name}`);
    }

    // 3. Create job posts
    console.log('[SEED] Creating job posts...');
    for (let i = 0; i < jobs; i++) {
      const clientId = getRandomItem(clientIds);
      const clientDoc = await db.collection('users').doc(clientId).get();
      const clientName = clientDoc.data()?.name || 'Unknown Client';
      const job = generateJobPost(i, clientId, clientName);
      await db.collection('job_posts').doc(job.id).set(job);
      created.jobs++;
    }

    // 4. Create appointments
    console.log('[SEED] Creating appointments...');
    for (let i = 0; i < appointments; i++) {
      const caregiverId = getRandomItem(caregiverIds);
      const clientId = getRandomItem(clientIds);
      const caregiverDoc = await db.collection('caregivers').doc(caregiverId).get();
      const clientDoc = await db.collection('users').doc(clientId).get();
      const caregiverName = caregiverDoc.data()?.name || 'Unknown Caregiver';
      const clientName = clientDoc.data()?.name || 'Unknown Client';
      const appointment = generateAppointment(i, caregiverId, caregiverName, clientId, clientName);
      await db.collection('appointments').doc(appointment.id).set(appointment);
      created.appointments++;
    }

    // 5. Create reviews
    console.log('[SEED] Creating reviews...');
    for (let i = 0; i < reviews; i++) {
      const caregiverId = getRandomItem(caregiverIds);
      const clientId = getRandomItem(clientIds);
      const clientDoc = await db.collection('users').doc(clientId).get();
      const clientName = clientDoc.data()?.name || 'Unknown Client';
      const review = generateReview(i, caregiverId, clientId, clientName);
      await db.collection('reviews').doc(review.id).set(review);
      created.reviews++;
    }

    // 6. Create support tickets
    console.log('[SEED] Creating support tickets...');
    for (let i = 0; i < tickets; i++) {
      const isClient = Math.random() > 0.5;
      const userId = isClient ? getRandomItem(clientIds) : getRandomItem(caregiverIds);
      const userDoc = await db.collection(isClient ? 'users' : 'caregivers').doc(userId).get();
      const userName = userDoc.data()?.name || 'Unknown User';
      const ticket = generateTicket(i, userId, userName, isClient ? 'client' : 'caregiver');
      await db.collection('support_tickets').doc(ticket.id).set(ticket);
      created.tickets++;
    }

    // 7. Create notifications
    console.log('[SEED] Creating notifications...');
    for (let i = 0; i < notifications; i++) {
      const userId = Math.random() > 0.5 ? getRandomItem(clientIds) : getRandomItem(caregiverIds);
      const notification = generateNotification(i, userId);
      await db.collection('notifications').doc(notification.id).set(notification);
      created.notifications++;
    }

    console.log('[SEED] Database seeding completed successfully!', created);
    return {
      success: true,
      message: `Successfully seeded database with dummy data!`,
      created
    };

  } catch (error: any) {
    console.error('[SEED] Database seeding failed:', error);
    throw new Error(`Failed to seed database: ${error.message}`);
  }
}

// Cleanup function - removes ALL seed data
export async function clearSeedData(): Promise<{ success: boolean; message: string; deleted: Record<string, number> }> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const deleted: Record<string, number> = {
    caregivers: 0,
    clients: 0,
    jobs: 0,
    appointments: 0,
    reviews: 0,
    tickets: 0,
    notifications: 0
  };

  const collections = [
    { name: 'caregivers', key: 'caregivers' },
    { name: 'users', key: 'clients' },
    { name: 'senior_profiles', key: 'clients' },
    { name: 'job_posts', key: 'jobs' },
    { name: 'appointments', key: 'appointments' },
    { name: 'reviews', key: 'reviews' },
    { name: 'support_tickets', key: 'tickets' },
    { name: 'notifications', key: 'notifications' }
  ];

  try {
    for (const { name, key } of collections) {
      const snapshot = await db.collection(name).where('_seedData', '==', true).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deleted[key] += snapshot.size;
    }

    return {
      success: true,
      message: 'All seed data has been removed from the database.',
      deleted
    };

  } catch (error: any) {
    console.error('Clear seed data error:', error);
    throw new Error(`Failed to clear seed data: ${error.message}`);
  }
}

// Check if seed data exists
export async function hasSeedData(): Promise<boolean> {
  if (!db) return false;
  
  try {
    const snapshot = await db.collection('caregivers').where('_seedData', '==', true).limit(1).get();
    return !snapshot.empty;
  } catch (error) {
    return false;
  }
}
