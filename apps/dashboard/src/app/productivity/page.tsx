'use client';

import { useState } from 'react';
import { ProductivityDashboard } from '@/components/productivity-monitoring';
import { ProductivityWidget } from '@/components/productivity-monitoring';
import { useProductivity } from '@/components/productivity-monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Brain,
  Target,
  TrendingUp,
  Settings,
  Download,
  Calendar,
  Clock,
  Award,
  Zap,
  Coffee,
  Activity
} from 'lucide-react';

export default function ProductivityPage() {
  const {
    isMonitoring,
    currentMetrics,
    currentSession,
    recentSessions,
    startMonitoring,
    stopMonitoring
  } = useProductivity();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return Award;
    if (score >= 60) => Target;
    return Activity;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  // Calculate overall stats
  const totalSessionTime = recentSessions.reduce((total, session) => {
    const duration = (session.end_time ? session.end_time.getTime() : Date.now()) - session.start_time.getTime();
    return total + duration;
  }, 0);

  const averageProductivity = recentSessions.length > 0
    ? recentSessions.reduce((sum, session) => sum + session.metrics.productivity_score, 0) / recentSessions.length
    : 0;

  const bestSession = recentSessions.reduce((best, session) =>
    session.metrics.productivity_score > (best?.metrics.productivity_score || 0) ? session : best,
    null as any
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Productivity Monitoring</h1>
            <p className="text-muted-foreground">AI-powered activity tracking and insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Monitoring' : 'Inactive'}
          </Badge>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? 'destructive' : 'default'}
            size="sm"
          >
            {isMonitoring ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Time</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(totalSessionTime / 1000)}</div>
            <div className="text-xs text-muted-foreground">
              {recentSessions.length} sessions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Average Score</span>
            </div>
            <div className={cn('text-2xl font-bold', getScoreColor(averageProductivity))}>
              {averageProductivity.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {getScoreLabel(averageProductivity)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Focus Time</span>
            </div>
            <div className="text-2xl font-bold text-purple-500">
              {formatDuration(recentSessions.reduce((total, session) => total + session.metrics.focus_time, 0))}
            </div>
            <div className="text-xs text-muted-foreground">
              Total focus time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Deep Work</span>
            </div>
            <div className="text-2xl font-bold text-indigo-500">
              {formatDuration(recentSessions.reduce((total, session) => total + session.metrics.deep_work_time, 0))}
            </div>
            <div className="text-xs text-muted-foreground">
              Quality sessions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dashboard */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <ProductivityDashboard />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Productivity Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Productivity Trend */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Productivity Trend</h4>
                      <div className="space-y-2">
                        {recentSessions.slice(-7).map((session, index) => {
                          const ScoreIcon = getScoreIcon(session.metrics.productivity_score);
                          return (
                            <div key={session.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center space-x-2">
                                <ScoreIcon className={cn('h-3 w-3', getScoreColor(session.metrics.productivity_score))} />
                                <span className="text-sm">
                                  {new Date(session.start_time).toLocaleDateString()}
                                </span>
                              </div>
                              <span className={cn('text-sm font-medium', getScoreColor(session.metrics.productivity_score))}>
                                {session.metrics.productivity_score.toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Best Session */}
                    {bestSession && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Best Session</h4>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-700 dark:text-green-300">
                              {new Date(bestSession.start_time).toLocaleDateString()}
                            </span>
                            <Badge className="bg-green-500 text-white">
                              {bestSession.metrics.productivity_score.toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="ml-1">
                                {formatDuration((bestSession.end_time ? bestSession.end_time.getTime() : Date.now()) - bestSession.start_time.getTime()) / 1000}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Focus:</span>
                              <span className="ml-1">{formatDuration(bestSession.metrics.focus_time)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Monitoring Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Camera Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable computer vision for advanced activity detection
                      </p>
                      <Badge variant="outline">Privacy Mode Enabled</Badge>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive insights about your productivity patterns
                      </p>
                      <Badge variant="default">Enabled</Badge>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Data Privacy</h4>
                      <p className="text-sm text-muted-foreground">
                        All data is processed locally and stored securely
                      </p>
                      <Badge variant="outline">Local Processing</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Session Widget */}
          {currentSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-base">Current Session</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-500">
                      {formatDuration(currentMetrics.focus_time)}
                    </div>
                    <div className="text-xs text-muted-foreground">Focus</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-500">
                      {formatDuration(currentMetrics.deep_work_time)}
                    </div>
                    <div className="text-xs text-muted-foreground">Deep Work</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Productivity</span>
                    <span className={cn('font-medium', getScoreColor(currentMetrics.productivity_score))}>
                      {currentMetrics.productivity_score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Duration</span>
                    <span>{formatDuration((Date.now() - currentSession.start_time.getTime()) / 1000)}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={stopMonitoring}>
                  End Session
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="text-base">Recent Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSessions.slice(-3).map((session) => {
                  const ScoreIcon = getScoreIcon(session.metrics.productivity_score);
                  const duration = (session.end_time ? session.end_time.getTime() : Date.now()) - session.start_time.getTime();

                  return (
                    <div key={session.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <ScoreIcon className={cn('h-3 w-3', getScoreColor(session.metrics.productivity_score))} />
                          <span className="text-xs font-medium">
                            {new Date(session.start_time).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={cn('text-xs font-bold', getScoreColor(session.metrics.productivity_score))}>
                          {session.metrics.productivity_score.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(duration / 1000)} • Focus: {formatDuration(session.metrics.focus_time)}
                      </div>
                    </div>
                  );
                })}

                {recentSessions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No sessions yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span className="text-base">Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? (
                  <>
                    <Coffee className="h-3 w-3 mr-2" />
                    Take Break
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-2" />
                    Start Focus
                  </>
                )}
              </Button>

              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-3 w-3 mr-2" />
                Export Data
              </Button>

              <Button variant="outline" size="sm" className="w-full justify-start">
                <Settings className="h-3 w-3 mr-2" />
                Configure Goals
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}