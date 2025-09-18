'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Trash2, Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { logger } from '@/lib/logger';
import { ErrorReportingService } from '@/services/error-reporting-service';

interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  category: 'cache' | 'storage' | 'network' | 'state' | 'modules';
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<boolean>;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}

interface RecoveryPanelProps {
  isVisible?: boolean;
  onRecoveryComplete?: (actions: RecoveryAction[]) => void;
}

export function RecoveryPanel({ isVisible = false, onRecoveryComplete }: RecoveryPanelProps) {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorReportingService] = useState(() => new ErrorReportingService());

  useEffect(() => {
    initializeRecoveryActions();
  }, []);

  const initializeRecoveryActions = () => {
    const recoveryActions: RecoveryAction[] = [
      {
        id: 'clear-browser-cache',
        name: 'Clear Browser Cache',
        description: 'Clear browser cache and service workers',
        category: 'cache',
        priority: 'high',
        execute: async () => {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          return true;
        },
        status: 'idle',
      },
      {
        id: 'clear-local-storage',
        name: 'Clear Local Storage',
        description: 'Clear application data from local storage',
        category: 'storage',
        priority: 'medium',
        execute: async () => {
          const keys = Object.keys(localStorage);
          const appKeys = keys.filter(key =>
            key.startsWith('atlas-') ||
            key.includes('cache') ||
            key.includes('state') ||
            key.includes('session')
          );
          appKeys.forEach(key => localStorage.removeItem(key));
          return true;
        },
        status: 'idle',
      },
      {
        id: 'clear-session-storage',
        name: 'Clear Session Storage',
        description: 'Clear temporary session data',
        category: 'storage',
        priority: 'low',
        execute: async () => {
          sessionStorage.clear();
          return true;
        },
        status: 'idle',
      },
      {
        id: 'reset-connections',
        name: 'Reset Network Connections',
        description: 'Close and restart WebSocket and network connections',
        category: 'network',
        priority: 'high',
        execute: async () => {
          // Close any existing WebSocket connections
          if ((window as any).atlasWebSockets) {
            Object.values((window as any).atlasWebSockets).forEach((ws: any) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
            });
          }
          return true;
        },
        status: 'idle',
      },
      {
        id: 'reset-service-workers',
        name: 'Reset Service Workers',
        description: 'Unregister and reset service workers',
        category: 'modules',
        priority: 'medium',
        execute: async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }
          return true;
        },
        status: 'idle',
      },
      {
        id: 'clear-error-reports',
        name: 'Clear Error Reports',
        description: 'Clear stored error reports and logs',
        category: 'storage',
        priority: 'low',
        execute: async () => {
          errorReportingService.clearStoredReports();
          const reports = localStorage.getItem('atlas-error-reports');
          if (reports) {
            localStorage.removeItem('atlas-error-reports');
          }
          return true;
        },
        status: 'idle',
      },
      {
        id: 'reload-app-state',
        name: 'Reload App State',
        description: 'Reset application state to default values',
        category: 'state',
        priority: 'critical',
        execute: async () => {
          // Trigger state reset through custom event
          window.dispatchEvent(new CustomEvent('atlas-state-reset'));
          return true;
        },
        status: 'idle',
      },
      {
        id: 'reset-permissions',
        name: 'Reset Permissions',
        description: 'Clear and re-request application permissions',
        category: 'state',
        priority: 'medium',
        execute: async () => {
          // Clear permission caches
          localStorage.removeItem('atlas-permissions');
          return true;
        },
        status: 'idle',
      },
    ];

    setActions(recoveryActions);
  };

  const executeRecoveryAction = async (action: RecoveryAction): Promise<boolean> => {
    setActions(prev => prev.map(a =>
      a.id === action.id ? { ...a, status: 'running' as const } : a
    ));

    try {
      logger.info('Executing recovery action', { action: action.id, name: action.name });

      const result = await action.execute();

      if (result) {
        setActions(prev => prev.map(a =>
          a.id === action.id ? { ...a, status: 'completed' as const } : a
        ));
        logger.info('Recovery action completed successfully', { action: action.id });
        return true;
      } else {
        throw new Error('Action returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setActions(prev => prev.map(a =>
        a.id === action.id ? {
          ...a,
          status: 'failed' as const,
          error: errorMessage
        } : a
      ));

      logger.error('Recovery action failed', {
        action: action.id,
        error: errorMessage,
      });

      return false;
    }
  };

  const executeAllRecoveryActions = async () => {
    setIsRunning(true);
    setProgress(0);

    const sortedActions = [...actions].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const totalActions = sortedActions.length;
    let completedActions = 0;

    for (const action of sortedActions) {
      if (action.status === 'idle') {
        await executeRecoveryAction(action);
      }
      completedActions++;
      setProgress((completedActions / totalActions) * 100);
    }

    setIsRunning(false);

    if (onRecoveryComplete) {
      onRecoveryComplete(actions);
    }

    logger.info('Recovery process completed', {
      totalActions,
      successfulActions: actions.filter(a => a.status === 'completed').length,
      failedActions: actions.filter(a => a.status === 'failed').length,
    });
  };

  const resetRecoveryActions = () => {
    setActions(prev => prev.map(action => ({
      ...action,
      status: 'idle' as const,
      error: undefined,
    })));
    setProgress(0);
  };

  const getStats = () => {
    const total = actions.length;
    const completed = actions.filter(a => a.status === 'completed').length;
    const failed = actions.filter(a => a.status === 'failed').length;
    const running = actions.filter(a => a.status === 'running').length;

    return { total, completed, failed, running };
  };

  const stats = getStats();

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Recovery Panel
            </CardTitle>
            <CardDescription>
              Diagnose and recover from application issues
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={stats.failed > 0 ? 'destructive' : stats.completed === stats.total ? 'default' : 'secondary'}>
              {stats.completed}/{stats.total} Complete
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Recovery Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={executeAllRecoveryActions}
            disabled={isRunning}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Recovery...' : 'Run All Recovery Actions'}
          </Button>

          <Button
            onClick={resetRecoveryActions}
            variant="outline"
            disabled={isRunning}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Recovery actions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Recovery Actions</h3>
          <div className="grid gap-3">
            {actions.map((action) => (
              <Card key={action.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{action.name}</h4>
                      <Badge variant={
                        action.priority === 'critical' ? 'destructive' :
                        action.priority === 'high' ? 'default' :
                        action.priority === 'medium' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {action.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {action.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {action.description}
                    </p>
                    {action.error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-2">
                        <p className="text-xs text-destructive">{action.error}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {action.status === 'idle' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeRecoveryAction(action)}
                        disabled={isRunning}
                      >
                        Run
                      </Button>
                    )}
                    {action.status === 'running' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {action.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {action.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">User Agent:</span>
              <p className="text-muted-foreground truncate">
                {navigator.userAgent.split(' ')[0]}
              </p>
            </div>
            <div>
              <span className="font-medium">URL:</span>
              <p className="text-muted-foreground truncate">
                {window.location.href}
              </p>
            </div>
            <div>
              <span className="font-medium">Memory Usage:</span>
              <p className="text-muted-foreground">
                {(performance as any).memory ?
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` :
                  'Not available'
                }
              </p>
            </div>
            <div>
              <span className="font-medium">Connection:</span>
              <p className="text-muted-foreground">
                {navigator.onLine ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecoveryPanel;