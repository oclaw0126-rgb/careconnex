// LLM Client - OpenAI API
import * as https from 'https';
import { logger } from './logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_HOST = 'api.openai.com';
const OPENAI_API_PATH = '/v1/chat/completions';

export async function callLLM(messages: Array<{role: string; content: string}>): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const postData = JSON.stringify({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  logger.info('[OpenAI] Sending request', { messageCount: messages.length });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: OPENAI_API_HOST,
      path: OPENAI_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            logger.error('[OpenAI] API error', { error: parsed.error });
            reject(new Error(`OpenAI API error: ${parsed.error.message}`));
            return;
          }
          
          if (res.statusCode !== 200) {
            logger.error('[OpenAI] HTTP error', { status: res.statusCode, data });
            reject(new Error(`OpenAI HTTP error: ${res.statusCode}`));
            return;
          }
          
          const content = parsed.choices?.[0]?.message?.content || '';
          logger.info('[OpenAI] Response received', { contentLength: content.length });
          resolve(content);
          
        } catch (e) {
          logger.error('[OpenAI] Parse error', { error: e, data });
          reject(new Error(`Failed to parse OpenAI response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      logger.error('[OpenAI] Request error', { error });
      reject(error);
    });

    req.on('timeout', () => {
      logger.error('[OpenAI] Request timeout');
      req.destroy();
      reject(new Error('OpenAI API timeout'));
    });

    req.write(postData);
    req.end();
  });
}
