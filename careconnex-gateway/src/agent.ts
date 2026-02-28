import { AgentState, ConversationMessage, ToolDefinition } from './types';
import { MemoryManager } from './memory';
import { executeTool, toolDefinitions } from './tools/registry';
import { callOpenAI } from './llm';

export class Agent {
  private memory = new MemoryManager();
  private MAX_ITERATIONS = 5;

  constructor(private userId: string, private sessionId: string) {}

  async processMessage(userMessage: string): Promise<string> {
    const profile = await this.memory.getUserProfile(this.userId);
    const history = await this.memory.getRecentHistory(this.userId);

    const messages: any[] = [
      { role: "system", content: `You are Cara, the advanced AI assistant for CareConnex. You help families find and book caregivers. User: ${profile?.name || 'Unknown'}. Current Date: ${new Date().toISOString()}. Be empathetic and concise. You have tools to search caregivers, book interviews, and update profiles.` },
      ...history.map(m => ({ role: m.role, content: m.content || null, tool_call_id: m.tool_call_id, tool_calls: m.tool_calls, name: m.name })),
      { role: "user", content: userMessage }
    ];

    let iterationCount = 0;
    let currentResponse = "Processing request...";

    while (iterationCount < this.MAX_ITERATIONS) {
      iterationCount++;
      console.log(`\n[Agent Loop] Iteration ${iterationCount}/${this.MAX_ITERATIONS}`);

      const tools = Object.values(toolDefinitions).map(t => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));

      const llmResponse = await callOpenAI(messages, tools);

      messages.push(llmResponse.message);
      await this.memory.saveMessage(this.userId, this.sessionId, {
        role: llmResponse.message.role,
        content: llmResponse.message.content || "",
        tool_calls: llmResponse.toolCalls
      } as any);

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        // Execute tool calls
        for (const callAny of llmResponse.toolCalls) { const call = callAny as any;
          console.log(`[Agent] Calling Tool: ${call.function.name}`);
          
          let result;
          try {
             const args = JSON.parse(call.function.arguments);
             result = await executeTool(call.function.name, args, { userId: this.userId, userPhone: this.userId });
          } catch(e: any) {
             result = { error: e.message };
          }
          
          const toolMessage: any = {
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          };
          messages.push(toolMessage);
          await this.memory.saveMessage(this.userId, this.sessionId, toolMessage);
        }
      } else {
        // Final response reached
        currentResponse = llmResponse.message.content || "No content returned.";
        break;
      }
    }

    if (iterationCount === this.MAX_ITERATIONS) {
      console.warn(`[Agent] Hit maximum iteration limit (${this.MAX_ITERATIONS}). Ending loop.`);
      currentResponse = "I've hit my thinking limit, but let me know how else I can help.";
    }

    return currentResponse;
  }
}

export async function runAgent(
  userMessage: string,
  userPhone: string,
  userName?: string
): Promise<{ response: string; toolCalls: any[] }> {
  const agent = new Agent(userPhone, "default_session");
  const response = await agent.processMessage(userMessage);
  return { response, toolCalls: [] };
}
