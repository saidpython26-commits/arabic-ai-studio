import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  Megaphone,
  MessageCircle,
  ShoppingBag,
  Send,
  Share2,
  Sparkles,
  Save,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Phone,
  BarChart3,
  ShieldCheck,
  Tag,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { BusinessProfile, Language, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { generateBusinessDirect } from '../services/geminiDirect';

interface BusinessTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BusinessTab: React.FC<BusinessTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';

  const [profile, setProfile] = useState<BusinessProfile>(() =>
    storageService.getBusinessProfile(user.uid)
  );
  const [isEditingProfile, setIsEditingProfile] = useState(() => !profile.businessName);
  const [activeSubTab, setActiveSubTab] = useState<'analysis' | 'campaigns' | 'customers' | 'commerce'>('analysis');

  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  // Campaigns result
  const [campaignsResult, setCampaignsResult] = useState<any>(null);
  // Customer replies result
  const [customerInquiry, setCustomerInquiry] = useState('');
  const [customerReplies, setCustomerReplies] = useState<any[]>([]);

  // Instant E-Commerce WhatsApp Product Card State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');

  const handleSaveProfile = async () => {
    if (!profile.businessName.trim()) {
      onShowToast(isAr ? 'يرجى كتابة اسم النشاط التجاري' : 'Please enter business name', 'error');
      return;
    }
    await storageService.saveBusinessProfile(user.uid, profile);
    setIsEditingProfile(false);
    onShowToast(isAr ? 'تم حفظ بيانات نشاطك التجاري بنجاح!' : 'Business profile saved!', 'success');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    onShowToast(isAr ? 'تم نسخ النص إلى الحافظة' : 'Copied to clipboard', 'info');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 1. Run Strategic Business Analysis
  const handleRunAnalysis = async () => {
    if (!profile.businessName) {
      setIsEditingProfile(true);
      onShowToast(isAr ? 'يرجى إكمال بيانات نشاطك أولاً' : 'Please complete business profile first', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const customKey = storageService.getCustomApiKey();
      let data: any = null;

      try {
        const res = await fetch('/api/gemini/business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({
            businessName: profile.businessName,
            businessType: profile.businessType,
            description: profile.description,
            whatsappNumber: profile.whatsappNumber,
            mode: 'analysis',
          }),
        });
        if (res.ok) data = await res.json();
      } catch (e) {
        console.warn('Backend business analysis call failed, using client direct:', e);
      }

      if (!data && customKey) {
        data = await generateBusinessDirect(customKey, {
          businessName: profile.businessName,
          businessType: profile.businessType,
          description: profile.description,
          whatsappNumber: profile.whatsappNumber,
          mode: 'analysis',
        });
      }

      if (data) {
        setAnalysisResult(data);
        onShowToast(isAr ? 'تم تحليل النشاط التجاري بنجاح!' : 'Business analysis completed!', 'success');
      }
    } catch (err) {
      onShowToast(isAr ? 'حدث خطأ أثناء تحليل النشاط' : 'Analysis failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Generate Promotional Campaigns & Offers
  const handleGenerateCampaigns = async () => {
    if (!profile.businessName) {
      setIsEditingProfile(true);
      return;
    }
    setIsLoading(true);
    try {
      const customKey = storageService.getCustomApiKey();
      let data: any = null;

      try {
        const res = await fetch('/api/gemini/business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({
            businessName: profile.businessName,
            businessType: profile.businessType,
            description: profile.description,
            whatsappNumber: profile.whatsappNumber,
            mode: 'campaign',
          }),
        });
        if (res.ok) data = await res.json();
      } catch (e) {
        console.warn('Backend business campaign failed:', e);
      }

      if (!data && customKey) {
        data = await generateBusinessDirect(customKey, {
          businessName: profile.businessName,
          businessType: profile.businessType,
          description: profile.description,
          whatsappNumber: profile.whatsappNumber,
          mode: 'campaign',
        });
      }

      if (data) {
        setCampaignsResult(data);
        onShowToast(isAr ? 'تم ابتكار العروض الترويجية بنجاح!' : 'Campaigns generated!', 'success');
      }
    } catch (err) {
      onShowToast(isAr ? 'حدث خطأ أثناء إنشاء العروض' : 'Campaign generation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Generate Customer Reply
  const handleGenerateCustomerReply = async (inquiryText?: string) => {
    const q = (inquiryText || customerInquiry).trim();
    if (!q) return;

    setIsLoading(true);
    try {
      const customKey = storageService.getCustomApiKey();
      let data: any = null;

      try {
        const res = await fetch('/api/gemini/business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({
            businessName: profile.businessName,
            businessType: profile.businessType,
            whatsappNumber: profile.whatsappNumber,
            mode: 'customer_reply',
            customerMessage: q,
          }),
        });
        if (res.ok) data = await res.json();
      } catch (e) {
        console.warn('Backend customer reply failed:', e);
      }

      if (!data && customKey) {
        data = await generateBusinessDirect(customKey, {
          businessName: profile.businessName,
          businessType: profile.businessType,
          description: profile.description,
          whatsappNumber: profile.whatsappNumber,
          mode: 'customer_reply',
          customerMessage: q,
        });
      }

      if (data && data.replies) {
        setCustomerReplies(data.replies);
        onShowToast(isAr ? 'تم تجهيز الردود الذكية للزبون!' : 'Customer replies generated!', 'success');
      }
    } catch (err) {
      onShowToast(isAr ? 'حدث خطأ أثناء إنشاء الرد' : 'Reply generation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean WhatsApp Number for wa.me link
  const cleanPhone = (phone: string) => phone.replace(/[^\d]/g, '');

  const openWhatsAppWithText = (text: string) => {
    const num = cleanPhone(profile.whatsappNumber);
    const url = num
      ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const openTelegramWithText = (text: string) => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="business-tab-root" className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">
              {isAr ? 'مركز الأعمال والتجارة الذكي' : 'Smart Business Hub'}
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'تحليل الأنشطة، عروض ترويجية، وربط واتساب وتليجرام' : 'Business analysis, promotions & WhatsApp CRM'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditingProfile(!isEditingProfile)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
        >
          <span>{isEditingProfile ? (isAr ? 'إخفاء الإعدادات' : 'Hide Setup') : (isAr ? 'بيانات نشاطي' : 'My Business')}</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center justify-around text-xs shrink-0 select-none">
        <button
          onClick={() => setActiveSubTab('analysis')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all cursor-pointer font-medium ${
            activeSubTab === 'analysis'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{isAr ? 'التحليل والاستشارات' : 'Analysis'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('campaigns')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all cursor-pointer font-medium ${
            activeSubTab === 'campaigns'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>{isAr ? 'العروض الترويجية' : 'Promotions'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all cursor-pointer font-medium ${
            activeSubTab === 'customers'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{isAr ? 'خدمة العملاء' : 'CRM & Replies'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('commerce')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all cursor-pointer font-medium ${
            activeSubTab === 'commerce'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isAr ? 'متجر واتساب' : 'Commerce'}</span>
        </button>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Business Profile Drawer / Card */}
        {isEditingProfile && (
          <div className="bg-slate-800/90 border border-emerald-500/30 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                {isAr ? 'إعدادات نشاطك التجاري وقنوات التواصل' : 'Business & Social Setup'}
              </span>
              <button
                onClick={handleSaveProfile}
                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ' : 'Save'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'اسم النشاط / المتجر' : 'Business Name'}</label>
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder={isAr ? 'مثلاً: متجر النخبة، مطعم السعادة...' : 'e.g. Apex Store'}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'نوع المجال أو النشاط' : 'Field / Category'}</label>
                <input
                  type="text"
                  value={profile.businessType}
                  onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                  placeholder={isAr ? 'مثلاً: ملابس، عطور، خدمات تقنية، مطعم...' : 'e.g. E-Commerce, Apparel'}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {isAr ? 'رقم الواتساب مع كود الدولة' : 'WhatsApp Number with Country Code'}
                </label>
                <input
                  type="text"
                  value={profile.whatsappNumber}
                  onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                  placeholder="+966501234567 أو 212612345678"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 dir-ltr text-left"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'معرف أو قناة التيلجرام' : 'Telegram Handle'}</label>
                <input
                  type="text"
                  value={profile.telegramUsername}
                  onChange={(e) => setProfile({ ...profile, telegramUsername: e.target.value })}
                  placeholder="@my_channel_or_bot"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 dir-ltr text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? 'وصف المنتجات أو الخدمات' : 'Description'}</label>
              <textarea
                rows={2}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder={isAr ? 'أهم ما يميز منتجاتك والجمهور المستهدف...' : 'Main products and value proposition...'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
        )}

        {/* 1. SUB-TAB: ANALYSIS */}
        {activeSubTab === 'analysis' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {isAr ? 'التحليل الاستراتيجي وخطة مضاعفة المبيعات' : 'Strategic Business Analysis & Growth'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {profile.businessName
                      ? `${isAr ? 'النشاط الحالي:' : 'Current Business:'} ${profile.businessName} (${profile.businessType || 'عام'})`
                      : (isAr ? 'قم بإدخال بيانات نشاطك للبدء' : 'Setup business details to start')}
                  </p>
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'تحليل النشاط الآن' : 'Analyze Now'}</span>
                </button>
              </div>
            </div>

            {analysisResult && (
              <div className="space-y-3 animate-in fade-in">
                {/* Growth Tips */}
                {analysisResult.growthTips && (
                  <div className="p-4 rounded-3xl bg-slate-800/90 border border-emerald-500/20 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>{isAr ? 'أهم 4 خطوات عملية لزيادة المبيعات والأرباح:' : 'Key Growth Action Items:'}</span>
                    </h4>
                    <div className="space-y-1.5">
                      {analysisResult.growthTips.map((tip: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SWOT Matrix */}
                {analysisResult.swot && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Strengths */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-1.5">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isAr ? 'نقاط القوة (Strengths)' : 'Strengths'}
                      </span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {analysisResult.swot.strengths?.map((s: string, i: number) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-sky-500/30 space-y-1.5">
                      <span className="font-bold text-sky-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isAr ? 'الفرص الواعدة (Opportunities)' : 'Opportunities'}
                      </span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {analysisResult.swot.opportunities?.map((s: string, i: number) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. SUB-TAB: CAMPAIGNS */}
        {activeSubTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {isAr ? 'صانع العروض الترويجية والإعلانات الفيروسية' : 'Promotional Campaigns & Viral Copy'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'توليد عروض جذابة، نصوص إعلانية، ورسائل برودكاست للواتساب' : 'Generate irresistible offers & broadcast copy'}
                  </p>
                </div>
                <button
                  onClick={handleGenerateCampaigns}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'ابتكار عروض جديدة' : 'Generate Offers'}</span>
                </button>
              </div>
            </div>

            {campaignsResult?.campaigns && (
              <div className="space-y-3 animate-in fade-in">
                {campaignsResult.campaigns.map((camp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-3xl bg-slate-800/90 border border-amber-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                        {camp.title}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">{camp.discountOffer}</span>
                    </div>

                    {/* Social Media Ad Copy */}
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>{isAr ? 'نص إعلان السوشيال ميديا (Instagram / Facebook / X):' : 'Social Media Ad Copy:'}</span>
                        <button
                          onClick={() => copyToClipboard(camp.adCopy, `camp_copy_${idx}`)}
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          {copiedIndex === `camp_copy_${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isAr ? 'نسخ' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{camp.adCopy}</p>
                    </div>

                    {/* WhatsApp & Telegram Quick Dispatch */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => openWhatsAppWithText(camp.whatsappBroadcast || camp.adCopy)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-sm shadow-emerald-600/20"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isAr ? 'إرسال برودكاست واتساب' : 'Broadcast to WhatsApp'}</span>
                      </button>

                      <button
                        onClick={() => openTelegramWithText(camp.adCopy)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-sm shadow-sky-600/20"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>{isAr ? 'تيلجرام' : 'Telegram'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SUB-TAB: CUSTOMERS & OBJECTION REPLIES */}
        {activeSubTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-100">
                {isAr ? 'ما رسالة أو سؤال الزبون الذي تريد الرد عليه بذكاء؟' : 'Customer inquiry or objection to answer:'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerInquiry}
                  onChange={(e) => setCustomerInquiry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomerReply()}
                  placeholder={
                    isAr
                      ? 'مثلاً: السعر غالي مقارنة بالمنافسين، هل التوصيل مضمون، هل يوجد إرجاع؟'
                      : 'e.g. Price is too high, is shipping guaranteed?...'
                  }
                  className="w-full pl-24 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => handleGenerateCustomerReply()}
                  disabled={isLoading || !customerInquiry.trim()}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'تجهيز الرد' : 'Generate'}</span>
                </button>
              </div>

              {/* Sample Quick Questions */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                <span className="text-slate-500 shrink-0">{isAr ? 'أسئلة شائعة:' : 'Common:'}</span>
                {[
                  isAr ? 'السعر غالي هل يوجد تخفيض؟' : 'Price is high, any discount?',
                  isAr ? 'هل التوصيل سريع ومضمون؟' : 'Is delivery fast & guaranteed?',
                  isAr ? 'كيف أطلب وما هي طرق الدفع؟' : 'How to order and payment options?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCustomerInquiry(q);
                      handleGenerateCustomerReply(q);
                    }}
                    className="shrink-0 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-sky-300 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {customerReplies.length > 0 && (
              <div className="space-y-3 animate-in fade-in">
                {customerReplies.map((rep, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-3xl bg-slate-800/90 border border-sky-500/20 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[10px]">
                        {rep.tone || (isAr ? 'أسلوب مقنع' : 'Persuasive')}
                      </span>
                      <button
                        onClick={() => copyToClipboard(rep.text, `rep_${idx}`)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer"
                      >
                        {copiedIndex === `rep_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isAr ? 'نسخ الرد' : 'Copy'}</span>
                      </button>
                    </div>

                    <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{rep.text}</p>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => openWhatsAppWithText(rep.text)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isAr ? 'إرسال للزبون على واتساب' : 'Send via WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SUB-TAB: WHATSAPP COMMERCE & PRODUCT CARDS */}
        {activeSubTab === 'commerce' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-purple-500/30 rounded-3xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {isAr ? 'منشئ بطاقة طلب المنتج عبر واتساب (WhatsApp Commerce)' : 'WhatsApp Commerce Card Creator'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'أنشئ بطاقة منتج تفاعلية تتيح لعملائك الطلب المباشر عبر واتساب بنقرة واحدة!' : 'Create instant product cards with 1-click WhatsApp order!'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'اسم المنتج أو الخدمة' : 'Product Name'}</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder={isAr ? 'مثلاً: عطر اللافندر الملكي' : 'e.g. Royal Perfume'}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? 'السعر (مع العملة)' : 'Price'}</label>
                  <input
                    type="text"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder={isAr ? 'مثلاً: 190 ريال / 25$' : 'e.g. $49'}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isAr ? 'مميزات المنتج أو العرض' : 'Features / Offer'}</label>
                <input
                  type="text"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder={isAr ? 'توصيل مجاني + ضمان استبدال 14 يوم' : 'Free shipping + 14-day return'}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 text-xs"
                />
              </div>
            </div>

            {/* Interactive Preview Card */}
            {productName && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/40 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    {profile.businessName || (isAr ? 'متجر إلكتروني' : 'Online Store')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                    {productPrice || (isAr ? 'سعر خاص' : 'Special Price')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{productName}</h3>
                  {productDesc && <p className="text-xs text-slate-300 mt-1">{productDesc}</p>}
                </div>

                {/* 1-Click WhatsApp Order Button */}
                <button
                  onClick={() => {
                    const orderText =
                      `مرحباً ${profile.businessName || ''}! 🛍️\n` +
                      `أود طلب المنتج التالي:\n` +
                      `📦 *المنتج:* ${productName}\n` +
                      (productPrice ? `💰 *السعر:* ${productPrice}\n` : '') +
                      `📍 برجاء تأكيد توفر المنتج وتفاصيل التوصيل. شكراً لك!`;
                    openWhatsAppWithText(orderText);
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{isAr ? 'اطلب الآن مباشرة عبر واتساب' : 'Order Now via WhatsApp'}</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{isAr ? 'رقم الواتساب المرتبط:' : 'WhatsApp:'} {profile.whatsappNumber || (isAr ? 'غير محدد بعد' : 'Not set')}</span>
                  <button
                    onClick={() => {
                      const shareText = `🔥 عرض خاص من ${profile.businessName || 'متجرنا'}:\n📦 ${productName}\n💰 السعر: ${productPrice}\n✨ ${productDesc}\nللطلب عبر واتساب: wa.me/${cleanPhone(profile.whatsappNumber)}`;
                      copyToClipboard(shareText, 'share_prod');
                    }}
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مشاركة العرض' : 'Share'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
