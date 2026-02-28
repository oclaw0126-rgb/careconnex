// Self-Improving Matching System
// Learns from successful/failed matches to improve recommendations over time

import * as admin from 'firebase-admin';
import { callLLM } from './llm';
import { logger } from './logger';

const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;

// Match outcome tracking
interface MatchOutcome {
  seniorId: string;
  caregiverId: string;
  matchScore: number;
  outcome: 'excellent' | 'good' | 'fair' | 'poor' | 'terminated';
  feedback: string[];
  durationDays: number;
  familySatisfaction: number; // 1-10
  caregiverSatisfaction: number; // 1-10
  factors: {
    personalityMatch: number;
    skillMatch: number;
    scheduleCompatibility: number;
    communication: number;
    reliability: number;
  };
  createdAt: Date;
  endedAt?: Date;
}

// Learn from match outcomes and improve algorithm
export async function learnFromMatches(): Promise<void> {
  logger.info('[MatchingLearner] Starting learning cycle');
  
  // Get all match outcomes from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const outcomesSnapshot = await db.collection('match_outcomes')
    .where('createdAt', '>=', thirtyDaysAgo)
    .get();
  
  const outcomes = outcomesSnapshot.docs.map(doc => doc.data() as MatchOutcome);
  
  if (outcomes.length < 5) {
    logger.info('[MatchingLearner] Not enough data to learn yet', { count: outcomes.length });
    return;
  }
  
  // Analyze patterns
  const analysis = await analyzeMatchPatterns(outcomes);
  
  // Update matching weights
  await updateMatchingWeights(analysis);
  
  // Generate insights
  const insights = await generateMatchingInsights(outcomes);
  
  // Store learnings
  await db.collection('matching_learnings').add({
    date: new Date(),
    totalMatchesAnalyzed: outcomes.length,
    averageSatisfaction: analysis.averageSatisfaction,
    successRate: analysis.successRate,
    topFactors: analysis.topFactors,
    insights,
    updatedWeights: analysis.recommendedWeights
  });
  
  logger.info('[MatchingLearner] Learning cycle complete', {
    matchesAnalyzed: outcomes.length,
    successRate: analysis.successRate,
    avgSatisfaction: analysis.averageSatisfaction
  });
}

