"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeMatching = void 0;
exports.calculateMatchScore = calculateMatchScore;
exports.findBestMatches = findBestMatches;
exports.learnFromSuccessfulMatch = learnFromSuccessfulMatch;
exports.explainMatch = explainMatch;
exports.getAlternativeMatches = getAlternativeMatches;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Cara Smart Matching Engine
 * ML-inspired caregiver-client matching algorithm
 * Goes beyond simple filtering to find the best personality and care fit
 */
/**
 * Matching factors and weights
 */
const MATCHING_WEIGHTS = {
    skillsMatch: 0.25, // 25% - Caregiver has required skills
    experienceLevel: 0.15, // 15% - Years of experience
    ratingQuality: 0.15, // 15% - Past performance
    availabilityFit: 0.15, // 15% - Schedule alignment
    personalityMatch: 0.15, // 15% - Personality compatibility
    proximity: 0.10, // 10% - Distance/zip code match
    priceMatch: 0.05 // 5%  - Budget alignment
};
/**
 * Calculate comprehensive match score
 */
async function calculateMatchScore(caregiver, clientNeeds) {
    const breakdown = {};
    const reasons = [];
    // 1. Skills Match (25%)
    const skillsScore = calculateSkillsMatch(caregiver.specialties || [], caregiver.services || [], clientNeeds.needs);
    breakdown.skillsMatch = skillsScore * MATCHING_WEIGHTS.skillsMatch;
    if (skillsScore > 0.8)
        reasons.push('Excellent skills match');
    else if (skillsScore > 0.5)
        reasons.push('Good skills match');
    // 2. Experience Level (15%)
    const experienceScore = Math.min((caregiver.yearsExperience || 0) / 10, 1);
    breakdown.experienceLevel = experienceScore * MATCHING_WEIGHTS.experienceLevel;
    if (caregiver.yearsExperience >= 5)
        reasons.push('Highly experienced');
    // 3. Rating Quality (15%)
    const ratingScore = (caregiver.rating || 4.0) / 5.0;
    breakdown.ratingQuality = ratingScore * MATCHING_WEIGHTS.ratingQuality;
    if (caregiver.rating >= 4.8)
        reasons.push('Top-rated caregiver');
    else if (caregiver.rating >= 4.5)
        reasons.push('Excellent ratings');
    // 4. Availability Fit (15%)
    const availabilityScore = calculateAvailabilityMatch(caregiver.recurringSchedule || {}, clientNeeds.schedule);
    breakdown.availabilityFit = availabilityScore * MATCHING_WEIGHTS.availabilityFit;
    if (availabilityScore > 0.8)
        reasons.push('Perfect schedule match');
    // 5. Personality Match (15%)
    const personalityScore = calculatePersonalityMatch(caregiver.personalityTraits || [], clientNeeds.personalityPrefs || []);
    breakdown.personalityMatch = personalityScore * MATCHING_WEIGHTS.personalityMatch;
    if (personalityScore > 0.7)
        reasons.push('Great personality fit');
    // 6. Proximity (10%)
    const proximityScore = calculateProximityScore(caregiver.serviceZipCodes || [], clientNeeds.zipCode);
    breakdown.proximity = proximityScore * MATCHING_WEIGHTS.proximity;
    if (proximityScore === 1)
        reasons.push('Local to your area');
    // 7. Price Match (5%)
    const priceScore = clientNeeds.maxPrice
        ? Math.max(0, 1 - Math.abs(caregiver.hourlyRate - clientNeeds.maxPrice / 2) / clientNeeds.maxPrice)
        : 0.8;
    breakdown.priceMatch = priceScore * MATCHING_WEIGHTS.priceMatch;
    // Calculate total
    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    return {
        totalScore: Math.round(totalScore * 100) / 100,
        breakdown,
        reasons
    };
}
/**
 * Calculate skills match percentage
 */
function calculateSkillsMatch(caregiverSpecialties, caregiverServices, clientNeeds) {
    if (clientNeeds.length === 0)
        return 0.5;
    const allSkills = [...caregiverSpecialties, ...caregiverServices]
        .map(s => s.toLowerCase());
    const matches = clientNeeds.filter(need => allSkills.some(skill => skill.includes(need.toLowerCase()))).length;
    return matches / clientNeeds.length;
}
/**
 * Calculate availability match
 */
