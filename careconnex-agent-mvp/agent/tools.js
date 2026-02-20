// Agent Tools - Core functionality for CareConnex Agent
const caregivers = require('../mock-caregivers.json').caregivers;

/**
 * Search caregivers based on user requirements
 */
function searchCaregivers({ location, needs, schedule, budget, languages }) {
  console.log('🔍 Searching caregivers:', { location, needs, schedule, budget });
  
  let matches = [...caregivers];
  
  // Filter by location (zip code or city)
  if (location) {
    const locationLower = location.toLowerCase();
    matches = matches.filter(cg => 
      cg.location.toLowerCase().includes(locationLower) ||
      cg.zipCode === location
    );
  }
  
  // Filter by skills/needs
  if (needs && needs.length > 0) {
    const needsLower = needs.map(n => n.toLowerCase());
    matches = matches.filter(cg => 
      needsLower.some(need => 
        cg.skills.some(skill => skill.toLowerCase().includes(need))
      )
    );
  }
  
  // Filter by budget
  if (budget) {
    matches = matches.filter(cg => cg.hourlyRate <= budget);
  }
  
  // Filter by schedule availability
  if (schedule && schedule.length > 0) {
    const daysNeeded = schedule.map(s => s.toLowerCase());
    matches = matches.filter(cg =>
      daysNeeded.every(day => 
        cg.availability.some(avail => avail.toLowerCase() === day)
      )
    );
  }
  
  // Filter by languages
  if (languages && languages.length > 0) {
    matches = matches.filter(cg =>
      languages.every(lang =>
        cg.languages.some(l => l.toLowerCase().includes(lang.toLowerCase()))
      )
    );
  }
  
  // Sort by rating and experience
  matches.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.yearsExperience - a.yearsExperience;
  });
  
  // Return top 3
  return matches.slice(0, 3);
}

/**
 * Schedule a video interview with a caregiver
 */
async function scheduleInterview({ caregiverId, userId, preferredTimes }) {
  console.log('📅 Scheduling interview:', { caregiverId, userId, preferredTimes });
  
  const caregiver = caregivers.find(cg => cg.id === caregiverId);
  if (!caregiver) {
    return { success: false, error: 'Caregiver not found' };
  }
  
  // Mock scheduling - in production would check calendar API
  const scheduledTime = preferredTimes[0]; // Simplified
  
  return {
    success: true,
    interview: {
      id: `int-${Date.now()}`,
      caregiverId,
      caregiverName: caregiver.name,
      userId,
      scheduledTime,
      status: 'scheduled',
      meetingLink: `https://meet.careconnex.com/${Date.now()}`,
      reminderSet: true
    }
  };
}

/**
 * Confirm booking with selected caregiver
 */
async function confirmBooking({ caregiverId, userId, schedule, startDate }) {
  console.log('✅ Confirming booking:', { caregiverId, userId, schedule, startDate });
  
  const caregiver = caregivers.find(cg => cg.id === caregiverId);
  if (!caregiver) {
    return { success: false, error: 'Caregiver not found' };
  }
  
  // Calculate weekly cost
  const hoursPerWeek = schedule.reduce((total, day) => total + day.hours, 0);
  const weeklyCost = hoursPerWeek * caregiver.hourlyRate;
  
  // Mock booking confirmation
  return {
    success: true,
    booking: {
      id: `bk-${Date.now()}`,
      caregiverId,
      caregiverName: caregiver.name,
      userId,
      schedule,
      startDate,
      hourlyRate: caregiver.hourlyRate,
      weeklyCost,
      status: 'confirmed',
      firstShift: `${startDate} ${schedule[0].day} ${schedule[0].startTime}`
    }
  };
}

/**
 * Get caregiver details by ID
 */
function getCaregiverById(caregiverId) {
  return caregivers.find(cg => cg.id === caregiverId);
}

/**
 * Format caregiver for display in SMS
 */
function formatCaregiverForSMS(caregiver, index) {
  return `${index}. ${caregiver.name} - $${caregiver.hourlyRate}/hr
⭐ ${caregiver.rating} (${caregiver.reviewCount} reviews)
${caregiver.skills.slice(0, 3).join(', ')}
${caregiver.yearsExperience} years experience`;
}

/**
 * Calculate match score for ranking (0-100)
 */
function calculateMatchScore(caregiver, requirements) {
  let score = 0;
  
  // Rating (up to 30 points)
  score += caregiver.rating * 6;
  
  // Experience (up to 20 points)
  score += Math.min(caregiver.yearsExperience * 2, 20);
  
  // Skill match (up to 30 points)
  if (requirements.needs) {
    const skillMatches = caregiver.skills.filter(skill =>
      requirements.needs.some(need => 
        skill.toLowerCase().includes(need.toLowerCase())
      )
    ).length;
    score += (skillMatches / requirements.needs.length) * 30;
  }
  
  // Availability match (up to 20 points)
  if (requirements.schedule) {
    const availableDays = requirements.schedule.filter(day =>
      caregiver.availability.some(avail => 
        avail.toLowerCase() === day.toLowerCase()
      )
    ).length;
    score += (availableDays / requirements.schedule.length) * 20;
  }
  
  return Math.round(score);
}

module.exports = {
  searchCaregivers,
  scheduleInterview,
  confirmBooking,
  getCaregiverById,
  formatCaregiverForSMS,
  calculateMatchScore,
  caregivers
};
