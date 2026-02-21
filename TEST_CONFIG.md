# CareConnex Test Configuration

## Source of Truth
**Path:** `C:\Users\Anahi\Downloads\careconnex (2)` (Antigravity IDE workspace)

## Test Commands
```bash
# Run all tests once (CI mode)
npm test -- --run

# Alternative (direct vitest)
npx vitest --run

# With coverage (when @vitest/coverage-v8 installed)
npm test -- --run --coverage
```

## Current Baseline (2026-02-07)
- **Test Files:** 4
- **Tests:** 70 passing
- **Framework:** Vitest v4.0.15
- **Environment:** jsdom

### Test Files
1. `services/matchService.test.ts` - 18 tests
2. `services/availabilityService.test.ts` - 6 tests
3. `services/encryption.test.ts` - 13 tests
4. `services/validation.test.ts` - 33 tests

## Known Issues
- `VITE_ENCRYPTION_KEY` not set (warning in encryption tests)
- `@vitest/coverage-v8` not installed (coverage unavailable)

## Untested Services (10 files)
- ai.ts, api.ts, bunkerService.ts, chatService.ts, errorHandler.ts
- matchingExamples.ts, notifications.ts, ratingService.ts
- trainingSimulation.ts, videoService.ts

## Workflow
1. Main agent makes changes in Antigravity IDE
2. I run `npm test -- --run` from Downloads path
3. Report results immediately
