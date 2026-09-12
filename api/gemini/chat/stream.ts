import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

function getAvailableApiKeys(customHeaderKey?: string): string[] {
  const keys: string[] = [];
  if (customHeaderKey && typeof customHeaderKey === 'string' && customHeaderKey.trim().length > 10) {
    keys.push(customHeaderKey.trim());
  }

  const envKeysRaw = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEYS,
  ];

  for (const raw of envKeysRaw) {
    if (!raw) continue;
    const parts = raw.split(',').map((k) => k.trim()).filter(Boolean);
    for (const p of parts) {
      if (!keys.includes(p)) {
        keys.push(p);
      }
    }
  }
  return keys;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], attachedFile } = req.body || {};
  const customKey = req.headers['x-gemini-key'] as string | undefined;
  const keys = getAvailableApiKeys(customKey);

  if (keys.length === 0) {
    return res.status(500).json({ error: 'No Gemini API keys configured' });
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let streamed = false;

  for (const key of keys) {
    if (streamed) break;
    const ai = new GoogleGenAI({ apiKey: key });

    for (const modelName of models) {
      try {
        const contents: any[] = [];
        for (const msg of messages) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: msg.content }],
          });
        }

        if (attachedFile?.base64Data && attachedFile?.mimeType) {
          const cleanBase64 = attachedFile.base64Data.replace(/^data:.*?;base64,/, '');
          const lastUserContent = contents[contents.length - 1];
          if (lastUserContent && lastUserContent.role === 'user') {
            lastUserContent.parts.unshift({
              inlineData: {
                data: cleanBase64,
                mimeType: attachedFile.mimeType,
              },
            });
          }
        }

        const streamResult = await ai.models.generateContentStream({
          model: modelName,
          contents,
        });

        for await (const chunk of streamResult) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        res.write(`data: [DONE]\n\n`);
        streamed = true;
        break;
      } catch (err) {
        console.warn(`Vercel function model ${modelName} with key error:`, err);
      }
    }
  }

  if (!streamed) {
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
  }
  res.end();
}
