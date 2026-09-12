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

  const { prompt } = req.body || {};
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'يرجى تقديم فكرة التطبيق المطلوب' });
  }

  const keys = getAvailableApiKeys(customKey);
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const key of keys) {
    const ai = new GoogleGenAI({ apiKey: key });
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `You are an elite web application engineer.
Create a complete, self-contained, responsive single-file interactive web app in HTML/JS/CSS using Tailwind CSS for: "${prompt}".
Return ONLY clean JSON:
{
  "appName": "App Name in Arabic",
  "description": "Brief description in Arabic",
  "html": "<!DOCTYPE html>..."
}`,
        });

        const text = response.text || '';
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

        const parsed = JSON.parse(cleaned.trim());
        if (parsed.html) {
          return res.json(parsed);
        }
      } catch {
        continue;
      }
    }
  }

  // Robust HTML Fallback if no AI response
  const safeName = prompt.slice(0, 30);
  return res.json({
    appName: safeName,
    description: `تطبيق تفاعلي: ${prompt}`,
    html: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen p-6 flex flex-col items-center justify-center">
  <div class="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-center space-y-4">
    <h1 class="text-2xl font-bold text-emerald-400">${safeName}</h1>
    <p class="text-sm text-slate-300">${prompt}</p>
    <div class="p-4 bg-slate-900/80 rounded-xl border border-slate-700/50">
      <p class="text-xs text-slate-400">تطبيق تفاعلي جاهز للتطوير</p>
    </div>
  </div>
</body>
</html>`
  });
}
