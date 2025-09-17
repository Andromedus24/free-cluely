import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { TimelineEntry, TimelineEvent } from '../types/TimelineUITypes';
import { useWebSocketRealtime, ConnectionStatus } from '../hooks/useWebSocketRealtime';
import { cn } from '../utils/cn';

export interface TimelineRealtimeProps {
  config: {
    url: string;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
  };
  onJobUpdate?: (job: TimelineEntry) => void;
  onJobCreate?: (job: TimelineEntry) => void;
  onJobDelete?: (jobId: string) => void;
  onEvent?: (event: TimelineEvent) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  showStatus?: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

interface RealtimeNotification {
  id: string;
  type: 'job_created' | 'job_updated' | 'job_deleted' | 'event' | 'error';
  message: string;
  timestamp: number;
  data?: any;
}

export const TimelineRealtime: React.FC<TimelineRealtimeProps> = ({
  config,
  onJobUpdate,
  onJobCreate,
  onJobDelete,
  onEvent,
  onConnectionChange,
  showStatus = true,
  compact = false,
  theme = 'light',
}) => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleJobCreated = useCallback((job: TimelineEntry) => {
    onJobCreate?.(job);

    if (!compact) {
      setNotifications(prev => [
        {
          id: `job_created_${job.id}_${Date.now()}`,
          type: 'job_created',
          message: `New job created: ${job.title || job.type}`,
          timestamp: Date.now(),
          data: job,
        },
        ...prev.slice(0, 9), // Keep only last 10 notifications
      ]);
    }
  }, [onJobCreate, compact]);

  const handleJobUpdated = useCallback((job: TimelineEntry) => {
    onJobUpdate?.(job);

    if (!compact) {
      setNotifications(prev => [
        {
          id: `job_updated_${job.id}_${Date.now()}`,
          type: 'job_updated',
          message: `Job updated: ${job.title || job.type}`,
          timestamp: Date.now(),
          data: job,
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [onJobUpdate, compact]);

  const handleJobDeleted = useCallback((jobId: string) => {
    onJobDelete?.(jobId);

    if (!compact) {
      setNotifications(prev => [
        {
          id: `job_deleted_${jobId}_${Date.now()}`,
          type: 'job_deleted',
          message: `Job deleted`,
          timestamp: Date.now(),
          data: { jobId },
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [onJobDelete, compact]);

  const handleJobEvent = useCallback((event: TimelineEvent) => {
    onEvent?.(event);

    if (!compact && event.type !== 'heartbeat') {
      setNotifications(prev => [
        {
          id: `event_${event.id}_${Date.now()}`,
          type: 'event',
          message: `${event.type.replace('_', ' ')}: ${event.message || 'Job event'}`,
          timestamp: Date.now(),
          data: event,
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [onEvent, compact]);

  const handleBatchUpdate = useCallback((update: any) => {
    setIsProcessing(true);

    try {
      // Process batch updates
      update.jobs?.forEach((job: TimelineEntry) => {
        onJobUpdate?.(job);
      });

      update.events?.forEach((event: TimelineEvent) => {
        onEvent?.(event);
      });

      update.deletedJobs?.forEach((jobId: string) => {
        onJobDelete?.(jobId);
      });

      if (!compact) {
        setNotifications(prev => [
          {
            id: `batch_${Date.now()}`,
            type: 'event',
            message: `Batch update: ${update.jobs?.length || 0} jobs, ${update.events?.length || 0} events`,
            timestamp: Date.now(),
            data: update,
          },
          ...prev.slice(0, 9),
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onJobUpdate, onEvent, onJobDelete, compact]);

  const handleError = useCallback((error: Event) => {
    if (!compact) {
      setNotifications(prev => [
        {
          id: `error_${Date.now()}`,
          type: 'error',
          message: 'Connection error occurred',
          timestamp: Date.now(),
          data: error,
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [compact]);

  const handleConnectionStateChange = useCallback((state: string) => {
    const isConnected = state === 'connected';
    onConnectionChange?.(isConnected);
  }, [onConnectionChange]);

  const {
    connectionState,
    isConnected,
    connect,
    disconnect,
    requestJobUpdate,
    requestBatchSync,
  } = useWebSocketRealtime(config, {
    onJobCreated: handleJobCreated,
    onJobUpdated: handleJobUpdated,
    onJobDeleted: handleJobDeleted,
    onJobEvent: handleJobEvent,
    onBatchUpdate: handleBatchUpdate,
    onError: handleError,
    onConnectionStateChange: handleConnectionStateChange,
  });

  // Remove old notifications
  useEffect(() => {
    if (compact) return;

    const interval = setInterval(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 10000)); // Keep notifications for 10 seconds
    }, 1000);

    return () => clearInterval(interval);
  }, [compact]);

  // Request initial sync on connect
  useEffect(() => {
    if (isConnected) {
      requestBatchSync();
    }
  }, [isConnected, requestBatchSync]);

  const getNotificationIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'job_created':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'job_updated':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'job_deleted':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'event':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'job_created':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'job_updated':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
      case 'job_deleted':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'event':
        return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800';
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <ConnectionStatus
            connectionState={connectionState}
            reconnectAttempts={0}
            onConnect={connect}
          />
        )}
        {isProcessing && (
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Controls */}
      {showStatus && (
        <div className="flex items-center justify-between">
          <ConnectionStatus
            connectionState={connectionState}
            reconnectAttempts={0}
            onConnect={connect}
          />

          <div className="flex items-center gap-2">
            {isProcessing && (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            )}
            <button
              onClick={() => isConnected ? disconnect() : connect()}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                isConnected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
              )}
            >
              {isConnected ? (
                <>
                  <WifiOff className="w-4 h-4 inline mr-1" />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 inline mr-1" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Real-time Notifications */}
      <div className="space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'p-3 rounded-lg border text-sm',
                getNotificationColor(notification.type)
              )}
            >
              <div className="flex items-start gap-2">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && isConnected && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Listening for real-time updates...</p>
          </div>
        )}
      </div>

      {/* Connection Status Details */}
      {!isConnected && connectionState === 'error' && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Connection Lost</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Real-time updates are unavailable. Check your connection and try reconnecting.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineRealtime;