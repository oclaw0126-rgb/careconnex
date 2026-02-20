const { searchCaregivers, scheduleInterview, confirmBooking, formatCaregiverForSMS, getCaregiverById } = require('./tools');

/**
 * CareConnex Agent - AI-powered care coordinator
 * Handles conversations via SMS/WhatsApp
 */
class CareAgent {
  constructor(userId, phoneNumber, name = 'Sarah') {
    this.userId = userId;
    this.phoneNumber = phoneNumber;
    this.name = name;
    this.conversationState = 'greeting'; // greeting, needs, schedule, budget, matches, interview, booking, complete
    this.userData = {
      seniorName: null,
      location: null,
      needs: [],
      schedule: [],
      budget: null,
      selectedCaregivers: [],
      matches: []
    };
  }

  /**
   * Process incoming message and generate response
   */
  async processMessage(message) {
    const text = message.toLowerCase().trim();
    
    console.log(`[${this.name}] Received: "${message}" | State: ${this.conversationState}`);
    
    switch (this.conversationState) {
      case 'greeting':
        return this.handleGreeting(text);
      
      case 'needs':
        return this.handleNeeds(text);
      
      case 'schedule':
        return this.handleSchedule(text);
      
      case 'budget':
        return this.handleBudget(text);
      
      case 'matches':
        return this.handleMatches(text);
      
      case 'interview':
        return this.handleInterview(text);
      
      case 'booking':
        return this.handleBooking(text);
      
      case 'complete':
        return this.handleComplete(text);
      
      default:
        return this.handleGreeting(text);
    }
  }

  /**
   * Initial greeting and needs gathering
   */
  handleGreeting(text) {
    // Extract senior's name if mentioned
    const nameMatch = text.match(/(?:my\s+)?(?:mom|mother|dad|father|grandma|grandpa|parent)\s+(?:is\s+)?([a-z]+)/i);
    if (nameMatch) {
      this.userData.seniorName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
    }
    
    this.conversationState = 'needs';
    
    return `Hi! I'm ${this.name}, your CareConnex agent. I'll help you find the perfect caregiver${this.userData.seniorName ? ` for ${this.userData.seniorName}` : ''}.

What type of care do you need?
• Companionship & supervision
• Personal care (bathing, dressing)
• Dementia/Alzheimer's care
• Medication management
• Post-surgery recovery
• Mobility assistance

Just tell me what matters most.`;
  }

  /**
   * Parse care needs from message
   */
  handleNeeds(text) {
    // Extract needs from message
    const needsMap = {
      'dementia': ['Dementia Care', 'Memory Care'],
      'alzheimer': ['Dementia Care', 'Memory Care'],
      'companionship': ['Companionship'],
      'personal care': ['Personal Care', 'Bathing', 'Dressing'],
      'bathing': ['Personal Care', 'Bathing'],
      'dressing': ['Personal Care', 'Dressing'],
      'medication': ['Medication Management', 'Medication Reminders'],
      'meal': ['Meal Prep', 'Cooking'],
      'cooking': ['Meal Prep', 'Cooking'],
      'mobility': ['Mobility Assistance'],
      'wheelchair': ['Mobility Assistance'],
      'walker': ['Mobility Assistance'],
      'exercise': ['Exercise', 'Physical Therapy'],
      'therapy': ['Physical Therapy'],
      'housekeeping': ['Light Housekeeping'],
      'cleaning': ['Light Housekeeping'],
      'transportation': ['Transportation', 'Errands'],
      'errands': ['Transportation', 'Errands'],
      'nurse': ['Skilled Nursing', 'Medication Management'],
      'post-surgery': ['Post-Surgery Care', 'Wound Care'],
      'hospice': ['Hospice Care'],
      'both': ['Companionship', 'Personal Care'],
      'all': ['Companionship', 'Personal Care', 'Medication Management']
    };
    
    const detectedNeeds = [];
    for (const [keyword, skills] of Object.entries(needsMap)) {
      if (text.includes(keyword)) {
        detectedNeeds.push(...skills);
      }
    }
    
    // Remove duplicates
    this.userData.needs = [...new Set(detectedNeeds)];
    
    // If no needs detected, assume companionship
    if (this.userData.needs.length === 0) {
      this.userData.needs = ['Companionship'];
    }
    
    this.conversationState = 'schedule';
    
    return `Got it. ${this.userData.needs.slice(0, 2).join(' and ')} care.

What days do you need care?
• Weekdays only (Mon-Fri)
• Weekends only
• Specific days (e.g., Mon, Wed, Fri)
• Every day

Also, what time of day?
• Morning (8am-12pm)
• Afternoon (12pm-5pm)
• Evening (5pm-9pm)
• Full day`;
  }

