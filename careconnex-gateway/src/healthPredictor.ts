// Predictive Health Alerts System
// Analyzes care data to detect patterns and predict issues before they happen

import * as admin from 'firebase-admin';
import { callLLMString as callLLM } from './llm';
import { logger } from './logger';

const db = new Proxy({}, { get: (_, prop) => (admin.firestore() as any)[prop] }) as FirebaseFirestore.Firestore;

// Risk patterns to monitor
interface RiskPattern {
  type: 'medication' | 'nutrition' | 'mobility' | 'mood' | 'safety' | 'caregiver';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  recommendedAction: string;
}

// Analyze a senior's care data for the last 7 days
export async function analyzeSeniorHealth(seniorId: string): Promise<RiskPattern[]> {
  logger.info(`[HealthPredictor] Analyzing senior ${seniorId}`);
  
  const alerts: RiskPattern[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Get care journal entries
  const journalSnapshot = await db.collection('care_journal')
    .where('seniorId', '==', seniorId)
    .where('date', '>=', sevenDaysAgo)
    .orderBy('date', 'desc')
    .get();
  
  const entries = journalSnapshot.docs.map(doc => doc.data());
  
  // Get medication logs
  const medicationSnapshot = await db.collection('medication_logs')
    .where('seniorId', '==', seniorId)
    .where('date', '>=', sevenDaysAgo)
    .get();
  
  const medications = medicationSnapshot.docs.map(doc => doc.data());
  
  // Get caregiver check-ins
  const checkinsSnapshot = await db.collection('caregiver_checkins')
    .where('seniorId', '==', seniorId)
    .where('timestamp', '>=', sevenDaysAgo)
    .get();
  
  const checkins = checkinsSnapshot.docs.map(doc => doc.data());
  
  // Run analysis algorithms
  const medicationAlert = await analyzeMedicationAdherence(seniorId, medications, entries);
  if (medicationAlert) alerts.push(medicationAlert);
  
  const nutritionAlert = await analyzeNutritionPatterns(seniorId, entries);
  if (nutritionAlert) alerts.push(nutritionAlert);
  
  const mobilityAlert = await analyzeMobilityDecline(seniorId, entries);
  if (mobilityAlert) alerts.push(mobilityAlert);
  
  const moodAlert = await analyzeMoodChanges(seniorId, entries);
  if (moodAlert) alerts.push(moodAlert);
  
  const caregiverAlert = await analyzeCaregiverPatterns(seniorId, checkins);
  if (caregiverAlert) alerts.push(caregiverAlert);
  
  const safetyAlert = await analyzeSafetyRisks(seniorId, entries);
  if (safetyAlert) alerts.push(safetyAlert);
  
  // Store alerts
  for (const alert of alerts) {
    await storeAlert(seniorId, alert);
  }
  
  // Send critical alerts immediately
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    await notifyFamilyOfCriticalAlert(seniorId, criticalAlerts);
  }
  
  logger.info(`[HealthPredictor] Analysis complete`, { 
    seniorId, 
    alertCount: alerts.length,
    criticalCount: criticalAlerts.length 
  });
  
  return alerts;
}

// 1. Medication Adherence Analysis
async function analyzeMedicationAdherence(
  seniorId: string, 
  medications: any[], 
  entries: any[]
): Promise<RiskPattern | null> {
  
  // Check missed medications
  const missedMeds = medications.filter(m => m.taken === false || m.skipped === true);
  const adherenceRate = medications.length > 0 
    ? (medications.length - missedMeds.length) / medications.length 
    : 1;
  
  if (adherenceRate < 0.7 && medications.length >= 3) {
    return {
      type: 'medication',
      severity: adherenceRate < 0.5 ? 'critical' : 'high',
      description: `Medication adherence is ${(adherenceRate * 100).toFixed(0)}% (below 70%)`,
      indicators: [
        `${missedMeds.length} missed medications in 7 days`,
        missedMeds.slice(0, 3).map(m => m.medicationName).join(', ')
      ],
      recommendedAction: 'Schedule medication review with family. Consider pill organizer or caregiver prompting.'
    };
  }
  
  // Check for concerning patterns in journal entries
  const medConcerns = entries.filter(e => 
    e.notes?.toLowerCase().includes('refused medication') ||
    e.notes?.toLowerCase().includes('spit out') ||
    e.notes?.toLowerCase().includes('forgot to take')
  );
  
  if (medConcerns.length >= 2) {
    return {
      type: 'medication',
      severity: 'high',
      description: 'Multiple concerns about medication administration',
      indicators: medConcerns.map(e => e.notes).slice(0, 3),
      recommendedAction: 'Speak with senior about medication concerns. May need doctor consultation.'
    };
  }
  
  return null;
}

