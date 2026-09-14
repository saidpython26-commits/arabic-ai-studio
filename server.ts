import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// --- Resilient Gemini Multi-Key Pool & Model Cascade Manager ---
const clientsMap = new Map<string, GoogleGenAI>();

function getAvailableApiKeys(customHeaderKey?: string): string[] {
  const keys: string[] = [];

  // 1. Client user custom key from header (if user provided one in settings)
  if (customHeaderKey && typeof customHeaderKey === 'string' && customHeaderKey.trim().length > 10) {
    keys.push(customHeaderKey.trim());
  }

  // 2. Server-side environment keys (pool & rotation)
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

function getGenAIClient(apiKey: string): GoogleGenAI {
  let client = clientsMap.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    clientsMap.set(apiKey, client);
  }
  return client;
}

// Supported modern models list for cascade fallback (gemini-3.1-flash-lite is primary due to high speed & fresh quota)
const CASCADE_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

let keyPoolIndex = 0;

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const keys = getAvailableApiKeys();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: keys.length > 0,
    keysInPool: keys.length,
    models: CASCADE_MODELS,
  });
});

// Cached standalone project ZIP buffer to ensure instant delivery & support resumable downloads
let cachedZipBuffer: Buffer | null = null;
let cachedZipTime = 0;

async function getProjectZipBuffer(): Promise<Buffer> {
  const now = Date.now();
  // Cache for 3 minutes to avoid re-zipping on every chunk or repeat request
  if (cachedZipBuffer && now - cachedZipTime < 180000) {
    return cachedZipBuffer;
  }

  const zip = new JSZip();
  const rootDir = process.cwd();
  const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.github', '.cache']);
  const ignoredFiles = new Set(['.env', 'bun.lock']);

  function addDirToZip(currentDir: string, zipFolder: JSZip) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name) || entry.name.startsWith('.')) continue;
        const subFolder = zipFolder.folder(entry.name);
        if (subFolder) {
          addDirToZip(path.join(currentDir, entry.name), subFolder);
        }
      } else if (entry.isFile()) {
        if (ignoredFiles.has(entry.name) || entry.name.endsWith('.log')) continue;
        const filePath = path.join(currentDir, entry.name);
        const content = fs.readFileSync(filePath);
        zipFolder.file(entry.name, content);
      }
    }
  }

  addDirToZip(rootDir, zip);

  cachedZipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  cachedZipTime = Date.now();
  return cachedZipBuffer;
}

// Full standalone project ZIP export endpoint with Resumable Byte-Ranges & Caching
app.get('/api/export/project-zip', async (req, res) => {
  try {
    const buffer = await getProjectZipBuffer();
    const totalSize = buffer.length;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="freegen-ai-standalone-project.zip"');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', `"${totalSize}-${cachedZipTime}"`);

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      // Range: bytes=start-end or bytes=start-
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize || start > end) {
          res.setHeader('Content-Range', `bytes */${totalSize}`);
          res.status(416).end();
          return;
        }

        const chunk = buffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', chunk.length);
        res.end(chunk);
        return;
      }
    }

    res.setHeader('Content-Length', totalSize);
    res.end(buffer);
  } catch (err: any) {
    console.error('Error generating project zip:', err);
    res.status(500).json({ error: 'Failed to generate project zip' });
  }
});

// GitHub Pages ready-to-upload static ZIP export
app.get('/api/export/dist-zip', async (req, res) => {
  try {
    const distDir = '/tmp/gh_dist';
    if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
      execSync('npx vite build --base=./ --outDir=/tmp/gh_dist && touch /tmp/gh_dist/.nojekyll', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }

    const zip = new JSZip();
    function addDirToZip(currentDir: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const sub = zipFolder.folder(entry.name);
          if (sub) addDirToZip(path.join(currentDir, entry.name), sub);
        } else if (entry.isFile()) {
          const content = fs.readFileSync(path.join(currentDir, entry.name));
          zipFolder.file(entry.name, content);
        }
      }
    }

    addDirToZip(distDir, zip);
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="arabic-ai-studio-github-pages.zip"');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err: any) {
    console.error('Error creating dist zip:', err);
    res.status(500).json({ error: 'Failed to generate GitHub Pages zip' });
  }
});

