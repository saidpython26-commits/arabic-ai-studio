import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  BookOpen,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Play,
  HelpCircle,
  Lightbulb,
  Wifi,
  WifiOff,
  History,
  Trash2,
  ChevronRight,
  BrainCircuit,
  Zap,
} from 'lucide-react';
import { UserProfile, Language, ExamRecord, StudyLesson, QuizQuestion, TutorVoiceMessage } from '../types';
import { storageService } from '../services/storage';
import { OfflineTutorEngine } from '../services/offlineTutorKnowledge';

interface TutorTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'voice' | 'lesson' | 'exam' | 'history';

const POPULAR_SUBJECTS = [
  { id: 'math', labelAr: 'الرياضيات', labelEn: 'Mathematics', defaultTopic: 'نظرية فيثاغورس' },
  { id: 'arabic', labelAr: 'اللغة العربية', labelEn: 'Arabic Grammar', defaultTopic: 'كان وأخواتها' },
  { id: 'physics', labelAr: 'الفيزياء', labelEn: 'Physics', defaultTopic: 'قوانين نيوتن للحركة' },
  { id: 'python', labelAr: 'البرمجة', labelEn: 'Programming', defaultTopic: 'حلقات التكرار في بايثون' },
  { id: 'english', labelAr: 'الإنجليزية', labelEn: 'English', defaultTopic: 'Past Simple vs Present Perfect' },
  { id: 'science', labelAr: 'العلوم والأحياء', labelEn: 'Biology', defaultTopic: 'الخلية الحية وعملية البناء الضوئي' },
  { id: 'business', labelAr: 'إدارة الأعمال', labelEn: 'Business', defaultTopic: 'استراتيجيات التسويق الرقمي' },
];