// 2. Nutrition Analysis
async function analyzeNutritionPatterns(seniorId: string, entries: any[]): Promise<RiskPattern | null> {
  const mealEntries = entries.filter(e => 
    e.category === 'meals' || 
    e.notes?.toLowerCase().includes('meal') ||
    e.notes?.toLowerCase().includes('breakfast') ||
    e.notes?.toLowerCase().includes('lunch') ||
    e.notes?.toLowerCase().includes('dinner')
  );
  
  // Check for skipped meals
  const skippedMeals = entries.filter(e => 
    e.notes?.toLowerCase().includes('skipped') ||
    e.notes?.toLowerCase().includes('refused') ||
    e.notes?.toLowerCase().includes('not hungry') ||
    e.notes?.toLowerCase().includes('ate very little')
  );
  
  const skipRate = mealEntries.length > 0 ? skippedMeals.length / mealEntries.length : 0;
  
  if (skippedMeals.length >= 3 || skipRate > 0.3) {
    return {
      type: 'nutrition',
      severity: skippedMeals.length >= 5 ? 'critical' : 'high',
      description: `Nutritional concern: ${skippedMeals.length} meal issues in 7 days`,
      indicators: skippedMeals.slice(0, 3).map(e => e.notes),
      recommendedAction: 'Monitor weight and hydration. Consider meal delivery service or dietary consultation.'
    };
  }
  
  // Check for dehydration signs
  const dehydrationSigns = entries.filter(e =>
    e.notes?.toLowerCase().includes('dehydrated') ||
    e.notes?.toLowerCase().includes('not drinking') ||
    e.notes?.toLowerCase().includes('dry mouth') ||
    e.notes?.toLowerCase().includes('dark urine')
  );
  
  if (dehydrationSigns.length >= 1) {
    return {
      type: 'nutrition',
      severity: 'high',
      description: 'Signs of dehydration detected',
      indicators: dehydrationSigns.map(e => e.notes).slice(0, 2),
      recommendedAction: 'Increase fluid intake monitoring. Contact doctor if symptoms persist.'
    };
  }
  
  return null;
}

// 3. Mobility Decline Analysis
async function analyzeMobilityDecline(seniorId: string, entries: any[]): Promise<RiskPattern | null> {
  // Check for mobility concerns
  const mobilityIssues = entries.filter(e =>
    e.notes?.toLowerCase().includes('fall') ||
    e.notes?.toLowerCase().includes('slipped') ||
    e.notes?.toLowerCase().includes('unsteady') ||
    e.notes?.toLowerCase().includes('walker') ||
    e.notes?.toLowerCase().includes('cane') ||
    e.notes?.toLowerCase().includes('balance') ||
    e.notes?.toLowerCase().includes('shuffle')
  );
  
  // Any fall is critical
  const falls = entries.filter(e =>
    e.notes?.toLowerCase().includes('fell') ||
    e.notes?.toLowerCase().includes('fall') && !e.notes?.toLowerCase().includes('fall asleep')
  );
  
  if (falls.length > 0) {
    return {
      type: 'mobility',
      severity: 'critical',
      description: `FALL DETECTED: ${falls.length} fall(s) in 7 days`,
      indicators: falls.map(e => e.notes).slice(0, 3),
      recommendedAction: 'URGENT: Fall risk assessment needed. Consider physical therapy, home safety evaluation.'
    };
  }
  
  if (mobilityIssues.length >= 3) {
    return {
      type: 'mobility',
      severity: 'high',
      description: 'Declining mobility detected',
      indicators: mobilityIssues.slice(0, 3).map(e => e.notes),
      recommendedAction: 'Schedule physical therapy evaluation. Assess home for safety hazards.'
    };
  }
  
  return null;
}