// Direct GitHub deploy endpoint (executes push safely without logging secret to AI context)
app.post('/api/deploy/github', async (req, res) => {
  const { token, repo = 'saidpython26-commits/arabic-ai-studio', updateGhPages = true, updateMain = true } = req.body;

  if (!token || typeof token !== 'string' || token.trim().length < 15) {
    return res.status(400).json({
      success: false,
      error: 'يرجى إدخال رمز GitHub Personal Access Token صالح يبدأ بـ ghp_ أو github_pat_',
    });
  }

  const cleanToken = token.trim();

  // 1. Verify token with GitHub API
  try {
    const verifyRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'arabic-ai-studio-deployer',
      },
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      return res.status(401).json({
        success: false,
        error: `رفض GitHub هذا الرمز (Bad credentials - ${verifyRes.status}). قد يكون الرمز ملغياً أو غير صحيح. يرجى إنشاء رمز جديد من إعدادات GitHub بصلاحية repo.`,
        details: errData,
      });
    }

    const userData = await verifyRes.json();
    const username = userData.login || 'saidpython26-commits';

    // 2. Build GitHub Pages static files with relative paths
    const ghDistPath = '/tmp/gh_deploy_dist';
    fs.rmSync(ghDistPath, { recursive: true, force: true });
    fs.mkdirSync(ghDistPath, { recursive: true });

    execSync(`npx vite build --base=./ --outDir=${ghDistPath} && touch ${ghDistPath}/.nojekyll`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    const workDir = `/tmp/gh_work_${Date.now()}`;
    fs.mkdirSync(workDir, { recursive: true });

    const authedUrl = `https://${username}:${cleanToken}@github.com/${repo}.git`;
    let ghPagesUpdated = false;
    let mainUpdated = false;

    // 3. Update gh-pages branch
    if (updateGhPages) {
      const ghPagesDir = path.join(workDir, 'gh-pages');
      execSync(`git clone --depth 1 --branch gh-pages "${authedUrl}" "${ghPagesDir}"`, { stdio: 'pipe' });

      // Clean old files except .git
      const existingFiles = fs.readdirSync(ghPagesDir);
      for (const f of existingFiles) {
        if (f !== '.git') {
          fs.rmSync(path.join(ghPagesDir, f), { recursive: true, force: true });
        }
      }

      // Copy new build
      execSync(`cp -r ${ghDistPath}/* ${ghDistPath}/.nojekyll "${ghPagesDir}/"`, { stdio: 'pipe' });

      execSync(`cd "${ghPagesDir}" && git config user.name "${username}" && git config user.email "saidabdess26@gmail.com" && git add -A && git commit -m "deploy: update slides, video export, business center, and whatsapp commerce" || true`, { stdio: 'pipe' });
      execSync(`cd "${ghPagesDir}" && git push origin gh-pages`, { stdio: 'pipe' });
      ghPagesUpdated = true;
    }

    // 4. Update main branch
    if (updateMain) {
      const mainDir = path.join(workDir, 'main');
      execSync(`git clone --depth 1 --branch main "${authedUrl}" "${mainDir}"`, { stdio: 'pipe' });

      // Copy source files from project root excluding ignored files
      const ignored = new Set(['node_modules', 'dist', '.git', '.github', '.cache']);
      const rootEntries = fs.readdirSync(process.cwd(), { withFileTypes: true });
      for (const entry of rootEntries) {
        if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue;
        const srcPath = path.join(process.cwd(), entry.name);
        const destPath = path.join(mainDir, entry.name);
        if (entry.isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      execSync(`cd "${mainDir}" && git config user.name "${username}" && git config user.email "saidabdess26@gmail.com" && git add -A && git commit -m "feat: sync SlidesTab, BusinessTab, and WhatsApp settings" || true`, { stdio: 'pipe' });
      execSync(`cd "${mainDir}" && git push origin main`, { stdio: 'pipe' });
      mainUpdated = true;
    }

    // Cleanup temp
    fs.rmSync(workDir, { recursive: true, force: true });

    return res.json({
      success: true,
      message: 'تم تحديث ونشر موقعك على GitHub بنجاح تام وبدون أي أخطاء!',
      pagesUrl: `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1] || 'arabic-ai-studio'}/`,
      ghPagesUpdated,
      mainUpdated,
    });
  } catch (err: any) {
    console.error('GitHub deploy error:', err);
    return res.status(500).json({
      success: false,
      error: `حدث خطأ أثناء الرفع إلى GitHub: ${err.message || err.stderr?.toString() || 'فشل الاتصال'}`,
    });
  }
});

// Helper to determine if an error is quota / rate limit / temporary overload
function isRetryableQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const status = err.status || err.statusCode || 0;
  return (
    status === 429 ||
    status === 503 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('overloaded') ||
    msg.includes('too many requests')
  );
}

