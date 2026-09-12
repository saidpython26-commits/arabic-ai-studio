# دليل التشغيل والنشر المستقل لتطبيق FreeGen AI

هذا التطبيق مبني بنية كاملة (Full-Stack) باستخدام React 19 + Express + Vite + Tailwind CSS ومستقل تماماً.

---

## 1. التشغيل المحلي الفوري (على حاسوبك الشخصي)

1. فك ضغط ملف المشروع.
2. افتح مجلد المشروع في الـ Terminal / موجه الأوامر.
3. نفّذ الأوامر التالية:
   ```bash
   npm install
   npm run build
   npm start
   ```
4. افتح المتصفح على: `http://localhost:3000`

---

## 2. النشر المجاني بضغطة زر على Render.com

1. ارفع الكود إلى حسابك في **GitHub**.
2. افتح [Render.com](https://render.com) وسجّل دخولك بحساب GitHub.
3. اضغط **New Web Service** واختر مستودع المشروع.
4. سيقرأ Render ملف `render.yaml` تلقائياً، فقط ضع مفتاح `GEMINI_API_KEY` الخاص بك في قسم Environment Variables.
5. اضغط **Deploy Web Service** وسيكون تطبيقك منشوراً على الإنترنت برابط دائم مجاني ومدى الحياة!

---

## 3. النشر عبر Docker على أي سيرفر أو VPS

التطبيق مزود بملف `Dockerfile` مجهز للإنتاج:
```bash
docker build -t freegen-ai .
docker run -d -p 3000:3000 -e GEMINI_API_KEY="your_key_here" freegen-ai
```

---

## 4. التحكم في النشر داخل منصة Google AI Studio

- **لجعل التطبيق متاحاً للعامة بدون تسجيل:** اضغط على زر **Share** أو **Deploy** في الشريط العلوي للمنصة.
- **لإيقاف النشر أو جعله خاصاً بك وحدك:** يمكنك إلغاء رابط المشاركة في أي وقت من نفس القائمة.
