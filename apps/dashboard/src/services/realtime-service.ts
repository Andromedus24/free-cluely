/**
 * Real-time Service for WebSocket Connections
 * Handles real-time updates, presence, and collaboration features
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

export interface RealtimeEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
  channel?: string;
}

export interface PresenceState {
  userId: string;
  onlineAt: string;
  currentPath?: string;
  metadata?: Record<string, any>;
}

export interface RealtimeMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CollaborationEvent {
  type: 'cursor_move' | 'selection_change' | 'text_change' | 'presence_update';
  userId: string;
  data: any;
  timestamp: string;
}

class RealtimeService {
  private channels: Map<string, any> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private presenceStates: Map<string, PresenceState> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeRealtime();
  }

  private initializeRealtime() {
    // Set up connection state monitoring
    supabase.realtime.onOpen(() => {
      logger.info('Realtime connection established');
      this.reconnectAttempts = 0;
    });

    supabase.realtime.onClose(() => {
      logger.warn('Realtime connection closed');
      this.attemptReconnect();
    });

    supabase.realtime.onError((error) => {
      logger.error('Realtime connection error', error);
      this.attemptReconnect();
    });
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached for realtime service');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Attempting to reconnect realtime service (attempt ${this.reconnectAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Re-subscribe to all channels
      for (const [channelName, channel] of this.channels.entries()) {
        this.subscribeToChannel(channelName, channel.config);
      }
    } catch (error) {
      logger.error('Failed to reconnect realtime channels', error);
    }
  }

  // Channel Management
  subscribeToChannel(channelName: string, config: any = {}) {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: await this.getUserId(),
        },
        ...config,
      },
    });

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        this.presenceStates = new Map(Object.entries(newState).map(([key, value]: [string, any]) => [
          key,
          value[0] as PresenceState,
        ]));
        this.emit('presence_sync', Array.from(this.presenceStates.values()));
      })
      .on('presence', { event: 'join' }, ({ key, currentPresences }) => {
        const presence = currentPresences[0] as PresenceState;
        this.presenceStates.set(key, presence);
        this.emit('presence_join', presence);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presence = leftPresences[0] as PresenceState;
        this.presenceStates.delete(key);
        this.emit('presence_leave', presence);
      });

    // Set up broadcast
    channel.on('broadcast', { event: '*' }, (payload) => {
      const event: RealtimeEvent = {
        id: `event_${Date.now()}_${Math.random()}`,
        type: payload.event,
        payload: payload.payload,
        timestamp: new Date().toISOString(),
        channel: channelName,
      };
      this.emit('broadcast', event);
    });

    // Set up database changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        this.emit('message', payload);
      }
    );

    this.channels.set(channelName, { channel, config });
    channel.subscribe();

    logger.info('Subscribed to realtime channel', { channelName });
    return channel;
  }

  unsubscribeFromChannel(channelName: string) {
    const channelData = this.channels.get(channelName);
    if (channelData) {
      channelData.channel.unsubscribe();
      this.channels.delete(channelName);
      logger.info('Unsubscribed from realtime channel', { channelName });
    }
  }

  // Presence Management
  async trackPresence(metadata: Record<string, any> = {}) {
    try {
      const userId = await this.getUserId();
      const channel = Array.from(this.channels.values())[0]?.channel;

      if (channel) {
        await channel.track({
          userId,
          onlineAt: new Date().toISOString(),
          currentPath: window.location.pathname,
          metadata,
        });
      }
    } catch (error) {
      logger.error('Failed to track presence', error);
    }
  }

  getOnlineUsers(): PresenceState[] {
    return Array.from(this.presenceStates.values());
  }

  isUserOnline(userId: string): boolean {
    return this.presenceStates.has(userId);
  }

  // Broadcasting
  async broadcast(channelName: string, event: string, payload: any) {
    try {
      const channelData = this.channels.get(channelName);
      if (!channelData) {
        throw new Error(`Channel ${channelName} not found`);
      }

      await channelData.channel.send({
        type: 'broadcast',
        event,
        payload,
      });

      logger.info('Broadcasted event', { channelName, event });
    } catch (error) {
      logger.error('Failed to broadcast event', error);
      throw error;
    }
  }

  // Collaboration Features
  async sendCollaborationEvent(channelName: string, event: CollaborationEvent) {
    return this.broadcast(channelName, 'collaboration', event);
  }

  async updateCursorPosition(channelName: string, x: number, y: number) {
    try {
      const userId = await this.getUserId();
      const event: CollaborationEvent = {
        type: 'cursor_move',
        userId,
        data: { x, y, timestamp: Date.now() },
        timestamp: new Date().toISOString(),
      };

      return this.sendCollaborationEvent(channelName, event);
    } catch (error) {
      logger.error('Failed to update cursor position', error);
    }
  }

  // Message Real-time
  async sendMessage(channelName: string, content: string, metadata?: Record<string, any>) {
    try {
      const userId = await this.getUserId();
      const message: RealtimeMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        channelId: channelName,
        userId,
        content,
        timestamp: new Date().toISOString(),
        metadata,
      };

      // Broadcast for real-time updates
      await this.broadcast(channelName, 'new_message', message);

      // Store in database
      const { error } = await supabase
        .from('messages')
        .insert([{
          channel_id: channelName,
          user_id: userId,
          content,
          metadata,
        }]);

      if (error) {
        throw error;
      }

      return message;
    } catch (error) {
      logger.error('Failed to send real-time message', error);
      throw error;
    }
  }

  // Voice Assistant Real-time
  async sendVoiceCommand(transcript: string, intent?: string) {
    try {
      const userId = await this.getUserId();
      const event = {
        type: 'voice_command',
        userId,
        transcript,
        intent,
        timestamp: new Date().toISOString(),
      };

      return this.broadcast('voice_assistant', 'command', event);
    } catch (error) {
      logger.error('Failed to send voice command', error);
      throw error;
    }
  }

  // 3D Modeling Collaboration
  async send3DModelingUpdate(channelName: string, update: {
    type: 'object_added' | 'object_updated' | 'object_deleted' | 'scene_changed';
    data: any;
  }) {
    try {
      const userId = await this.getUserId();
      const event = {
        type: '3d_update',
        userId,
        update,
        timestamp: new Date().toISOString(),
      };

      return this.broadcast(channelName, '3d_modeling', event);
    } catch (error) {
      logger.error('Failed to send 3D modeling update', error);
      throw error;
    }
  }

  // Productivity Monitoring Real-time
  async sendProductivityUpdate(data: {
    activity: string;
    productivity_score: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const userId = await this.getUserId();
      const event = {
        type: 'productivity_update',
        userId,
        data,
        timestamp: new Date().toISOString(),
      };

      return this.broadcast('productivity', 'update', event);
    } catch (error) {
      logger.error('Failed to send productivity update', error);
      throw error;
    }
  }

  // Event System
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error('Event handler error', error);
        }
      });
    }
  }

  // Utility Methods
  private async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  getConnectionStatus() {
    return {
      connected: supabase.realtime.isConnected(),
      channels: Array.from(this.channels.keys()),
      onlineUsers: this.presenceStates.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Clean up
  destroy() {
    for (const [channelName, channelData] of this.channels.entries()) {
      channelData.channel.unsubscribe();
    }
    this.channels.clear();
    this.presenceStates.clear();
    this.eventHandlers.clear();
    logger.info('Realtime service destroyed');
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// Hook for real-time features
export function useRealtime() {
  return {
    service: realtimeService,
    // Common real-time operations
    usePresence: (callback: (presences: PresenceState[]) => void) => {
      realtimeService.on('presence_sync', callback);
      return () => realtimeService.off('presence_sync', callback);
    },
    useBroadcast: (channel: string, callback: (event: RealtimeEvent) => void) => {
      realtimeService.on('broadcast', callback);
      return () => realtimeService.off('broadcast', callback);
    },
    useMessages: (callback: (message: any) => void) => {
      realtimeService.on('message', callback);
      return () => realtimeService.off('message', callback);
    },
  };
}

export default RealtimeService;