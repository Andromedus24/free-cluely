'use client';

import React, { useState, useEffect } from 'react';
import { productivityMonitor, ProductivityMetrics, ActivityEvent, SessionData } from '@/services/productivity-monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Target,
  Clock,
  TrendingUp,
  Brain,
  Coffee,
  Users,
  Settings,
  Play,
  Pause,
  BarChart3,
  Calendar,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityDashboardProps {
  className?: string;
}

export function ProductivityDashboard({ className }: ProductivityDashboardProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<ProductivityMetrics>(productivityMonitor.getMetrics());
  const [currentSession, setCurrentSession] = useState<SessionData | null>(productivityMonitor.getCurrentSession());
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [realtimeActivity, setRealtimeActivity] = useState<ActivityEvent | null>(null);

  useEffect(() => {
    // Set up activity listener
    productivityMonitor.onActivity((event) => {
      setRealtimeActivity(event);
      // Clear activity after 3 seconds
      setTimeout(() => setRealtimeActivity(null), 3000);
    });

    // Set up metrics listener
    productivityMonitor.onMetrics((metrics) => {
      setCurrentMetrics(metrics);
      setCurrentSession(productivityMonitor.getCurrentSession());
    });

    // Load recent sessions
    setRecentSessions(productivityMonitor.getSavedSessions().slice(-5));

    // Check monitoring status
    const interval = setInterval(() => {
      setIsMonitoring(productivityMonitor.isActive);
      setCurrentSession(productivityMonitor.getCurrentSession());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        productivityMonitor.stopMonitoring();
      } else {
        await productivityMonitor.startMonitoring();
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getActivityColor = (type: string) => {
    const colors = {
      focus: 'bg-blue-500',
      break: 'bg-green-500',
      distraction: 'bg-red-500',
      meeting: 'bg-purple-500',
      deep_work: 'bg-indigo-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      focus: Target,
      break: Coffee,
      distraction: Activity,
      meeting: Users,
      deep_work: Brain
    };
    return icons[type as keyof typeof icons] || Activity;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const sessionDuration = currentSession
    ? (currentSession.end_time ? currentSession.end_time.getTime() : Date.now()) - currentSession.start_time.getTime()
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Productivity Monitoring</h2>
            <p className="text-muted-foreground">AI-powered activity tracking and insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Monitoring' : 'Inactive'}
          </Badge>
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? 'destructive' : 'default'}
            size="sm"
          >
            {isMonitoring ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      {realtimeActivity && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn('w-3 h-3 rounded-full animate-pulse', getActivityColor(realtimeActivity.type))} />
                <div>
                  <p className="font-medium capitalize">{realtimeActivity.type.replace('_', ' ')}</p>
                  <p className="text-sm text-muted-foreground">
                    {realtimeActivity.data.activity || 'Activity detected'}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {realtimeActivity.confidence.toFixed(0)}% confidence
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Session Stats */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Current Session</span>
              <Badge variant="outline">
                {formatDuration(sessionDuration / 1000)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {formatDuration(currentMetrics.focus_time)}
                </div>
                <div className="text-sm text-muted-foreground">Focus Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {formatDuration(currentMetrics.break_time)}
                </div>
                <div className="text-sm text-muted-foreground">Break Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {formatDuration(currentMetrics.distraction_time)}
                </div>
                <div className="text-sm text-muted-foreground">Distractions</div>
              </div>
              <div className="text-center">
                <div className={cn('text-2xl font-bold', getScoreColor(currentMetrics.productivity_score))}>
                  {currentMetrics.productivity_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Productivity</div>
              </div>
              <div className="text-center">
                <div className={cn('text-2xl font-bold', getScoreColor(currentMetrics.efficiency))}>
                  {currentMetrics.efficiency.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Efficiency</div>
              </div>
            </div>

            {/* Goals Progress */}
            {currentSession.goals && (
              <div className="space-y-3">
                <h4 className="font-medium">Session Goals</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Focus Target</span>
                      <span>{formatDuration(currentMetrics.focus_time)} / {formatDuration(currentSession.goals.focus_target)}</span>
                    </div>
                    <Progress
                      value={(currentMetrics.focus_time / currentSession.goals.focus_target) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Break Target</span>
                      <span>{formatDuration(currentMetrics.break_time)} / {formatDuration(currentSession.goals.break_target)}</span>
                    </div>
                    <Progress
                      value={(currentMetrics.break_time / currentSession.goals.break_target) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Focus Time</span>
                </div>
                <div className="text-2xl font-bold">{formatDuration(currentMetrics.focus_time)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm text-muted-foreground">Deep Work</span>
                </div>
                <div className="text-2xl font-bold">{formatDuration(currentMetrics.deep_work_time)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Productivity</span>
                </div>
                <div className={cn('text-2xl font-bold', getScoreColor(currentMetrics.productivity_score))}>
                  {currentMetrics.productivity_score.toFixed(0)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Efficiency</span>
                </div>
                <div className={cn('text-2xl font-bold', getScoreColor(currentMetrics.efficiency))}>
                  {currentMetrics.efficiency.toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentMetrics.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {currentMetrics.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Start a monitoring session to receive personalized recommendations
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Recent Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session, index) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {new Date(session.start_time).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration((session.end_time ? session.end_time.getTime() : Date.now()) - session.start_time.getTime()) / 1000}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={cn('font-bold', getScoreColor(session.metrics.productivity_score))}>
                          {session.metrics.productivity_score.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Productivity</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No previous sessions found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Monitoring Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Camera Monitoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable computer vision for activity detection
                    </p>
                  </div>
                  <Badge variant={productivityMonitor.getConfig().camera.enabled ? 'default' : 'secondary'}>
                    {productivityMonitor.getConfig().camera.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive productivity insights and reminders
                    </p>
                  </div>
                  <Badge variant={productivityMonitor.getConfig().notifications.enabled ? 'default' : 'secondary'}>
                    {productivityMonitor.getConfig().notifications.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Data Retention</h4>
                    <p className="text-sm text-muted-foreground">
                      Keep data for {productivityMonitor.getConfig().privacy.data_retention_days} days
                    </p>
                  </div>
                  <Badge variant="outline">
                    {productivityMonitor.getConfig().privacy.data_retention_days} days
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}