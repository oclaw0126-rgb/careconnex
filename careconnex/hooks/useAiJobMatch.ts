import { useState, useEffect } from 'react';
import { JobPost, Caregiver } from '../types';
import { dbService } from '../services/api';
import { aiService } from '../services/ai';

interface JobMatch {
  job: JobPost;
  matchScore: number;
  matchReasons: string[];
}

export const useAiJobMatch = (profile: Caregiver | null) => {
  const [matchedJobs, setMatchedJobs] = useState<JobMatch[]>([]);
  const [allJobs, setAllJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndMatchJobs = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch available jobs
        const jobs = await dbService.getOpenJobs();
        setAllJobs(jobs);

        // 2. Score each job using AI
        const scoredJobs: JobMatch[] = [];
        
        for (const job of jobs) {
          const match = await scoreJobForCaregiver(job, profile);
          if (match.matchScore > 50) { // Only show jobs with >50% match
            scoredJobs.push(match);
          }
        }

        // 3. Sort by match score
        scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
        
        setMatchedJobs(scoredJobs);
      } catch (error) {
        console.error('Job matching failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndMatchJobs();
  }, [profile]);

  return { matchedJobs, allJobs, loading };
};

/**
 * AI-powered job scoring for caregivers
 */
async function scoreJobForCaregiver(job: JobPost, caregiver: Caregiver): Promise<JobMatch> {
  const reasons: string[] = [];
  let score = 50; // Base score

  // 1. Rate compatibility (30 points max)
  const jobRate = job.rate;
  const myRate = caregiver.hourlyRate;
  
  if (jobRate >= myRate) {
    score += 30;
    reasons.push('Rate meets your minimum');
  } else if (jobRate >= myRate * 0.9) {
    score += 20;
    reasons.push('Rate is slightly below your rate');
  } else if (jobRate >= myRate * 0.8) {
    score += 10;
    reasons.push('Rate is negotiable');
  } else {
    score -= 10;
    reasons.push('Rate is below your usual rate');
  }

  // 2. Skills match (25 points max)
  const jobSkills = extractSkillsFromJob(job);
  const mySkills = [
    ...(caregiver.skills || []),
    ...(caregiver.medicalSkills || []),
    ...(caregiver.certifications || [])
  ];
  
  const matchedSkills = jobSkills.filter(skill => 
    mySkills.some(mySkill => 
      mySkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(mySkill.toLowerCase())
    )
  );
  
  if (matchedSkills.length > 0) {
    const skillPoints = Math.min(matchedSkills.length * 8, 25);
    score += skillPoints;
    reasons.push(`Skills match: ${matchedSkills.slice(0, 2).join(', ')}`);
  }

  // 3. Location/Distance (20 points max)
  if (caregiver.location && job.location) {
    const cLoc = caregiver.location.toLowerCase();
    const jLoc = job.location.toLowerCase();
    const normalizeLoc = (loc: string) => loc.replace(/[^a-z0-9]/g, '');
    
    // Substring or exact match
    if (jLoc.includes(cLoc) || cLoc.includes(jLoc)) {
      score += 20;
      reasons.push('Location is convenient');
    }
    // Normalized match (handles "San Francisco, CA" vs "San Francisco CA")
    else if (normalizeLoc(jLoc) === normalizeLoc(cLoc)) {
      score += 15;
      reasons.push('Location is a close match');
    }
    // Partial word matching for fuzzy matching
    else {
      const cWords = cLoc.split(/[\s,]+/).filter(w => w.length > 2);
      const jWords = jLoc.split(/[\s,]+/).filter(w => w.length > 2);
      const hasCommonWord = cWords.some(w => jWords.includes(w));
      if (hasCommonWord) {
        score += 10;
        reasons.push('Location might be nearby');
      }
    }
  }

  // 4. Experience level bonus (15 points)
  if ((caregiver.experience || 0) >= 5) {
    score += 15;
    reasons.push('Your experience is a great fit');
  } else if ((caregiver.experience || 0) >= 2) {
    score += 10;
    reasons.push('Good experience match');
  }

  // 5. Verification bonus (10 points)
  if (caregiver.verified) {
    score += 10;
    reasons.push('Your verification helps');
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  return {
    job,
    matchScore: score,
    matchReasons: reasons
  };
}

/**
 * Extract relevant skills from job description
 */
function extractSkillsFromJob(job: JobPost): string[] {
  const skills: string[] = [];
  const text = `${job.title} ${job.description}`.toLowerCase();
  
  const skillKeywords: { [key: string]: string[] } = {
    'driving': ['drive', 'driver', 'transportation', 'car', 'vehicle'],
    'meal preparation': ['meal', 'cook', 'cooking', 'food', 'kitchen'],
    'medical assistance': ['medical', 'medication', 'medicine', 'health'],
    'mobility support': ['mobility', 'transfer', 'hoyer', 'lift', 'wheelchair'],
    'personal care': ['bathing', 'grooming', 'hygiene', 'toileting'],
    'dementia care': ['dementia', 'alzheimer', 'memory', 'confusion'],
    'companionship': ['companion', 'social', 'conversation', 'company'],
    'overnight care': ['overnight', 'night', 'sleep', '24-hour']
  };

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      skills.push(skill);
    }
  }

  return skills;
}

export default useAiJobMatch;