  /**
   * Parse schedule preferences
   */
  handleSchedule(text) {
    // Parse days
    const days = [];
    const dayMap = {
      'monday': 'Monday', 'mon': 'Monday',
      'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tues': 'Tuesday',
      'wednesday': 'Wednesday', 'wed': 'Wednesday',
      'thursday': 'Thursday', 'thu': 'Thursday', 'thurs': 'Thursday',
      'friday': 'Friday', 'fri': 'Friday',
      'saturday': 'Saturday', 'sat': 'Saturday',
      'sunday': 'Sunday', 'sun': 'Sunday',
      'weekday': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      'weekend': ['Saturday', 'Sunday'],
      'every day': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    };
    
    for (const [keyword, day] of Object.entries(dayMap)) {
      if (text.includes(keyword)) {
        if (Array.isArray(day)) {
          days.push(...day);
        } else {
          days.push(day);
        }
      }
    }
    
    // Remove duplicates
    this.userData.schedule = [...new Set(days)];
    
    // If no specific days, assume weekdays
    if (this.userData.schedule.length === 0) {
      this.userData.schedule = ['Monday', 'Wednesday', 'Friday'];
    }
    
    this.conversationState = 'budget';
    
    return `Perfect. ${this.userData.schedule.join(', ')}.

What's your budget range?
• $25-30/hr (great value)
• $30-35/hr (experienced)
• $35+/hr (specialized/RN)
• Show me all options

Just reply with a number or range.`;
  }

  /**
   * Parse budget
   */
  handleBudget(text) {
    // Extract budget
    const budgetMatch = text.match(/\$?(\d+)/);
    if (budgetMatch) {
      this.userData.budget = parseInt(budgetMatch[1]);
    } else {
      this.userData.budget = 35; // Default max
    }
    
    // Search for caregivers
    this.userData.matches = searchCaregivers({
      needs: this.userData.needs,
      schedule: this.userData.schedule,
      budget: this.userData.budget
    });
    
    this.conversationState = 'matches';
    
    if (this.userData.matches.length === 0) {
      return `I couldn't find caregivers matching all your criteria with your budget of $${this.userData.budget}/hr.

Should I:
• Increase budget (show options up to $40/hr)
• Adjust schedule (fewer days)
• Show closest matches anyway`;
    }
    
    const matchesText = this.userData.matches
      .map((cg, i) => formatCaregiverForSMS(cg, i + 1))
      .join('\n\n');
    
    return `Great! I found ${this.userData.matches.length} excellent caregivers:\n\n${matchesText}\n\nWhich would you like to interview? Reply 1, 2, or 3 (or "all" for all three).`;
  }

