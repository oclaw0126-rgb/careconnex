/**
 * Demo Mode Configuration
 * 
 * When DEMO_MODE is enabled, the app will mock external API calls
 * (Stripe, Twilio, Gemini, Checkr) so the platform appears fully functional
 * without real API keys.
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_USE_MOCKS === 'true';

// Demo responses for external services
export const demoResponses = {
  // Stripe mock responses
  stripe: {
    createConnectedAccount: () => ({
      accountId: `acct_demo_${Date.now()}`,
      url: 'https://stripe.com/connect/demo'
    }),
    createOnboardingLink: () => ({
      url: 'https://stripe.com/connect/demo/onboarding'
    }),
    createDirectCharge: () => ({
      url: 'https://stripe.com/checkout/demo'
    }),
    createPaymentSession: () => ({
      url: 'https://stripe.com/checkout/demo'
    }),
    completeOnboarding: () => true
  },

  // Twilio Video mock responses
  twilio: {
    getVideoToken: () => ({
      token: 'demo_token_' + Math.random().toString(36).substr(2, 9),
      roomName: 'demo-room-' + Date.now()
    }),
    sendSMS: () => ({
      success: true,
      messageId: 'demo_msg_' + Date.now()
    })
  },

  // Gemini AI mock responses
  gemini: {
    chat: (message: string) => ({
      text: `This is a demo response to: "${message}". In production, this would be a real AI response from Gemini.`,
      suggestions: ['Schedule a visit', 'Find a caregiver', 'Update care plan']
    }),
    analyze: () => ({
      score: 85,
      insights: ['Demo insight 1', 'Demo insight 2'],
      recommendations: ['Demo recommendation']
    }),
    findMatches: (profile: any) => {
      // Return demo caregiver matches
      return Array(5).fill(null).map((_, i) => ({
        id: `demo_cg_${i}`,
        name: `Demo Caregiver ${i + 1}`,
        matchScore: 80 + Math.floor(Math.random() * 15),
        hourlyRate: 20 + Math.floor(Math.random() * 20),
        rating: 4.5 + Math.random() * 0.5,
        distance: Math.floor(Math.random() * 10),
        verified: true,
        skills: ['Companionship', 'Meal Prep', 'Transportation'],
        bio: 'Experienced demo caregiver for testing purposes.'
      }));
    }
  },

  // Checkr background check mock
  checkr: {
    initiateCheck: () => ({
      candidateId: `cand_demo_${Date.now()}`,
      reportId: `report_demo_${Date.now()}`,
      status: 'pending',
      estimatedCompletion: '2-3 business days'
    }),
    getReportStatus: () => ({
      status: 'clear',
      completedAt: new Date().toISOString(),
      findings: []
    })
  },

  // Notifications mock
  notifications: {
    sendEmail: () => ({ success: true, messageId: 'demo_email_' + Date.now() }),
    sendPush: () => ({ success: true, token: 'demo_token' })
  }
};

// Helper to simulate network delay
export const simulateDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Demo user for testing
export const demoUsers = {
  client: {
    uid: 'demo_client_001',
    email: 'demo.client@example.com',
    name: 'Demo Client',
    userType: 'client',
    zipCode: '90210',
    latitude: 34.0901,
    longitude: -118.4065
  },
  caregiver: {
    uid: 'demo_caregiver_001',
    email: 'demo.caregiver@example.com',
    name: 'Demo Caregiver',
    userType: 'caregiver',
    hourlyRate: 30,
    verified: true,
    skills: ['Dementia Care', 'Meal Prep', 'Transportation']
  },
  admin: {
    uid: 'demo_admin_001',
    email: 'demo.admin@example.com',
    name: 'Demo Admin',
    userType: 'admin'
  }
};

if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') {
  console.log(`🔧 Demo Mode: ${DEMO_MODE ? 'ENABLED' : 'DISABLED'}`);
  if (DEMO_MODE) {
    console.log('   External APIs will return mock responses');
  }
}
