import { callLLM, LLMResponse } from './llm';
import { MemoryManager } from './memory';
import { executeTool, toolDefinitions } from './tools/registry';
import { startWorkflow, detectWorkflowIntent } from './workflows';
import { logger } from './logger';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface AgentResult {
  response: string;
  toolCalls: any[];
}

export class Agent {
  private memory: MemoryManager;
  private MAX_ITERATIONS = 5;

  constructor(private userId: string, private sessionId: string) {
    this.memory = new MemoryManager();
  }

  async processMessage(userMessage: string): Promise<AgentResult> {
    logger.info(`[Agent] Processing message for ${this.userId}`, { message: userMessage.substring(0, 100) });

    // Step 1: Check if this triggers a workflow
    const workflowIntent = detectWorkflowIntent(userMessage);
    if (workflowIntent) {
      const workflowId = await startWorkflow(
        workflowIntent.workflowKey,
        this.userId,
        this.userId, // Using userId as phone for now
        workflowIntent.inputs
      );
      return {
        response: `I'm on it! I'll handle this for you and let you know when it's done.`,
        toolCalls: [{ tool: 'start_workflow', workflowId }]
      };
    }

    // Step 2: Get context
    const profile = await this.memory.getUserProfile(this.userId);
    const history = await this.memory.getRecentHistory(this.userId, 10);

    // Step 3: Build messages
    const messages: any[] = [
      {
        role: 'system',
        content: `You are Cara, CareConnex's AI care coordinator. Help families find caregivers and caregivers find families. Be warm, concise, and helpful. User: ${profile?.name || 'Unknown'}`
      },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Step 4: Agent loop
    let iterationCount = 0;
    const executedToolCalls: any[] = [];

    while (iterationCount < this.MAX_ITERATIONS) {
      iterationCount++;
      logger.info(`[Agent] Iteration ${iterationCount}/${this.MAX_ITERATIONS}`);

      // Build tools list
      const tools = Object.values(toolDefinitions).map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));

      // Call LLM
      const response = await callLLM(messages, tools);

      // Save assistant message
      const assistantMessage: any = {
        role: 'assistant',
        content: response.content
      };
      if (response.toolCalls) {
        assistantMessage.tool_calls = response.toolCalls;
      }
      messages.push(assistantMessage);
      await this.memory.saveMessage(this.userId, this.sessionId, assistantMessage);

      // Check for tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          logger.info(`[Agent] Executing tool: ${toolName}`);
          
          try {
            const result = await executeTool(toolName, toolArgs, {
              userId: this.userId,
              userPhone: this.userId
            });
            
            executedToolCalls.push({ tool: toolName, result });
            
            // Add tool result to messages
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            });
            
            await this.memory.saveMessage(this.userId, this.sessionId, {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            logger.error(`[Agent] Tool execution failed: ${toolName}`, error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({ error: error.message })
            });
          }
        }
      } else {
        // No tool calls, return final response
        return {
          response: response.content,
          toolCalls: executedToolCalls
        };
      }
    }

    // Max iterations reached
    return {
      response: "I've been working on this but need a bit more time. Let me connect you with our care team to help.",
      toolCalls: executedToolCalls
    };
  }
}

// Backward compatibility with v4 webhook
export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<AgentResult> {
  const agent = new Agent(userPhone, `session_${Date.now()}`);
  return await agent.processMessage(userMessage);
}
