import { getApiBaseUrl } from '../config/api';
import { syncEngine } from './syncEngine';

export interface PresencePayload {
  userId?: string;
  username: string;
  fullName?: string;
  role: string;
  action: 'LOGIN' | 'LOGOUT' | 'SHIFT_START' | 'SHIFT_CLOSE' | 'ONLINE_HEARTBEAT';
  deviceInfo?: string;
  timestamp: number;
}

type RealtimeListener = (connected: boolean) => void;
type PresenceListener = (presence: PresencePayload) => void;

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private clientId = 'client-' + Math.random().toString(36).substring(2, 9);
  private connectionListeners: RealtimeListener[] = [];
  private presenceListeners: PresenceListener[] = [];

  constructor() {
    this.connect();
    // Reconnect when browser comes back online
    window.addEventListener('online', () => {
      this.reconnectDelay = 2000;
      this.connect();
    });
  }

  public connect() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const sseUrl = `${getApiBaseUrl()}/api/realtime/events?clientId=${encodeURIComponent(this.clientId)}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectDelay = 2000;
        this.notifyConnectionListeners(true);
        console.log('⚡ Realtime SSE Connected to Bunk Cloud Stream');
      };

      this.eventSource.addEventListener('CONNECTED', (e: MessageEvent) => {
        this.isConnected = true;
        this.notifyConnectionListeners(true);
      });

      this.eventSource.addEventListener('PING', () => {
        // Keep-alive heartbeat from backend
        this.isConnected = true;
      });

      // Instant synchronization trigger from any device
      this.eventSource.addEventListener('SYNC_UPDATE', async (e: MessageEvent) => {
        console.log('🔔 Live SYNC_UPDATE event received from cloud:', e.data);
        try {
          // Immediately pull and hydrate latest cloud state
          await syncEngine.pullAndHydrateFromCloud();
          // Notify any listening components/screens to re-render without page refresh
          window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));
        } catch (err) {
          console.warn('Error hydrating on live sync event:', err);
        }
      });

      // User / Admin presence broadcast across devices
      this.eventSource.addEventListener('PRESENCE_UPDATE', (e: MessageEvent) => {
        try {
          const payload: PresencePayload = JSON.parse(e.data);
          console.log('👤 Live PRESENCE_UPDATE received:', payload);
          this.presenceListeners.forEach(listener => listener(payload));
          window.dispatchEvent(new CustomEvent('bunk_presence_changed', { detail: payload }));
        } catch (err) {
          console.warn('Error parsing presence update:', err);
        }
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        if (this.eventSource) {
          try {
            this.eventSource.close();
          } catch {}
          this.eventSource = null;
        }

        // Auto-reconnect with exponential backoff (max 30s)
        const delay = Math.min(this.reconnectDelay, 30000);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      };
    } catch (err) {
      console.warn('Failed to initiate EventSource connection:', err);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  public subscribeConnection(listener: RealtimeListener): () => void {
    this.connectionListeners.push(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  public subscribePresence(listener: PresenceListener): () => void {
    this.presenceListeners.push(listener);
    return () => {
      this.presenceListeners = this.presenceListeners.filter(l => l !== listener);
    };
  }

  private notifyConnectionListeners(status: boolean) {
    this.connectionListeners.forEach(l => l(status));
  }

  /**
   * Broadcast current user login or activity to all other connected devices
   */
  public async broadcastPresence(payload: Omit<PresencePayload, 'timestamp'>): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/realtime/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.warn('Failed to broadcast user presence:', err);
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimeManager = new RealtimeSyncManager();
