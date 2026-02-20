// LLM Client - Kimi K2.5 API
import * as https from 'https';
import { logger } from './logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_API_HOST = 'api.moonshot.cn';
const KIMI_API_PATH = '/v1/chat/completions';

export async function callKimiLLM(messages: Array<{role: string; content: string}>): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY not configured');
  }

  const postData = JSON.stringify({
    model: 'kimi-k2.5',
    messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  logger.info('[Kimi] Sending request', { messageCount: messages.length });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: KIMI_API_HOST,
      path: KIMI_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000 // 30 second timeout
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            logger.error('[Kimi] API error', { error: parsed.error });
            reject(new Error(`Kimi API error: ${parsed.error.message}`));
            return;
          }
          
          if (res.statusCode !== 200) {
            logger.error('[Kimi] HTTP error', { status: res.statusCode, data });
            reject(new Error(`Kimi HTTP error: ${res.statusCode}`));
            return;
          }
          
          const content = parsed.choices?.[0]?.message?.content || '';
          logger.info('[Kimi] Response received', { contentLength: content.length });
          resolve(content);
          
        } catch (e) {
          logger.error('[Kimi] Parse error', { error: e, data });
          reject(new Error(`Failed to parse Kimi response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      logger.error('[Kimi] Request error', { error });
      reject(error);
    });

    req.on('timeout', () => {
      logger.error('[Kimi] Request timeout');
      req.destroy();
      reject(new Error('Kimi API timeout'));
    });

    req.write(postData);
    req.end();
  });
}
