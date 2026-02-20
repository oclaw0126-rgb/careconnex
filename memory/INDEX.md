# CareConnex Project Memory Index

## Memory Files

### Daily Logs
- `2026-02-15.md` - Self-evolution activation, caregiver callout system deployment, industry research validation

## Key Decisions Logged

### 2026-02-15
1. **Self-evolution authorized** - Can modify config, create skills without permission
2. **Communication style** - Brevity over explanation, act-then-report
3. **Caregiver callout system** - Live with 4 Cloud Functions
4. **React bundling** - Single chunk to avoid loading order issues
5. **Industry research** - All ideas validated, benefits program identified as key differentiator

## Quick Reference

### Live URLs
- **Frontend:** https://careconnex-d4c8b.web.app
- **Project Console:** https://console.firebase.google.com/project/careconnex-d4c8b/overview

### Cloud Functions (28 deployed)
- `onCaregiverCallout` - Triggered on cancellation
- `selectBackupCaregiver` - Client selects replacement
- `requestCalloutRefund` - Refund processing
- `getBackupCaregiverOptions` - Get available backups
- Plus 24 others (payments, notifications, messaging, etc.)

### Key Files
- `IMPROVEMENT_ANALYSIS.md` - 30+ improvement ideas
- `INDUSTRY_RESEARCH_VALIDATED.md` - Industry research with benchmarks
- `docs/adr/003-caregiver-callout.md` - Architecture decision
- `docs/runbooks/caregiver-callout.md` - Operations guide
- `TEST_PLAN.md` - End-to-end testing scenarios

### Skills Created
- `skills/careconnex-deploy/` - One-command deployment

### Components Ready for Integration
- `LiveCareUpdates.tsx` - Real-time care updates
- `ExpressBooking.tsx` - 2-minute booking flow
- `CaregiverEarnings.tsx` - Earnings dashboard

### Next Priority
1. Integrate LiveCareUpdates (addresses #1 family pain point)
2. Launch ExpressBooking (4hr vs 2-4 week industry avg)
3. Deploy CaregiverEarnings (retention crisis solution)
4. Design Caregiver Benefits Program (health stipend + 401k)
