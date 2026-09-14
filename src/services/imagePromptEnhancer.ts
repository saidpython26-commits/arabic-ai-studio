// Client-Side Image Prompt Expansion & Self-Learning Visual Enhancer
// Enhances short/brief prompts into rich, high-fidelity visual descriptions

const VISUAL_DICTIONARY: Record<string, string> = {
  // Animals
  'قط': 'cute playful domestic cat with soft detailed fur and expressive eyes',
  'قطة': 'beautiful fluffy cat with sparkling eyes and sleek detailed fur',
  'بسة': 'cute charming cat with expressive green eyes',
  'كلب': 'loyal friendly dog with glossy detailed coat',
  'جرو': 'adorable tiny puppy',
  'حصان': 'majestic thoroughbred stallion running gracefully with flowing mane',
  'خيل': 'graceful arabian horse with glossy coat and proud posture',
  'فرس': 'elegant arabian mare with silky flowing mane',
  'أسد': 'regal majestic lion with rich golden mane and commanding gaze',
  'نمر': 'stealthy bengal tiger with bold stripes and piercing amber eyes',
  'فهد': 'sleek spotted cheetah in aerodynamic stance',
  'ذئب': 'lone mystic wolf with silver grey fur against misty moonlit woods',
  'صقر': 'sharp-eyed golden peregrine falcon with outstretched detailed feathers',
  'نسر': 'mighty bald eagle soaring high with wide powerful wingspan',
  'بومة': 'wise mythical owl with feathered plumage perched on branch',
  'طائر': 'colorful exotic bird with iridescent feathers',
  'عصفور': 'tiny vibrant songbird perched delicately',
  'حمامة': 'pure white dove in mid-flight with delicate feathers',
  'سمكة': 'luminous tropical fish with translucent fins swimming in crystal reef',
  'حوت': 'colossal majestic blue whale swimming in sunlit deep ocean waters',
  'دولفين': 'playful dolphin leaping out of turquoise water with water droplets',
  'قرش': 'sleek powerful shark in deep blue ocean abyss',
  'غزال': 'graceful wild deer with elegant antlers in enchanted foggy meadow',
  'فيل': 'majestic elephant walking peacefully across sunset savannah',
  'جمل': 'hardy desert camel with ornate saddle standing beside golden dunes',
  'ناقة': 'gentle desert camel standing beside desert oasis',
  'دب': 'powerful grizzly bear in lush wilderness',
  'باندا': 'adorable giant panda happily chewing bamboo leaves',
  'أرنب': 'fluffy cute bunny rabbit with twitching nose',
  'تنين': 'fearsome mythical fire-breathing dragon with iridescent scales and wings',
  'طاووس': 'magnificent peacock displaying iridescent emerald and sapphire feathers',

  // Characters & Roles
  'رجل': 'distinguished man with expressive features',
  'امرأة': 'graceful woman with radiant expressive face',
  'بنت': 'cheerful young girl with sparkling eyes',
  'فتاة': 'graceful young woman with natural flowing hair',
  'ولد': 'curious young boy with bright smile',
  'طفل': 'charming young child with innocent expression',
  'محارب': 'brave warrior in ornate detailed armor holding battle staff',
  'فارس': 'heroic medieval knight in gleaming polished plate armor',
  'ملك': 'regal monarch king wearing ornate jewel-encrusted golden crown',
  'ملكة': 'majestic queen dressed in royal velvet robe and tiara',
  'أمير': 'handsome prince in embroidered royal tunic',
  'أميرة': 'elegant princess in ethereal flowing gown',
  'طبيب': 'modern doctor in clean lab coat with stethoscope',
  'مهندس': 'focused engineer looking over futuristic blueprints',
  'رائد فضاء': 'astronaut in advanced high-tech space suit exploring alien planet',
  'طيار': 'aviator pilot in leather jacket with flight goggles',
  'ساحر': 'wise mystical wizard with glowing magical orb and runic robes',
  'قرصان': 'charismatic pirate captain with weathered hat and compass',
  'نينجا': 'shadowy ninja assassin in black garments poised in stealth',
  'ساموراي': 'honorable samurai warrior with authentic katana in cherry blossom garden',
  'روبوت': 'sleek humanoid android robot with glowing circuit lines and chrome finish',
  'شخصية': 'intriguing character with distinct personality and expressive presence',

  // Environments & Landscapes
  'صحراء': 'endless golden desert sand dunes under vast cinematic sunset sky',
  'واحة': 'lush desert oasis with emerald palm trees and clear blue pool',
  'غابة': 'ancient mystical forest with tall mossy trees and volumetric god rays',
  'حديقة': 'enchanted botanical garden with blooming flowers and stone pathway',
  'شجرة': 'magnificent ancient tree with sprawling branches and luminous foliage',
  'نخلة': 'tall tropical palm trees swaying against gradient sky',
  'أزهار': 'vibrant colorful blossoms in soft morning dew',
  'ورد': 'luxurious blooming red roses with glistening water droplets',
  'نهر': 'crystal clear winding river flowing over smooth river stones',
  'بحر': 'dramatic open sea with gentle turquoise waves and foam',
  'محيط': 'vast deep blue ocean with sun rays penetrating beneath surface',
  'شاطئ': 'serene white sand tropical beach at golden sunset',
  'جبل': 'breathtaking mountain peaks covered in fresh white snow',
  'وادي': 'grand scenic canyon valley with dramatic depth and cliffs',
  'شلال': 'cascading powerful waterfall into pristine natural pool',
  'مدينة': 'futuristic cyberpunk metropolis skyline with holographic neon lights',
  'شارع': 'charming cobblestone European street illuminated by vintage lanterns',
  'قصر': 'grand majestic arabesque palace with carved arches, domes and fountains',
  'قلعة': 'ancient medieval stone castle fortress towering on cliff edge',
  'مسجد': 'exquisite islamic mosque with grand glowing domes and slender minarets',
  'بيت': 'charming cozy cottage nestled in peaceful scenic nature',
  'مقهى': 'warm cozy artisan coffee shop with steam rising and soft lighting',
  'فضاء': 'deep cosmic outer space with vibrant purple-cyan nebula and galaxy stars',
  'كوكب': 'mysterious exoplanet with majestic rings and craters',
  'قمر': 'luminous radiant full moon glowing in clear midnight starry sky',
  'شمس': 'warm radiant golden sun casting dramatic long shadows',
  'سماء': 'expansive dramatic sky with layered twilight sunset clouds',
  'غيوم': 'soft volumetric cumulus clouds painted in pink and amber hues',
  'مطر': 'atmospheric gentle rain with reflective wet pavement and raindrops',
  'ثلج': 'magical winter wonderland with untouched sparkling snow and frost',
  'نار': 'crackling warm campfire with dancing amber embers',
  'جليد': 'translucent crystalline ice glaciers glowing with cyan undertones',

  // Colors
  'أحمر': 'vibrant ruby red',
  'حمراء': 'vibrant crimson red',
  'أزرق': 'deep sapphire blue',
  'زرقاء': 'deep cobalt blue',
  'أخضر': 'lush emerald green',
  'خضراء': 'vibrant forest green',
  'أصفر': 'sunny bright golden yellow',
  'صفراء': 'radiant warm yellow',
  'ذهبي': 'luxurious reflective metallic gold',
  'ذهبية': 'gleaming polished gold',
  'فضي': 'sleek reflective metallic silver',
  'فضية': 'burnished shiny silver',
  'أبيض': 'pure pristine white',
  'بيضاء': 'clean luminous white',
  'أسود': 'deep midnight onyx black',
  'سوداء': 'obsidian black with soft highlights',
  'بنفسجي': 'royal velvety purple',
  'بنفسجية': 'enchanted amethyst purple',
  'وردي': 'soft pastel blush pink',
  'وردية': 'delicate rose pink',
  'برتقالي': 'warm fiery orange',
  'برتقالية': 'rich sunset amber orange',

  // Descriptors & Adjectives
  'لطيف': 'charming adorable captivating',
  'لطيفة': 'sweet delightful charming',
  'جميل': 'breathtakingly beautiful aesthetically pleasing',
  'جميلة': 'stunning gorgeous elegant',
  'ضخم': 'colossal massive awe-inspiring scale',
  'عملاق': 'towering monumental giant',
  'صغير': 'dainty miniature cute',
  'صغيرة': 'petite charming miniature',
  'قديم': 'vintage antique weathered historical',
  'حديث': 'modern sleek minimalist contemporary',
  'مستقبلي': 'futuristic advanced sci-fi cyberpunk aesthetics',
  'مستقبلية': 'high-tech futuristic aesthetic',
  'خيالي': 'ethereal magical fantasy dreamlike',
  'خيالية': 'surreal magical fantasy',
  'مضيء': 'glowing with inner luminescence',
  'مضيئة': 'radiating luminous ambient light',
  'متوهج': 'emitting radiant magical neon glow',
  'متوهجة': 'radiant glowing with mystical aura',
  'مظلم': 'moody dark noir atmosphere with deep shadows',
  'مظلمة': 'dramatic low-key atmospheric lighting',

  // Actions
  'يطير': 'soaring gracefully through the air with outstretched wings',
  'متحرك': 'dynamic composition with sense of fluid motion',
  'يركض': 'running energetically with action blur',
  'يسبح': 'swimming fluidly through crystal clear waters',
  'يجلس': 'sitting gracefully in relaxed centered posture',
  'يقف': 'standing proudly centered with commanding presence',
  'يحمل': 'holding carefully with both hands',
  'ينظر': 'looking directly into camera lens with piercing captivating gaze',

  // Objects & Tech
  'سيارة': 'sleek high-performance luxury sports car with glossy reflections',
  'طيارة': 'aerodynamic supersonic jet aircraft soaring through clouds',
  'صاروخ': 'colossal spacecraft rocket launching with fiery exhaust trail',
  'سفينة': 'grand tall wooden sailing ship cutting through ocean waves',
  'هاتف': 'sleek borderless glass smartphone glowing with futuristic UI',
  'كتاب': 'ancient leather-bound spellbook with gold filigree and glowing runes',
  'شعار': 'minimalist clean modern vector logo badge symbol',
  'تاج': 'exquisite royal crown encrusted with diamonds and emeralds',
  'سيف': 'mastercrafted steel sword with glowing runic engraving along blade',
  'خاتم': 'enchanted golden ring set with sparkling gemstone',
};