function calculateAvailabilityMatch(caregiverSchedule, clientSchedule) {
    var _a;
    if (clientSchedule.length === 0)
        return 0.5;
    const dayMap = {
        'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday',
        'thu': 'thursday', 'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday'
    };
    let matches = 0;
    for (const clientDay of clientSchedule) {
        const normalizedDay = dayMap[clientDay.toLowerCase()] || clientDay.toLowerCase();
        if (((_a = caregiverSchedule[normalizedDay]) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            matches++;
        }
    }
    return matches / clientSchedule.length;
}
/**
 * Calculate personality compatibility
 */
function calculatePersonalityMatch(caregiverTraits, clientPrefs) {
    if (clientPrefs.length === 0 || caregiverTraits.length === 0)
        return 0.5;
    const matches = clientPrefs.filter(pref => caregiverTraits.some(trait => trait.toLowerCase().includes(pref.toLowerCase()))).length;
    return 0.3 + (0.7 * (matches / clientPrefs.length)); // Minimum 0.3 for neutral
}
/**
 * Calculate proximity score
 */
function calculateProximityScore(caregiverZipCodes, clientZipCode) {
    if (caregiverZipCodes.includes(clientZipCode))
        return 1.0;
    // Check if in same area (first 3 digits match for zip+4)
    const clientPrefix = clientZipCode.substring(0, 3);
    const nearby = caregiverZipCodes.some(zip => zip.substring(0, 3) === clientPrefix);
    return nearby ? 0.7 : 0.3;
}
/**
 * Find best caregiver matches with ML-style ranking
 */
async function findBestMatches(clientNeeds, limit = 3) {
    // Initial filter - basic requirements
    let query = db.collection('caregivers')
        .where('verified', '==', true)
        .where('available', '==', true);
    // Filter by price if provided
    if (clientNeeds.maxPrice) {
        query = query.where('hourlyRate', '<=', clientNeeds.maxPrice + 5); // Slight buffer
    }
    // Filter by zip code area
    query = query.where('serviceZipCodes', 'array-contains', clientNeeds.zipCode);
    const caregivers = await query.limit(20).get();
    // Score each caregiver
    const scoredMatches = await Promise.all(caregivers.docs.map(async (doc) => {
        const caregiver = Object.assign({ id: doc.id }, doc.data());
        const scoring = await calculateMatchScore(caregiver, clientNeeds);
        return Object.assign(Object.assign({}, caregiver), { matchScore: scoring.totalScore, matchBreakdown: scoring.breakdown, matchReasons: scoring.reasons, confidence: scoring.totalScore > 0.8 ? 'high' : scoring.totalScore > 0.6 ? 'medium' : 'low' });
    }));
    // Sort by score and return top matches
    return scoredMatches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
}
/**
 * Learn from successful matches
 * Updates matching weights based on historical success
 */
async function learnFromSuccessfulMatch(clientId, caregiverId, outcome, feedback) {
    // Store the match outcome
    await db.collection('match_outcomes').add({
        clientId,
        caregiverId,
        outcome,
        feedback,
        learnedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // If highly successful, note what worked
    if (outcome === 'completed' && (feedback === null || feedback === void 0 ? void 0 : feedback.rating) && feedback.rating >= 4) {
        // Get the match details
        const matchDoc = await db.collection('appointments')
            .where('userId', '==', clientId)
            .where('caregiverId', '==', caregiverId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (!matchDoc.empty) {
            const match = matchDoc.docs[0].data();
            // Store successful pattern
            await db.collection('successful_patterns').add({
                clientNeeds: match.needs,
                caregiverTraits: {
                    specialties: match.caregiverSpecialties,
                    personality: match.caregiverPersonality
                },
                rating: feedback.rating,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
}
/**
 * Cloud Function: Auto-improve matching based on outcomes
 * Runs weekly to analyze match success rates
 */
exports.optimizeMatching = functions.pubsub
    .schedule('0 3 * * 1') // Mondays at 3 AM
    .timeZone('America/Los_Angeles')
    .onRun(async (context) => {
    console.log('🎯 Analyzing match outcomes for optimization...');
    // Get recent outcomes
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const outcomes = await db.collection('match_outcomes')
        .where('learnedAt', '>=', thirtyDaysAgo)
        .get();
    // Calculate success rates by factor
    let successCount = 0;
    outcomes.docs.forEach(doc => {
        var _a;
        const data = doc.data();
        if (data.outcome === 'completed' && ((_a = data.feedback) === null || _a === void 0 ? void 0 : _a.rating) >= 4) {
            successCount++;
        }
    });
    console.log(`Success rate: ${successCount}/${outcomes.size}`);
    console.log(`Analyzed ${outcomes.size} match outcomes`);
    return { success: true, analyzed: outcomes.size };
});
/**
 * Tool: Explain why a caregiver was recommended
 */
function explainMatch(caregiver, matchScore, matchBreakdown, matchReasons) {
    let explanation = `*Match Score: ${Math.round(matchScore * 100)}%*\n\n`;
    explanation += '*Why this caregiver is recommended:*\n';
    matchReasons.forEach(reason => {
        explanation += `• ${reason}\n`;
    });
    explanation += '\n*Detailed Breakdown:*\n';
    for (const [factor, score] of Object.entries(matchBreakdown)) {
        const percentage = Math.round(score * 100);
        const bar = '█'.repeat(Math.round(percentage / 10)) + '░'.repeat(10 - Math.round(percentage / 10));
        explanation += `${factor}: ${bar} ${percentage}%\n`;
    }
    return explanation;
}
/**
 * Tool: Get alternative suggestions if top match isn't available
 */
async function getAlternativeMatches(primaryMatchId, clientNeeds, count = 2) {
    // Exclude the primary match
    const allMatches = await findBestMatches(clientNeeds, count + 5);
    return allMatches
        .filter(m => m.id !== primaryMatchId)
        .slice(0, count);
}
//# sourceMappingURL=caraMatching.js.map