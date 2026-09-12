import type { VercelRequest, VercelResponse } from '@vercel/node';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, aspectRatio = '1:1', style = 'واقعي', variation = 0 } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'يرجى كتابة وصف الصورة المطلوب توليدها' });
  }

  const styleModifiers: Record<string, string> = {
    'واقعي': 'photorealistic, ultra detailed 8k photography, cinematic volumetric lighting, sharp focus',
    'كرتوني': 'vibrant 3D animated cartoon, pixar style, charming character, clean rendering',
    'سينمائي': 'cinematic movie still, dramatic atmosphere, anamorphic lens, epic moody lighting',
    'رقمي': 'digital art concept, trending on artstation, rich detailed illustration',
    'ثلاثي الأبعاد': '3D render, smooth textures, ray tracing, studio lighting',
  };

  const styleDesc = styleModifiers[style] || 'high quality digital artwork, sharp focus';
  const enhancedPrompt = `${prompt}, ${styleDesc}, centered subject, cinematic composition, highly detailed, 8k resolution`;

  let width = 1024;
  let height = 1024;
  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  }

  const promptHash = hashString(enhancedPrompt);
  const seed = ((promptHash + (Number(variation) || 0) * 12345) % 899999) + 100000;
  const negativePrompt = encodeURIComponent(
    'blurry, distorted, bad anatomy, bad hands, extra limbs, ugly, deformed, watermark, lowres'
  );

  const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    enhancedPrompt
  )}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&negative=${negativePrompt}`;

  return res.json({
    imageUrl: fluxUrl,
    prompt,
    enhancedPrompt,
    model: 'Flux.1 High-Fidelity Diffusion',
    seed,
  });
}