// Streaming Chat Endpoint (SSE) with Key Pool & Model Cascade
app.post('/api/gemini/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const { messages, systemInstruction, attachedFile } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  const availableKeys = getAvailableApiKeys(customKey);

  if (availableKeys.length === 0) {
    const note = '⚠️ تنبيه: لم يتم العثور على مفتاح GEMINI_API_KEY. يرجى تفعيله من إعدادات المنصة أو إضافة مفتاحك الخاص في صفحة إعدادات التطبيق للاستخدام المباشر.';
    res.write(`data: ${JSON.stringify({ text: note })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Format conversation history for Gemini
  const contents: any[] = [];
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

  const sysPrompt =
    systemInstruction ||
    `أنت "FreeGen AI"، مساعد ذكاء اصطناعي عربي فائق الذكاء، ومستشار برمجي وتقني وعلمي من الطراز الرفيع (Senior Full-Stack AI Engineer & Deep Reasoning Architect).
معلومات التوقيت واللحظة الحالية:
- اليوم والتاريخ الحالي بدقة: ${dateStr} (${isoDate}).
- الوقت الحالي: ${timeStr}.
أنت على دراية تامة ولحظية بالتاريخ والوقت الفعلي الحالي، وتجيب بدقة كاملة بناءً عليه.
التعليمات الأساسية لمنهجية عملك:
1. التفكير العميق والمنطقي (Deep Analytical Reasoning & Step-by-Step Problem Solving):
   - قم بتحليل السؤال وسياقه بدقة فائقة، وافهم الغاية الأساسية وراء طلب المستخدم.
   - إذا كان الطلب مسألة رياضية، خوارزمية، هندسية، أو مشكلة فكرية معقدة، فكر بأسلوب منظم خطوة بخطوة وقدم استنتاجات دقيقة مع التوضيح العلمي السليم.
2. هندسة البرمجيات الاحترافية (Production-Grade & Zero-Placeholder Coding):
   - كتابة أكواد برمجية كاملة 100%، نظيفة، معيارية، خالية من الأخطاء وقابلة للتشغيل الفوري في جميع البيئات (Python, TypeScript, JavaScript, React, Next.js, HTML5/Tailwind, Node.js, Flutter, Kotlin, Java, C++, SQL, Bash وغيرها).
   - ضع الأكواد دائماً داخل كتل Markdown محددة باسم اللغة بدقة.
   - يُمنع منعاً باتاً اختصار الأكواد، أو وضع نصوص نائبة مثل "// أكمل هنا" أو "// باقي المنطق". اكتب الكود كاملاً ليعمل فوراً بنسخه.
3. صناعة المحتوى والتحليل والاستشارات:
   - تقديم خطط عمل، مقالات، نصوص إبداعية، وتلخيصات احترافية بمستوى استشاري رفيع، مع استشهادات وأفكار عملية قابلة للتنفيذ المباشر.
4. التفاعل مع انقطاع واستئناف الاتصال:
   - قد يستأنف المستخدم المحادثة بعد انقطاع مؤقت للإنترنت؛ حافظ دائماً على ترابط السياق وقوة الربط المنطقي مع الرسائل السابقة.
5. الأسلوب والتواصل:
   - تحدث باللغة العربية الفصحى الراقية، المهذبة، والمحكمة، مع الجمع بين الدقة العلمية والوضوح التام وسهولة الفهم.`;

  if (Array.isArray(messages)) {
    for (const m of messages) {
      const role = m.role === 'user' ? 'user' : 'model';
      const parts: any[] = [{ text: m.content || '' }];

      if (m === messages[messages.length - 1] && attachedFile) {
        if (attachedFile.isBase64 && attachedFile.data) {
          parts.push({
            inlineData: {
              data: attachedFile.data,
              mimeType: attachedFile.mimeType || 'application/pdf',
            },
          });
        } else if (attachedFile.content) {
          parts.push({
            text: `\n\n[محتوى الملف المرفق (${attachedFile.name})]:\n${attachedFile.content}`,
          });
        }
      }

      contents.push({ role, parts });
    }
  }

  const normalizedContents =
    contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'مرحباً' }] }];

  // Try across available keys (ordered round-robin) and across fallback models
  let streamSuccess = false;
  let lastErrorMsg = '';

  // Order keys: start from keyPoolIndex
  const numKeys = availableKeys.length;
  const keyIndices = Array.from({ length: numKeys }, (_, i) => (keyPoolIndex + i) % numKeys);
  // Advance rotation for next incoming request
  keyPoolIndex = (keyPoolIndex + 1) % numKeys;

  outerKeyLoop: for (const kIdx of keyIndices) {
    const activeKey = availableKeys[kIdx];
    const ai = getGenAIClient(activeKey);

    for (const modelName of CASCADE_MODELS) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: normalizedContents,
          config: {
            systemInstruction: sysPrompt,
          },
        });

        let emittedAnyText = false;
        for await (const chunk of responseStream) {
          if (chunk.text) {
            emittedAnyText = true;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            if ((res as any).flush) {
              (res as any).flush();
            }
          }
        }

        if (emittedAnyText) {
          streamSuccess = true;
          break outerKeyLoop;
        }
      } catch (callErr: any) {
        lastErrorMsg = callErr?.message || String(callErr);
        console.warn(`[Gemini Cascade] Key #${kIdx + 1}, Model ${modelName} failed:`, lastErrorMsg);
        // Resilient cascade: try next model in cascade or next key
        continue;
      }
    }
  }

  if (!streamSuccess) {
    // If all failed, provide a clean and helpful Arabic explanation instead of empty bubble
    let userNotice = '⚠️ نعتذر، واجهت خوادم الذكاء الاصطناعي ضغطاً استثنائياً مؤقتاً في سقف الطلبات المجانية.';
    if (isRetryableQuotaError({ message: lastErrorMsg })) {
      userNotice =
        '⚠️ استهلكت خوادم Google الحصة اللحظية المؤقتة (Rate Limit/Quota).\n\n' +
        '💡 **حلول سريعة ومضمونة:**\n' +
        '1. انتظر دقيقة واحدة واضغط على زر **"إعادة المحاولة"** بالأسفل وسيعمل فوراً.\n' +
        '2. أو يمكنك وضع مفتاح Gemini مجاني خاص بك في صفحة **الإعدادات** لضمان حصتك الخاصة بنسبة 100% دون مشاركتها مع أحد.';
    }
    res.write(`data: ${JSON.stringify({ text: userNotice })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// Arabic to English visual concept mapping for bulletproof prompt fidelity
const ARABIC_VISUAL_DICTIONARY: Record<string, string> = {
  // Animals
  'قطة': 'cat',
  'قط': 'cat',
  'بسة': 'cute cat',
  'هر': 'cat',
  'كلب': 'dog',
  'جرو': 'puppy',
  'أسد': 'majestic lion',
  'نمر': 'bengal tiger',
  'فهد': 'cheetah',
  'ذئب': 'wild wolf',
  'ثعلب': 'fox',
  'صقر': 'majestic falcon',
  'نسر': 'eagle',
  'طائر': 'bird',
  'عصفور': 'little songbird',
  'حمامة': 'white dove',
  'خيل': 'arabian horse',
  'حصان': 'majestic arabian stallion',
  'جمل': 'desert camel',
  'ناقة': 'camel',
  'غزال': 'gazelle deer',
  'دب': 'bear',
  'فيل': 'elephant',
  'زرافة': 'giraffe',
  'قرد': 'monkey',
  'باندا': 'giant panda',
  'سمكة': 'tropical fish',
  'حوت': 'majestic whale',
  'قرش': 'shark',
  'دولفين': 'dolphin',
  'سلحفاة': 'sea turtle',
  'تنين': 'mythical dragon',
  'طاووس': 'colorful peacock',

  // People & Characters
  'رجل': 'man',
  'شاب': 'young man',
  'شيخ': 'elderly wise man',
  'عجوز': 'elderly person',
  'امرأة': 'woman',
  'فتاة': 'young woman',
  'بنت': 'girl',
  'طفل': 'child',
  'رضيع': 'baby',
  'محارب': 'warrior in detailed ornate armor',
  'فارس': 'heroic knight in shining armor',
  'ملك': 'majestic king wearing ornate gold crown',
  'ملكة': 'queen wearing regal crown',
  'أمير': 'prince',
  'أميرة': 'princess',
  'طبيب': 'doctor in medical coat',
  'مهندس': 'engineer',
  'رائد فضاء': 'astronaut in high-tech space suit',
  'طيار': 'aviator pilot',
  'ساحر': 'mystic wizard holding glowing magical staff',
  'قرصان': 'pirate captain',
  'نينجا': 'ninja assassin in dark robes',
  'ساموراي': 'samurai warrior with katana',
  'روبوت': 'futuristic humanoid android robot',
  'شخصية': 'character',

  // Clothing & Gear
  'قبعة': 'stylish hat',
  'كاب': 'cap',
  'نظارة': 'glasses',
  'نظارات شمسية': 'modern sunglasses',
  'عباءة': 'flowing traditional cloak',
  'ثوب': 'traditional arabic thobe',
  'بشت': 'ornate gold-trimmed traditional bisht',
  'شماغ': 'traditional keffiyeh headdress',
  'عمامة': 'turban',
  'قميص': 'shirt',
  'تاج': 'royal crown adorned with jewels',
  'سيف': 'ornate curved sword blade',
  'درع': 'protective battle armor shield',
  'وشاح': 'flowing scarf',
  'ساعة': 'luxury wristwatch',

  // Environments & Places
  'صحراء': 'vast golden sand dunes desert',
  'واحة': 'lush green desert oasis with palm trees',
  'غابة': 'ancient mystical forest with tall trees and sunlight rays',
  'حديقة': 'blooming flower garden',
  'شجرة': 'magnificent tree',
  'نخلة': 'tall palm trees',
  'أزهار': 'vibrant blooming flowers',
  'ورد': 'red roses',
  'نهر': 'winding clear river',
  'بحر': 'open deep blue ocean waters',
  'محيط': 'vast ocean with gentle waves',
  'شاطئ': 'tropical sandy beach',
  'جبل': 'snow-capped mountain peaks',
  'وادي': 'scenic canyon valley',
  'شلال': 'cascading waterfall',
  'مدينة': 'futuristic neon metropolis skyline',
  'شارع': 'vibrant city street',
  'قصر': 'grand majestic arabesque royal palace',
  'قلعة': 'ancient stone fortress castle',
  'مسجد': 'ornate islamic mosque with domes and minarets',
  'بيت': 'cozy house',
  'مقهى': 'cozy warm coffee shop',
  'فضاء': 'outer space nebula cosmic galaxy stars',
  'كوكب': 'exoplanet with glowing planetary rings',
  'قمر': 'luminous full moon in night sky',
  'شمس': 'radiant warm sun',
  'سماء': 'dramatic open sky',
  'غيوم': 'volumetric soft clouds',
  'مطر': 'gentle rain raindrops',
  'ثلج': 'fresh crystalline snow',
  'نار': 'blazing warm fire flames',
  'جليد': 'translucent ice crystals',

  // Colors
  'أحمر': 'vibrant red',
  'حمراء': 'vibrant red',
  'أزرق': 'deep ocean blue',
  'زرقاء': 'deep ocean blue',
  'أخضر': 'emerald green',
  'خضراء': 'emerald green',
  'أصفر': 'bright yellow',
  'صفراء': 'bright yellow',
  'ذهبي': 'luxurious golden',
  'ذهبية': 'luxurious golden',
  'فضي': 'metallic silver',
  'فضية': 'metallic silver',
  'أبيض': 'pure pristine white',
  'بيضاء': 'pure pristine white',
  'أسود': 'deep midnight black',
  'سوداء': 'deep midnight black',
  'بنفسجي': 'royal purple',
  'بنفسجية': 'royal purple',
  'وردي': 'soft pastel pink',
  'وردية': 'soft pastel pink',
  'برتقالي': 'warm vibrant orange',
  'برتقالية': 'warm vibrant orange',

  // Adjectives & Actions
  'لطيف': 'adorable cute charming',
  'لطيفة': 'adorable cute charming',
  'جميل': 'breathtakingly beautiful',
  'جميلة': 'breathtakingly beautiful',
  'ضخم': 'massive colossal',
  'عملاق': 'majestic giant',
  'صغير': 'tiny cute miniature',
  'صغيرة': 'tiny cute miniature',
  'قديم': 'vintage antique historical',
  'حديث': 'modern sleek contemporary',
  'مستقبلي': 'futuristic sci-fi cyberpunk',
  'مستقبلية': 'futuristic sci-fi cyberpunk',
  'خيالي': 'ethereal enchanted fantasy',
  'خيالية': 'ethereal enchanted fantasy',
  'مضيء': 'glowing luminous',
  'مضيئة': 'glowing luminous',
  'متوهج': 'radiant glowing with mystical aura',
  'متوهجة': 'radiant glowing with mystical aura',
  'مظلم': 'dark moody atmospheric',
  'مظلمة': 'dark moody atmospheric',
  'يطير': 'flying gracefully with wings spread',
  'متحرك': 'dynamic in motion',
  'يركض': 'running dynamically in motion',
  'يسبح': 'swimming peacefully',
  'يجلس': 'sitting gracefully',
  'يقف': 'standing proudly centered',
  'يرتدي': 'wearing',
  'تلبس': 'wearing',
  'يلبس': 'wearing',
  'يحمل': 'holding',
  'ينظر': 'looking directly at camera lens',
  'يلعب': 'playfully interacting',

  // Objects & Tech
  'سيارة': 'sleek luxury sports car',
  'طيارة': 'aerodynamic airplane',
  'صاروخ': 'spacecraft rocket',
  'سفينة': 'grand sailing vessel',
  'هاتف': 'modern smartphone device',
  'كتاب': 'leather-bound ancient book',
  'شعار': 'minimalist clean vector logo badge',
};

function translateArabicVisualLexicon(arabicText: string): string {
  const normalized = arabicText
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();

  const words = normalized.split(/[\s,،.]+/).filter(Boolean);
  const matchedTokens: string[] = [];

  for (const word of words) {
    if (ARABIC_VISUAL_DICTIONARY[word]) {
      matchedTokens.push(ARABIC_VISUAL_DICTIONARY[word]);
      continue;
    }
    if (word.startsWith('ال') && word.length > 3) {
      const stripped = word.slice(2);
      if (ARABIC_VISUAL_DICTIONARY[stripped]) {
        matchedTokens.push(ARABIC_VISUAL_DICTIONARY[stripped]);
        continue;
      }
    }
    if ((word.startsWith('و') || word.startsWith('ف') || word.startsWith('ب') || word.startsWith('ل')) && word.length > 3) {
      const stripped = word.slice(1);
      if (ARABIC_VISUAL_DICTIONARY[stripped]) {
        matchedTokens.push(ARABIC_VISUAL_DICTIONARY[stripped]);
        continue;
      }
    }
  }

  if (matchedTokens.length > 0) {
    return matchedTokens.join(', ');
  }
  return '';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Image Generation Endpoint (Deterministic SOTA AI Image Synthesis)
app.post('/api/gemini/image', async (req, res) => {
  const { prompt, aspectRatio = '1:1', style = 'واقعي', variation = 0 } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'يرجى كتابة وصف الصورة المطلوب توليدها' });
    return;
  }

  try {
    const availableKeys = getAvailableApiKeys(customKey);

    // Map style to visual enhancements
    const styleModifiers: Record<string, string> = {
      'واقعي': 'photorealistic, ultra detailed 8k photography, cinematic volumetric lighting, sharp focus, 35mm lens, octane render, natural skin and textures',
      'سينمائي': 'cinematic movie still, dramatic atmosphere, anamorphic 70mm lens, 35mm film photography, epic moody lighting, rim light',
      'رقمي': 'digital art concept, trending on artstation, rich detailed illustration, fantasy atmosphere, artful shading, vivid palette',
      'أنمي': 'modern aesthetic anime style, Makoto Shinkai aesthetic, vibrant sky, expressive eyes, crisp linework, gorgeous illumination',
      'كرتوني': 'vibrant 3D animated cartoon, Pixar Disney animation style, expressive charming character, colorful, clean rendering',
      'ثلاثي الأبعاد': '3D render, smooth textures, ray tracing, subsurface scattering, studio lighting, Blender Octane masterpiece, solid geometry',
    };
    const styleDesc = styleModifiers[style] || 'high quality digital artwork, sharp focus';

    // Step 1: Rapid Intelligent Visual Prompt Engineering with Gemini & Fallback Lexicon
    let enhancedPrompt = '';
    const isArabic = /[\u0600-\u06FF]/.test(prompt);

    if (availableKeys.length > 0) {
      const key = availableKeys[0];
      const ai = getGenAIClient(key);
      for (const modelName of CASCADE_MODELS) {
        try {
          const geminiPromptResp = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: `You are a world-class Visual Art Director and Diffusion Prompt Engineer.
Analyze the user's concept in detail and construct a coherent, ultra-focused, high-fidelity English visual prompt.

User Concept: "${prompt}"
Requested Style: "${style}" (${styleDesc})

CRITICAL RULES:
1. SUBJECT FIDELITY: Maintain the EXACT subject requested. Do NOT add random or unrelated items, random people, or chaotic clutter.
2. ANATOMY & DETAILS: Describe the subject's exact posture, clothing, expression, materials, and textures accurately.
3. ENVIRONMENT & LIGHTING: Describe an appropriate background, volumetric cinematic lighting, depth of field, and mood that strictly complements the subject.
4. LANGUAGE: The final output MUST be 100% in English, descriptive, and between 25 and 60 words.
5. FORMAT: Return ONLY the raw English prompt. No preamble, no quotes, no labels.`,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Prompt engineering timeout')), 4000)
            ),
          ]);

          const text = geminiPromptResp.text?.trim();
          if (text && text.length > 10) {
            enhancedPrompt = text;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // Bulletproof Fallback: if Gemini timed out or offline, use our comprehensive semantic dictionary
    if (!enhancedPrompt) {
      if (isArabic) {
        const dictionaryTokens = translateArabicVisualLexicon(prompt);
        if (dictionaryTokens) {
          enhancedPrompt = `${dictionaryTokens}, ${styleDesc}, centered subject, cinematic composition, highly detailed, 8k resolution`;
        } else {
          enhancedPrompt = `A high quality visual artwork of ${prompt}, ${styleDesc}, sharp focus, centered composition`;
        }
      } else {
        enhancedPrompt = `${prompt}, ${styleDesc}, highly detailed, centered composition`;
      }
    }

    // Determine dimensions based on aspect ratio
    let width = 1024;
    let height = 1024;
    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    }

    // Step 2: High-Quality Real AI Synthesis via Flux Diffusion Model
    // Deterministic seed based on prompt to avoid erratic random hopping, plus variation offset
    const promptHash = hashString(enhancedPrompt);
    const seed = ((promptHash + (Number(variation) || 0) * 12345) % 899999) + 100000;
    const negativePrompt = encodeURIComponent(
      'blurry, distorted, bad anatomy, bad hands, extra limbs, missing limbs, ugly, deformed, watermark, lowres, artifacts, chaotic clutter, random objects, duplicate, text'
    );

    const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      enhancedPrompt
    )}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&negative=${negativePrompt}`;

    // Return instant high-res URL to avoid connection drops during slow buffering
    res.json({
      imageUrl: fluxUrl,
      prompt,
      enhancedPrompt,
      model: 'Flux.1 High-Fidelity Diffusion',
      seed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/image:', error);
    res.status(500).json({ error: error?.message || 'فشل توليد الصورة' });
  }
});

// App Generation Endpoint with Key Pool & Model Cascade
app.post('/api/gemini/app', async (req, res) => {
  const { prompt } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'يرجى تقديم فكرة التطبيق المطلوب' });
    return;
  }

  const availableKeys = getAvailableApiKeys(customKey);

  const fallbackInteractiveHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prompt}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'IBM Plex Sans Arabic', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-4 flex flex-col items-center justify-center">
  <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
    <div class="flex items-center gap-3">
      <span class="text-3xl">🚀</span>
      <div>
        <h1 class="text-xl font-bold text-emerald-400">${prompt}</h1>
        <p class="text-xs text-slate-400">تطبيق تفاعلي منجز عبر FreeGen AI</p>
      </div>
    </div>
    <div class="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60">
      <p class="text-sm leading-relaxed text-slate-300">
        هذا تطبيق تفاعلي مخصص يمكنك استخدامه وتشغيله مباشرة، أو تنزيله وتشغيله في أي متصفح هاتف أو حاسوب!
      </p>
    </div>
    <div class="space-y-2">
      <input id="noteInput" type="text" placeholder="اكتب فكرة أو مهمة جديدة..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white" />
      <button onclick="addNote()" class="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-xl text-slate-950 text-sm transition cursor-pointer">إضافة عنصر</button>
    </div>
    <ul id="noteList" class="space-y-2 pt-2">
      <li class="p-3 bg-slate-900 rounded-lg text-sm border border-slate-700/50 flex justify-between items-center">
        <span>مهمة تجريبية أولى جاهزة</span>
        <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">نشط</span>
      </li>
    </ul>
  </div>
  <script>
    function addNote() {
      const input = document.getElementById('noteInput');
      const text = input.value.trim();
      if (!text) return;
      const li = document.createElement('li');
      li.className = 'p-3 bg-slate-900 rounded-lg text-sm border border-slate-700/50 flex justify-between items-center';
      li.innerHTML = '<span>' + text + '</span><span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">جديد</span>';
      document.getElementById('noteList').appendChild(li);
      input.value = '';
    }
  </script>
