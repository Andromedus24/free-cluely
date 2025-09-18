import { DashboardEvent } from '@/types/dashboard';
import { logger } from '@/lib/logger';

export interface RealtimeUpdateConfig {
  websocketUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class RealtimeUpdates {
  private websocket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(private config: RealtimeUpdateConfig = {}) {
    this.config = {
      websocketUrl: 'ws://localhost:3000/ws/dashboard',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }

  connect(): void {
    try {
      this.websocket = new WebSocket(this.config.websocketUrl!);

      this.websocket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected', { timestamp: new Date() });
        logger.info('realtime-updates', 'Realtime updates connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data: DashboardEvent = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('realtime-updates', 'Failed to parse realtime message', error instanceof Error ? error : new Error(String(error)));
        }
      };

      this.websocket.onclose = (event) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.attemptReconnect();
      };

      this.websocket.onerror = (error) => {
        logger.error('realtime-updates', 'WebSocket error', error instanceof Error ? error : new Error(String(error)));
        this.emit('error', error);
      };

    } catch (error) {
      logger.error('realtime-updates', 'Failed to create WebSocket connection', error instanceof Error ? error : new Error(String(error)));
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.emit('max_reconnect_attempts_reached', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.websocket) {
        this.websocket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(event: DashboardEvent): void {
    this.emit('message', event);

    switch (event.type) {
      case 'stats_update':
        this.emit('stats_update', event.data);
        break;
      case 'activity_update':
        this.emit('activity_update', event.data);
        break;
      case 'health_update':
        this.emit('health_update', event.data);
        break;
      case 'job_update':
        this.emit('job_update', event.data);
        break;
      default:
        this.emit('unknown_event', event);
    }
  }

  send(data: Record<string, unknown>): void {
    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify(data));
    } else {
      logger.warn('realtime-updates', 'Cannot send message: WebSocket not connected');
    }
  }

  // Event emitter methods
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // Public methods
  isConnectionOpen(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): {
    connected: boolean;
    reconnectAttempts: number;
    readyState?: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.websocket?.readyState
    };
  }

  forceReconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}