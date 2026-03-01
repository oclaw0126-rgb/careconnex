import OpenAI from 'openai';
import { logger } from './logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LLMResponse {
  content: string;
  toolCalls?: any[];
}

export async function callLLM(
  messages: Array<{role: string; content: string; name?: string; tool_call_id?: string}>,
  tools?: any[]
): Promise<LLMResponse> {
  try {
    const model = tools && tools.length > 0 ? 'gpt-4o' : 'gpt-4o-mini';
    
    const response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      tools: tools && tools.length > 0 ? tools : undefined,
      temperature: 0.2,
      max_tokens: 1500
    });
    
    const message = response.choices[0].message;
    
    return {
      content: message.content || '',
      toolCalls: message.tool_calls
    };
  } catch (error) {
    logger.error('[LLM] Error:', error);
    throw error;
  }
}

// Backward compatibility for old code expecting string
export async function callLLMString(messages: Array<{role: string; content: string}>): Promise<string> {
  const response = await callLLM(messages);
  return response.content;
}

// Backward compatibility
export async function callOpenAI(messages: any[], tools: any[]): Promise<any> {
  const response = await callLLM(messages, tools);
  return {
    message: { role: 'assistant', content: response.content, tool_calls: response.toolCalls },
    toolCalls: response.toolCalls
  };
}
