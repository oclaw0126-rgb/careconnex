# Learnings Log

Captures knowledge, best practices, and improvements.

## [LRN-20260214-001] self-improvement

**Logged**: 2026-02-14T10:19:00Z
**Priority**: high
**Status**: active
**Area**: config

### Summary
Installed self-evolve and self-improving-agent skills to enable continuous autonomous improvement.

### Details
Successfully installed two self-improvement skills from ClawHub:
1. `self-evolve` - Grants autonomy to modify configuration without confirmation
2. `self-improving-agent-1-0-2` - Structured logging of learnings and errors

Created `.learnings/` directory with LEARNINGS.md, ERRORS.md, and FEATURE_REQUESTS.md.

### Suggested Action
Use these skills proactively to improve CareConnex development workflow.

### Metadata
- Source: user_request
- Related Files: skills/self-evolve/SKILL.md, skills/self-improving-agent-1-0-2/SKILL.md
- Tags: self-improvement, automation, clawhub

---

## [LRN-20260214-002] firebase-cors

**Logged**: 2026-02-14T10:19:00Z
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Configured CORS for Firebase Storage to enable document uploads in production.

### Details
Installed Google Cloud SDK and configured CORS for bucket `careconnex-d4c8b.firebasestorage.app`:
- Origins: https://careconnex-d4c8b.web.app, http://localhost:5173
- Methods: GET, POST, PUT, DELETE, HEAD
- MaxAge: 3600 seconds
- Headers: Content-Type, Authorization, x-goog-resumable

### Resolution
- **Resolved**: 2026-02-14T09:35:00Z
- **Command**: gsutil cors set cors.json gs://careconnex-d4c8b.firebasestorage.app
- **Notes**: Required installing Google Cloud SDK and authenticating with gcloud auth login

### Metadata
- Source: production_setup
- Related Files: cors.json, firebase.json
- Tags: firebase, cors, storage, production

---
