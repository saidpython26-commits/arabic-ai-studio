export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';
export type ActiveTab = 'chat' | 'images' | 'apps' | 'settings';

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

export interface AppSettings {
  language: Language;
  theme: Theme;
}