// Analyze what makes matches successful
async function analyzeMatchPatterns(outcomes: MatchOutcome[]): Promise<any> {
  const successfulMatches = outcomes.filter(o => 
    o.outcome === 'excellent' || o.outcome === 'good'
  );
  
  const failedMatches = outcomes.filter(o => 
    o.outcome === 'poor' || o.outcome === 'terminated'
  );
  
  // Calculate success rate
  const successRate = outcomes.length > 0 
    ? successfulMatches.length / outcomes.length 
    : 0;
  
  // Calculate average satisfaction
  const avgSatisfaction = outcomes.reduce((sum, o) => 
    sum + o.familySatisfaction, 0
  ) / outcomes.length;
  
  // Analyze factor importance
  const factorScores = {
    personalityMatch: 0,
    skillMatch: 0,
    scheduleCompatibility: 0,
    communication: 0,
    reliability: 0
  };
  
  successfulMatches.forEach(match => {
    factorScores.personalityMatch += match.factors.personalityMatch;
    factorScores.skillMatch += match.factors.skillMatch;
    factorScores.scheduleCompatibility += match.factors.scheduleCompatibility;
    factorScores.communication += match.factors.communication;
    factorScores.reliability += match.factors.reliability;
  });
  
  const matchCount = successfulMatches.length || 1;
  
  // Calculate which factors matter most
  const topFactors = Object.entries(factorScores)
    .map(([factor, score]) => ({
      factor,
      averageScore: score / matchCount,
      importance: score / matchCount > 7 ? 'high' : score / matchCount > 5 ? 'medium' : 'low'
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
  
  // Generate recommended weights based on analysis
  const totalScore = topFactors.reduce((sum, f) => sum + f.averageScore, 0);
  const recommendedWeights = {
    personalityMatch: topFactors.find(f => f.factor === 'personalityMatch')!.averageScore / totalScore,
    skillMatch: topFactors.find(f => f.factor === 'skillMatch')!.averageScore / totalScore,
    scheduleCompatibility: topFactors.find(f => f.factor === 'scheduleCompatibility')!.averageScore / totalScore,
    communication: topFactors.find(f => f.factor === 'communication')!.averageScore / totalScore,
    reliability: topFactors.find(f => f.factor === 'reliability')!.averageScore / totalScore
  };
  
  return {
    successRate,
    averageSatisfaction: avgSatisfaction,
    successfulCount: successfulMatches.length,
    failedCount: failedMatches.length,
    topFactors: topFactors.slice(0, 3),
    recommendedWeights
  };
}

// Update the matching algorithm weights
async function updateMatchingWeights(analysis: any): Promise<void> {
  await db.collection('matching_config').doc('weights').set({
    weights: analysis.recommendedWeights,
    lastUpdated: new Date(),
    basedOnMatches: analysis.successfulCount + analysis.failedCount
  });
  
  logger.info('[MatchingLearner] Updated matching weights', analysis.recommendedWeights);
}

// Generate insights using LLM
async function generateMatchingInsights(outcomes: MatchOutcome[]): Promise<string[]> {
  const successfulPatterns = outcomes
    .filter(o => o.outcome === 'excellent' || o.outcome === 'good')
    .slice(0, 10);
  
  const failedPatterns = outcomes
    .filter(o => o.outcome === 'poor' || o.outcome === 'terminated')
    .slice(0, 10);
  
  const prompt = `As a care matching expert, analyze these successful and failed caregiver matches to identify patterns and insights.

SUCCESSFUL MATCHES:
${successfulPatterns.map(o => `- Caregiver ${o.caregiverId} with Senior ${o.seniorId}: ${o.outcome}, satisfaction ${o.familySatisfaction}/10, lasted ${o.durationDays} days. Factors: personality ${o.factors.personalityMatch}, skills ${o.factors.skillMatch}, schedule ${o.factors.scheduleCompatibility}`).join('\n')}

FAILED MATCHES:
${failedPatterns.map(o => `- Caregiver ${o.caregiverId} with Senior ${o.seniorId}: ${o.outcome}, satisfaction ${o.familySatisfaction}/10, lasted ${o.durationDays} days. Feedback: ${o.feedback.join(', ')}`).join('\n')}

Provide 3-5 actionable insights about what makes caregiver-senior matches successful. Return as JSON array of strings.`;

  try {
    const response = await callLLM([
      { role: 'system', content: 'You are a care matching expert. Return only valid JSON array of insight strings.' },
      { role: 'user', content: prompt }
    ]);
    
    return JSON.parse(response);
  } catch (e) {
    logger.error('[MatchingLearner] Failed to generate insights', { error: e });
    return [
      'Continue monitoring match outcomes to improve recommendations',
      'Personality compatibility appears to be a key success factor'
    ];
  }
}

// Record match outcome (called when match ends or periodically)
export async function recordMatchOutcome(outcome: MatchOutcome): Promise<void> {
  await db.collection('match_outcomes').add({
    ...outcome,
    createdAt: new Date()
  });
  
  logger.info('[MatchingLearner] Match outcome recorded', {
    seniorId: outcome.seniorId,
    caregiverId: outcome.caregiverId,
    outcome: outcome.outcome
  });
}

// Get personalized match score using learned weights
export async function calculateSmartMatchScore(
  seniorId: string,
  caregiverId: string
): Promise<{ score: number; reasoning: string; factors: any }> {
  // Get current weights
  const weightsDoc = await db.collection('matching_config').doc('weights').get();
  const weights = weightsDoc.exists ? weightsDoc.data()?.weights : {
    personalityMatch: 0.25,
    skillMatch: 0.25,
    scheduleCompatibility: 0.20,
    communication: 0.15,
    reliability: 0.15
  };
  
  // Get senior and caregiver data
  const [seniorDoc, caregiverDoc] = await Promise.all([
    db.collection('seniors').doc(seniorId).get(),
    db.collection('caregivers').doc(caregiverId).get()
  ]);
  
  const senior = seniorDoc.data();
  const caregiver = caregiverDoc.data();
  
  if (!senior || !caregiver) {
    return { score: 0, reasoning: 'Data not found', factors: {} };
  }
  
  // Calculate individual factors (0-10 scale)
  const factors = {
    personalityMatch: calculatePersonalityMatch(senior, caregiver),
    skillMatch: calculateSkillMatch(senior, caregiver),
    scheduleCompatibility: calculateScheduleCompatibility(senior, caregiver),
    communication: calculateCommunicationScore(caregiver),
    reliability: calculateReliabilityScore(caregiver)
  };
  
  // Calculate weighted score
  const score = 
    factors.personalityMatch * weights.personalityMatch +
    factors.skillMatch * weights.skillMatch +
    factors.scheduleCompatibility * weights.scheduleCompatibility +
    factors.communication * weights.communication +
    factors.reliability * weights.reliability;
  
  // Generate reasoning
  const reasoning = await generateMatchReasoning(senior, caregiver, factors, score);
  
  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    reasoning,
    factors
  };
}

// Individual factor calculations
function calculatePersonalityMatch(senior: any, caregiver: any): number {
  let score = 5; // Base score
  
  // Check for personality compatibility
  if (senior.personality && caregiver.personality) {
    if (senior.personality === caregiver.personality) score += 2;
    if (senior.personality === 'calm' && caregiver.personality === 'patient') score += 2;
    if (senior.personality === 'social' && caregiver.personality === 'outgoing') score += 2;
  }
  
  // Check for interest alignment
  if (senior.interests && caregiver.interests) {
    const commonInterests = senior.interests.filter((i: string) => 
      caregiver.interests.includes(i)
    );
    score += commonInterests.length * 0.5;
  }
  
  return Math.min(10, score);
}

function calculateSkillMatch(senior: any, caregiver: any): number {
  let score = 5;
  
  if (senior.careNeeds && caregiver.specialties) {
    const matchingSpecialties = senior.careNeeds.filter((need: string) =>
      caregiver.specialties.some((s: string) => 
        s.toLowerCase().includes(need.toLowerCase()) ||
        need.toLowerCase().includes(s.toLowerCase())
      )
    );
    score += matchingSpecialties.length * 1.5;
  }
  
  // Experience bonus
  if (caregiver.yearsExperience >= 5) score += 1;
  if (caregiver.yearsExperience >= 10) score += 1;
  
  // Certifications
  if (caregiver.certifications?.length > 2) score += 1;
  
  return Math.min(10, score);
}

function calculateScheduleCompatibility(senior: any, caregiver: any): number {
  let score = 5;
  
  if (senior.preferredTimes && caregiver.availability) {
    const preferredTimes = senior.preferredTimes as string[];
    const caregiverAvailability = caregiver.availability as string[];
    
    const matchingTimes = preferredTimes.filter(time =>
      caregiverAvailability.some(avail => avail.toLowerCase().includes(time.toLowerCase()))
    );
    
    score += (matchingTimes.length / preferredTimes.length) * 5;
  }
  
  return Math.min(10, score);
}

function calculateCommunicationScore(caregiver: any): number {
  let score = 5;
  
  // Check previous ratings
  if (caregiver.averageRating >= 4.5) score += 2;
  else if (caregiver.averageRating >= 4.0) score += 1;
  
  // Check reviews for communication mentions
  if (caregiver.reviews) {
    const goodCommunication = caregiver.reviews.filter((r: any) =>
      r.comment?.toLowerCase().includes('communicat') ||
      r.comment?.toLowerCase().includes('responsive') ||
      r.comment?.toLowerCase().includes('updates')
    ).length;
    
    score += Math.min(2, goodCommunication * 0.5);
  }
  
  // Language match (simplified - would check senior's preferred language)
  if (caregiver.languages?.includes('English')) score += 1;
  
  return Math.min(10, score);
}

function calculateReliabilityScore(caregiver: any): number {
  let score = 5;
  
  // Check cancellation rate
  if (caregiver.cancellationRate !== undefined) {
    score -= caregiver.cancellationRate * 3; // Penalty for cancellations
  }
  
  // Check punctuality
  if (caregiver.averageOnTimePercentage >= 95) score += 2;
  else if (caregiver.averageOnTimePercentage >= 90) score += 1;
  
  // Tenure with platform
  if (caregiver.joinedAt) {
    const monthsOnPlatform = (Date.now() - caregiver.joinedAt.toDate().getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsOnPlatform >= 12) score += 1.5;
    else if (monthsOnPlatform >= 6) score += 0.5;
  }
  
  // Completed appointments
  if (caregiver.completedAppointments >= 50) score += 1;
  
  return Math.min(10, Math.max(0, score));
}

// Generate human-readable reasoning for the match
async function generateMatchReasoning(
  senior: any,
  caregiver: any,
  factors: any,
  score: number
): Promise<string> {
  const prompt = `Explain why this caregiver is a good match for this senior. Keep it warm and specific.

Senior: ${senior.name}, needs: ${senior.careNeeds?.join(', ') || 'general care'}
Caregiver: ${caregiver.name}, specialties: ${caregiver.specialties?.join(', ')}, ${caregiver.yearsExperience} years experience

Match scores (0-10):
- Personality match: ${factors.personalityMatch}
- Skills match: ${factors.skillMatch}
- Schedule fit: ${factors.scheduleCompatibility}
- Communication: ${factors.communication}
- Reliability: ${factors.reliability}

Overall score: ${score}/10

Write 2-3 sentences explaining why this is a strong match. Mention specific strengths.`;

  try {
    const response = await callLLM([
      { role: 'system', content: 'You are a care coordinator explaining a caregiver match to a family. Be warm and specific.' },
      { role: 'user', content: prompt }
    ]);
    
    return response.trim();
  } catch (e) {
    return `${caregiver.name} has strong experience in ${caregiver.specialties?.[0] || 'senior care'} with ${caregiver.yearsExperience} years of experience. Their schedule aligns well with your needs.`;
  }
}

// Get top caregivers for a senior using smart matching
export async function getSmartMatches(
  seniorId: string,
  limit: number = 3
): Promise<Array<{ caregiverId: string; caregiver: any; score: number; reasoning: string }>> {
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  if (!senior) {
    throw new Error('Senior not found');
  }
  
  // Get available caregivers
  const caregiversSnapshot = await db.collection('caregivers')
    .where('available', '==', true)
    .where('verified', '==', true)
    .get();
  
  // Calculate scores for all caregivers
  const matches = [];
  
  for (const caregiverDoc of caregiversSnapshot.docs) {
    const matchResult = await calculateSmartMatchScore(seniorId, caregiverDoc.id);
    
    if (matchResult.score >= 6) { // Only include good matches
      matches.push({
        caregiverId: caregiverDoc.id,
        caregiver: caregiverDoc.data(),
        score: matchResult.score,
        reasoning: matchResult.reasoning
      });
    }
  }
  
  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Collect family feedback after a match
export async function collectFamilyFeedback(
  seniorId: string,
  caregiverId: string,
  feedback: {
    rating: number;
    satisfaction: number;
    wouldRecommend: boolean;
    comments: string;
  }
): Promise<void> {
  await db.collection('family_feedback').add({
    seniorId,
    caregiverId,
    ...feedback,
    createdAt: new Date()
  });
  
  // Update match outcome if exists
  const outcomesSnapshot = await db.collection('match_outcomes')
    .where('seniorId', '==', seniorId)
    .where('caregiverId', '==', caregiverId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  
  if (!outcomesSnapshot.empty) {
    await outcomesSnapshot.docs[0].ref.update({
      familySatisfaction: feedback.satisfaction,
      feedback: admin.firestore.FieldValue.arrayUnion(feedback.comments),
      lastFeedbackAt: new Date()
    });
  }
  
  logger.info('[MatchingLearner] Family feedback collected', {
    seniorId,
    caregiverId,
    satisfaction: feedback.satisfaction
  });
}

// Run weekly learning cycle
export async function runWeeklyLearning(): Promise<void> {
  logger.info('[MatchingLearner] Starting weekly learning cycle');
  
  await learnFromMatches();
  
  // Send summary to admin
  const learningDoc = await db.collection('matching_learnings')
    .orderBy('date', 'desc')
    .limit(1)
    .get();
  
  if (!learningDoc.empty) {
    const data = learningDoc.docs[0].data();
    
    // Could send email notification to admin with insights
    logger.info('[MatchingLearner] Weekly summary', {
      successRate: data.successRate,
      insights: data.insights
    });
  }
}
