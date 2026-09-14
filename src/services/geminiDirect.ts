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

function getLiveSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isoDate = now.toISOString().split('T')[0];

  return `أنت FreeGen AI، مساعد الذكاء الاصطناعي العربي فائق الذكاء، والمستشار البرمجي والتقني والعلمي من الطراز الأول (Senior Full-Stack AI Engineer & Analytical Reasoning Architect).
معلومات التوقيت واللحظة الحالية:
- اليوم والتاريخ بدقة: ${dateStr} (${isoDate}).
- الوقت الفعلي: ${timeStr}.
أنت على دراية تامة ولحظية بالتاريخ والوقت الفعلي الحالي.
التعليمات الأساسية لمنهجية عملك:
1. التفكير العميق والمنطقي (Step-by-Step Problem Solving):
   - حل المسائل المعقدة، والرياضيات، والخوارزميات بأسلوب علمي منهجي منظم ومفسر بدقة.
2. هندسة البرمجيات الاحترافية (Production-Grade Code):
   - كتابة أكواد برمجية كاملة 100%، بدون اختصارات وبدون نصوص نائبة مطلقا، جاهزة للتشغيل الفوري مع أفضل الممارسات.
3. صناعة المحتوى والإجابات الشاملة:
   - تقديم خطط، تحليلات، وصياغات لغوية راقية باللغة العربية الفصحى تجمع بين الإحكام والدقة وجمال العرض.`;
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

  const systemPromptText = getLiveSystemPrompt();

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
                text: systemPromptText,
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

export async function generateSlidesDirect(
  apiKey: string,
  topic: string
): Promise<{ topic: string; summary: string; slideDuration?: number; slides: any[] }> {
  const trimmedKey = apiKey.trim();
  const sysPrompt = `أنت أستاذ ومحاضر عبقري في تبسيط أصعب العلوم والمفاهيم مع صوت إلقائي شائق وحركات بصرية سينمائية كالباوربوينت.
المطلوب: شرح الموضوع التالي في عرض تقديمي تعليمي تفاعلي من 4 إلى 6 شرائح بصيغة JSON حصرية:
"${topic}"

الصيغة المطلوبة:
{
  "topic": "${topic}",
  "summary": "ملخص شامل وممتع للدرس في سطرين",
  "slideDuration": 12,
  "slides": [
    {
      "id": "s1",
      "title": "عنوان الشريحة",
      "badge": "الفكرة الجوهرية / آلية العمل / التشبيه الواقعي / أمثلة وتطبيقات / الخلاصة والاتقان",
      "animationType": "fade-up",
      "content": ["نقطة 1", "نقطة 2", "نقطة 3"],
      "analogy": "تشبيه حسي واقعي يبسط الفكرة",
      "keyTakeaway": "القاعدة الذهبية المستفادة",
      "speechScript": "نص الشرح الصوتي المسموع كاملاً للشريحة باللغة العربية الفصحى الواضحة والملهمة."
    }
  ]
}`;

  for (const model of DIRECT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: topic }] }],
          systemInstruction: { parts: [{ text: sysPrompt }] },
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Direct slides model ${model} error:`, e);
    }
  }

  throw new Error('فشل توليد العرض التقديمي مباشرة عبر المفتاح');
}

export async function generateBusinessDirect(
  apiKey: string,
  params: {
    businessName: string;
    businessType: string;
    description: string;
    whatsappNumber: string;
    mode: 'analysis' | 'campaign' | 'customer_reply';
    customerMessage?: string;
  }
): Promise<any> {
  const trimmedKey = apiKey.trim();
  const sysPrompt = `أنت كبير مستشاري الأعمال والتسويق وخدمة العملاء. أرجع إجابة JSON حصراً وفق المطلوب بدقة.`;
  const userPrompt = `بيانات الطلب: ${JSON.stringify(params)}`;

  for (const model of DIRECT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: sysPrompt }] },
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(rawText);
    } catch (e) {
      console.warn(`Direct business model ${model} error:`, e);
    }
  }

  throw new Error('فشل معالجة أعمالك مباشرة عبر المفتاح');
}