const STYLE_PROMPT_DETAILS: Record<string, string> = {
  'واقعي': 'photorealistic, ultra detailed 8k photography, 35mm lens, natural soft lighting, depth of field, sharp focus, octane render',
  'سينمائي': 'cinematic film still, 70mm anamorphic lens, dramatic moody lighting, rim light, epic volumetric atmosphere, award-winning cinematography',
  'رقمي': 'concept digital art, artstation trending, rich vibrant colors, dynamic brushstrokes, fantasy epic illustration, highly detailed',
  'كرتوني': 'vibrant 3D animated movie style, Pixar Disney animation quality, charming expressive character, clean soft rendering, rich colors',
  'ثلاثي الأبعاد': 'hyperdetailed 3D render, ray-tracing, subsurface scattering, studio lighting, Blender Octane masterpiece, smooth polished textures',
  'أنمي': 'stunning modern anime aesthetic, Makoto Shinkai style, vibrant skies, crisp detailed linework, emotional expressive lighting',
};

function normalizeArabic(text: string): string {
  return text
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * Automatically upgrades short or simple prompts (e.g. "قط أسود", "مدينة في الفضاء")
 * into a rich, professional English prompt engineered for top-tier image diffusion.
 */
export function expandPromptVisually(rawPrompt: string, style: string = 'واقعي'): string {
  const clean = rawPrompt.trim();
  if (!clean) return '';

  const isArabic = /[\u0600-\u06FF]/.test(clean);
  const styleKeywords = STYLE_PROMPT_DETAILS[style] || 'ultra high quality, sharp focus, 8k resolution';

  if (!isArabic) {
    // English prompt: if already long and descriptive, just polish with style
    if (clean.split(/\s+/).length > 10) {
      return `${clean}, ${styleKeywords}`;
    }
    // Short English prompt: augment with clarity and lighting
    return `A masterfully crafted visual depiction of ${clean}, centered composition, intricate fine textures, ${styleKeywords}`;
  }

  // Arabic prompt processing
  const normalized = normalizeArabic(clean);
  const words = normalized.split(/[\s,،.]+/).filter(Boolean);
  const matchedTokens: string[] = [];

  for (const word of words) {
    // Direct match
    if (VISUAL_DICTIONARY[word]) {
      matchedTokens.push(VISUAL_DICTIONARY[word]);
      continue;
    }
    // With 'ال' prefix
    if (word.startsWith('ال') && word.length > 3) {
      const stripped = word.slice(2);
      if (VISUAL_DICTIONARY[stripped]) {
        matchedTokens.push(VISUAL_DICTIONARY[stripped]);
        continue;
      }
    }
    // With 'و' or 'ف' prefix
    if ((word.startsWith('و') || word.startsWith('ف') || word.startsWith('ب') || word.startsWith('ل')) && word.length > 3) {
      const stripped = word.slice(1);
      if (VISUAL_DICTIONARY[stripped]) {
        matchedTokens.push(VISUAL_DICTIONARY[stripped]);
        continue;
      }
    }
  }

  if (matchedTokens.length > 0) {
    const combinedTokens = Array.from(new Set(matchedTokens)).join(', ');
    return `${combinedTokens}, centered subject, cinematic composition, ${styleKeywords}`;
  }

  // Fallback if no exact dictionary tokens hit: generate safe universal prompt with user text
  return `A breathtakingly detailed masterpiece artwork representing ${clean}, centered composition, high visual fidelity, ${styleKeywords}`;
}
