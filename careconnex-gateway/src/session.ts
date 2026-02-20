// Session Management - OpenClaw-style
// Maintains conversation state in memory

import { Message } from './types';

export interface Session {
  userId: string;
  userPhone: string;
  userName?: string;
  conversationHistory: Message[];
  memory: Record<string, any>;
  state: 'greeting' | 'gathering_info' | 'showing_caregivers' | 'scheduling' | 'confirmed';
  lastActivity: Date;
}

// In-memory session store (like OpenClaw)
const sessions = new Map<string, Session>();

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function getOrCreateSession(userPhone: string, userName?: string): Session {
  // Clean expired sessions periodically
  cleanExpiredSessions();
  
  if (sessions.has(userPhone)) {
    const session = sessions.get(userPhone)!;
    session.lastActivity = new Date();
    return session;
  }
  
  // Create new session
  const newSession: Session = {
    userId: `user_${userPhone}`,
    userPhone,
    userName,
    conversationHistory: [],
    memory: {},
    state: 'greeting',
    lastActivity: new Date()
  };
  
  sessions.set(userPhone, newSession);
  console.log(`[Session] Created new session for ${userPhone}`);
  return newSession;
}

export function getSession(userPhone: string): Session | undefined {
  return sessions.get(userPhone);
}

export function updateSession(userPhone: string, updates: Partial<Session>): void {
  const session = sessions.get(userPhone);
  if (session) {
    Object.assign(session, updates);
    session.lastActivity = new Date();
  }
}

export function addToHistory(userPhone: string, role: 'user' | 'assistant', content: string): void {
  const session = sessions.get(userPhone);
  if (session) {
    session.conversationHistory.push({ role, content, timestamp: new Date() });
    // Keep only last 20 messages
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
    session.lastActivity = new Date();
  }
}

export function updateMemory(userPhone: string, key: string, value: any): void {
  const session = sessions.get(userPhone);
  if (session) {
    session.memory[key] = value;
    session.lastActivity = new Date();
    console.log(`[Session] Memory updated for ${userPhone}: ${key} = ${value}`);
  }
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [phone, session] of sessions.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TIMEOUT_MS) {
      sessions.delete(phone);
      console.log(`[Session] Expired session removed for ${phone}`);
    }
  }
}

// Stats for monitoring
export function getSessionStats(): { activeSessions: number; totalSessions: number } {
  return {
    activeSessions: sessions.size,
    totalSessions: sessions.size
  };
}
