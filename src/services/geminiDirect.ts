// Direct Gemini client-side fallback for static PWA deployments (like GitHub Pages or Vercel static)
const DIRECT_MODELS = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; model?: string; error?: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { valid: false, error: 'المفتاح فارغ' };

  for (const model of DIRECT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmed}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'مرحبا' }] }],
        }),
      });

      if (res.ok) {
        return { valid: true, model };
      }
    } catch (e: any) {
      // Continue to next model
    }
  }

  return { valid: false, error: 'تعذر التحقق من المفتاح. تأكد من صحته أو اتصال الإنترنت.' };
}

export async function generateGeminiDirect(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void
): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error('API Key missing');

  const formattedContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let lastError: Error | null = null;

  for (const model of DIRECT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${trimmedKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: formattedContents,
          systemInstruction: {
            parts: [
              {
                text: 'أنت FreeGen AI، المساعد الذكي والمستشار التقني المتخصص في البرمجة والحلول التقنية المتقدمة باللغة العربية. قدم إجابات وافية ودقيقة ومدعومة بالأمثلة البرمجية والتنسيق الواضح.',
              },
            ],
          },
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream');
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed.candidates?.[0];
              const text = candidate?.content?.parts?.[0]?.text;
              if (text) {
                accumulated += text;
                onChunk(accumulated);
              }
            } catch {}
          }
        }
      }

      if (accumulated.trim().length > 0) {
        return accumulated;
      }
    } catch (err: any) {
      console.warn(`Direct model ${model} failed, trying next:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini direct models failed');
}

export async function generateAppDirect(
  apiKey: string,
  prompt: string
): Promise<{ appName: string; description: string; html: string }> {
  const trimmedKey = apiKey.trim();
  const sysPrompt = `أنت مهندس واجهات وتطبيقات تفاعلية متقدم. قم بإنشاء تطبيق ويب كامل وحقيقي في ملف HTML تفاعلي واحد يحتوي على HTML و Tailwind CSS و JavaScript تفاعلي باللغة العربية.
أرجع الإجابة بتنسيق JSON حصراً بالشكل التالي:
{
  "appName": "اسم التطبيق",
  "description": "وصف موجز للتطبيق ومميزاته",
  "html": "<!DOCTYPE html>..."
}`;

  for (const model of DIRECT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: sysPrompt }] },
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      if (parsed.html) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Direct app model ${model} error:`, e);
    }
  }

  throw new Error('فشل توليد التطبيق مباشرة عبر المفتاح');
}
