---
name: careconnex-deploy
version: 1.0.0
description: One-command deployment for CareConnex frontend and Firebase Cloud Functions with automatic build verification.
keywords: [careconnex, deploy, firebase, automation]
---

# CareConnex Deployment Skill

One-command deployment for CareConnex platform.

## Quick Deploy

```bash
# Deploy everything (frontend + functions)
npx careconnex-deploy

# Deploy only frontend
npx careconnex-deploy frontend

# Deploy only functions
npx careconnex-deploy functions

# Deploy with verbose logging
npx careconnex-deploy --verbose
```

## What It Does

1. **Pre-deploy checks:**
   - Verify Firebase CLI login
   - Check environment variables (.env files)
   - Run TypeScript compilation check
   - Verify no uncommitted critical changes

2. **Build:**
   - Clean dist/ directory
   - Run `npm run build`
   - Verify build output exists

3. **Deploy Frontend:**
   - `firebase deploy --only hosting`
   - Verify deployment URL is accessible
   - Return live URL

4. **Deploy Functions:**
   - `firebase deploy --only functions`
   - Verify functions are live via Firebase console
   - Return function endpoints

5. **Post-deploy:**
   - Update MEMORY.md with deployment log
   - Report success/failure with clear status

## Requirements

- Firebase CLI installed and logged in
- `.env.production` with required vars
- User authenticated for firebase deploy

## Exit Codes

- 0: Success
- 1: Build failure
- 2: Firebase auth issue
- 3: Deploy failure
- 4: Verification failure
