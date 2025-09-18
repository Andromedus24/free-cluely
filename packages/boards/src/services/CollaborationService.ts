import { useState } from 'react';

export interface CollaborationEvent {
  id: string;
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'typing_start' | 'typing_end' |
        'message_sent' | 'card_moved' | 'card_updated' | 'column_updated' |
        'selection_changed' | 'board_updated' | 'session_started' | 'session_ended';
  sessionId: string;
  boardId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data?: any;
  metadata?: Record<string, any>;
}

export interface CollaborationMessage {
  id: string;
  sessionId: string;
  boardId: string;
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'system' | 'action';
  mentions?: string[];
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  timestamp: Date;
}

export interface UserCursor {
  userId: string;
  userName: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isTyping: boolean;
  selection?: { start: number; end: number };
  lastActive: Date;
}

export interface CollaborationSession {
  id: string;
  boardId: string;
  name: string;
  participants: Array<{
    userId: string;
    userName: string;
    role: string;
    joinedAt: Date;
    isActive: boolean;
    isOwner: boolean;
  }>;
  createdAt: Date;
  isActive: boolean;
  settings?: {
    enableChat: boolean;
    enableCursors: boolean;
    enableActivityFeed: boolean;
    maxParticipants: number;
  };
}

export class CollaborationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private currentSession: CollaborationSession | null = null;
  private connected = false;

  constructor(private baseUrl: string) {}

  // Connection management
  async connect(boardId: string, userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.baseUrl}/collaboration?boardId=${boardId}&userId=${userId}&userName=${encodeURIComponent(userName)}`);

        this.ws.onopen = () => {
          console.log('Collaboration WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('Collaboration WebSocket disconnected');
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect(boardId, userId, userName);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
    this.connected = false;
  }

  private attemptReconnect(boardId: string, userId: string, userName: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect(boardId, userId, userName).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connection_failed');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Session management
  async startSession(boardId: string, name: string, settings?: CollaborationSession['settings']): Promise<CollaborationSession> {
    const response = await fetch(`${this.baseUrl}/api/collaboration/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, name, settings })
    });

    if (!response.ok) {
      throw new Error('Failed to start collaboration session');
    }

    const session = await response.json();
    this.currentSession = session;
    this.emit('session_started', session);
    return session;
  }

  async joinSession(sessionId: string, userId: string, userName: string): Promise<CollaborationSession> {
    const response = await fetch(`${this.baseUrl}/api/collaboration/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName })
    });

    if (!response.ok) {
      throw new Error('Failed to join collaboration session');
    }

    const session = await response.json();
    this.currentSession = session;
    this.emit('session_joined', session);
    return session;
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({
        type: 'leave_session',
        sessionId,
        userId
      }));
    }

    const response = await fetch(`${this.baseUrl}/api/collaboration/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to leave collaboration session');
    }

    this.currentSession = null;
    this.emit('session_left', sessionId);
  }

  async getActiveSessions(boardId: string): Promise<CollaborationSession[]> {
    const response = await fetch(`${this.baseUrl}/api/collaboration/sessions?boardId=${boardId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch active sessions');
    }
    return response.json();
  }

  // Real-time events
  sendCursor(position: { x: number; y: number }): void {
    if (this.ws && this.connected && this.currentSession) {
      this.ws.send(JSON.stringify({
        type: 'cursor_moved',
        sessionId: this.currentSession.id,
        data: { position }
      }));
    }
  }

  sendTypingStart(): void {
    if (this.ws && this.connected && this.currentSession) {
      this.ws.send(JSON.stringify({
        type: 'typing_start',
        sessionId: this.currentSession.id
      }));
    }
  }

  sendTypingEnd(): void {
    if (this.ws && this.connected && this.currentSession) {
      this.ws.send(JSON.stringify({
        type: 'typing_end',
        sessionId: this.currentSession.id
      }));
    }
  }

  sendMessage(content: string, mentions?: string[], attachments?: File[]): void {
    if (this.ws && this.connected && this.currentSession) {
      const message: CollaborationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: this.currentSession.id,
        boardId: this.currentSession.boardId,
        userId: 'current_user', // This should be passed in or stored
        userName: 'Current User', // This should be passed in or stored
        content,
        type: 'text',
        mentions,
        attachments: attachments?.map(file => ({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        })),
        timestamp: new Date()
      };

      this.ws.send(JSON.stringify({
        type: 'message_sent',
        sessionId: this.currentSession.id,
        data: message
      }));
    }
  }

  sendSelection(selection: { start: number; end: number }): void {
    if (this.ws && this.connected && this.currentSession) {
      this.ws.send(JSON.stringify({
        type: 'selection_changed',
        sessionId: this.currentSession.id,
        data: { selection }
      }));
    }
  }

  // Message handling
  private handleMessage(data: any): void {
    const event: CollaborationEvent = {
      id: data.id || `event_${Date.now()}`,
      type: data.type,
      sessionId: data.sessionId,
      boardId: data.boardId,
      userId: data.userId,
      userName: data.userName,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data.data,
      metadata: data.metadata
    };

    this.emit('event', event);

    // Emit specific events
    switch (event.type) {
      case 'user_joined':
        this.emit('user_joined', event);
        break;
      case 'user_left':
        this.emit('user_left', event);
        break;
      case 'cursor_moved':
        this.emit('cursor_moved', event);
        break;
      case 'typing_start':
        this.emit('typing_start', event);
        break;
      case 'typing_end':
        this.emit('typing_end', event);
        break;
      case 'message_sent':
        this.emit('message_sent', event);
        break;
      case 'card_moved':
        this.emit('card_moved', event);
        break;
      case 'card_updated':
        this.emit('card_updated', event);
        break;
      case 'column_updated':
        this.emit('column_updated', event);
        break;
      case 'selection_changed':
        this.emit('selection_changed', event);
        break;
      case 'board_updated':
        this.emit('board_updated', event);
        break;
      case 'session_started':
        this.emit('session_started', event);
        break;
      case 'session_ended':
        this.emit('session_ended', event);
        break;
      default:
        console.warn('Unknown event type:', event.type);
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected;
  }

  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  getActiveUsers(): string[] {
    if (!this.currentSession) return [];
    return this.currentSession.participants
      .filter(p => p.isActive)
      .map(p => p.userId);
  }

  // Batch operations
  sendBatchEvents(events: Partial<CollaborationEvent>[]): void {
    if (this.ws && this.connected && this.currentSession) {
      const batchEvents = events.map(event => ({
        ...event,
        sessionId: this.currentSession!.id,
        boardId: this.currentSession!.boardId,
        timestamp: new Date()
      }));

      this.ws.send(JSON.stringify({
        type: 'batch_events',
        sessionId: this.currentSession.id,
        data: batchEvents
      }));
    }
  }

  // Error handling
  private handleError(error: any): void {
    console.error('Collaboration service error:', error);
    this.emit('error', error);
  }
}

// Factory function for creating collaboration service instances
export const createCollaborationService = (baseUrl: string): CollaborationService => {
  return new CollaborationService(baseUrl);
};

// React hook for collaboration service
export const useCollaboration = (baseUrl: string, boardId: string, userId: string, userName: string) => {
  const [service, setService] = useState<CollaborationService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<CollaborationSession | null>(null);

  useEffect(() => {
    const collabService = createCollaborationService(baseUrl);
    setService(collabService);

    // Set up event listeners
    collabService.on('disconnected', () => setIsConnected(false));
    collabService.on('session_joined', (newSession: CollaborationSession) => {
      setSession(newSession);
      setIsConnected(true);
    });

    return () => {
      collabService.disconnect();
    };
  }, [baseUrl]);

  const connect = async () => {
    if (service) {
      await service.connect(boardId, userId, userName);
    }
  };

  const startSession = async (name: string, settings?: CollaborationSession['settings']) => {
    if (service) {
      const newSession = await service.startSession(boardId, name, settings);
      setSession(newSession);
      return newSession;
    }
  };

  const joinSession = async (sessionId: string) => {
    if (service) {
      const newSession = await service.joinSession(sessionId, userId, userName);
      setSession(newSession);
      return newSession;
    }
  };

  return {
    service,
    isConnected,
    session,
    connect,
    startSession,
    joinSession
  };
};