// Types for CareConnex Gateway

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface AgentResult {
  response: string;
  toolCalls: ToolCall[];
  updatedMemory?: Record<string, any>;
}

export interface Caregiver {
  id: string;
  name: string;
  hourlyRate: number;
  rating: number;
  specialties: string[];
  yearsExperience: number;
  bio?: string;
}

export interface SearchCaregiversResult {
  found: boolean;
  count: number;
  caregivers: Caregiver[];
  message?: string;
}

export interface ScheduleInterviewResult {
  success: boolean;
  interviewId?: string;
  message: string;
}
