// Resilient chunked downloader with auto-resume on internet disconnect and offline cache
export interface DownloadStatus {
  state: 'idle' | 'checking' | 'downloading' | 'paused' | 'completed' | 'error';
  receivedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: string; // e.g., "1.2 MB/s"
  errorMessage?: string;
  isOnline: boolean;
  isFromCache: boolean;
}

type StatusCallback = (status: DownloadStatus) => void;

class ResilientDownloaderService {
  private statusListeners: Set<StatusCallback> = new Set();
  private currentStatus: DownloadStatus = {
    state: 'idle',
    receivedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    speed: '0 KB/s',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isFromCache: false,
  };

  private chunks: Uint8Array[] = [];
  private abortController: AbortController | null = null;
  private isUserPaused = false;
  private retryTimeoutId: any = null;
  private lastBytesReceived = 0;
  private lastTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public subscribe(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => this.statusListeners.delete(callback);
  }

  private notify() {
    this.statusListeners.forEach((cb) => cb({ ...this.currentStatus }));
  }

  private handleNetworkChange(isOnline: boolean) {
    this.currentStatus.isOnline = isOnline;
    if (!isOnline && this.currentStatus.state === 'downloading') {
      this.currentStatus.state = 'paused';
      this.notify();
    } else if (isOnline && this.currentStatus.state === 'paused' && !this.isUserPaused) {
      // Auto-resume immediately when connection returns
      this.resumeDownload();
    } else {
      this.notify();
    }
  }

  // Check if we already have the ZIP cached locally in IndexedDB
  public async getCachedZip(): Promise<Blob | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('zips', 'readonly');
        const store = tx.objectStore('zips');
        const request = store.get('project-standalone-zip');
        request.onsuccess = () => {
          resolve(request.result?.blob || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async saveZipToCache(blob: Blob): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('zips', 'readwrite');
        const store = tx.objectStore('zips');
        const request = store.put({
          id: 'project-standalone-zip',
          blob,
          timestamp: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Failed to save ZIP to IndexedDB cache:', e);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FreeGenOfflineZips', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('zips')) {
          db.createObjectStore('zips', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Start or resume download
  public async startDownload(): Promise<void> {
    this.isUserPaused = false;

    // Check offline cache first
    this.currentStatus = {
      ...this.currentStatus,
      state: 'checking',
    };
    this.notify();

    const cachedBlob = await this.getCachedZip();
    if (cachedBlob) {
      this.currentStatus = {
        state: 'completed',
        receivedBytes: cachedBlob.size,
        totalBytes: cachedBlob.size,
        percentage: 100,
        speed: 'فوري (الذاكرة المحلية)',
        isOnline: navigator.onLine,
        isFromCache: true,
      };
      this.notify();
      this.triggerBrowserSave(cachedBlob);
      return;
    }

    // Reset chunks if starting fresh
    if (this.currentStatus.state !== 'paused') {
      this.chunks = [];
      this.currentStatus.receivedBytes = 0;
      this.currentStatus.totalBytes = 0;
      this.currentStatus.percentage = 0;
    }

    this.runDownloadLoop();
  }

  public pauseDownload() {
    this.isUserPaused = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.currentStatus.state = 'paused';
    this.notify();
  }

  public resumeDownload() {
    this.isUserPaused = false;
    this.runDownloadLoop();
  }

  private async runDownloadLoop() {
    if (this.isUserPaused) return;

    if (!navigator.onLine) {
      this.currentStatus.state = 'paused';
      this.notify();
      return;
    }

    this.currentStatus.state = 'downloading';
    this.currentStatus.errorMessage = undefined;
    this.notify();

    this.abortController = new AbortController();
    const startByte = this.currentStatus.receivedBytes;

    const headers: Record<string, string> = {};
    if (startByte > 0) {
      headers['Range'] = `bytes=${startByte}-`;
    }

    try {
      this.lastTime = Date.now();
      this.lastBytesReceived = startByte;

      const res = await fetch('/api/export/project-zip', {
        headers,
        signal: this.abortController.signal,
      });

      if (!res.ok && res.status !== 206) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Determine total size
      if (res.status === 206) {
        const contentRange = res.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) {
            this.currentStatus.totalBytes = parseInt(match[1], 10);
          }
        }
      } else {
        const cl = res.headers.get('content-length');
        if (cl) {
          this.currentStatus.totalBytes = parseInt(cl, 10);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      while (true) {
        if (this.isUserPaused) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          this.chunks.push(value);
          this.currentStatus.receivedBytes += value.length;

          // Calculate speed
          const now = Date.now();
          const timeDiff = (now - this.lastTime) / 1000;
          if (timeDiff >= 0.5) {
            const bytesDiff = this.currentStatus.receivedBytes - this.lastBytesReceived;
            const bytesPerSec = bytesDiff / timeDiff;
            this.currentStatus.speed =
              bytesPerSec > 1024 * 1024
                ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${Math.round(bytesPerSec / 1024)} KB/s`;
            this.lastBytesReceived = this.currentStatus.receivedBytes;
            this.lastTime = now;
          }

          if (this.currentStatus.totalBytes > 0) {
            this.currentStatus.percentage = Math.min(
              100,
              Math.round((this.currentStatus.receivedBytes / this.currentStatus.totalBytes) * 100)
            );
          }
          this.notify();
        }
      }

      // If loop exited and we have all bytes
      if (!this.isUserPaused) {
        const blob = new Blob(this.chunks, { type: 'application/zip' });
        this.currentStatus = {
          state: 'completed',
          receivedBytes: blob.size,
          totalBytes: blob.size,
          percentage: 100,
          speed: 'اكتمل',
          isOnline: true,
          isFromCache: false,
        };
        this.notify();

        // Save into IndexedDB for zero-internet future instant downloads
        await this.saveZipToCache(blob);

        // Save directly to user's phone / device
        this.triggerBrowserSave(blob);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted or network change pause, don't treat as fatal error
        return;
      }

      console.warn('[ResilientDownloader] Temporary disconnect:', err.message);
      // Automatically pause and retry in background
      this.currentStatus.state = 'paused';
      this.currentStatus.errorMessage =
        '⚠️ انقطع الاتصال بالإنترنت مؤقتاً. تم حفظ التقدم في الذاكرة وسنستأنف التنزيل تلقائياً فور عودة الإشارة...';
      this.notify();

      // Schedule auto-reconnect retry every 3 seconds
      if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = setTimeout(() => {
        if (!this.isUserPaused) {
          this.runDownloadLoop();
        }
      }, 3000);
    }
  }

  public triggerBrowserSave(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freegen-ai-standalone-project.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const resilientDownloader = new ResilientDownloaderService();