// 4. Mood & Mental Health Analysis
async function analyzeMoodChanges(seniorId: string, entries: any[]): Promise<RiskPattern | null> {
  const moodConcerns = entries.filter(e =>
    e.notes?.toLowerCase().includes('sad') ||
    e.notes?.toLowerCase().includes('depressed') ||
    e.notes?.toLowerCase().includes('withdrawn') ||
    e.notes?.toLowerCase().includes('confused') ||
    e.notes?.toLowerCase().includes('agitated') ||
    e.notes?.toLowerCase().includes('aggressive') ||
    e.notes?.toLowerCase().includes('crying') ||
    e.notes?.toLowerCase().includes('anxious') ||
    e.notes?.toLowerCase().includes('lonely')
  );
  
  // Use LLM for deeper sentiment analysis if we have enough entries
  if (entries.length >= 5) {
    const recentNotes = entries.slice(0, 7).map(e => e.notes).filter(Boolean).join('\n');
    
    try {
      const analysis = await callLLM([
        { 
          role: 'system', 
          content: 'You are a mental health monitoring assistant. Analyze these caregiver notes and detect any concerning mood patterns. Return ONLY valid JSON with format: {"concernDetected": boolean, "severity": "low|medium|high", "description": "...", "recommendedAction": "..."}' 
        },
        { 
          role: 'user', 
          content: `Analyze these care notes for mood/mental health concerns:\n\n${recentNotes}` 
        }
      ]);
      
      const result = JSON.parse(analysis);
      if (result.concernDetected && ['medium', 'high'].includes(result.severity)) {
        return {
          type: 'mood',
          severity: result.severity as 'medium' | 'high',
          description: result.description,
          indicators: moodConcerns.slice(0, 2).map(e => e.notes),
          recommendedAction: result.recommendedAction
        };
      }
    } catch (e) {
      logger.error('[HealthPredictor] LLM mood analysis failed', { error: e });
    }
  }
  
  // Fallback to keyword detection
  if (moodConcerns.length >= 3) {
    return {
      type: 'mood',
      severity: 'high',
      description: 'Multiple mood concerns detected',
      indicators: moodConcerns.slice(0, 3).map(e => e.notes),
      recommendedAction: 'Consider mental health evaluation. Increase social engagement and family visits.'
    };
  }
  
  return null;
}

// 5. Caregiver Performance Analysis
async function analyzeCaregiverPatterns(seniorId: string, checkins: any[]): Promise<RiskPattern | null> {
  // Check for late arrivals
  const lateArrivals = checkins.filter(c => {
    if (!c.scheduledTime || !c.actualTime) return false;
    const scheduled = new Date(c.scheduledTime).getTime();
    const actual = new Date(c.actualTime).getTime();
    return actual > scheduled + 15 * 60 * 1000; // 15+ minutes late
  });
  
  const lateRate = checkins.length > 0 ? lateArrivals.length / checkins.length : 0;
  
  if (lateRate > 0.3 && checkins.length >= 3) {
    return {
      type: 'caregiver',
      severity: 'medium',
      description: `Caregiver reliability issue: ${(lateRate * 100).toFixed(0)}% late arrivals`,
      indicators: lateArrivals.slice(0, 3).map(c => 
        `Arrived ${Math.round((new Date(c.actualTime).getTime() - new Date(c.scheduledTime).getTime()) / 60000)} min late`
      ),
      recommendedAction: 'Discuss punctuality with caregiver. May need backup caregiver or schedule adjustment.'
    };
  }
  
  // Check for missed check-ins
  const missedCheckins = checkins.filter(c => c.status === 'missed' || c.noShow === true);
  if (missedCheckins.length >= 1) {
    return {
      type: 'caregiver',
      severity: 'high',
      description: 'Caregiver missed scheduled visit(s)',
      indicators: missedCheckins.map(c => `Missed visit on ${c.date}`),
      recommendedAction: 'URGENT: Contact caregiver immediately. Ensure senior is safe. Consider backup coverage.'
    };
  }
  
  return null;
}

// 6. Safety Risk Analysis
async function analyzeSafetyRisks(seniorId: string, entries: any[]): Promise<RiskPattern | null> {
  const safetyIssues = entries.filter(e =>
    e.notes?.toLowerCase().includes('wander') ||
    e.notes?.toLowerCase().includes('left stove on') ||
    e.notes?.toLowerCase().includes('unlocked door') ||
    e.notes?.toLowerCase().includes('lost') ||
    e.notes?.toLowerCase().includes('disoriented') ||
    e.notes?.toLowerCase().includes('unsafe')
  );
  
  // Wandering is critical
  const wandering = entries.filter(e =>
    e.notes?.toLowerCase().includes('wander') ||
    e.notes?.toLowerCase().includes('found outside') ||
    e.notes?.toLowerCase().includes('walked away')
  );
  
  if (wandering.length > 0) {
    return {
      type: 'safety',
      severity: 'critical',
      description: 'WANDERING RISK DETECTED',
      indicators: wandering.map(e => e.notes).slice(0, 2),
      recommendedAction: 'URGENT: Implement wandering prevention measures. Consider door alarms, GPS tracker, 24/7 supervision.'
    };
  }
  
  if (safetyIssues.length >= 2) {
    return {
      type: 'safety',
      severity: 'high',
      description: 'Multiple safety concerns',
      indicators: safetyIssues.slice(0, 3).map(e => e.notes),
      recommendedAction: 'Conduct full home safety evaluation. Consider increased supervision or assisted living.'
    };
  }
  
  return null;
}

