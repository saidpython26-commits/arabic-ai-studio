export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';
export type ActiveTab = 'chat' | 'images' | 'apps' | 'slides' | 'business' | 'settings';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface ChatAttachment {
  name: string;
  mimeType: string;
  content?: string;
  data?: string; // base64
  isBase64?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachment?: ChatAttachment;
  interrupted?: boolean;
  isPendingOffline?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  imageUrl: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
  style: string;
  createdAt: number;
}

export interface GeneratedApp {
  id: string;
  name: string;
  description: string;
  html: string;
  createdAt: number;
}

export interface SlideItem {
  id: string;
  title: string;
  badge?: string;
  content: string[];
  analogy?: string; // Real-world analogy simplifying the concept
  keyTakeaway: string;
  speechScript?: string; // Voiceover script explained aloud
  animationType?: 'fade-up' | 'zoom-in' | 'bounce-in' | 'slide-in' | 'flip' | 'typewriter';
  durationSeconds?: number;
  codeSnippet?: string;
  bgColor?: string;
}

export interface GeneratedPresentation {
  id: string;
  topic: string;
  summary: string;
  slides: SlideItem[];
  slideDuration?: number; // Configurable duration in seconds (5s to 30s)
  voiceEnabled?: boolean;
  createdAt: number;
}

export interface BusinessProfile {
  businessName: string;
  businessType: string;
  whatsappNumber: string;
  telegramUsername: string;
  description: string;
}

export interface BusinessAnalysis {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  growthTips: string[];
  suggestedCampaigns: Array<{
    title: string;
    offer: string;
    targetAudience: string;
    callToAction: string;
  }>;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
}