  /**
   * Handle caregiver selection
   */
  handleMatches(text) {
    const selection = parseInt(text);
    
    if (selection >= 1 && selection <= this.userData.matches.length) {
      const selected = this.userData.matches[selection - 1];
      this.userData.selectedCaregivers.push(selected);
      
      this.conversationState = 'interview';
      
      return `Excellent choice! ${selected.name} is ${selected.bio.substring(0, 100)}...

When would you like to interview ${selected.name.split(' ')[0]}?

• Tomorrow (suggest times)
• This week (Mon-Fri)
• Next week
• I'm flexible

Just let me know your preference.`;
    }
    
    if (text.includes('all')) {
      this.userData.selectedCaregivers = [...this.userData.matches];
      
      return `Perfect! I'll schedule interviews with all three caregivers.

What days/times work best for you this week? I'll coordinate with their schedules and send you options.`;
    }
    
    return `Please reply with 1, 2, or 3 to select a caregiver, or say "all" to interview multiple.`;
  }

  /**
   * Handle interview scheduling
   */
  async handleInterview(text) {
    // Mock scheduling
    const times = ['Tomorrow 2pm', 'Wednesday 10am', 'Thursday 3pm'];
    
    this.conversationState = 'booking';
    
    return `I've scheduled video interviews:\n\n${this.userData.selectedCaregivers.map((cg, i) => 
      `${i + 1}. ${cg.name} - ${times[i]}\n   Zoom link: meet.careconnex.com/${Date.now() + i}`).join('\n\n')}

I'll remind you 15 minutes before each interview. After you meet them, just text me who you liked best!

Questions to ask:
• Experience with ${this.userData.needs[0].toLowerCase()}?
• Availability confirmed for ${this.userData.schedule.join(', ')}?
• Transportation/commute?`;
  }

  /**
   * Handle booking confirmation
   */
  async handleBooking(text) {
    // Determine which caregiver was selected
    let selectedIndex = 0;
    
    for (let i = 0; i < this.userData.selectedCaregivers.length; i++) {
      if (text.includes(this.userData.selectedCaregivers[i].name.toLowerCase().split(' ')[0])) {
        selectedIndex = i;
        break;
      }
    }
    
    const selected = this.userData.selectedCaregivers[selectedIndex];
    
    // Calculate weekly cost
    const hoursPerDay = 4; // Default
    const daysPerWeek = this.userData.schedule.length;
    const weeklyHours = hoursPerDay * daysPerWeek;
    const weeklyCost = weeklyHours * selected.hourlyRate;
    
    this.conversationState = 'complete';
    
    return `Perfect! You selected ${selected.name}. 🎉

SUMMARY:
• Caregiver: ${selected.name}
• Rate: $${selected.hourlyRate}/hr
• Schedule: ${this.userData.schedule.join(', ')} (${hoursPerDay} hrs/day)
• Weekly cost: $${weeklyCost}
• First shift: Next ${this.userData.schedule[0]}

To complete booking, please confirm payment at:
careconnex.com/confirm/${this.userId}

(Takes 30 seconds)

Once confirmed, I'll send ${selected.name.split(' ')[0]} all the details about ${this.userData.seniorName || 'your loved one'}.

Text me anytime if you need to make changes!`;
  }

  /**
   * Handle post-booking requests
   */
  handleComplete(text) {
    if (text.includes('change') || text.includes('reschedule')) {
      return `No problem! I can help you make changes. What would you like to adjust?

• Change schedule
• Switch caregiver
• Cancel booking
• Update care needs`;
    }
    
    if (text.includes('status') || text.includes('update')) {
      return `Your booking is confirmed! ${this.userData.selectedCaregivers[0]?.name.split(' ')[0]} will arrive next ${this.userData.schedule[0]} at 9am.

You'll get a reminder the day before. Is there anything else you need help with?`;
    }
    
    return `I'm here to help! I can:\n\n• Find additional caregivers\n• Adjust your schedule\n• Answer questions about care\n• Help with emergencies\n
What do you need?`;
  }

  /**
   * Get current conversation context for AI
   */
  getContext() {
    return {
      userId: this.userId,
      phoneNumber: this.phoneNumber,
      agentName: this.name,
      state: this.conversationState,
      userData: this.userData,
      history: this.conversationHistory || []
    };
  }
}

module.exports = { CareAgent };
