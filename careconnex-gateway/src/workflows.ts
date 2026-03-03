// Multi-Step Workflow Engine for Cara
// Enables autonomous task completion across multiple tool calls

import { logger } from './logger';
import { executeTool } from './tools/registry';
import * as admin from 'firebase-admin';

// Lazy initialization of Firestore to ensure Firebase is initialized first
const getDb = () => admin.firestore();

// Workflow step types
export type StepType = 
  | 'search_caregivers'
  | 'rank_caregivers' 
  | 'schedule_interview'
  | 'get_user_availability'
  | 'send_message'
  | 'update_profile'
  | 'wait_for_input'
  | 'complete'
  | 'query_checkins'
  | 'analyze_health_trends'
  | 'generate_report'
  | 'check_profile_completion';

export interface WorkflowStep {
  id: string;
  type: StepType;
  params: Record<string, any>;
  dependsOn?: string[];
  condition?: (context: WorkflowContext) => boolean;
}

export interface WorkflowContext {
  workflowId: string;
  userId: string;
  userPhone: string;
  steps: WorkflowStep[];
  currentStep: number;
  results: Record<string, any>;
  userInputs: Record<string, any>;
  status: 'running' | 'waiting' | 'completed' | 'error';
  error?: string;
}

// Pre-defined workflows
export const workflows: Record<string, { name: string; description: string; steps: WorkflowStep[] }> = {
  // Workflow 1: Find and Book Caregiver
  findAndBook: {
    name: 'Find and Book Caregiver',
    description: 'Search, rank, and schedule interviews with caregivers',
    steps: [
      {
        id: 'search',
        type: 'search_caregivers',
        params: { zip_code: '{{userInputs.zip_code}}', care_type: '{{userInputs.care_type}}' }
      },
      {
        id: 'rank',
        type: 'rank_caregivers',
        dependsOn: ['search'],
        params: { criteria: 'experience', limit: 3 }
      },
      {
        id: 'get_availability',
        type: 'get_user_availability',
        dependsOn: ['rank'],
        params: {}
      },
      {
        id: 'schedule_top_2',
        type: 'schedule_interview',
        dependsOn: ['rank', 'get_availability'],
        params: { 
          caregiver_id: '{{results.rank.0.id}}',
          proposed_time: '{{results.get_availability.slots.0}}'
        }
      },
      {
        id: 'schedule_second',
        type: 'schedule_interview',
        dependsOn: ['rank', 'get_availability'],
        params: {
          caregiver_id: '{{results.rank.1.id}}',
          proposed_time: '{{results.get_availability.slots.1}}'
        }
      },
      {
        id: 'send_confirmation',
        type: 'send_message',
        dependsOn: ['schedule_top_2', 'schedule_second'],
        params: {
          message: '✅ Scheduled interviews with {{results.rank.0.name}} and {{results.rank.1.name}}!'
        }
      }
    ]
  },
  
  // Workflow 2: Onboard Caregiver
  onboardCaregiver: {
    name: 'Onboard New Caregiver',
    description: 'Complete profile, verify certs, activate',
    steps: [
      {
        id: 'check_profile',
        type: 'update_profile', // Actually check_profile_completion, using closest type
        params: {}
      },
      {
        id: 'request_photo',
        type: 'send_message',
        dependsOn: ['check_profile'],
        condition: (ctx) => !ctx.results.check_profile.hasPhoto,
        params: { message: 'Please upload a profile photo to get matched faster.' }
      },
      {
        id: 'request_certs',
        type: 'send_message',
        dependsOn: ['check_profile'],
        condition: (ctx) => !ctx.results.check_profile.hasCertifications,
        params: { message: 'Please upload your certifications.' }
      },
      {
        id: 'activate',
        type: 'update_profile',
        dependsOn: ['check_profile'],
        condition: (ctx) => ctx.results.check_profile.isComplete,
        params: { status: 'active' }
      }
    ]
  },
  
  // Workflow 3: Weekly Family Report
  weeklyReport: {
    name: 'Generate Weekly Report',
    description: 'Gather care data and send summary to family',
    steps: [
      {
        id: 'gather_checkins',
        type: 'query_checkins',
        params: { seniorId: '{{userInputs.seniorId}}', days: 7 }
      },
      {
        id: 'analyze_health',
        type: 'analyze_health_trends',
        dependsOn: ['gather_checkins'],
        params: { checkins: '{{results.gather_checkins}}', seniorId: '{{userInputs.seniorId}}' }
      },
      {
        id: 'generate_report',
        type: 'generate_report',
        dependsOn: ['analyze_health'],
        params: { analysis: '{{results.analyze_health}}', seniorId: '{{userInputs.seniorId}}', template: 'weekly_family' }
      },
      {
        id: 'send_report',
        type: 'send_message',
        dependsOn: ['generate_report'],
        params: { 
          message: '{{results.generate_report.summary}}',
          channel: 'preferred'
        }
      }
    ]
  }
};

