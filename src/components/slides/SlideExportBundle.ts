import { GeneratedPresentation } from '../../types';

export function exportStandalonePresentationHtml(
  presentation: GeneratedPresentation,
  themeName: string = 'dark-slate'
): void {
  const isDark = themeName !== 'light-editorial';
  const bgColor = isDark ? '#090d16' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#f59e0b';

  const slidesDataJson = JSON.stringify(presentation.slides);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${presentation.topic} - عرض تقديمي</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      background: ${bgColor};
      color: ${textColor};
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid ${cardBorder};
      background: ${isDark ? '#060910' : '#ffffff'};
    }
    .header-title { font-weight: bold; font-size: 16px; color: ${accentColor}; }
    .container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      overflow: hidden;
    }
    .slide-stage {
      width: 100%;
      max-width: 1050px;
      aspect-ratio: 16 / 9;
      background: ${isDark ? 'linear-gradient(145deg, #0f172a, #090d16)' : 'linear-gradient(145deg, #ffffff, #f1f5f9)'};
      border: 1px solid ${cardBorder};
      border-radius: 24px;
      padding: 36px 48px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
    }
    .slide-title {
      font-size: 32px;
      font-weight: 900;
      margin: 16px 0;
      line-height: 1.3;
    }
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 16px;
      background: ${cardBg};
      border: 1px solid ${cardBorder};
      border-radius: 14px;
      margin-bottom: 10px;
      font-size: 15px;
      line-height: 1.6;
    }
    .bullet-dot {
      color: #f59e0b;
      font-weight: bold;
      margin-top: 2px;
    }
    .analogy-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 16px;
      padding: 14px 18px;
      font-size: 14px;
      margin-top: 12px;
      line-height: 1.6;
    }
    .takeaway-box {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 14px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: bold;
      color: #10b981;
      margin-top: 10px;
    }
    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      border-top: 1px solid ${cardBorder};
      background: ${isDark ? '#060910' : '#ffffff'};
    }
    button {
      padding: 8px 18px;
      border-radius: 12px;
      border: none;
      font-family: inherit;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      transition: 0.2s;
    }
    .btn-nav {
      background: #f59e0b;
      color: #000;
    }
    .btn-nav:hover { background: #d97706; }
    .btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-speak {
      background: #10b981;
      color: #fff;
    }
    .counter { font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <header>
    <div class="header-title">🎓 ${presentation.topic}</div>
    <div class="counter" id="slideCounter">1 / ${presentation.slides.length}</div>
  </header>

  <div class="container">
    <div class="slide-stage" id="slideStage"></div>
  </div>

  <div class="controls">
    <button class="btn-nav" id="prevBtn" onclick="prevSlide()">السابق</button>
    <button class="btn-speak" id="speakBtn" onclick="toggleSpeak()">🔊 قراءة صوتية</button>
    <button class="btn-nav" id="nextBtn" onclick="nextSlide()">التالي</button>
  </div>

  <script>
    const slides = ${slidesDataJson};
    let currentIdx = 0;

    function renderSlide() {
      const s = slides[currentIdx];
      const stage = document.getElementById('slideStage');
      document.getElementById('slideCounter').innerText = (currentIdx + 1) + ' / ' + slides.length;
      document.getElementById('prevBtn').disabled = currentIdx === 0;
      document.getElementById('nextBtn').disabled = currentIdx === slides.length - 1;

      let bulletsHtml = s.content.map(pt => '<div class="bullet-item"><span class="bullet-dot">✔</span><span>' + pt + '</span></div>').join('');
      let analogyHtml = s.analogy ? '<div class="analogy-box">💡 <b>تشبيه واقعي:</b> ' + s.analogy + '</div>' : '';
      let takeawayHtml = s.keyTakeaway ? '<div class="takeaway-box">⭐ <b>القاعدة الذهبية:</b> ' + s.keyTakeaway + '</div>' : '';

      stage.innerHTML = '<div>' +
        '<span class="badge">' + (s.badge || 'مفهوم رئيسي') + '</span>' +
        '<h2 class="slide-title">' + s.title + '</h2>' +
        '<div>' + bulletsHtml + '</div>' +
        analogyHtml +
        takeawayHtml +
        '</div>';
    }

    function nextSlide() {
      if (currentIdx < slides.length - 1) {
        currentIdx++;
        window.speechSynthesis.cancel();
        renderSlide();
      }
    }

    function prevSlide() {
      if (currentIdx > 0) {
        currentIdx--;
        window.speechSynthesis.cancel();
        renderSlide();
      }
    }

    function toggleSpeak() {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
      }
      const s = slides[currentIdx];
      const text = s.speechScript || (s.title + '. ' + s.content.join('. ') + '. ' + s.keyTakeaway);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-SA';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    renderSlide();
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = presentation.topic.replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 30);
  a.download = `عرض_تقديمي_${cleanTitle}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printPresentationSlides(): void {
  window.print();
}
