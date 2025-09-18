'use client';

import React from 'react';
import { useProductivity } from './ProductivityProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingButton } from '@/components/ui/loading-states';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useGlobalErrorHandling } from '@/providers/ErrorHandlingProvider';
import {
  BarChart3,
  Play,
  Pause,
  Target,
  TrendingUp,
  Brain,
  Activity,
  Coffee,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function ProductivityWidget({ className, variant = 'compact' }: ProductivityWidgetProps) {
  const {
    isMonitoring,
    currentMetrics,
    currentSession,
    startMonitoring,
    stopMonitoring,
    getSessions
  } = useProductivity();
  const { handleError } = useGlobalErrorHandling();
  const [loading, setLoading] = React.useState(false);

  const recentSessions = getSessions().slice(-3);
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Target;
    return Activity;
  };

  const handleStartMonitoring = async () => {
    setLoading(true);
    try {
      await startMonitoring();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to start monitoring'), {
        type: 'error',
        title: 'Monitoring Error',
        message: 'Failed to start productivity monitoring',
        component: 'ProductivityWidget'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      await stopMonitoring();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to stop monitoring'), {
        type: 'error',
        title: 'Monitoring Error',
        message: 'Failed to stop productivity monitoring',
        component: 'ProductivityWidget'
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <ErrorBoundary context="ProductivityWidget">
        <Card className={className}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Productivity</span>
                {loading && <LoadingSpinner size="sm" />}
              </div>
              <Badge variant={isMonitoring ? 'default' : 'secondary'} className="text-xs">
                {isMonitoring ? 'Active' : 'Offline'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-blue-500">
                  {formatDuration(currentMetrics.focus_time)}
                </div>
                <div className="text-xs text-muted-foreground">Focus</div>
              </div>
              <div>
                <div className={cn('text-lg font-bold', getScoreColor(currentMetrics.productivity_score))}>
                  {currentMetrics.productivity_score.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            </div>

            <LoadingButton
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              variant={isMonitoring ? 'destructive' : 'default'}
              size="sm"
              className="w-full"
              isLoading={loading}
              loadingText={isMonitoring ? "Stopping..." : "Starting..."}
            >
              {isMonitoring ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </LoadingButton>
          </CardContent>
        </Card>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary context="ProductivityWidgetDetailed">
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Productivity Monitor</span>
              {loading && <LoadingSpinner size="sm" />}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                {isMonitoring ? 'Monitoring' : 'Inactive'}
              </Badge>
              <LoadingButton
                onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                variant={isMonitoring ? 'destructive' : 'default'}
                size="sm"
                isLoading={loading}
                loadingText={isMonitoring ? "Stopping..." : "Starting..."}
              >
                {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </LoadingButton>
            </div>
          </CardTitle>
        </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Session */}
        {currentSession && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Session</span>
              <Badge variant="outline" className="text-xs">
                {formatDuration((Date.now() - currentSession.start_time.getTime()) / 1000)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Focus</span>
                </div>
                <div className="font-medium">{formatDuration(currentMetrics.focus_time)}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Brain className="h-3 w-3 text-indigo-500" />
                  <span className="text-xs text-muted-foreground">Deep Work</span>
                </div>
                <div className="font-medium">{formatDuration(currentMetrics.deep_work_time)}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Coffee className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Breaks</span>
                </div>
                <div className="font-medium">{formatDuration(currentMetrics.break_time)}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Activity className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-muted-foreground">Distractions</span>
                </div>
                <div className="font-medium">{formatDuration(currentMetrics.distraction_time)}</div>
              </div>
            </div>

            {/* Productivity Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  {React.createElement(getScoreIcon(currentMetrics.productivity_score), {
                    className: 'h-3 w-3',
                    className: cn('h-3 w-3', getScoreColor(currentMetrics.productivity_score))
                  })}
                  <span>Productivity Score</span>
                </div>
                <span className={cn('font-medium', getScoreColor(currentMetrics.productivity_score))}>
                  {currentMetrics.productivity_score.toFixed(0)}%
                </span>
              </div>
              <Progress value={currentMetrics.productivity_score} className="h-2" />
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Sessions</div>
            <div className="space-y-1">
              {recentSessions.map((session, index) => {
                const duration = (session.end_time ? session.end_time.getTime() : Date.now()) - session.start_time.getTime();
                const ScoreIcon = getScoreIcon(session.metrics.productivity_score);

                return (
                  <div key={session.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                    <div className="flex items-center space-x-2">
                      <ScoreIcon className={cn('h-3 w-3', getScoreColor(session.metrics.productivity_score))} />
                      <span>{new Date(session.start_time).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{formatDuration(duration / 1000)}</span>
                      <span className={cn('font-medium', getScoreColor(session.metrics.productivity_score))}>
                        {session.metrics.productivity_score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentSession && recentSessions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start monitoring to track your productivity</p>
          </div>
        )}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}

// Mini productivity indicator for header or sidebar
export function ProductivityIndicator() {
  const { isMonitoring, currentMetrics } = useProductivity();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-sm text-muted-foreground">
        {isMonitoring ? 'Productivity: ' : 'Monitor'}
      </span>
      {isMonitoring && (
        <Badge variant="outline" className="text-xs">
          {currentMetrics.productivity_score.toFixed(0)}%
        </Badge>
      )}
    </div>
  );
}