</body>
</html>`;

  if (availableKeys.length === 0) {
    res.json({
      appName: prompt.slice(0, 30),
      description: prompt,
      html: fallbackInteractiveHtml,
    });
    return;
  }

  const appPrompt = `أنت كبير مهندسي الواجهات وتطبيقات الويب التفاعلية أحادية الملف (Senior Principal Web Apps Architect).
المطلوب: بناء تطبيق ويب متكامل وتفاعلي فائق الجودة، دقيق البرمجة، وعصري التصميم بناءً على هذا الطلب:
"${prompt}"

القواعد والمواصفات المعيارية لبناء التطبيق:
1. أنتج فقط كود ملف HTML واحد متكامل ومستقل (Self-Contained Single-File Application) يحتوي على:
   - <!DOCTYPE html>
   - <html lang="ar" dir="rtl"> (أو الاتجاه المناسب للغة)
   - <head> مع علامات meta للموبايل (viewport, mobile-web-app-capable)
   - استيراد Tailwind CSS عبر CDN: <script src="https://cdn.tailwindcss.com"></script>
   - استيراد خطوط عربية فائقة الجمال (مثل IBM Plex Sans Arabic أو Cairo) عبر Google Fonts
   - تصميم فاخر متناسق (Dark/Modern theme، تباين عالي، حواف ناعمة، تأثيرات hover وأزرار حية)