export const TutorTab: React.FC<TutorTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';
  const [subTab, setSubTab] = useState<SubTab>('voice');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Subject and Topic configuration
  const [selectedSubject, setSelectedSubject] = useState(POPULAR_SUBJECTS[0].labelAr);
  const [topicInput, setTopicInput] = useState(POPULAR_SUBJECTS[0].defaultTopic);
  const [difficulty, setDifficulty] = useState<'مبتدئ' | 'متوسط' | 'متقدم'>('متوسط');

  // --- Voice Tutor State ---
  const [voiceMessages, setVoiceMessages] = useState<TutorVoiceMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'tutor',
      text: isAr
        ? 'مرحباً بك يا بطل! أنا معلمك وممتحنك الذكي فائق السرعة. يمكنك التحدث معي شفهياً بالكلام، وسأرد عليك بصوتي فوراً وأمتحنك في أي درس!'
        : 'Welcome! I am your ultrafast AI Tutor. You can talk to me directly with your voice, and I will reply with voice immediately!',
      timestamp: Date.now(),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<1.0 | 1.15 | 1.3>(1.15);
  const [continuousVoiceMode, setContinuousVoiceMode] = useState<boolean>(true);
  const [textInput, setTextInput] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Speech Recognition & Synthesis references
  const recognitionRef = useRef<any>(null);
  const continuousModeRef = useRef<boolean>(true);
  const isSpeakingRef = useRef<boolean>(false);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const voiceChatScrollRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync
  useEffect(() => {
    continuousModeRef.current = continuousVoiceMode;
  }, [continuousVoiceMode]);

  // --- Study Lesson State ---
  const [currentLesson, setCurrentLesson] = useState<StudyLesson | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);

  // --- Real Exam State ---
  const [currentExamQuestions, setCurrentExamQuestions] = useState<QuizQuestion[]>([]);
  const [currentExamTitle, setCurrentExamTitle] = useState('');
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);
  const [examGrade, setExamGrade] = useState('');
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [examTimer, setExamTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // --- Exam History Database ---
  const [examHistory, setExamHistory] = useState<ExamRecord[]>(() => storageService.getExams(user.uid));

  // Network listener & background silent sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Silently sync offline saved exams
      storageService.syncPendingOfflineExams(user.uid).then(() => {
        setExamHistory(storageService.getExams(user.uid));
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user.uid]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = isAr ? 'ar-SA' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleSendVoiceMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isAr]);

  // Exam timer ticker
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setExamTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // Auto-scroll voice chat
  useEffect(() => {
    if (voiceChatScrollRef.current) {
      voiceChatScrollRef.current.scrollTop = voiceChatScrollRef.current.scrollHeight;
    }
  }, [voiceMessages]);

  // Ultra-fast speech synthesis executor with natural Arabic voice preference
  const speakFast = (text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel(); // Stop any pending speech immediately

      // Remove code brackets or markdown symbols for clean rapid reading
      const cleanText = text
        .replace(/[*#`_~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = voiceSpeed; // 1.15x for ultrafast crisp cadence
      utterance.pitch = 1.0;
      utterance.lang = isAr ? 'ar-SA' : 'en-US';

      // Pick natural Arabic or system voice if available
      const voices = synthRef.current.getVoices();
      const bestVoice = voices.find(
        (v) => (isAr ? v.lang.startsWith('ar') : v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Maged') || v.name.includes('Tarik') || v.name.includes('Laila'))
      ) || voices.find((v) => (isAr ? v.lang.startsWith('ar') : v.lang.startsWith('en')));

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause recognition while tutor is talking to prevent feedback loop
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onEnd) onEnd();

        // If continuous voice dialogue mode is on, automatically re-listen for user's verbal reply
        if (continuousModeRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 350);
        }
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      onShowToast(
        isAr ? 'التعرف الصوتي غير مدعوم في هذا المتصفح، يرجى كتابة السؤال' : 'Speech recognition not supported in browser, please type',
        'info'
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.abort();
          recognitionRef.current.start();
        } catch {}
      }
    }
  };

  // Ultra-fast voice dialogue handler (resilient to offline drops)
  const handleSendVoiceMessage = async (inputMsg: string) => {
    const text = inputMsg.trim();
    if (!text || isProcessingVoice) return;

    setTextInput('');
    const userMsg: TutorVoiceMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setVoiceMessages((prev) => [...prev, userMsg]);
    setIsProcessingVoice(true);

    const customKey = storageService.getCustomApiKey();

    // Check if offline: respond immediately via OfflineTutorEngine without any network failure
    if (!navigator.onLine) {
      const offlineRes = OfflineTutorEngine.getVoiceResponse(text, selectedSubject, topicInput);
      const tutorMsg: TutorVoiceMessage = {
        id: `tutor-${Date.now()}`,
        role: 'tutor',
        text: offlineRes.replyText,
        timestamp: Date.now(),
        isOffline: true,
      };
      setVoiceMessages((prev) => [...prev, tutorMsg]);
      setIsProcessingVoice(false);
      speakFast(offlineRes.speechText);
      return;
    }

    // Online: Call Gemini Tutor Endpoint
    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          mode: 'voice_dialogue',
          subject: selectedSubject,
          topic: topicInput,
          userMessage: text,
          conversationHistory: voiceMessages.slice(-4),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const tutorMsg: TutorVoiceMessage = {
          id: `tutor-${Date.now()}`,
          role: 'tutor',
          text: data.replyText,
          timestamp: Date.now(),
        };
        setVoiceMessages((prev) => [...prev, tutorMsg]);
        speakFast(data.speechText || data.replyText);
      } else {
        throw new Error('Fallback to local tutor');
      }
    } catch (_err) {
      // Seamless fallback to offline heuristics without interrupting user
      const offlineRes = OfflineTutorEngine.getVoiceResponse(text, selectedSubject, topicInput);
      const tutorMsg: TutorVoiceMessage = {
        id: `tutor-${Date.now()}`,
        role: 'tutor',
        text: offlineRes.replyText,
        timestamp: Date.now(),
        isOffline: true,
      };
      setVoiceMessages((prev) => [...prev, tutorMsg]);
      speakFast(offlineRes.speechText);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Generate or Load Pedagogical Lesson
  const handleGenerateLesson = async (overrideTopic?: string) => {
    const activeTopic = overrideTopic || topicInput;
    if (!activeTopic.trim()) return;

    setIsLoadingLesson(true);
    const customKey = storageService.getCustomApiKey();

    if (!navigator.onLine) {
      const offlineLesson = OfflineTutorEngine.getLesson(selectedSubject, activeTopic);
      setCurrentLesson(offlineLesson);
      setIsLoadingLesson(false);
      await storageService.saveStudyLesson(user.uid, offlineLesson);
      return;
    }

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          mode: 'lesson',
          subject: selectedSubject,
          topic: activeTopic,
          difficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const lesson: StudyLesson = {
          id: `lesson-${Date.now()}`,
          title: data.title || `درس: ${activeTopic}`,
          subject: selectedSubject,
          summary: data.summary,
          coreConcepts: data.coreConcepts || [],
          realWorldAnalogy: data.realWorldAnalogy || '',
          stepByStepGuide: data.stepByStepGuide || [],
          keyTakeaways: data.keyTakeaways || [],
          speechVocalizedSummary: data.speechVocalizedSummary,
          createdAt: Date.now(),
        };
        setCurrentLesson(lesson);
        await storageService.saveStudyLesson(user.uid, lesson);
      } else {
        throw new Error('Lesson fallback');
      }
    } catch {
      const offlineLesson = OfflineTutorEngine.getLesson(selectedSubject, activeTopic);
      setCurrentLesson(offlineLesson);
      await storageService.saveStudyLesson(user.uid, offlineLesson);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Generate & Start Real Exam
  const handleStartExam = async (overrideTopic?: string) => {
    const activeTopic = overrideTopic || topicInput;
    setIsLoadingExam(true);
    setExamSubmitted(false);
    setUserAnswers({});
    setExamScore(null);
    setExamGrade('');
    setExamTimer(0);
    setIsTimerRunning(false);

    const customKey = storageService.getCustomApiKey();

    if (!navigator.onLine) {
      const offlineQuestions = OfflineTutorEngine.getExam(selectedSubject, activeTopic, 5);
      setCurrentExamQuestions(offlineQuestions);
      setCurrentExamTitle(`امتحان التميز: ${activeTopic}`);
      setIsLoadingExam(false);
      setSubTab('exam');
      setIsTimerRunning(true);
      return;
    }

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          mode: 'exam',
          subject: selectedSubject,
          topic: activeTopic,
          difficulty,
          questionCount: 5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentExamQuestions(data.questions || []);
        setCurrentExamTitle(data.examTitle || `امتحان في: ${activeTopic}`);
        setSubTab('exam');
        setIsTimerRunning(true);
      } else {
        throw new Error('Exam fallback');
      }
    } catch {
      const offlineQuestions = OfflineTutorEngine.getExam(selectedSubject, activeTopic, 5);
      setCurrentExamQuestions(offlineQuestions);
      setCurrentExamTitle(`امتحان التميز: ${activeTopic}`);
      setSubTab('exam');
      setIsTimerRunning(true);
    } finally {
      setIsLoadingExam(false);
    }
  };

  // Submit and Grade Real Exam
  const handleSubmitExam = async () => {
    if (currentExamQuestions.length === 0) return;

    setIsTimerRunning(false);
    let correctCount = 0;
    const weaknesses: string[] = [];
    const strengths: string[] = [];

    currentExamQuestions.forEach((q, idx) => {
      const selected = userAnswers[q.id];
      if (selected === q.correctAnswerIndex) {
        correctCount += 1;
        strengths.push(`السؤال ${idx + 1}: إتقان واضح للقاعدة`);
      } else {
        weaknesses.push(`السؤال ${idx + 1}: مراجعة مفهوم (${q.question.slice(0, 40)}...)`);
      }
    });

    const percentage = Math.round((correctCount / currentExamQuestions.length) * 100);
    setExamScore(percentage);

    let gradeText = '';
    if (percentage >= 90) gradeText = isAr ? 'ممتاز مع مرتبة الشرف 🏆' : 'Excellent with Honors 🏆';
    else if (percentage >= 75) gradeText = isAr ? 'جيد جداً ومتمكن 🌟' : 'Very Good 🌟';
    else if (percentage >= 50) gradeText = isAr ? 'ناجح وبحاجة لتثبيت المعلومات 📚' : 'Passed - Needs Review 📚';
    else gradeText = isAr ? 'فرصة ممتازة لإعادة المذاكرة والتفوق 💪' : 'Good attempt - review and re-test 💪';

    setExamGrade(gradeText);
    setExamSubmitted(true);

    const record: ExamRecord = {
      id: `exam-${Date.now()}`,
      title: currentExamTitle,
      subject: selectedSubject,
      topic: topicInput,
      totalQuestions: currentExamQuestions.length,
      correctAnswersCount: correctCount,
      scorePercentage: percentage,
      grade: gradeText,
      timeSpentSeconds: examTimer,
      userAnswers,
      questions: currentExamQuestions,
      strengths,
      weaknesses,
      createdAt: Date.now(),
      syncedToCloud: navigator.onLine,
    };

    await storageService.saveExam(user.uid, record);
    setExamHistory(storageService.getExams(user.uid));

    // Announce grade fast with voice
    speakFast(
      isAr
        ? `أحسنت يا بطل! نتيجتك في الامتحان هي ${percentage} بالمائة. ${gradeText}`
        : `Well done! Your exam score is ${percentage} percent. ${gradeText}`
    );

    onShowToast(
      isAr ? `تم حفظ نتيجة الامتحان في قاعدة البيانات (${percentage}%)` : `Exam saved to database (${percentage}%)`,
      'success'
    );
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="shrink-0 px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
              {isAr ? 'الأستاذ والممتحن الذكي' : 'Smart AI Tutor & Exams'}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-normal">
                {isAr ? 'فائق السرعة' : 'Ultra-Fast'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>{isAr ? 'سحابي متصل' : 'Cloud Connected'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>{isAr ? 'يعمل بدون إنترنت ومزامنة تلقائية' : 'Offline Continuity Ready'}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Right Actions: Hands-Free Voice Mode & Speed */}
        <div className="flex items-center gap-2">
          {/* Hands-free Conversational Dialogue Mode */}
          <button
            type="button"
            onClick={() => {
              const next = !continuousVoiceMode;
              setContinuousVoiceMode(next);
              if (next && !isListening && !isSpeaking) {
                toggleListen();
              }
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
              continuousVoiceMode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={
              isAr
                ? 'وضع الحوار المستمر بالكلام (يتحدث معك وتجيبه دون ضغط أزرار)'
                : 'Continuous conversational mode (talk back and forth hands-free)'
            }
          >
            <Mic className={`w-3.5 h-3.5 ${continuousVoiceMode ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span className="hidden sm:inline">
              {isAr ? (continuousVoiceMode ? 'حوار مستمر' : 'حوار يدوي') : continuousVoiceMode ? 'Hands-Free' : 'Manual'}
            </span>
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setVoiceSpeed(1.0)}
              className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                voiceSpeed === 1.0 ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isAr ? 'سرعة عادية' : 'Normal'}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setVoiceSpeed(1.15)}
              className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                voiceSpeed === 1.15 ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isAr ? 'سرعة فائقة مريحة' : 'Fast'}
            >
              1.15x
            </button>
            <button
              type="button"
              onClick={() => setVoiceSpeed(1.3)}
              className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                voiceSpeed === 1.3 ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isAr ? 'أقصى سرعة' : 'Turbo'}
            >
              1.3x
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="shrink-0 px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSubTab('voice')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            subTab === 'voice'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{isAr ? 'الحوار الصوتي الفوري' : 'Voice Dialogue'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('lesson');
            if (!currentLesson) handleGenerateLesson();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            subTab === 'lesson'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isAr ? 'الشرح والدروس' : 'Lessons'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('exam');
            if (currentExamQuestions.length === 0) handleStartExam();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            subTab === 'exam'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{isAr ? 'الامتحان الحقيقي' : 'Real Exam'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            subTab === 'history'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{isAr ? 'سجل الامتحانات' : 'Records'}</span>
          {examHistory.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300">
              {examHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area based on subTab */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col">
        {/* ================= 1. FAST VOICE TUTOR TAB ================= */}
        {subTab === 'voice' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Visualizer & Animated Speaking Hub */}
            <div className="shrink-0 p-4 rounded-2xl bg-gradient-to-b from-slate-800/70 to-slate-900/90 border border-slate-800 text-center mb-3 relative overflow-hidden">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-2">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSpeaking
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/20 scale-105 animate-pulse'
                        : isListening
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 ring-4 ring-amber-500/20 scale-105 animate-ping'
                        : 'bg-slate-800 text-emerald-400 border border-slate-700'
                    }`}
                  >
                    <BrainCircuit className="w-8 h-8" />
                  </div>
                  {isSpeaking && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">
                      {isAr ? 'يتحدث' : 'Speaking'}
                    </span>
                  )}
                  {isListening && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
                      {isAr ? 'يستمع' : 'Listening'}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-200">
                  {isSpeaking
                    ? isAr ? 'الأستاذ يشرح لك بصوته فائق السرعة...' : 'Tutor is speaking rapidly...'
                    : isListening
                    ? isAr ? '🎙️ الأستاذ يستمع لكلامك الآن... تحدث وسيرد عليك فوراً' : '🎙️ Listening to you speak... speak now'
                    : continuousVoiceMode
                    ? isAr ? 'وضع الحوار بالكلام مفعل: اضغط الميكروفون للبدء وسيتحدث معك بدون توقف' : 'Voice dialogue active: Tap mic to speak back and forth'
                    : isAr ? 'اضغط الميكروفون للتحدث صوتياً أو اكتب سؤالك' : 'Tap microphone or type to speak'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {continuousVoiceMode
                    ? isAr
                      ? '🗣️ حوار شفهي متواصل: يتحدث الأستاذ ثم يستمع لإجابتك وسؤالك تلقائياً دون لمس الشاشة'
                      : '🗣️ Hands-free dialogue: Tutor speaks then automatically listens to your response'
                    : isAr
                    ? 'يعمل بكفاءة كاملة حتى عند انقطاع الإنترنت دون توقف!'
                    : 'Works seamlessly offline with instantaneous voice!'}
                </p>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="mt-2.5 px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/30 transition-all cursor-pointer"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إيقاف الصوت فوراً' : 'Interrupt Voice'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Topic Prompts */}
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {isAr ? 'مقترحات سريعة:' : 'Quick:'}
              </span>
              {[
                isAr ? 'اشرح لي درس كان وأخواتها' : 'Explain Python loops',
                isAr ? 'امتحني في نظرية فيثاغورس' : 'Quiz me in Math',
                isAr ? 'ما هي قوانين نيوتن للحركة؟' : 'Explain Newton laws',
                isAr ? 'اختبرني في قواعد اللغة الإنجليزية' : 'Test my English grammar',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendVoiceMessage(suggestion)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 shrink-0 transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Voice Messages Transcript Scroll */}
            <div
              ref={voiceChatScrollRef}
              className="flex-1 min-h-[160px] overflow-y-auto space-y-2.5 pr-1"
            >
              {voiceMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/70 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 opacity-80 text-[10px]">
                      <span className="font-semibold">
                        {msg.role === 'user'
                          ? isAr ? 'أنت' : 'You'
                          : isAr ? 'الأستاذ الذكي' : 'AI Tutor'}
                      </span>
                      {msg.role === 'tutor' && (
                        <button
                          type="button"
                          onClick={() => speakFast(msg.text)}
                          className="hover:text-emerald-300 text-slate-400 p-0.5"
                          title={isAr ? 'إعادة القراءة الصوتية' : 'Replay voice'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.isOffline && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {isAr ? 'استجابة سريعة أوفلاين' : 'Offline Engine'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {isProcessingVoice && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 p-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isAr ? 'الأستاذ يجهز الإجابة فورياً...' : 'Tutor preparing response...'}</span>
                </div>
              )}
            </div>

            {/* Voice Input & Controls */}
            <div className="shrink-0 pt-2 border-t border-slate-800/80 mt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendVoiceMessage(textInput);
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                    isListening
                      ? 'bg-amber-500 text-white shadow-amber-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                  title={isListening ? (isAr ? 'إيقاف الاستماع' : 'Stop') : (isAr ? 'تحدث صوتياً' : 'Speak')}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    isAr ? 'اكتب للأستاذ أي سؤال أو درس...' : 'Ask the tutor anything...'
                  }
                  className="flex-1 bg-slate-800 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim() || isProcessingVoice}
                  className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= 2. STUDY LESSONS TAB ================= */}
        {subTab === 'lesson' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Subject Selector & Topic Config */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {isAr ? 'المادة الدراسية:' : 'Subject:'}
                </span>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    const matched = POPULAR_SUBJECTS.find((s) => s.labelAr === e.target.value);
                    if (matched) setTopicInput(matched.defaultTopic);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {POPULAR_SUBJECTS.map((s) => (
                    <option key={s.id} value={isAr ? s.labelAr : s.labelEn}>
                      {isAr ? s.labelAr : s.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم الدرس أو القاعدة...' : 'Enter lesson or concept name...'}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateLesson()}
                  disabled={isLoadingLesson}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoadingLesson ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isAr ? 'اشرح الدرس' : 'Teach Me'}</span>
                </button>
              </div>
            </div>

            {/* Lesson Display Card */}
            {currentLesson ? (
              <div className="flex-1 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-4 space-y-3.5 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      {currentLesson.subject}
                    </span>
                    <h2 className="text-base font-bold text-slate-100 mt-1">
                      {currentLesson.title}
                    </h2>
                  </div>

                  {currentLesson.speechVocalizedSummary && (
                    <button
                      type="button"
                      onClick={() => speakFast(currentLesson.speechVocalizedSummary!)}
                      className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title={isAr ? 'استمع لملخص الدرس بصوت الأستاذ' : 'Listen to voice summary'}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{isAr ? 'صوت الأستاذ' : 'Listen'}</span>
                    </button>
                  )}
                </div>

                {/* Summary */}
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-700/40">
                  <p>{currentLesson.summary}</p>
                </div>

                {/* Real World Analogy */}
                {currentLesson.realWorldAnalogy && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                      <Lightbulb className="w-4 h-4" />
                      <span>{isAr ? 'تشبيه من واقع الحياة لترسيخ الفهم:' : 'Real-World Analogy:'}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{currentLesson.realWorldAnalogy}</p>
                  </div>
                )}

                {/* Core Concepts */}
                {currentLesson.coreConcepts?.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'المفاهيم التأسيسية للدرس:' : 'Core Concepts:'}</span>
                    </h3>
                    <ul className="space-y-1 text-xs text-slate-300 pr-2">
                      {currentLesson.coreConcepts.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step-by-Step Guide */}
                {currentLesson.stepByStepGuide?.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isAr ? 'خطوات الحل والتطبيق المنهجي:' : 'Step-by-Step Guide:'}</span>
                    </h3>
                    <div className="space-y-1 text-xs">
                      {currentLesson.stepByStepGuide.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded-lg">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-slate-200">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Takeaways */}
                {currentLesson.keyTakeaways?.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
                    <h4 className="font-bold text-emerald-300 mb-1">
                      {isAr ? 'الخلاصة الذهبية للامتحان:' : 'Exam Key Takeaways:'}
                    </h4>
                    <ul className="space-y-1 text-slate-300">
                      {currentLesson.keyTakeaways.map((t, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Jump to Real Exam Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleStartExam(currentLesson.title)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    <Award className="w-4 h-4" />
                    <span>{isAr ? 'ابدأ امتحاناً حقيقياً على هذا الدرس الآن' : 'Start Real Exam on this Lesson'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-800/40 rounded-2xl border border-slate-800">
                <BookOpen className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'اختر مادة أو اكتب موضوعاً واضغط "اشرح الدرس" لتوليد دليل دراسي متكامل'
                    : 'Select a subject and tap Teach Me to generate a complete study guide'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= 3. REAL EXAM TAB ================= */}
        {subTab === 'exam' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Exam Header Bar */}
            <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>{currentExamTitle || (isAr ? 'امتحان التميز' : 'Real Mock Exam')}</span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  {selectedSubject} • {difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Timer Badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(examTimer)}</span>
                </div>

                {/* Retake / Regenerate */}
                <button
                  type="button"
                  onClick={() => handleStartExam()}
                  disabled={isLoadingExam}
                  className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors cursor-pointer"
                  title={isAr ? 'توليد امتحان جديد' : 'New Exam'}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Exam Submitted Result Summary Card */}
            {examSubmitted && examScore !== null && (
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-850 border border-emerald-500/40 text-center space-y-2 shadow-xl">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-emerald-500/20 text-emerald-400 text-lg font-bold border border-emerald-500/30">
                  {examScore}%
                </div>
                <h3 className="text-base font-bold text-slate-100">{examGrade}</h3>
                <p className="text-xs text-slate-300">
                  {isAr
                    ? `استغرقت في الامتحان ${formatTime(examTimer)}. تم حفظ النتيجة والتقييم في قاعدة بياناتك.`
                    : `Completed in ${formatTime(examTimer)}. Results saved to your database.`}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setExamSubmitted(false);
                      setUserAnswers({});
                      setExamTimer(0);
                      setIsTimerRunning(true);
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    {isAr ? 'إعادة المحاولة' : 'Retake Exam'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartExam()}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    {isAr ? 'امتحان جديد' : 'Next Exam'}
                  </button>
                </div>
              </div>
            )}

            {/* Questions List */}
            {isLoadingExam ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-slate-300">
                  {isAr ? 'جاري إعداد أسئلة الامتحان الحقيقي...' : 'Preparing exam questions...'}
                </p>
              </div>
            ) : currentExamQuestions.length > 0 ? (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {currentExamQuestions.map((q, qIndex) => {
                  const selectedIdx = userAnswers[q.id];
                  const isAnswered = selectedIdx !== undefined;

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        examSubmitted
                          ? selectedIdx === q.correctAnswerIndex
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-800/70 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400">
                          {isAr ? `السؤال ${qIndex + 1} من ${currentExamQuestions.length}` : `Question ${qIndex + 1}`}
                        </span>
                        {q.hint && !examSubmitted && (
                          <span
                            className="text-[10px] text-amber-400/90 flex items-center gap-1 cursor-help"
                            title={q.hint}
                          >
                            <HelpCircle className="w-3 h-3" />
                            {isAr ? 'تلميح' : 'Hint'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 mb-3 leading-relaxed">
                        {q.question}
                      </h4>

                      {/* Options */}
                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedIdx === optIdx;
                          const isCorrect = q.correctAnswerIndex === optIdx;

                          let btnStyle = 'bg-slate-900/60 border-slate-700/80 text-slate-200 hover:bg-slate-800';
                          if (examSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-rose-600/30 border-rose-500 text-rose-200';
                            } else {
                              btnStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={examSubmitted}
                              onClick={() => {
                                setUserAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                              }}
                              className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm text-right flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {examSubmitted ? (
                                isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : isSelected ? (
                                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                ) : null
                              ) : (
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                                      : 'border-slate-600'
                                  }`}
                                >
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation if submitted */}
                      {examSubmitted && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs">
                          <span className="font-bold text-emerald-400 block mb-0.5">
                            {isAr ? 'الشرح النموذجي والتصحيح:' : 'Explanation:'}
                          </span>
                          <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Submit Exam Button */}
                {!examSubmitted && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isAr
                        ? `تصحيح الامتحان واعتماد النتيجة (${Object.keys(userAnswers).length}/${currentExamQuestions.length})`
                        : `Submit and Grade Exam (${Object.keys(userAnswers).length}/${currentExamQuestions.length})`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-800/40 rounded-2xl border border-slate-800">
                <Award className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 mb-3">
                  {isAr
                    ? 'اضغط زر البدء لتوليد امتحان حقيقي مع مؤقت زمني وتصحيح تفصيلي'
                    : 'Tap Start to generate a real mock exam with timer and detailed grading'}
                </p>
                <button
                  type="button"
                  onClick={() => handleStartExam()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isAr ? 'بدء امتحان الآن' : 'Start Exam Now'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= 4. EXAM HISTORY DATABASE ================= */}
        {subTab === 'history' && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'قاعدة بيانات وسجل الامتحانات المكتملة' : 'Exam Records Database'}</span>
              </h2>
              <span className="text-xs text-slate-400">
                {isAr ? `${examHistory.length} امتحانات` : `${examHistory.length} exams`}
              </span>
            </div>

            {examHistory.length > 0 ? (
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {examHistory.map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            record.scorePercentage >= 80
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : record.scorePercentage >= 50
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {record.scorePercentage}%
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {record.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{record.subject}</span>
                        <span>•</span>
                        <span>{formatTime(record.timeSpentSeconds)}</span>
                        <span>•</span>
                        <span>{new Date(record.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentExamQuestions(record.questions);
                          setCurrentExamTitle(record.title);
                          setUserAnswers(record.userAnswers);
                          setExamScore(record.scorePercentage);
                          setExamGrade(record.grade);
                          setExamSubmitted(true);
                          setSubTab('exam');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold cursor-pointer"
                      >
                        {isAr ? 'مراجعة' : 'Review'}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await storageService.deleteExam(user.uid, record.id);
                          setExamHistory(storageService.getExams(user.uid));
                        }}
                        className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title={isAr ? 'حذف من السجل' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-800/40 rounded-2xl border border-slate-800">
                <History className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 mb-3">
                  {isAr
                    ? 'لم تجتز أي امتحانات بعد. خض أول امتحان لتسجيل نتائجك ونقاط قوتك في قاعدة البيانات!'
                    : 'No exam records yet. Take your first real exam to track your scores in the database!'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('exam');
                    handleStartExam();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isAr ? 'بدء امتحان جديد' : 'Take an Exam'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