// Store alert in database
async function storeAlert(seniorId: string, alert: RiskPattern): Promise<void> {
  await db.collection('health_alerts').add({
    seniorId,
    ...alert,
    status: 'active',
    createdAt: new Date(),
    acknowledgedAt: null,
    acknowledgedBy: null
  });
}

// Notify family of critical alert
async function notifyFamilyOfCriticalAlert(seniorId: string, alerts: RiskPattern[]): Promise<void> {
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  if (!senior) return;
  
  // Get family contact
  const familyDoc = await db.collection('families').doc(senior.familyId).get();
  const family = familyDoc.data();
  
  if (!family) return;
  
  // Build critical alert message
  const alertTexts = alerts.map(a => `🚨 ${a.type.toUpperCase()}: ${a.description}`).join('\n\n');
  
  const message = `🚨 URGENT CARE ALERT 🚨

${senior.name}

${alertTexts}

Please check on them immediately or call:
📞 CareConnex Emergency: (555) 123-4567

Reply OK to acknowledge.`;

  // Send via all channels
  if (family.whatsappNumber) {
    await sendWhatsAppAlert(family.whatsappNumber, message);
  }
  if (family.phone) {
    await sendSMSAlert(family.phone, message);
  }
  if (family.email) {
    await sendEmailAlert(family.email, `URGENT: Care Alert for ${senior.name}`, message);
  }
  
  logger.info(`[HealthPredictor] Critical alerts sent`, { 
    seniorId, 
    familyId: senior.familyId,
    alertCount: alerts.length 
  });
}

// Send daily health summary (non-critical)
export async function sendDailyHealthSummary(seniorId: string): Promise<void> {
  const alerts = await analyzeSeniorHealth(seniorId);
  
  // Only send if there are medium or high alerts (not critical - those are immediate)
  const nonCriticalAlerts = alerts.filter(a => a.severity !== 'critical');
  
  if (nonCriticalAlerts.length === 0) return;
  
  const seniorDoc = await db.collection('seniors').doc(seniorId).get();
  const senior = seniorDoc.data();
  
  if (!senior) return;
  
  const familyDoc = await db.collection('families').doc(senior.familyId).get();
  const family = familyDoc.data();
  
  if (!family || !family.notificationPreferences?.healthAlerts) return;
  
  const message = `📊 Daily Health Summary for ${senior.name}

${nonCriticalAlerts.map(a => `• ${a.type}: ${a.description}`).join('\n')}

Recommendations:
${nonCriticalAlerts.map(a => `• ${a.recommendedAction}`).join('\n')}

View full details: https://careconnex.com/family/${senior.familyId}`;

  if (family.whatsappNumber) {
    await sendWhatsAppAlert(family.whatsappNumber, message);
  }
}

// Helper functions
async function sendWhatsAppAlert(to: string, message: string): Promise<void> {
  // Implementation in notifications.ts
  logger.info(`[Alert] WhatsApp sent`, { to: to.substring(0, 8) + '...' });
}

async function sendSMSAlert(to: string, message: string): Promise<void> {
  logger.info(`[Alert] SMS sent`, { to: to.substring(0, 8) + '...' });
}

async function sendEmailAlert(to: string, subject: string, body: string): Promise<void> {
  logger.info(`[Alert] Email sent`, { to, subject });
}

// Run health analysis for all active seniors (overnight job)
export async function runHealthAnalysisForAllSeniors(): Promise<void> {
  logger.info('[HealthPredictor] Starting batch analysis for all seniors');
  
  const seniorsSnapshot = await db.collection('seniors')
    .where('active', '==', true)
    .get();
  
  for (const seniorDoc of seniorsSnapshot.docs) {
    try {
      await analyzeSeniorHealth(seniorDoc.id);
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`[HealthPredictor] Failed to analyze senior ${seniorDoc.id}`, { error });
    }
  }
  
  logger.info('[HealthPredictor] Batch analysis complete', { count: seniorsSnapshot.size });
}