2. البرمجة التفاعلية والصلابة (Full Interactivity & Resilience):
   - اكتب كامل كود الـ JavaScript داخل وسم <script> بدون أي اختصارات أو نصوص نائبة مطلقا.
   - استخدم التخزين المحلي (localStorage) لحفظ بيانات ومدخلات المستخدم حتى تظل محفوظة عند تحديث الصفحة أو إغلاقها.
   - وفر تحققاً من المدخلات، وتنبيهات فورية (Toasts/Feedback)، وحالات فارغة أنيقة (Empty states).
   - تأكد من أن كل الأزرار والوظائف قابلة للنقر وتعمل بصورة مثالية 100% دون أي خطأ برمجي.
3. التزم بإرجاع كود الـ HTML فقط دون كتابة أي شروحات أو مقدمات خارج الكود.`;

  let generatedHtml = '';

  outerAppLoop: for (const key of availableKeys) {
    const ai = getGenAIClient(key);
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: appPrompt }] }],
        });

        let rawOutput = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let clean = rawOutput.trim();
        if (clean.startsWith('```html')) {
          clean = clean.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
        } else if (clean.startsWith('```')) {
          clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        }
        clean = clean.trim();

        if (clean.includes('<html') || clean.includes('<!DOCTYPE')) {
          generatedHtml = clean;
          break outerAppLoop;
        }
      } catch (err: any) {
        console.warn(`[App Gen] Key or model ${model} failed:`, err?.message);
        continue;
      }
    }
  }

  const finalHtml = generatedHtml || fallbackInteractiveHtml;
  let appTitle = prompt.slice(0, 30);
  const titleMatch = finalHtml.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    appTitle = titleMatch[1].trim();
  }

  res.json({
    appName: appTitle,
    description: prompt,
    html: finalHtml,
  });
});

