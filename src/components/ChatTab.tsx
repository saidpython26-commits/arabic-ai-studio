import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Paperclip,
  Trash2,
  Plus,
  Bot,
  User,
  Copy,
  Check,
  FileText,
  X,
  Sparkles,
  History,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Play,
  Maximize2,
  Code2,
  WifiOff,
  RotateCcw,
  RefreshCw,
  Download,
  Smartphone,
} from 'lucide-react';
import { ChatMessage, Conversation, Language, UserProfile, ChatAttachment } from '../types';
import { storageService } from '../services/storage';
import { networkManager } from '../services/networkManager';

interface ChatTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    storageService.getConversations(user.uid)
  );

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    const list = storageService.getConversations(user.uid);
    if (list.length > 0) return list[0].id;
    return '';
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ChatAttachment | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Scrolling & preview state
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep references to state for asynchronous network reconnect triggers
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Auto-reconnect trigger: resume interrupted or pending offline messages
  useEffect(() => {
    const unsubscribe = networkManager.registerOnReconnect(() => {
      const currentList = conversationsRef.current;
      const targetConvId = activeConvIdRef.current;
      const targetConv = currentList.find((c) => c.id === targetConvId);
      if (!targetConv || isStreamingRef.current) return;

      const pendingOrInterrupted = [...targetConv.messages].reverse().find(
        (m) => m.role === 'assistant' && (m.interrupted || m.isPendingOffline)
      );

      if (pendingOrInterrupted) {
        onShowToast(
          isAr
            ? '⚡ تم استعادة الاتصال بالإنترنت - جاري استئناف التوليد تلقائياً...'
            : '⚡ Connection restored - Auto-resuming generation...',
          'success'
        );
        if (pendingOrInterrupted.interrupted && pendingOrInterrupted.content.trim().length > 0) {
          handleResumeInterrupted(pendingOrInterrupted.id);
        } else {
          handleRestartMessage(pendingOrInterrupted.id);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAr]);

  const handleContainerScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottomBtn(distanceToBottom > 120);
    setShowScrollTopBtn(scrollTop > 180);
  };

  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const scrollToTop = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Only auto-scroll to bottom if user is NOT scrolling up reading previous messages
  useEffect(() => {
    if (!showScrollBottomBtn) {
      scrollToBottom();
    }
  }, [activeConversation?.messages, isStreaming]);

  // Create new conversation
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: isAr ? 'محادثة جديدة' : 'New Chat',
      updatedAt: Date.now(),
      messages: [],
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
    storageService.saveConversation(user.uid, newConv);
    onShowToast(isAr ? 'تم فتح محادثة جديدة' : 'New conversation started', 'info');
  };

  // Ensure an active conversation exists
  useEffect(() => {
    if (!activeConvId && conversations.length === 0) {
      handleNewChat();
    }
  }, []);

  // Clear current conversation
  const handleClearChat = () => {
    if (!activeConvId) return;
    if (window.confirm(isAr ? 'هل تريد مسح رسائل هذه المحادثة؟' : 'Clear this conversation?')) {
      const updatedConv: Conversation = {
        ...activeConversation!,
        messages: [],
        updatedAt: Date.now(),
      };
      const updatedList = conversations.map((c) => (c.id === activeConvId ? updatedConv : c));
      setConversations(updatedList);
      storageService.saveConversation(user.uid, updatedConv);
      onShowToast(isAr ? 'تم مسح المحادثة' : 'Chat cleared', 'info');
    }
  };

  // Delete an entire conversation
  const handleDeleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.deleteConversation(user.uid, id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeConvId === id) {
      if (updated.length > 0) {
        setActiveConvId(updated[0].id);
      } else {
        handleNewChat();
      }
    }
    onShowToast(isAr ? 'تم حذف المحادثة' : 'Conversation deleted', 'info');
  };

  // Handle file attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onShowToast(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)' : 'File too large (max 10MB)', 'error');
      return;
    }

    try {
      const isPdf = file.type === 'application/pdf';
      const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');

      if (isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          setAttachedFile({
            name: file.name,
            mimeType: file.type,
            data: base64String,
            isBase64: true,
          });
          onShowToast(isAr ? `تم إرفاق: ${file.name}` : `Attached: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
      } else {
        const textContent = await file.text();
        setAttachedFile({
          name: file.name,
          mimeType: file.type || 'text/plain',
          content: textContent,
        });
        onShowToast(isAr ? `تم إرفاق: ${file.name}` : `Attached: ${file.name}`, 'success');
      }
    } catch (err) {
      console.error('File reading failed:', err);
      onShowToast(isAr ? 'تعذر قراءة الملف' : 'Failed to read file', 'error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Core streaming executor with fault-tolerance & resumption
  const executeChatStream = async (
    targetConv: Conversation,
    aiMsgId: string,
    userMsgContent: string,
    attachment?: ChatAttachment,
    resumeFromText?: string
  ) => {
    setIsStreaming(true);
    let accumulatedText = resumeFromText || '';

    // Check if offline before starting fetch
    if (!networkManager.isOnline()) {
      setIsStreaming(false);
      setConversations((prevList) =>
        prevList.map((c) => {
          if (c.id !== targetConv.id) return c;
          const msgs = c.messages.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: accumulatedText,
                  interrupted: !!resumeFromText,
                  isPendingOffline: !resumeFromText,
                }
              : m
          );
          return { ...c, messages: msgs };
        })
      );
      onShowToast(
        isAr
          ? 'لا يوجد اتصال بالإنترنت - الرسالة محفوظة وستُرسل تلقائياً فور عودة الشبكة'
          : 'Offline - Request queued and will execute automatically when online',
        'info'
      );
      return;
    }

    try {
      // Build messages history payload
      const baseMsgs = targetConv.messages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      if (resumeFromText && resumeFromText.trim().length > 0) {
        // We are resuming an interrupted stream
        baseMsgs.push({
          role: 'assistant',
          content: resumeFromText,
        });
        baseMsgs.push({
          role: 'user',
          content: isAr
            ? 'واصل وأكمل باقي الإجابة أو الكود البرمجي من حيث توقفت بالضبط دون إعادة أو تكرار ما سبق:'
            : 'Please continue and complete the remaining response/code exactly from where you stopped without repeating:',
        });
      }

      const customKey = storageService.getCustomApiKey();
      const response = await fetch('/api/gemini/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          messages: baseMsgs,
          attachedFile: attachment,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to streaming API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                networkManager.reportSuccess();
                accumulatedText += parsed.text;
                // Live update assistant message
                setConversations((prevList) =>
                  prevList.map((c) => {
                    if (c.id !== targetConv.id) return c;
                    const msgs = c.messages.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            interrupted: false,
                            isPendingOffline: false,
                          }
                        : m
                    );
                    return { ...c, messages: msgs };
                  })
                );
              } else if (parsed.error) {
                let cleanErr = parsed.error;
                if (typeof cleanErr === 'string') {
                  try {
                    const parsedErrObj = JSON.parse(cleanErr);
                    if (parsedErrObj.error?.message) {
                      cleanErr = parsedErrObj.error.message;
                    }
                  } catch {}
                }
                const errorAlert = isAr
                  ? `\n\n⚠️ تنبيه: ${cleanErr}`
                  : `\n\n⚠️ Notice: ${cleanErr}`;
                accumulatedText += errorAlert;

                setConversations((prevList) =>
                  prevList.map((c) => {
                    if (c.id !== targetConv.id) return c;
                    const msgs = c.messages.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            interrupted: true,
                            isPendingOffline: false,
                          }
                        : m
                    );
                    return { ...c, messages: msgs };
                  })
                );
              }
            } catch {}
          }
        }
      }

      // Final save to storage on completion
      const finalConv: Conversation = {
        ...targetConv,
        messages: targetConv.messages.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content: accumulatedText || (isAr ? 'عذراً، لم يتم استلام رد.' : 'No response received.'),
                interrupted: false,
                isPendingOffline: false,
              }
            : m
        ),
      };
      storageService.saveConversation(user.uid, finalConv);
    } catch (err: any) {
      console.warn('Stream interrupted or network error:', err);
      networkManager.reportFailure();
      const hasPartial = accumulatedText.trim().length > 0;

      setConversations((prevList) =>
        prevList.map((c) => {
          if (c.id !== targetConv.id) return c;
          const msgs = c.messages.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: accumulatedText,
                  interrupted: hasPartial,
                  isPendingOffline: !hasPartial,
                }
              : m
          );
          return { ...c, messages: msgs };
        })
      );

      if (hasPartial) {
        onShowToast(
          isAr
            ? 'انقطع الاتصال مؤقتاً أثناء التوليد - تم حفظ الإجابة ويمكنك استئنافها فوراً'
            : 'Connection lost during streaming - progress saved, ready to resume',
          'info'
        );
      } else {
        onShowToast(
          isAr
            ? 'انقطع الاتصال بالإنترنت - سيتم استئناف التوليد تلقائياً فور عودة الشبكة'
            : 'Internet disconnected - will auto-resume upon reconnection',
          'info'
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Send message and trigger stream
  const handleSendMessage = async (promptText?: string) => {
    const contentToSend = promptText || inputMessage;
    if ((!contentToSend.trim() && !attachedFile) || isStreaming) return;

    let targetConv = activeConversation;
    if (!targetConv) {
      targetConv = {
        id: `conv_${Date.now()}`,
        title: contentToSend.slice(0, 25) || (isAr ? 'محادثة' : 'Chat'),
        updatedAt: Date.now(),
        messages: [],
      };
    }

    // User Message
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: contentToSend.trim(),
      timestamp: Date.now(),
      attachment: attachedFile ? { ...attachedFile } : undefined,
    };

    // AI placeholder message
    const aiMsgId = `msg_ai_${Date.now() + 1}`;
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isPendingOffline: !networkManager.isOnline(),
    };

    const isFirstMsg = targetConv.messages.length === 0;
    const newTitle = isFirstMsg ? (contentToSend.slice(0, 24) || (isAr ? 'محادثة' : 'Chat')) : targetConv.title;

    const updatedMessages = [...targetConv.messages, userMsg, initialAiMsg];
    const updatedConv: Conversation = {
      ...targetConv,
      title: newTitle,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    setInputMessage('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);

    await executeChatStream(updatedConv, aiMsgId, contentToSend, currentAttachment);
  };

  // Resume interrupted stream from where it stopped
  const handleResumeInterrupted = async (aiMsgId: string) => {
    if (isStreaming) return;
    const currentList = conversationsRef.current;
    const targetConvId = activeConvIdRef.current;
    const targetConv = currentList.find((c) => c.id === targetConvId) || activeConversation;
    if (!targetConv) return;

    const aiMsg = targetConv.messages.find((m) => m.id === aiMsgId);
    if (!aiMsg) return;

    // Find previous user message
    const aiIndex = targetConv.messages.findIndex((m) => m.id === aiMsgId);
    const prevUserMsg = aiIndex > 0 ? targetConv.messages[aiIndex - 1] : null;

    onShowToast(isAr ? 'جاري استئناف التوليد...' : 'Resuming generation...', 'info');
    await executeChatStream(
      targetConv,
      aiMsgId,
      prevUserMsg?.content || '',
      prevUserMsg?.attachment,
      aiMsg.content
    );
  };

  // Restart message generation from start
  const handleRestartMessage = async (aiMsgId: string) => {
    if (isStreaming) return;
    const currentList = conversationsRef.current;
    const targetConvId = activeConvIdRef.current;
    const targetConv = currentList.find((c) => c.id === targetConvId) || activeConversation;
    if (!targetConv) return;

    const aiIndex = targetConv.messages.findIndex((m) => m.id === aiMsgId);
    const prevUserMsg = aiIndex > 0 ? targetConv.messages[aiIndex - 1] : null;

    // Reset AI message content
    setConversations((prevList) =>
      prevList.map((c) => {
        if (c.id !== targetConv.id) return c;
        const msgs = c.messages.map((m) =>
          m.id === aiMsgId ? { ...m, content: '', interrupted: false, isPendingOffline: false } : m
        );
        return { ...c, messages: msgs };
      })
    );

    await executeChatStream(
      targetConv,
      aiMsgId,
      prevUserMsg?.content || '',
      prevUserMsg?.attachment,
      undefined
    );
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    onShowToast(isAr ? 'تم نسخ الكود!' : 'Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const sampleSuggestions = [
    isAr ? '💻 اكتب لي تطبيق آلة حاسبة تفاعلية كامل بـ HTML و JS' : '💻 Complete interactive calculator app in HTML & JS',
    isAr ? '🐍 كود بايثون متقدم لتحليل البيانات وحساب الإحصائيات' : '🐍 Advanced Python data analysis and statistics script',
    isAr ? '⚛️ مكون React لبطاقة بروفايل حديثة مع تأثيرات حركية' : '⚛️ Modern React interactive profile card with animations',
    isAr ? '🎨 كود صفحة هبوط فخمة مع أنيميشن وتصميم حديث' : '🎨 Elegant landing page code with CSS animations',
  ];

  return (
    <div id="chat-tab-container" className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Top Bar for Chat */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors max-w-[170px]"
          >
            <History className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{activeConversation?.title || (isAr ? 'المحادثة' : 'Chat')}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-install-modal'))}
            id="chat-install-app-btn"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer active:scale-95"
            title={isAr ? 'تثبيت التطبيق على الهاتف' : 'Install App to Phone'}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{isAr ? 'تثبيت' : 'Install'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-download-modal'))}
            id="chat-download-code-btn"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors cursor-pointer active:scale-95"
            title={isAr ? 'تنزيل كود المشروع الذكي المقاوم للانقطاع (ZIP)' : 'Resilient Download Code (ZIP)'}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isAr ? 'الكود' : 'Code'}</span>
          </button>
          <button
            id="scroll-to-top-btn"
            onClick={scrollToTop}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={isAr ? 'الانتقال لأعلى المحادثة' : 'Scroll to top'}
          >
            <ArrowUp className="w-4 h-4 text-slate-300" />
          </button>
          <button
            id="new-chat-btn"
            onClick={handleNewChat}
            disabled={isStreaming}
            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
            title={isAr ? 'محادثة جديدة' : 'New Chat'}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="clear-chat-btn"
            onClick={handleClearChat}
            disabled={isStreaming || !activeConversation?.messages?.length}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors cursor-pointer disabled:opacity-30"
            title={isAr ? 'مسح الرسائل' : 'Clear Chat'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 touch-pan-y scroll-smooth relative"
      >
        {(!activeConversation || activeConversation.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/5">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {isAr ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I assist you today?'}
            </h2>
            <p className="text-xs text-slate-400 max-w-[280px] mt-1">
              {isAr
                ? 'مهندس برمجة وذكاء اصطناعي متكامل: اكتب أكواداً، ابني صفحات وتطبيقات، وحلل الملفات فورياً.'
                : 'Senior AI software engineer: write code, build interactive pages, and analyze files instantly.'}
            </p>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 mt-6 max-w-[340px]">
              {sampleSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.replace(/^[^\s]+\s/, ''))}
                  className="w-full text-right p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition hover:border-emerald-500/50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeConversation?.messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                isUser ? 'flex-row-reverse self-end justify-start' : 'justify-start'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 ${
                  isUser
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 border border-slate-700 text-emerald-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600/90 text-white rounded-tr-none shadow-md shadow-emerald-600/10'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none shadow-sm'
                }`}
              >
                {/* File Attachment Badge */}
                {msg.attachment && (
                  <div className="mb-2 flex items-center gap-1.5 p-1.5 rounded-lg bg-black/20 text-xs text-emerald-200 border border-white/10">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                    <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                  </div>
                )}

                {/* Message Content */}
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    {/* If message is empty and currently streaming */}
                    {!msg.content.trim() && isStreaming && (
                      <div className="flex items-center gap-2 py-1 text-xs text-emerald-400 font-medium">
                        <Sparkles className="w-4 h-4 animate-spin shrink-0" />
                        <span className="animate-pulse">
                          {isAr ? 'جاري التفكير والتوليد عبر نماذج Gemini السريعة...' : 'Thinking and generating via Gemini models...'}
                        </span>
                      </div>
                    )}

                    {/* If message ended empty and not streaming */}
                    {!msg.content.trim() && !isStreaming && !msg.isPendingOffline && !msg.interrupted && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                        <p className="leading-relaxed">
                          {isAr
                            ? '⚠️ تعذر استلام الرد بسبب ضغط مؤقت على الخوادم. يمكنك النقر على الزر أدناه لإعادة المحاولة فوراً:'
                            : '⚠️ Could not get response due to temporary server load. Please retry below:'}
                        </p>
                        <button
                          onClick={() => handleRestartMessage(msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إعادة المحاولة الآن' : 'Retry Now'}</span>
                        </button>
                      </div>
                    )}

                    {msg.content.trim().length > 0 && (
                      <ReactMarkdown
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const lang = match ? match[1].toLowerCase() : '';
                          const codeText = String(children).replace(/\n$/, '');
                          const isInline = !match && !String(children).includes('\n');
                          const blockId = `code_${Math.random().toString(36).slice(2, 7)}`;

                          if (isInline) {
                            return (
                              <code
                                className="bg-slate-900/80 text-emerald-300 px-1.5 py-0.5 rounded text-xs border border-slate-700/50"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }

                          const canPreview =
                            ['html', 'htm', 'xml', 'svg'].includes(lang) ||
                            codeText.includes('<!DOCTYPE') ||
                            (codeText.includes('<html') && codeText.includes('</html>')) ||
                            (codeText.includes('<div') && (codeText.includes('<style') || codeText.includes('<script')));

                          return (
                            <div className="my-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
                                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{lang || 'code'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {canPreview && (
                                    <button
                                      onClick={() => setPreviewCode(codeText)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer text-[10px] font-medium"
                                      title={isAr ? 'معاينة وتشغيل الكود' : 'Run / Live Preview'}
                                    >
                                      <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                                      <span>{isAr ? 'معاينة وتشغيل' : 'Preview'}</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => copyCode(codeText, blockId)}
                                    className="flex items-center gap-1 hover:text-emerald-400 transition cursor-pointer"
                                  >
                                    {copiedCodeId === blockId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">
                                          {isAr ? 'تم النسخ' : 'Copied'}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>{isAr ? 'نسخ' : 'Copy'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                              <pre className="p-3 text-xs overflow-x-auto text-slate-200">
                                <code>{children}</code>
                              </pre>
                            </div>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    )}

                    {/* Message Actions Footer for Assistant */}
                    {!isStreaming && msg.content.trim().length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center gap-2 text-[11px] text-slate-400">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            onShowToast(isAr ? 'تم نسخ نص الرد' : 'Response copied', 'success');
                          }}
                          className="hover:text-emerald-400 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{isAr ? 'نسخ الرد' : 'Copy'}</span>
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          onClick={() => handleRestartMessage(msg.id)}
                          className="hover:text-emerald-400 transition flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isAr ? 'إعادة التوليد' : 'Regenerate'}</span>
                        </button>
                      </div>
                    )}

                    {/* Active streaming cursor indicator */}
                    {isStreaming && msg.id === activeConversation.messages[activeConversation.messages.length - 1]?.id && (
                      <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                    )}

                    {/* Offline Queued Indicator */}
                    {msg.isPendingOffline && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            {isAr
                              ? 'الرسالة محفوظة محلياً - بانتظار عودة الإنترنت للإرسال فوراً...'
                              : 'Message queued locally - waiting for internet reconnect...'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRestartMessage(msg.id)}
                          disabled={isStreaming}
                          className="self-start px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{isAr ? 'محاولة الإرسال الآن' : 'Send now'}</span>
                        </button>
                      </div>
                    )}

                    {/* Interrupted Stream Recovery Card */}
                    {msg.interrupted && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-900/95 border border-amber-500/40 text-xs text-slate-200 flex flex-col gap-2 shadow-lg">
                        <div className="flex items-center gap-2 text-amber-400 font-bold">
                          <WifiOff className="w-4 h-4 shrink-0" />
                          <span>
                            {isAr
                              ? 'توقف البث مؤقتاً بسبب انقطاع الاتصال (تم حفظ ما تم توليده)'
                              : 'Stream paused due to disconnection (progress saved)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isAr
                            ? 'يمكنك استئناف ومواصلة التوليد فوراً من النقطة التي توقف عندها دون فقدان ما سبق.'
                            : 'Resume generating right from where it paused without losing anything.'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResumeInterrupted(msg.id)}
                            disabled={isStreaming}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>{isAr ? 'متابعة واستئناف التوليد' : 'Resume Generation'}</span>
                          </button>
                          <button
                            onClick={() => handleRestartMessage(msg.id)}
                            disabled={isStreaming}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isAr ? 'إعادة التوليد كلياً' : 'Restart all'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {/* Floating Quick Scroll Controls */}
        {(showScrollTopBtn || showScrollBottomBtn) && (
          <div className="sticky bottom-4 left-0 right-0 flex justify-center items-center gap-2 pointer-events-auto z-20">
            {showScrollTopBtn && (
              <button
                onClick={scrollToTop}
                className="px-2.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-lg backdrop-blur-sm transition cursor-pointer flex items-center gap-1 text-xs"
                title={isAr ? 'الانتقال لأعلى' : 'Scroll to top'}
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'للأعلى' : 'Top'}</span>
              </button>
            )}
            {showScrollBottomBtn && (
              <button
                onClick={() => scrollToBottom(true)}
                className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1"
                title={isAr ? 'الانتقال لآخر رسالة' : 'Scroll to bottom'}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>{isAr ? 'آخر رسالة' : 'Latest'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Attachment Pill if Selected */}
      {attachedFile && (
        <div className="px-4 py-1.5 bg-slate-800/90 border-t border-slate-700/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <FileText className="w-4 h-4" />
            <span className="truncate max-w-[260px] font-medium">{attachedFile.name}</span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Input Section */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 focus-within:border-emerald-500/70 transition-colors shadow-inner"
        >
          {/* File Upload Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.json,.js,.py,.html"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-xl transition cursor-pointer"
            title={isAr ? 'إرفاق ملف (PDF / TXT)' : 'Attach file'}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            id="chat-message-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isAr ? 'اكتب رسالتك لـ FreeGen AI...' : 'Type your message to FreeGen AI...'
            }
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-500 py-1.5"
          />

          <button
            type="submit"
            disabled={(!inputMessage.trim() && !attachedFile) || isStreaming}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* History Drawer Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[75vh] flex flex-col p-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                {isAr ? 'سجل المحادثات' : 'Chat History'}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-2 space-y-1.5 flex-1 mt-2">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  {isAr ? 'لا توجد محادثات سابقة' : 'No previous conversations'}
                </p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConvId(c.id);
                      setShowHistoryModal(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                      c.id === activeConvId
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                        : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs truncate font-medium">{c.title}</p>
                        <p className="text-[10px] text-slate-500">
                          {c.messages.length} {isAr ? 'رسائل' : 'messages'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConv(c.id, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowHistoryModal(false);
                handleNewChat();
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'بدء محادثة جديدة' : 'Start New Chat'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Live Code Preview Modal */}
      {previewCode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col p-2 sm:p-4 justify-center items-center animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Play className="w-3.5 h-3.5 fill-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    {isAr ? 'تشغيل ومعاينة الكود المولد' : 'Live Code Execution Preview'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isAr ? 'بيئة تشغيل تفاعلية مباشرة' : 'Interactive sandbox preview'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCode(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Sandbox Container */}
            <div className="flex-1 bg-white relative overflow-hidden">
              <iframe
                title="Interactive Code Preview"
                srcDoc={previewCode}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-modals allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
