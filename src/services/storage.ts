import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Conversation, GeneratedImage, GeneratedApp, GeneratedPresentation, BusinessProfile, ExamRecord, StudyLesson } from '../types';

const CONV_KEY_PREFIX = 'freegen_conversations_';
const IMG_KEY_PREFIX = 'freegen_images_';
const APP_KEY_PREFIX = 'freegen_apps_';
const SLIDES_KEY_PREFIX = 'freegen_slides_';
const BUSINESS_KEY_PREFIX = 'freegen_business_';
const EXAM_KEY_PREFIX = 'freegen_exams_';
const LESSON_KEY_PREFIX = 'freegen_lessons_';

export const storageService = {
  // --- Conversations ---
  getConversations(uid: string): Conversation[] {
    try {
      const raw = localStorage.getItem(`${CONV_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to get conversations:', e);
      return [];
    }
  },

  async saveConversation(uid: string, conv: Conversation): Promise<void> {
    try {
      // 1. Instant local persistence
      const list = this.getConversations(uid);
      const index = list.findIndex((c) => c.id === conv.id);
      if (index >= 0) {
        list[index] = conv;
      } else {
        list.unshift(conv);
      }
      localStorage.setItem(`${CONV_KEY_PREFIX}${uid}`, JSON.stringify(list));

      // 2. Cloud Firestore sync
      const convRef = doc(db, 'users', uid, 'conversations', conv.id);
      await setDoc(convRef, {
        id: conv.id,
        userId: uid,
        title: conv.title,
        updatedAt: conv.updatedAt,
        messages: conv.messages,
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore conversation sync note:', e);
    }
  },

  async deleteConversation(uid: string, convId: string): Promise<void> {
    try {
      const list = this.getConversations(uid).filter((c) => c.id !== convId);
      localStorage.setItem(`${CONV_KEY_PREFIX}${uid}`, JSON.stringify(list));

      const convRef = doc(db, 'users', uid, 'conversations', convId);
      await deleteDoc(convRef);
    } catch (e) {
      console.warn('Firestore conversation deletion note:', e);
    }
  },

  clearAllConversations(uid: string): void {
    localStorage.removeItem(`${CONV_KEY_PREFIX}${uid}`);
  },

  // --- Images ---
  getImages(uid: string): GeneratedImage[] {
    try {
      const raw = localStorage.getItem(`${IMG_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to get images:', e);
      return [];
    }
  },

  async saveImage(uid: string, image: GeneratedImage): Promise<void> {
    try {
      // 1. Local
      const list = this.getImages(uid);
      const filtered = list.filter((img) => img.id !== image.id);
      filtered.unshift(image);
      localStorage.setItem(`${IMG_KEY_PREFIX}${uid}`, JSON.stringify(filtered));

      // 2. Cloud Firestore
      const imgRef = doc(db, 'users', uid, 'images', image.id);
      await setDoc(imgRef, {
        ...image,
        userId: uid,
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore image sync note:', e);
    }
  },

  async deleteImage(uid: string, imageId: string): Promise<void> {
    try {
      const list = this.getImages(uid).filter((img) => img.id !== imageId);
      localStorage.setItem(`${IMG_KEY_PREFIX}${uid}`, JSON.stringify(list));

      const imgRef = doc(db, 'users', uid, 'images', imageId);
      await deleteDoc(imgRef);
    } catch (e) {
      console.warn('Firestore image deletion note:', e);
    }
  },

  clearAllImages(uid: string): void {
    localStorage.removeItem(`${IMG_KEY_PREFIX}${uid}`);
  },

  // --- Apps ---
  getApps(uid: string): GeneratedApp[] {
    try {
      const raw = localStorage.getItem(`${APP_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to get apps:', e);
      return [];
    }
  },

  async saveApp(uid: string, app: GeneratedApp): Promise<void> {
    try {
      // 1. Local
      const list = this.getApps(uid);
      const filtered = list.filter((a) => a.id !== app.id);
      filtered.unshift(app);
      localStorage.setItem(`${APP_KEY_PREFIX}${uid}`, JSON.stringify(filtered));

      // 2. Cloud Firestore
      const appRef = doc(db, 'users', uid, 'apps', app.id);
      await setDoc(appRef, {
        ...app,
        userId: uid,
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore app sync note:', e);
    }
  },

  async deleteApp(uid: string, appId: string): Promise<void> {
    try {
      const list = this.getApps(uid).filter((a) => a.id !== appId);
      localStorage.setItem(`${APP_KEY_PREFIX}${uid}`, JSON.stringify(list));

      const appRef = doc(db, 'users', uid, 'apps', appId);
      await deleteDoc(appRef);
    } catch (e) {
      console.warn('Firestore app deletion note:', e);
    }
  },

  clearAllApps(uid: string): void {
    localStorage.removeItem(`${APP_KEY_PREFIX}${uid}`);
  },

  // --- Cloud Sync on load/login ---
  async syncFromFirestore(uid: string): Promise<void> {
    try {
      // Sync conversations
      const convsSnap = await getDocs(collection(db, 'users', uid, 'conversations'));
      if (!convsSnap.empty) {
        const cloudConvs: Conversation[] = [];
        convsSnap.forEach((d) => cloudConvs.push(d.data() as Conversation));
        cloudConvs.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(`${CONV_KEY_PREFIX}${uid}`, JSON.stringify(cloudConvs));
      }

      // Sync images
      const imgSnap = await getDocs(collection(db, 'users', uid, 'images'));
      if (!imgSnap.empty) {
        const cloudImgs: GeneratedImage[] = [];
        imgSnap.forEach((d) => cloudImgs.push(d.data() as GeneratedImage));
        cloudImgs.sort((a, b) => b.createdAt - a.createdAt);
        localStorage.setItem(`${IMG_KEY_PREFIX}${uid}`, JSON.stringify(cloudImgs));
      }

      // Sync apps
      const appSnap = await getDocs(collection(db, 'users', uid, 'apps'));
      if (!appSnap.empty) {
        const cloudApps: GeneratedApp[] = [];
        appSnap.forEach((d) => cloudApps.push(d.data() as GeneratedApp));
        cloudApps.sort((a, b) => b.createdAt - a.createdAt);
        localStorage.setItem(`${APP_KEY_PREFIX}${uid}`, JSON.stringify(cloudApps));
      }

      // Sync exams
      const examSnap = await getDocs(collection(db, 'users', uid, 'exams'));
      if (!examSnap.empty) {
        const cloudExams: ExamRecord[] = [];
        examSnap.forEach((d) => cloudExams.push(d.data() as ExamRecord));
        cloudExams.sort((a, b) => b.createdAt - a.createdAt);
        localStorage.setItem(`${EXAM_KEY_PREFIX}${uid}`, JSON.stringify(cloudExams));
      }
    } catch (_e) {
      // Operates in offline mode seamlessly using cached local data
    }
  },

  // --- Stats ---
  getUserStats(uid: string) {
    const convs = this.getConversations(uid);
    const totalMessages = convs.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
    const images = this.getImages(uid);
    const apps = this.getApps(uid);
    const exams = this.getExams(uid);

    return {
      conversationsCount: convs.length,
      messagesCount: totalMessages,
      imagesCount: images.length,
      appsCount: apps.length,
      presentationsCount: this.getPresentations(uid).length,
      examsCount: exams.length,
    };
  },

  // --- Presentations ---
  getPresentations(uid: string): GeneratedPresentation[] {
    try {
      const raw = localStorage.getItem(`${SLIDES_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to get presentations:', e);
      return [];
    }
  },

  async savePresentation(uid: string, pres: GeneratedPresentation): Promise<void> {
    try {
      const list = this.getPresentations(uid);
      const filtered = list.filter((p) => p.id !== pres.id);
      filtered.unshift(pres);
      localStorage.setItem(`${SLIDES_KEY_PREFIX}${uid}`, JSON.stringify(filtered));

      const presRef = doc(db, 'users', uid, 'presentations', pres.id);
      await setDoc(presRef, { ...pres, userId: uid }, { merge: true });
    } catch (e) {
      console.warn('Firestore presentation sync note:', e);
    }
  },

  async deletePresentation(uid: string, presId: string): Promise<void> {
    try {
      const list = this.getPresentations(uid).filter((p) => p.id !== presId);
      localStorage.setItem(`${SLIDES_KEY_PREFIX}${uid}`, JSON.stringify(list));

      const presRef = doc(db, 'users', uid, 'presentations', presId);
      await deleteDoc(presRef);
    } catch (e) {
      console.warn('Firestore presentation deletion note:', e);
    }
  },

  // --- Business Profile ---
  getBusinessProfile(uid: string): BusinessProfile {
    try {
      const raw = localStorage.getItem(`${BUSINESS_KEY_PREFIX}${uid}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return {
      businessName: '',
      businessType: '',
      whatsappNumber: '',
      telegramUsername: '',
      description: '',
    };
  },

  async saveBusinessProfile(uid: string, profile: BusinessProfile): Promise<void> {
    try {
      localStorage.setItem(`${BUSINESS_KEY_PREFIX}${uid}`, JSON.stringify(profile));
      const busRef = doc(db, 'users', uid, 'profile', 'business');
      await setDoc(busRef, { ...profile, userId: uid }, { merge: true });
    } catch (e) {
      console.warn('Firestore business profile sync note:', e);
    }
  },

  clearAllUserData(uid: string): void {
    this.clearAllConversations(uid);
    this.clearAllImages(uid);
    this.clearAllApps(uid);
    localStorage.removeItem(`${SLIDES_KEY_PREFIX}${uid}`);
    localStorage.removeItem(`${BUSINESS_KEY_PREFIX}${uid}`);
    localStorage.removeItem(`${EXAM_KEY_PREFIX}${uid}`);
    localStorage.removeItem(`${LESSON_KEY_PREFIX}${uid}`);
  },

  // --- Exams Database & Offline Sync ---
  getExams(uid: string): ExamRecord[] {
    try {
      const raw = localStorage.getItem(`${EXAM_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to get exams:', e);
      return [];
    }
  },

  async saveExam(uid: string, exam: ExamRecord): Promise<void> {
    try {
      // 1. Instant local persistence
      const list = this.getExams(uid);
      const filtered = list.filter((e) => e.id !== exam.id);
      filtered.unshift({ ...exam, syncedToCloud: navigator.onLine });
      localStorage.setItem(`${EXAM_KEY_PREFIX}${uid}`, JSON.stringify(filtered));

      // 2. Cloud Firestore sync if online
      if (navigator.onLine) {
        const examRef = doc(db, 'users', uid, 'exams', exam.id);
        await setDoc(examRef, { ...exam, userId: uid, syncedToCloud: true }, { merge: true });
      }
    } catch (e) {
      console.warn('Exam saved locally (offline or firestore note):', e);
    }
  },

  async deleteExam(uid: string, examId: string): Promise<void> {
    try {
      const list = this.getExams(uid).filter((e) => e.id !== examId);
      localStorage.setItem(`${EXAM_KEY_PREFIX}${uid}`, JSON.stringify(list));

      if (navigator.onLine) {
        const examRef = doc(db, 'users', uid, 'exams', examId);
        await deleteDoc(examRef);
      }
    } catch (e) {
      console.warn('Exam delete note:', e);
    }
  },

  // Background silent sync of offline-completed exams when internet reconnects
  async syncPendingOfflineExams(uid: string): Promise<void> {
    if (!navigator.onLine) return;
    try {
      const list = this.getExams(uid);
      const pending = list.filter((e) => !e.syncedToCloud);
      if (pending.length === 0) return;

      for (const exam of pending) {
        const examRef = doc(db, 'users', uid, 'exams', exam.id);
        await setDoc(examRef, { ...exam, userId: uid, syncedToCloud: true }, { merge: true });
        exam.syncedToCloud = true;
      }

      localStorage.setItem(`${EXAM_KEY_PREFIX}${uid}`, JSON.stringify(list));
    } catch (_e) {
      // Background retry silently on next interval or online event
    }
  },

  // --- Study Lessons Storage ---
  getStudyLessons(uid: string): StudyLesson[] {
    try {
      const raw = localStorage.getItem(`${LESSON_KEY_PREFIX}${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async saveStudyLesson(uid: string, lesson: StudyLesson): Promise<void> {
    try {
      const list = this.getStudyLessons(uid);
      const filtered = list.filter((l) => l.id !== lesson.id);
      filtered.unshift(lesson);
      localStorage.setItem(`${LESSON_KEY_PREFIX}${uid}`, JSON.stringify(filtered.slice(0, 50)));

      if (navigator.onLine) {
        const lessonRef = doc(db, 'users', uid, 'lessons', lesson.id);
        await setDoc(lessonRef, { ...lesson, userId: uid }, { merge: true });
      }
    } catch (_e) {
      // Local caching ensures continuity
    }
  },

  // --- Custom Gemini API Key Storage ---
  getCustomApiKey(): string {
    try {
      return localStorage.getItem('freegen_custom_gemini_key') || '';
    } catch {
      return '';
    }
  },

  setCustomApiKey(key: string): void {
    try {
      const trimmed = key.trim();
      if (trimmed) {
        localStorage.setItem('freegen_custom_gemini_key', trimmed);
      } else {
        localStorage.removeItem('freegen_custom_gemini_key');
      }
    } catch (e) {
      console.warn('Failed to persist custom api key:', e);
    }
  },
};