// Presentation / Lessons Slides Explainer Endpoint with JSON Schema & Cascade
app.post('/api/gemini/slides', async (req, res) => {
  const { topic } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ error: 'يرجى كتابة عنوان الدرس أو المفهوم المطلوب شرحه' });
    return;
  }

  const availableKeys = getAvailableApiKeys(customKey);

  // Fallback high-quality structured slides if keys are temporarily unavailable
  const fallbackSlides = {
    topic,
    summary: `شرح تفاعلي مبسط وشامل لمفهوم: ${topic} لترسيخ الفهم وتبسيط الأفكار المعقدة بأمثلة وتشبيهات واقعية.`,
    slides: [
      {
        id: 's1',
        title: `ما هو ${topic}؟ الجوهر والتعريف`,
        badge: 'الفكرة الجوهرية',
        content: [
          `المفهوم الأساسي يهدف إلى حل مشكلة محددة أو تفسير ظاهرة علمية/عملية.`,
          `بدلاً من التعقيد، يمكن فهمه كنظام من الخطوات المترابطة.`,
          `يُعتبر هذا المفهوم حجر زاوية في مجاله وله تطبيقات يومية واسعة.`
        ],
        analogy: `تخيل أن هذا المفهوم يشبه شبكة إشارات المرور الذكية؛ كل جزء يكمل الآخر لضمان انسيابية العمل دون تصادم.`,
        keyTakeaway: 'الفهم يبدأ من إدراك الغاية الأساسية قبل الغوص في التفاصيل المعقدة.'
      },
      {
        id: 's2',
        title: 'كيف يعمل خطوة بخطوة؟',
        badge: 'آلية العمل',
        content: [
          'المرحلة الأولى: استقبال المدخلات أو الشروط الأولية وتجهيزها.',
          'المرحلة الثانية: معالجة البيانات أو التفاعل وفق قواعد محددة وثابتة.',
          'المرحلة الثالثة: إنتاج المخرجات أو النتيجة النهائية بدقة.'
        ],
        analogy: 'تماماً مثل إعداد وصفة متقنة: المكونات (المدخلات)، الطهي (المعالجة)، والطبق النهائي (المخرجات).',
        keyTakeaway: 'كل خطوة تعتمد بالكامل على صحة الخطوة التي تسبقها.'
      },
      {
        id: 's3',
        title: 'أمثلة وتطبيقات عملية ملموسة',
        badge: 'التطبيق الواقعي',
        content: [
          'تطبيقات في التكنولوجيا الحديثة والصناعات المتقدمة.',
          'كيف يساعدنا هذا المفهوم في تحسين الكفاءة وتوفير الوقت والموارد.',
          'أمثلة واقعية نراها في حياتنا اليومية دون أن نشعر.'
        ],
        analogy: 'مثل استخدام نظام الملاحة GPS؛ يرشدك لأقصر طريق متجاوزاً العقبات بذكاء.',
        keyTakeaway: 'النظريات تكتسب قيمتها الحقيقية عند تطبيقها على أرض الواقع.'
      },
      {
        id: 's4',
        title: 'أخطاء شائعة والقاعدة الذهبية',
        badge: 'الخلاصة والاتقان',
        content: [
          'الخطأ الشائع 1: الخلط بين السبب والنتيجة عند دراسة هذا المفهوم.',
          'الخطأ الشائع 2: إهمال الشروط الأساسية المؤثرة على النتائج.',
          'نصيحة المراجعة: ربط كل فكرة بتشبيه بصري يسهل استرجاعه أثناء الاختبار أو التطبيق العملي.'
        ],
        analogy: 'مثل بناء بيت متين؛ إذا كانت الأساسات قوية، ستصمد الجدران أمام أي عاصفة.',
        keyTakeaway: 'الإتقان الحقيقي يعني قدرتك على شرح هذا الدرس لطفل في السابعة من عمره ببساطة!'
      }
    ]
  };

  if (availableKeys.length === 0) {
    res.json(fallbackSlides);
    return;
  }

  const promptText = `أنت أستاذ ومحاضر عبقري في تبسيط وتفكيك أصعب العلوم والمفاهيم المعقدة (Master Educator & Visual Explainer).
المطلوب: شرح الدرس أو الموضوع التالي في عرض تقديمي تعليمي تفاعلي احترافي مكون من 4 إلى 5 شرائح:
"${topic}"

يجب أن تكون الإجابة بصيغة JSON حصرية، دون أي نصوص إضافية خارج الـ JSON:
{
  "topic": "${topic}",
  "summary": "ملخص شامل وشيق للدرس في سطرين",
  "slides": [
    {
      "id": "s1",
      "title": "عنوان الشريحة الواضح",
      "badge": "الفكرة الجوهرية / آلية العمل / التشبيه الواقعي / أمثلة وتطبيقات / الخلاصة والاتقان",
      "content": ["نقطة توضيحية 1", "نقطة توضيحية 2", "نقطة توضيحية 3"],
      "analogy": "تشبيه واقعي حسي يبسط الفكرة لأي مبتدئ",
      "keyTakeaway": "القاعدة الذهبية المستفادة من هذه الشريحة"
    }
  ]
}`;

  for (const key of availableKeys) {
    const ai = getGenAIClient(key);
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        });

        const raw = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let clean = raw.trim();
        if (clean.startsWith('```json')) {
          clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        } else if (clean.startsWith('```')) {
          clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        }
        const parsed = JSON.parse(clean);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          res.json(parsed);
          return;
        }
      } catch (err: any) {
        console.warn(`[Slides Gen] Model ${model} failed:`, err?.message);
      }
    }
  }

  res.json(fallbackSlides);
});

