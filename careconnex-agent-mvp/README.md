# CareConnex Agent MVP

AI-powered care coordinator that helps families find caregivers via text message.

## 🎯 What This Is

A standalone prototype of the CareConnex conversational agent. Families text their needs, and the AI agent:
1. Asks clarifying questions
2. Searches caregiver database
3. Presents top 3 matches
4. Schedules interviews
5. Handles booking

All via natural text conversation.

## 📁 Structure

```
careconnex-agent-mvp/
├── agent/
│   ├── agent.js          # Core AI agent logic
│   └── tools.js          # Search, schedule, book tools
├── functions/
│   └── twilio-webhook.js # SMS webhook handler
├── web/
│   ├── index.html        # Landing page (signup)
│   └── dashboard.html    # Demo conversation viewer
├── mock-caregivers.json  # 10 sample caregivers
└── package.json
```

## 🚀 Quick Start (Local Testing)

### 1. Test the Agent Logic

```bash
cd careconnex-agent-mvp
node
```

```javascript
const { CareAgent } = require('./agent/agent');

// Create agent
const agent = new CareAgent('user-123', '+15551234567', 'Sarah');

// Simulate conversation
console.log(await agent.processMessage("I need care for my mom"));
console.log(await agent.processMessage("She has dementia"));
console.log(await agent.processMessage("3 days a week"));
console.log(await agent.processMessage("95125"));
```

### 2. View Landing Page

Open `web/index.html` in browser:
- Simple signup form
- Collects name, phone, messaging preference
- Demo only (no backend connected)

### 3. View Demo Dashboard

Open `web/dashboard.html` in browser:
- Shows active conversations
- Live message viewing
- Stats tracking

## 📱 User Flow

```
1. Family visits landing page
   ↓
2. Enters name + phone
   ↓
3. Receives text: "Hi! I'm Sarah..."
   ↓
4. Conversation:
      User: "My mom has dementia"
      Agent: "Got it. What days do you need care?"
      User: "Mon, Wed, Fri"
      Agent: "Perfect. What's your budget?"
      User: "$30/hr"
      Agent: "Great! I found 3 caregivers..."
   ↓
5. User selects caregiver(s)
   ↓
6. Agent schedules interviews
   ↓
7. User picks favorite
   ↓
8. Agent sends booking confirmation
```

## 🔧 Integration with CareConnex

To integrate this MVP into the main CareConnex platform:

### Step 1: Move Files
```
agent/ → careconnex/functions/src/agent/
functions/twilio-webhook.js → careconnex/functions/src/
web/index.html → Integrate into careconnex landing page
```

### Step 2: Connect to Real Database
Replace `mock-caregivers.json` with Firestore queries:

```javascript
// In tools.js
const caregivers = await db.collection('caregivers')
  .where('verified', '==', true)
  .where('hourlyRate', '<=', budget)
  .get();
```

### Step 3: Add Twilio Integration
1. Sign up for Twilio account
2. Buy phone number
3. Configure webhook URL to Firebase Function
4. Add credentials to Firebase config

### Step 4: Deploy
```bash
cd careconnex/functions
npm install twilio
firebase deploy --only functions
```

## 💰 Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| Twilio SMS | ~$20 (2,000 msgs) |
| Firebase Functions | ~$30 (always-on) |
| AI (Kimi/Gemini) | ~$50 |
| **Total** | **~$100/mo** |

## ✅ Features Implemented

### Phase 1 (This MVP)
- ✅ SMS text interface
- ✅ AI agent with 3 tools
- ✅ Natural conversation flow
- ✅ Mock caregiver database (10 profiles)
- ✅ Interview scheduling
- ✅ Booking confirmation
- ✅ Landing page
- ✅ Demo dashboard

### Phase 2 (Integration)
- 🔲 Real caregiver database
- 🔲 WhatsApp support
- 🔲 Video interview integration
- 🔲 Payment processing
- 🔲 Push notifications

## 🧪 Testing

### Test Conversation

1. Text: `"I need help for my dad"`
   - Expected: Agent introduces, asks care type

2. Text: `"He has dementia and needs personal care"`
   - Expected: Acknowledges, asks schedule

3. Text: `"Monday, Wednesday, Friday"`
   - Expected: Asks budget

4. Text: `"$30 per hour"`
   - Expected: Shows 3 caregiver matches

5. Text: `"1"`
   - Expected: Confirms selection, schedules interview

## 📊 Success Metrics

Track these in dashboard:
- Conversation completion rate
- Time to find matches
- Interview scheduling rate
- Booking conversion rate
- User satisfaction

## 🤝 Next Steps

1. **Test this MVP** with 5-10 beta users
2. **Gather feedback** on conversation flow
3. **Iterate** on agent logic
4. **Integrate** into CareConnex
5. **Scale** to production

## 📝 Notes

- This is a **prototype** for testing
- Uses mock data (no real caregivers)
- No payment processing in MVP
- Firebase functions need Twilio credentials to work

## 📞 Demo

To see it working:
1. Open `web/index.html`
2. Enter test info
3. Imagine receiving texts
4. View `web/dashboard.html` to see conversation flow

---

Built for CareConnex - Making senior care simple.
