import React, { useEffect, useRef, useCallback, useState } from 'react';
import { TimelineEntry, TimelineEvent } from '../types/TimelineUITypes';

export interface WebSocketRealtimeConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  timeout?: number;
  enableCompression?: boolean;
}

export interface WebSocketRealtimeEvents {
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onJobCreated?: (job: TimelineEntry) => void;
  onJobUpdated?: (job: TimelineEntry) => void;
  onJobDeleted?: (jobId: string) => void;
  onJobEvent?: (event: TimelineEvent) => void;
  onArtifactAdded?: (jobId: string, artifact: any) => void;
  onBatchUpdate?: (updates: RealtimeBatchUpdate) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export interface RealtimeBatchUpdate {
  jobs: TimelineEntry[];
  events: TimelineEvent[];
  deletedJobs: string[];
  timestamp: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface UseWebSocketRealtimeReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  lastMessage: any;
  connectionError: Error | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  subscribe: (channel: string, handler: (data: any) => void) => void;
  unsubscribe: (channel: string) => void;
  requestJobUpdate: (jobId: string) => void;
  requestBatchSync: (since?: number) => void;
}

export function useWebSocketRealtime(
  config: WebSocketRealtimeConfig,
  events: WebSocketRealtimeEvents = {}
): UseWebSocketRealtimeReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Map<string, (data: any) => void>>(new Map());
  const connectionAttemptRef = useRef(0);

  const {
    url,
    reconnectAttempts: maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    timeout = 10000,
    enableCompression = true,
  } = config;

  const {
    onConnect,
    onDisconnect,
    onError,
    onJobCreated,
    onJobUpdated,
    onJobDeleted,
    onJobEvent,
    onArtifactAdded,
    onBatchUpdate,
    onConnectionStateChange,
  } = events;

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      let data: any;

      if (event.data instanceof Blob) {
        // Handle compressed binary data
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result as string;
            data = JSON.parse(text);
            processMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        reader.readAsText(event.data);
        return;
      } else {
        data = JSON.parse(event.data);
      }

      processMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [
    onJobCreated,
    onJobUpdated,
    onJobDeleted,
    onJobEvent,
    onArtifactAdded,
    onBatchUpdate,
  ]);

  const processMessage = useCallback((data: any) => {
    setLastMessage(data);

    // Handle different message types
    switch (data.type) {
      case 'job_created':
        onJobCreated?.(data.payload);
        break;

      case 'job_updated':
        onJobUpdated?.(data.payload);
        break;

      case 'job_deleted':
        onJobDeleted?.(data.payload.jobId);
        break;

      case 'job_event':
        onJobEvent?.(data.payload);
        break;

      case 'artifact_added':
        onArtifactAdded?.(data.payload.jobId, data.payload.artifact);
        break;

      case 'batch_update':
        onBatchUpdate?.(data.payload);
        break;

      case 'channel_message':
        const handler = subscriptionsRef.current.get(data.channel);
        if (handler) {
          handler(data.payload);
        }
        break;

      case 'heartbeat':
        // Respond to heartbeat
        sendMessage({ type: 'heartbeat_ack', timestamp: Date.now() });
        break;

      case 'error':
        console.error('WebSocket error from server:', data.payload);
        break;

      default:
        console.warn('Unknown WebSocket message type:', data.type);
    }
  }, [onJobCreated, onJobUpdated, onJobDeleted, onJobEvent, onArtifactAdded, onBatchUpdate]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'heartbeat', timestamp: Date.now() });
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    setConnectionError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          setConnectionError(new Error('Connection timeout'));
          setConnectionState('error');
        }
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        setConnectionState('connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        connectionAttemptRef.current = 0;

        // Start heartbeat
        if (heartbeatInterval) {
          heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);
        }

        // Send initial subscription
        sendMessage({
          type: 'subscribe',
          channels: ['jobs', 'events', 'artifacts'],
        });

        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        clearTimeout(timeoutId);
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        // Attempt reconnection
        if (connectionAttemptRef.current < maxReconnectAttempts) {
          setConnectionState('reconnecting');
          connectionAttemptRef.current++;
          setReconnectAttempts(connectionAttemptRef.current);

          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionState('disconnected');
        }

        onDisconnect?.(event);
      };

      ws.onerror = (error) => {
        setConnectionError(error as Error);
        setConnectionState('error');
        onError?.(error);
      };

    } catch (error) {
      setConnectionError(error as Error);
      setConnectionState('error');
      onError?.(error as Event);
    }
  }, [
    url,
    maxReconnectAttempts,
    reconnectInterval,
    timeout,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onError,
    handleMessage,
    sendHeartbeat,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    setIsConnected(false);
    setReconnectAttempts(0);
    connectionAttemptRef.current = 0;
  }, []);

  // Send message
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      wsRef.current.send(data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Subscribe to channel
  const subscribe = useCallback((channel: string, handler: (data: any) => void) => {
    subscriptionsRef.current.set(channel, handler);
    sendMessage({
      type: 'subscribe',
      channels: [channel],
    });
  }, [sendMessage]);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel);
    sendMessage({
      type: 'unsubscribe',
      channels: [channel],
    });
  }, [sendMessage]);

  // Request job update
  const requestJobUpdate = useCallback((jobId: string) => {
    sendMessage({
      type: 'request_job_update',
      payload: { jobId },
    });
  }, [sendMessage]);

  // Request batch sync
  const requestBatchSync = useCallback((since?: number) => {
    sendMessage({
      type: 'request_batch_sync',
      payload: { since },
    });
  }, [sendMessage]);

  // Update connection state
  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connectionState,
    isConnected,
    lastMessage,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    requestJobUpdate,
    requestBatchSync,
  };
}

// Connection status indicator component
export interface ConnectionStatusProps {
  connectionState: ConnectionState;
  reconnectAttempts: number;
  onConnect?: () => void;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  reconnectAttempts,
  onConnect,
  className,
}) => {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting (${reconnectAttempts}/${5})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return '●';
      case 'connecting':
      case 'reconnecting':
        return '◐';
      case 'error':
        return '✕';
      default:
        return '○';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
      {connectionState === 'disconnected' && onConnect && (
        <button
          onClick={onConnect}
          className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connect
        </button>
      )}
    </div>
  );
};