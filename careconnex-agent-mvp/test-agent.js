/**
 * Simple test script for CareConnex Agent
 * Run: node test-agent.js
 */

const { CareAgent } = require('./agent/agent');

async function runTest() {
  console.log('🧪 Testing CareConnex Agent\n');
  console.log('=' .repeat(50));
  
  // Create agent
  const agent = new CareAgent('user-123', '+15551234567', 'Sarah');
  
  // Simulate conversation
  const conversation = [
    { user: 'I need care for my mom', expected: 'greeting' },
    { user: 'She has dementia and needs help with bathing', expected: 'needs' },
    { user: 'Monday Wednesday Friday', expected: 'schedule' },
    { user: '$30 per hour', expected: 'matches' },
    { user: '1', expected: 'interview' }
  ];
  
  for (const turn of conversation) {
    console.log(`\n👤 USER: "${turn.user}"`);
    console.log('-'.repeat(50));
    
    const response = await agent.processMessage(turn.user);
    
    console.log(`🤖 AGENT:\n${response}`);
    console.log('=' .repeat(50));
    
    // Small delay for readability
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✅ Test complete!');
  console.log('\nAgent state:', agent.conversationState);
  console.log('User data:', JSON.stringify(agent.userData, null, 2));
}

// Run test
runTest().catch(console.error);
