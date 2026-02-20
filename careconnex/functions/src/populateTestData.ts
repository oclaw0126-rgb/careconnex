import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Allow anyone to call this - for development only
export const populateTestData = functions.https.onRequest(async (req, res) => {
  // Set CORS headers manually
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Add test user
    const userRef = db.collection('users').doc('test-user-imran');
    await userRef.set({
      name: "Imran",
      email: "imran@careconnex.com",
      phone: "+14155551234",
      lovedOneName: "Mom",
      careRecipientName: "Mom",
      careNeeds: ["dementia", "mobility assistance", "meal prep"],
      zipCode: "95050",
      preferences: {
        caregiverGender: "no preference",
        schedule: "weekdays preferred",
        language: "English"
      },
      emergencyContact: {
        name: "Sister",
        phone: "+14155555678",
        relationship: "sister"
      },
      appointments: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add caregivers for multiple zip codes including 95125
    const caregivers = [
      // Santa Clara area (95050)
      {
        name: "Maria Gonzalez",
        phone: "+14155551001",
        hourlyRate: 28,
        skills: ["dementia", "bathing", "meal prep", "medication reminders"],
        specialties: ["dementia", "alzheimer care", "meal preparation"],
        services: ["personal care", "medication reminders", "meal prep", "companionship"],
        zipCode: "95050",
        serviceZipCodes: ["95050", "95051", "95054"],
        yearsExperience: 8,
        rating: 4.9,
        verified: true,
        available: true,
        active: true,
        bio: "Experienced caregiver specializing in dementia care. Fluent in Spanish and English. Certified in Alzheimer's care.",
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        recurringSchedule: {
          monday: ["morning", "afternoon"],
          tuesday: ["morning", "afternoon"],
          wednesday: ["morning", "afternoon"],
          thursday: ["morning", "afternoon"],
          friday: ["morning", "afternoon"]
        },
        languages: ["English", "Spanish"]
      },
      {
        name: "David Kim",
        phone: "+14155551002",
        hourlyRate: 32,
        skills: ["mobility assistance", "physical therapy", "meal prep", "companionship"],
        specialties: ["mobility assistance", "fall prevention", "physical therapy"],
        services: ["mobility support", "exercise assistance", "meal prep", "transportation"],
        zipCode: "95050",
        serviceZipCodes: ["95050", "95051", "95125"],
        yearsExperience: 12,
        rating: 4.8,
        verified: true,
        available: true,
        active: true,
        bio: "Former physical therapist assistant. Gentle, patient, and great with seniors. Specializes in mobility and fall prevention.",
        availability: ["Monday", "Wednesday", "Friday", "Saturday", "Sunday"],
        recurringSchedule: {
          monday: ["morning", "afternoon", "evening"],
          wednesday: ["morning", "afternoon", "evening"],
          friday: ["morning", "afternoon", "evening"],
          saturday: ["morning", "afternoon"],
          sunday: ["morning", "afternoon"]
        },
        languages: ["English", "Korean"]
      },
      // San Jose area (95125)
      {
        name: "Jennifer Walsh",
        phone: "+14155551003",
        hourlyRate: 26,
        skills: ["companionship", "meal prep", "light housekeeping", "transportation"],
        specialties: ["companionship", "meal preparation", "medication management"],
        services: ["companionship", "meal prep", "light housekeeping", "medication reminders", "transportation"],
        zipCode: "95125",
        serviceZipCodes: ["95125", "95124", "95118"],
        yearsExperience: 5,
        rating: 5.0,
        verified: true,
        available: true,
        active: true,
        bio: "RN background, now providing compassionate in-home care. Excellent references. Specializes in medication management and companionship.",
        availability: ["Tuesday", "Thursday", "Saturday", "Sunday"],
        recurringSchedule: {
          tuesday: ["morning", "afternoon", "evening"],
          thursday: ["morning", "afternoon", "evening"],
          saturday: ["morning", "afternoon"],
          sunday: ["morning", "afternoon"]
        },
        languages: ["English"]
      },
      {
        name: "Robert Chen",
        phone: "+14155551004",
        hourlyRate: 30,
        skills: ["dementia", "alzheimer care", "personal care", "meal prep"],
        specialties: ["dementia care", "alzheimer care", "personal care"],
        services: ["dementia care", "bathing assistance", "meal prep", "companionship", "medication reminders"],
        zipCode: "95125",
        serviceZipCodes: ["95125", "95124", "95120", "95050"],
        yearsExperience: 10,
        rating: 4.9,
        verified: true,
        available: true,
        active: true,
        bio: "Certified dementia care specialist with 10 years experience. Patient, kind, and skilled in managing challenging behaviors.",
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        recurringSchedule: {
          monday: ["morning", "afternoon"],
          tuesday: ["morning", "afternoon"],
          wednesday: ["morning", "afternoon"],
          thursday: ["morning", "afternoon"],
          friday: ["morning", "afternoon"],
          saturday: ["morning"]
        },
        languages: ["English", "Mandarin"]
      },
      {
        name: "Sarah Johnson",
        phone: "+14155551005",
        hourlyRate: 27,
        skills: ["companionship", "meal prep", "light exercise", "transportation"],
        specialties: ["companionship", "meal preparation", "senior fitness"],
        services: ["companionship", "meal prep", "light exercise", "transportation", "errands"],
        zipCode: "95125",
        serviceZipCodes: ["95125", "95124", "95118", "95050"],
        yearsExperience: 6,
        rating: 4.7,
        verified: true,
        available: true,
        active: true,
        bio: "Energetic caregiver who loves engaging seniors in activities. Great cook and enjoys taking clients on outings.",
        availability: ["Monday", "Wednesday", "Friday", "Saturday", "Sunday"],
        recurringSchedule: {
          monday: ["morning", "afternoon", "evening"],
          wednesday: ["morning", "afternoon", "evening"],
          friday: ["morning", "afternoon", "evening"],
          saturday: ["morning", "afternoon"],
          sunday: ["morning", "afternoon"]
        },
        languages: ["English"]
      },
      {
        name: "Lisa Patel",
        phone: "+14155551006",
        hourlyRate: 29,
        skills: ["dementia", "personal care", "medication reminders", "end of life care"],
        specialties: ["dementia care", "hospice support", "personal care"],
        services: ["dementia care", "bathing assistance", "medication reminders", "companionship", "hospice support"],
        zipCode: "95125",
        serviceZipCodes: ["95125", "95124", "95120"],
        yearsExperience: 15,
        rating: 5.0,
        verified: true,
        available: true,
        active: true,
        bio: "15 years of experience including hospice care. Compassionate, reliable, and specially trained in dementia and end-of-life care.",
        availability: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        recurringSchedule: {
          tuesday: ["morning", "afternoon", "evening"],
          wednesday: ["morning", "afternoon", "evening"],
          thursday: ["morning", "afternoon", "evening"],
          friday: ["morning", "afternoon"],
          saturday: ["morning", "afternoon", "evening"],
          sunday: ["morning", "afternoon", "evening"]
        },
        languages: ["English", "Hindi", "Gujarati"]
      }
    ];

    const caregiverIds = [];
    for (const caregiver of caregivers) {
      const docRef = db.collection('caregivers').doc();
      await docRef.set({
        ...caregiver,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      caregiverIds.push({ id: docRef.id, name: caregiver.name });
    }

    res.json({
      success: true,
      message: "Test data populated!",
      userId: userRef.id,
      caregiversAdded: caregiverIds.length,
      caregiverNames: caregiverIds.map(c => c.name)
    });

  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Unknown error' });
  }
});