// Workflow engine
export class WorkflowEngine {
  async startWorkflow(
    workflowKey: string,
    userId: string,
    userPhone: string,
    inputs: Record<string, any>
  ): Promise<string> {
    const workflow = workflows[workflowKey];
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowKey}`);
    }
    
    const workflowId = getDb().collection('workflows').doc().id;
    
    const context: WorkflowContext = {
      workflowId,
      userId,
      userPhone,
      steps: workflow.steps,
      currentStep: 0,
      results: {},
      userInputs: inputs,
      status: 'running'
    };
    
    // Save to Firestore
    await getDb().collection('workflows').doc(workflowId).set({
      ...context,
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`[Workflow] Started ${workflowKey}`, { workflowId, userId });
    
    // Execute
    this.executeWorkflow(context);
    
    return workflowId;
  }
  
  async executeWorkflow(context: WorkflowContext): Promise<void> {
    while (context.currentStep < context.steps.length && context.status === 'running') {
      const step = context.steps[context.currentStep];
      
      try {
        // Check dependencies
        if (step.dependsOn) {
          const depsMet = step.dependsOn.every(depId => context.results[depId] !== undefined);
          if (!depsMet) {
            logger.warn(`[Workflow] Dependencies not met for step ${step.id}`);
            context.status = 'waiting';
            await this.saveWorkflow(context);
            return;
          }
        }
        
        // Check condition
        if (step.condition && !step.condition(context)) {
          logger.info(`[Workflow] Skipping step ${step.id} (condition not met)`);
          context.currentStep++;
          continue;
        }
        
        // Resolve params (handle {{template}} syntax)
        const resolvedParams = this.resolveParams(step.params, context);
        
        // Execute step
        logger.info(`[Workflow] Executing step ${step.id}`, { type: step.type });
        const result = await executeTool(step.type, resolvedParams, {
          userId: context.userId,
          userPhone: context.userPhone
        });
        
        // Store result
        context.results[step.id] = result;
        context.currentStep++;
        
        // Save progress
        await this.saveWorkflow(context);
        
      } catch (error: any) {
        logger.error(`[Workflow] Step ${step.id} failed`, { error });
        context.status = 'error';
        context.error = error.message;
        await this.saveWorkflow(context);
        return;
      }
    }
    
    if (context.currentStep >= context.steps.length) {
      context.status = 'completed';
      await this.saveWorkflow(context);
      logger.info(`[Workflow] Completed`, { workflowId: context.workflowId });
      
      // Notify user
      await this.notifyCompletion(context);
    }
  }
  
  private resolveParams(params: Record<string, any>, context: WorkflowContext): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Template syntax: {{results.search.0.name}} or {{userInputs.zip}}
        const path = value.slice(2, -2).split('.');
        let current: any = context;
        
        for (const segment of path) {
          if (current && typeof current === 'object') {
            current = current[segment];
          } else {
            current = undefined;
            break;
          }
        }
        
        resolved[key] = current ?? value;
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
  
  private async saveWorkflow(context: WorkflowContext): Promise<void> {
    await getDb().collection('workflows').doc(context.workflowId).update({
      currentStep: context.currentStep,
      results: context.results,
      status: context.status,
      error: context.error,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  private async notifyCompletion(context: WorkflowContext): Promise<void> {
    // Send completion message to user
    const { sendProactiveMessage } = await import('./messaging');
    await sendProactiveMessage(
      context.userPhone,
      '✅ I\'ve completed your request! Let me know if you need anything else.',
      { userId: context.userId, checkType: 'workflow_complete' }
    );
  }
  
  async resumeWorkflow(workflowId: string, userInput: any): Promise<void> {
    const doc = await getDb().collection('workflows').doc(workflowId).get();
    if (!doc.exists) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    const context = doc.data() as WorkflowContext;
    
    if (context.status !== 'waiting') {
      logger.warn(`[Workflow] Cannot resume workflow ${workflowId} (status: ${context.status})`);
      return;
    }
    
    // Add user input to context
    context.userInputs = { ...context.userInputs, ...userInput };
    context.status = 'running';
    
    await this.saveWorkflow(context);
    await this.executeWorkflow(context);
  }
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();

// Helper to start workflows from agent
export async function startWorkflow(
  workflowKey: string,
  userId: string,
  userPhone: string,
  inputs: Record<string, any>
): Promise<string> {
  return await workflowEngine.startWorkflow(workflowKey, userId, userPhone, inputs);
}
// Simple regex-based intent detection for workflows
export function detectWorkflowIntent(userMessage: string): { workflowKey: string, inputs: Record<string, any> } | null {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('need a caregiver') || msg.includes('looking for a caregiver') || msg.includes('find me a caregiver')) {
    return { workflowKey: 'intake', inputs: {} };
  }
  
  if (msg.includes('schedule an interview') || msg.includes('book an interview')) {
    return { workflowKey: 'interview', inputs: {} };
  }

  if (msg.includes('leave a review') || msg.includes('rate caregiver')) {
    return { workflowKey: 'review', inputs: {} };
  }
  
  return null;
}