// Business Hub & E-Commerce Analysis Endpoint
app.post('/api/gemini/business', async (req, res) => {
  const {
    businessName = 'نشاط تجاري',
    businessType = 'تجارة وخدمات',
    description = '',
    whatsappNumber = '',
    mode = 'analysis', // 'analysis' | 'campaign' | 'customer_reply'
    customerMessage = '',
  } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;

  const availableKeys = getAvailableApiKeys(customKey);

  let systemPrompt = '';
  let userPrompt = '';

  if (mode === 'customer_reply') {
    systemPrompt = `أنت خبير محترف في خدمة العملاء والمبيعات باللغة العربية. مهمتك تقديم 3 نماذج ردود احترافية ومهذبة ومقنعة جداً للرد على رسالة أو اعتراض الزبون. الردود يجب أن تكون جاهزة للإرسال فوراً عبر واتساب، وتنهي الرسالة بدعوة واضحة لاتخاذ إجراء (Call to Action).`;
    userPrompt = `رسالة أو استفسار الزبون: "${customerMessage || 'كم السعر وهل التوصيل متوفر؟'}"
اسم النشاط: ${businessName} (${businessType})
رقم الواتساب للتواصل: ${whatsappNumber || 'رقمنا المعتمد'}

أرجع الرد بتنسيق JSON:
{
  "replies": [
    {
      "tone": "ودي وترحيبي",
      "text": "نص الرسالة الجاهزة للواتساب مع الإيموجي المناسب"
    },
    {
      "tone": "مقنع وعرض قيمة مضافة",
      "text": "نص الرسالة الجاهزة للواتساب مع التركيز على الجودة والضمان"
    },
    {
      "tone": "مباشر وسريع للشراء",
      "text": "نص الرسالة الجاهزة للواتساب مع رابط أو تفاصيل الحجز الفوري"
    }
  ]
}`;
  } else if (mode === 'campaign') {
    systemPrompt = `أنت خبير تسويق رقمي وصانع حملات إعلانية فيروسية (Viral Growth Marketer). مهمتك ابتكار 3 عروض ترويجية مميزة مع نصوص إعلانية جذابة لمنصات التواصل (إنستغرام، تيك توك، فيسبوك، واتساب).`;
    userPrompt = `بيانات النشاط:
- الاسم: ${businessName}
- المجال: ${businessType}
- الوصف: ${description || 'منتجات وخدمات مميزة ذات جودة عالية'}
- رقم الواتساب: ${whatsappNumber}

أرجع الإجابة بتنسيق JSON حصري:
{
  "campaigns": [
    {
      "title": "عنوان العرض الترويجي الجذاب",
      "discountOffer": "تفاصيل الخصم أو العرض (مثلاً اشترِ 1 واحصل على 1 مجاناً أو خصم 30%)",
      "adCopy": "نص الإعلان الجذاب الكامل مع الإيموجي والهاشتاغات",
      "whatsappBroadcast": "رسالة البث الجاهزة للإرسال في مجموعات الواتساب",
      "targetAudience": "الجمهور المستهدف بدقة"
    }
  ]
}`;
  } else {
    // Mode: analysis
    systemPrompt = `أنت كبير مستشاري الأعمال وتطوير المشاريع والتجارة الإلكترونية (Senior Business & Growth Consultant). مهمتك تقديم تحليل شامل وعملي للنشاط التجاري مع نصائح نمو واقعية لزيادة المبيعات.`;
    userPrompt = `بيانات المشروع:
- اسم النشاط: ${businessName}
- نوع النشاط: ${businessType}
- الوصف: ${description || 'نشاط تجاري يقدم منتجات وخدمات للمستهلكين'}

أرجع التحليل بتنسيق JSON حصري:
{
  "swot": {
    "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
    "weaknesses": ["تحدي أو نقطة بحاجة لتحسين 1", "تحدي 2"],
    "opportunities": ["فرصة تسويقية أو تجارية واعدة 1", "فرصة 2", "فرصة 3"],
    "threats": ["مخاطر أو منافسة محتملة 1", "مخاطر 2"]
  },
  "growthTips": [
    "نصيحة عملية 1 لزيادة المبيعات بسرعة",
    "نصيحة عملية 2 لبناء ولاء العملاء وتكرار الشراء",
    "نصيحة عملية 3 لتحسين الحملات على واتساب وتيلجرام",
    "نصيحة عملية 4 لتمييز السعر والقيمة أمام المنافسين"
  ],
  "suggestedCampaigns": [
    {
      "title": "فكرة حملة إعلانية مقترحة",
      "offer": "العرض الترويجي الذكي",
      "targetAudience": "الفئة المستهدفة",
      "callToAction": "الدعوة للشراء عبر واتساب"
    }
  ]
}`;
  }

  for (const key of availableKeys) {
    const ai = getGenAIClient(key);
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const raw = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let clean = raw.trim();
        if (clean.startsWith('```json')) {
          clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        } else if (clean.startsWith('```')) {
          clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        }
        const parsed = JSON.parse(clean);
        res.json(parsed);
        return;
      } catch (err: any) {
        console.warn(`[Business Hub] Model ${model} failed:`, err?.message);
      }
    }
  }

  // Resilient fallback
  if (mode === 'customer_reply') {
    res.json({
      replies: [
        {
          tone: 'ودي وسريع',
          text: `أهلاً بك يا غالي في ${businessName}! يسعدنا خدمتك بكل سرور. بخصوص استفسارك، نحن جاهزون لتنفيذ طلبك بأفضل جودة وسعر منافس. للطلب أو الاستفسار السريع يسعدنا تواصلك معنا مباشرة! 🌟`
        },
        {
          tone: 'احترافي ومقنع',
          text: `مرحباً بك! في ${businessName} نحرص دائماً على تقديم أفضل تجربة لعملائنا الكرام مع ضمان الجودة وسرعة المتابعة. هل ترغب في تثبيت طلبك الآن لنجهزه لك على الفور؟ 📦✨`
        }
      ]
    });
  } else {
    res.json({
      swot: {
        strengths: ['المرونة وسرعة التواصل المباشر مع العملاء', 'إمكانية تقديم عروض حصرية ومخصصة'],
        weaknesses: ['الحاجة لتنظيم قاعدة بيانات العملاء ومتابعتهم دورياً'],
        opportunities: ['التوسع عبر التجارة بالمحادثة على واتساب وتيلجرام', 'إطلاق عروض موسمية لجذب عملاء جدد'],
        threats: ['المنافسة السعرية وتغير اهتمامات السوق السريع']
      },
      growthTips: [
        'فعّل رسائل الترحيب والعروض الحصرية على واتساب لتسريع إغلاق المبيعات.',
        'قدم ميزة إضافية أو توصيل مجاني عند وصول سلة المشتريات لمبلغ محدد.',
        'انشر آراء وتقييمات العملاء الإيجابية (Social Proof) لبناء ثقة فورية مع الزبائن الجدد.'
      ],
      suggestedCampaigns: [
        {
          title: 'عرض الانطلاقة الخاص',
          offer: 'خصم 20% على أول طلب + هدية مجانية',
          targetAudience: 'العملاء الجدد والمهتمين بالخدمة',
          callToAction: 'تواصل معنا على الواتساب للاستفادة من العرض قبل نفاد الكمية!'
        }
      ]
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FreeGen AI server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;

