// WebSocket Sync Adapter Implementation
// ====================================

import { SyncAdapter, SettingsData, SyncAdapterConfig } from '../../types';

export interface WebSocketSyncAdapterConfig extends SyncAdapterConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  compression?: boolean;
  encryption?: boolean;
  roomId?: string;
  userId?: string;
}

export interface WebSocketMessage {
  type: 'sync' | 'pull' | 'heartbeat' | 'ack' | 'error' | 'broadcast';
  id: string;
  timestamp: number;
  payload?: any;
  operationId?: string;
  userId?: string;
  roomId?: string;
}

export interface WebSocketSyncState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastMessage: number;
  lastHeartbeat: number;
  pendingAcks: Map<string, NodeJS.Timeout>;
}

export class WebSocketSyncAdapter implements SyncAdapter {
  private config: WebSocketSyncAdapterConfig;
  private ws: WebSocket | null = null;
  private state: WebSocketSyncState = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    lastMessage: 0,
    lastHeartbeat: 0,
    pendingAcks: new Map()
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: WebSocketSyncAdapterConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      compression: false,
      encryption: false,
      ...config
    };

    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (event) => this.handleError(event);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.state.connected = true;
    this.state.reconnecting = false;
    this.state.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Send queued messages
    this.sendQueuedMessages();

    // Emit connected event
    this.emit('connected', { timestamp: Date.now() });

    // Join room if specified
    if (this.config.roomId) {
      this.send({
        type: 'sync',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        payload: { action: 'join', roomId: this.config.roomId },
        roomId: this.config.roomId
      });
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.state.lastMessage = Date.now();

      switch (message.type) {
        case 'ack':
          this.handleAck(message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'broadcast':
          this.handleBroadcast(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        default:
          this.emit('message', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleAck(message: WebSocketMessage): void {
    // Clear pending ack timeout
    const timeout = this.state.pendingAcks.get(message.id);
    if (timeout) {
      clearTimeout(timeout);
      this.state.pendingAcks.delete(message.id);
    }

    this.emit('ack', message);
  }

  private handleHeartbeat(message: WebSocketMessage): void {
    this.state.lastHeartbeat = Date.now();

    // Respond to heartbeat
    this.send({
      type: 'heartbeat',
      id: this.generateMessageId(),
      timestamp: Date.now()
    });
  }

  private handleBroadcast(message: WebSocketMessage): void {
    // Handle broadcast messages from other clients
    if (message.payload && message.payload.settings) {
      this.emit('settings-updated', {
        settings: message.payload.settings,
        userId: message.userId,
        timestamp: message.timestamp
      });
    }
  }

  private handleClose(event: CloseEvent): void {
    this.state.connected = false;
    this.cleanup();

    // Emit disconnected event
    this.emit('disconnected', { event, timestamp: Date.now() });

    // Schedule reconnection if not closed intentionally
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event | WebSocketMessage): void {
    this.emit('error', { error, timestamp: Date.now() });
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.emit('reconnect-failed', { attempts: this.state.reconnectAttempts });
      return;
    }

    this.state.reconnecting = true;
    this.state.reconnectAttempts++;

    this.emit('reconnecting', { attempt: this.state.reconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.state.connected) {
        this.send({
          type: 'heartbeat',
          id: this.generateMessageId(),
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(message: WebSocketMessage): boolean {
    if (!this.state.connected || !this.ws) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      const finalMessage = {
        ...message,
        userId: this.config.userId,
        roomId: this.config.roomId
      };

      let content = JSON.stringify(finalMessage);

      // Apply compression if enabled
      if (this.config.compression) {
        content = this.compress(content);
      }

      // Apply encryption if enabled
      if (this.config.encryption) {
        content = this.encrypt(content);
      }

      this.ws.send(content);

      // Set up ack timeout
      const ackTimeout = setTimeout(() => {
        this.state.pendingAcks.delete(message.id);
        this.emit('ack-timeout', message);
      }, 5000);

      this.state.pendingAcks.set(message.id, ackTimeout);

      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  private sendQueuedMessages(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      this.send(message);
    }
  }

  private compress(content: string): string {
    // Simple compression simulation
    return `compressed:${btoa(content)}`;
  }

  private decompress(content: string): string {
    if (content.startsWith('compressed:')) {
      return atob(content.slice(11));
    }
    return content;
  }

  private encrypt(content: string): string {
    // Simple encryption simulation
    return `encrypted:${btoa(content)}`;
  }

  private decrypt(content: string): string {
    if (content.startsWith('encrypted:')) {
      return atob(content.slice(10));
    }
    return content;
  }

  private generateMessageId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanup(): void {
    // Stop heartbeat
    this.stopHeartbeat();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear pending acks
    for (const timeout of this.state.pendingAcks.values()) {
      clearTimeout(timeout);
    }
    this.state.pendingAcks.clear();

    // Close WebSocket
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  async sync(data: SettingsData, operationId?: string): Promise<void> {
    if (!this.state.connected) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'sync',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload: { settings: data, action: 'sync' },
      operationId
    };

    const sent = this.send(message);
    if (!sent) {
      throw new Error('Failed to send sync message');
    }

    // Wait for ack
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync ack timeout'));
      }, 10000);

      const handler = (ackMessage: WebSocketMessage) => {
        if (ackMessage.id === message.id) {
          clearTimeout(timeout);
          this.off('ack', handler);
          resolve();
        }
      };

      this.on('ack', handler);
    });
  }

  async pull(operationId?: string): Promise<SettingsData> {
    if (!this.state.connected) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'pull',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload: { action: 'pull' },
      operationId
    };

    const sent = this.send(message);
    if (!sent) {
      throw new Error('Failed to send pull message');
    }

    // Wait for response
    return new Promise<SettingsData>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pull response timeout'));
      }, 10000);

      const handler = (responseMessage: WebSocketMessage) => {
        if (responseMessage.operationId === operationId && responseMessage.payload?.settings) {
          clearTimeout(timeout);
          this.off('message', handler);
          resolve(responseMessage.payload.settings);
        }
      };

      this.on('message', handler);
    });
  }

  async getConflictResolution(localData: SettingsData, remoteData: SettingsData): Promise<SettingsData> {
    // For WebSocket sync, we'll use timestamp-based resolution
    const localTimestamp = localData.metadata?.updatedAt || 0;
    const remoteTimestamp = remoteData.metadata?.updatedAt || 0;

    if (remoteTimestamp > localTimestamp) {
      return remoteData;
    } else if (localTimestamp > remoteTimestamp) {
      return localData;
    } else {
      // If timestamps are equal, prefer remote for WebSocket sync
      return remoteData;
    }
  }

  async getMetadata(): Promise<any> {
    return {
      connected: this.state.connected,
      reconnecting: this.state.reconnecting,
      reconnectAttempts: this.state.reconnectAttempts,
      lastMessage: this.state.lastMessage,
      lastHeartbeat: this.state.lastHeartbeat,
      pendingAcks: this.state.pendingAcks.size,
      queueSize: this.messageQueue.length,
      url: this.config.url,
      roomId: this.config.roomId,
      userId: this.config.userId
    };
  }

  async clearCache(): Promise<void> {
    // WebSocket adapter doesn't use cache in the traditional sense
    this.messageQueue = [];
  }

  async testConnection(): Promise<boolean> {
    if (!this.state.connected) {
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'heartbeat',
        id: this.generateMessageId(),
        timestamp: Date.now()
      };

      const sent = this.send(message);
      return sent;
    } catch (error) {
      return false;
    }
  }

  // Event handling
  private on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Public API for real-time events
  broadcast(data: SettingsData, excludeSelf: boolean = true): void {
    if (!this.state.connected) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'broadcast',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload: { settings: data, excludeSelf }
    };

    this.send(message);
  }

  joinRoom(roomId: string): void {
    this.config.roomId = roomId;

    if (this.state.connected) {
      this.send({
        type: 'sync',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        payload: { action: 'join', roomId },
        roomId
      });
    }
  }

  leaveRoom(roomId: string): void {
    if (this.state.connected && this.config.roomId === roomId) {
      this.send({
        type: 'sync',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        payload: { action: 'leave', roomId },
        roomId
      });
    }

    this.config.roomId = undefined;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<WebSocketSyncAdapterConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Reconnect if URL changed
    if (oldConfig.url !== this.config.url) {
      this.cleanup();
      this.connect();
    }
  }

  getConfig(): WebSocketSyncAdapterConfig {
    return { ...this.config };
  }

  getStatus(): { connected: boolean; reconnecting: boolean; reconnectAttempts: number } {
    return {
      connected: this.state.connected,
      reconnecting: this.state.reconnecting,
      reconnectAttempts: this.state.reconnectAttempts
    };
  }

  // Cleanup
  destroy(): void {
    this.cleanup();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }
}