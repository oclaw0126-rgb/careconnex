# CareConnex Gateway 🏥

Real AI Agent Gateway for CareConnex - OpenClaw-inspired architecture.

## Features

- ✅ **Persistent Agent Server** - No cold starts, always running
- ✅ **OpenClaw-Style Architecture** - Session management, tool execution, bootstrap context
- ✅ **Kimi K2.5 Integration** - Real LLM reasoning
- ✅ **Tool System** - Search caregivers, schedule interviews, store memory
- ✅ **WhatsApp Integration** - Via Twilio webhook
- ✅ **Firebase Integration** - Firestore for caregiver data

## Architecture

```
┌─────────────────────────────────────────┐
│  RAILWAY / HEROKU / VPS                 │
│  ┌─────────────────────────────────┐   │
│  │  CareConnex Gateway             │   │
│  │  - Express server              │   │
│  │  - Session management          │   │
│  │  - Agent loop (OpenClaw-style) │   │
│  │  - Tool execution              │   │
│  └─────────────────────────────────┘   │
└────────────────────┬────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌─────▼──────┐   ┌────▼────┐
│ Firestore│    │ Twilio     │   │ Kimi    │
│ (DB)     │    │ (WhatsApp) │   │ (LLM)   │
└──────────┘    └────────────┘   └─────────┘
```

## Deployment to Railway

### 1. Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Empty Project"
4. Name it `careconnex-gateway`

### 2. Add Environment Variables

Go to Variables tab, add:

```
KIMI_API_KEY=sk-79KeYXAoLYMQ3EyyCHM5iL6MzTUTPHJenJoILInjizcmDjVY
FIREBASE_PROJECT_ID=careconnex-d4c8b
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=your_twilio_number
PORT=3000
NODE_ENV=production
```

### 3. Deploy

**Option A: GitHub (Recommended)**

1. Push this code to GitHub
2. In Railway: Project → Settings → Connect GitHub Repo
3. Select your repo
4. Railway auto-deploys on push

**Option B: CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

### 4. Get Your URL

1. Go to Settings tab
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://careconnex-gateway.up.railway.app`)

### 5. Configure Twilio Webhook

1. Go to Twilio Console → Messaging → WhatsApp Sandbox
2. Set webhook URL to: `https://your-railway-url.railway.app/webhook/whatsapp`
3. Method: POST
4. Save

## Testing

Send a WhatsApp message to your Twilio number:

```
Hi, my mom needs care in 95125
```

Cara should:
1. Understand the request
2. Search caregivers in 95125
3. Present 3 options
4. Handle your selection

## API Endpoints

- `POST /webhook/whatsapp` - Twilio WhatsApp webhook
- `GET /health` - Health check
- `GET /stats` - Session statistics

## Development

```bash
# Install dependencies
npm install

# Run locally (needs .env file)
npm run dev

# Build
npm run build

# Start production
npm start
```

## Differences from Firebase

| Feature | Firebase Functions | CareConnex Gateway |
|---------|-------------------|-------------------|
| Runtime | Cold start every message | Always running |
| Session | Firestore only | In-memory + Firestore |
| Response time | 5-10 seconds | < 2 seconds |
| Streaming | No | Possible |
| Agent quality | Chatbot | Real agent |

## License

MIT - CareConnex
