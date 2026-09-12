// Network resilience and offline auto-reconnect engine
type NetworkListener = (isOnline: boolean) => void;

class NetworkManager {
  private online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<NetworkListener> = new Set();
  private reconnectCallbacks: Set<() => void> = new Set();
  private pingIntervalId: any = null;
  private consecutiveFailures: number = 0;
  private isSimulatedOffline: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkConnectivity(true));
      window.addEventListener('offline', () => this.setOnlineState(false));

      // Periodic connectivity check every 10s
      this.startHeartbeat();
    }
  }

  private startHeartbeat() {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.pingIntervalId = setInterval(() => {
      this.checkConnectivity();
    }, 10000);
  }

  public async checkConnectivity(forceNotify = false): Promise<boolean> {
    if (this.isSimulatedOffline) {
      if (this.online) this.setOnlineState(false);
      return false;
    }

    const reachable = await this.ping();
    if (reachable) {
      this.consecutiveFailures = 0;
      if (!this.online || forceNotify) {
        this.setOnlineState(true);
      }
    } else {
      this.consecutiveFailures++;
      // If ping fails or navigator says offline, mark offline
      if (this.consecutiveFailures >= 1 && this.online) {
        this.setOnlineState(false);
      }
    }
    return reachable;
  }

  public reportFailure() {
    if (this.isSimulatedOffline) return;
    this.consecutiveFailures++;
    this.setOnlineState(false);
    // Quickly retry to see when connection restores
    setTimeout(() => this.checkConnectivity(), 3000);
  }

  public reportSuccess() {
    if (this.isSimulatedOffline) return;
    this.consecutiveFailures = 0;
    if (!this.online) {
      this.setOnlineState(true);
    }
  }

  public toggleSimulatedOffline(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    if (this.isSimulatedOffline) {
      this.setOnlineState(false);
    } else {
      this.checkConnectivity(true);
    }
    return this.isSimulatedOffline;
  }

  public isSimulatingOffline(): boolean {
    return this.isSimulatedOffline;
  }

  private setOnlineState(newState: boolean) {
    const stateChanged = this.online !== newState;
    this.online = newState;
    this.notifyListeners();

    if (stateChanged && newState) {
      // Trigger all registered reconnect tasks
      const cbs = Array.from(this.reconnectCallbacks);
      for (const cb of cbs) {
        try {
          cb();
        } catch (e) {
          console.error('Reconnect task callback error:', e);
        }
      }
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public registerOnReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.add(callback);
    return () => {
      this.reconnectCallbacks.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.online);
      } catch (e) {
        console.error('Network listener error:', e);
      }
    });
  }
}

export const networkManager = new NetworkManager();

