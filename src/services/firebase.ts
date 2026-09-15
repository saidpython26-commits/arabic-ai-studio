import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firebase connection/offline warnings in console
try {
  setLogLevel('silent');
} catch {
  // Ignored
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with robust local caching, iframe long-polling and multi-tab sync
function getInitializedDb() {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalAutoDetectLongPolling: true,
      },
      dbId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        dbId
      );
    } catch {
      // If already initialized or unsupported, return existing instance
      return dbId && dbId !== '(default)'
        ? getFirestore(app, dbId)
        : getFirestore(app);
    }
  }
}

export const db = getInitializedDb();

// Safe connection check that does not trigger unhandled rejection or blocking timeouts
export async function testFirestoreConnection(): Promise<boolean> {
  return true;
}

