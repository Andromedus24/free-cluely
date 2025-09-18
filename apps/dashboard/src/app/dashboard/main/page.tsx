'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/services/api-service';
import { useAuth } from '@/services/auth-service';
import { useRealtime } from '@/services/realtime-service';
import { useVoiceAssistant } from '@/components/voice-assistant';
import { useProductivityMonitoring } from '@/components/productivity-monitoring';
import { useKnowledgeManagement } from '@/contexts/knowledge-context';
import { useMessaging } from '@/contexts/messaging-context';
import { use3DModeling } from '@/contexts/3d-modeling-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { AsyncErrorBoundary } from '@/components/async-error-boundary';
import {
  Activity,
  BarChart3,
  Brain,
  Clock,
  FileText,
  Hash,
  MessageSquare,
  Mic,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Target,
  Database,
  Globe,
  Layers,
  Palette,
  Shield
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalApps: number;
  activeUsers: number;
  messagesToday: number;
  productivityScore: number;
  systemHealth: number;
  storageUsed: number;
  apiCalls: number;
  errorsLogged: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export default function DashboardMainPage() {
  const { user } = useAuth();
  const { api, useQuery, useMutation } = useApi();
  const { service: realtimeService } = useRealtime();
  const { isActive: voiceActive } = useVoiceAssistant();
  const { currentSession: productivitySession } = useProductivityMonitoring();
  const { datasets: knowledgeItems } = useKnowledgeManagement();
  const { channels: messagingChannels } = useMessaging();
  const { currentScene: modelingScene } = use3DModeling();

  const [stats, setStats] = useState<DashboardStats>({
    totalApps: 0,
    activeUsers: 0,
    messagesToday: 0,
    productivityScore: 0,
    systemHealth: 100,
    storageUsed: 0,
    apiCalls: 0,
    errorsLogged: 0,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user analytics
      const analyticsResponse = await useQuery('/users/me/analytics');
      if (analyticsResponse.success) {
        const analytics = analyticsResponse.data;
        setStats(prev => ({
          ...prev,
          totalApps: analytics.total_apps || 0,
          totalActivity: analytics.total_activity || 0,
        }));
      }

      // Load activity logs
      const activityResponse = await useQuery('/users/me/activity?limit=10');
      if (activityResponse.success) {
        const activities = activityResponse.data.data.map((log: any) => ({
          id: log.id,
          type: log.action,
          title: log.action.replace('_', ' ').toUpperCase(),
          description: `${log.resource_type} - ${log.resource_id}`,
          timestamp: log.created_at,
        }));
        setRecentActivity(activities);
      }

      // Check realtime connection
      setRealtimeStatus(realtimeService.getConnectionStatus().connected);

      // Update service-specific stats
      setStats(prev => ({
        ...prev,
        productivityScore: productivitySession?.productivity_score || 0,
        messagesToday: messagingChannels.reduce((total, channel) =>
          total + (channel.messages?.length || 0), 0),
        storageUsed: knowledgeItems.size * 2.5, // Mock: 2.5MB per knowledge item
      }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Set up realtime subscriptions
    const unsubscribeActivity = realtimeService.useBroadcast('activity', (event) => {
      setRecentActivity(prev => [event.payload, ...prev].slice(0, 10));
    });

    const unsubscribePresence = realtimeService.usePresence((presences) => {
      setStats(prev => ({
        ...prev,
        activeUsers: presences.filter(p => p.userId !== user?.id).length,
      }));
    });

    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      unsubscribeActivity();
      unsubscribePresence();
      clearInterval(interval);
    };
  }, [user, productivitySession, messagingChannels, knowledgeItems]);

  // Calculate system health
  const calculateSystemHealth = () => {
    const factors = [
      realtimeStatus ? 1 : 0,          // Realtime connection
      voiceActive ? 1 : 0,              // Voice assistant
      productivitySession ? 1 : 0,      // Productivity monitoring
      modelingScene ? 1 : 0,            // 3D modeling
      messagingChannels.length > 0 ? 1 : 0, // Messaging
      knowledgeItems.size > 0 ? 1 : 0, // Knowledge management
    ];

    return (factors.filter(Boolean).length / factors.length) * 100;
  };

  const systemHealth = calculateSystemHealth();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary context="dashboard-page">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.full_name || user?.email || 'User'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={realtimeStatus ? 'default' : 'secondary'}>
              {realtimeStatus ? 'Real-time Connected' : 'Offline'}
            </Badge>
            <Badge variant="outline">
              {systemHealth >= 80 ? 'Healthy' : systemHealth >= 50 ? 'Degraded' : 'Issues'}
            </Badge>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Productivity Score */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productivityScore.toFixed(0)}%</div>
              <Progress value={stats.productivityScore} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on activity and focus
              </p>
            </CardContent>
          </Card>

          {/* Active Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Services</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[voiceActive, productivitySession, modelingScene, messagingChannels.length > 0].filter(Boolean).length}/4
              </div>
              <div className="flex gap-1 mt-2">
                {voiceActive && <Badge variant="outline" className="text-xs">Voice</Badge>}
                {productivitySession && <Badge variant="outline" className="text-xs">Productivity</Badge>}
                {modelingScene && <Badge variant="outline" className="text-xs">3D</Badge>}
                {messagingChannels.length > 0 && <Badge variant="outline" className="text-xs">Messaging</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Items</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{knowledgeItems.size}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatBytes(stats.storageUsed)} used
              </p>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.toFixed(0)}%</div>
              <Progress value={systemHealth} className="mt-2" />
              <div className="flex items-center gap-1 mt-2">
                {systemHealth >= 80 ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : systemHealth >= 50 ? (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {systemHealth >= 80 ? 'All systems operational' :
                   systemHealth >= 50 ? 'Some services degraded' : 'Issues detected'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Link href="/voice-assistant">
                        <Button variant="outline" className="w-full h-20 flex flex-col">
                          <Mic className="h-6 w-6 mb-2" />
                          <span className="text-xs">Voice Assistant</span>
                        </Button>
                      </Link>
                      <Link href="/productivity">
                        <Button variant="outline" className="w-full h-20 flex flex-col">
                          <BarChart3 className="h-6 w-6 mb-2" />
                          <span className="text-xs">Productivity</span>
                        </Button>
                      </Link>
                      <Link href="/knowledge">
                        <Button variant="outline" className="w-full h-20 flex flex-col">
                          <Brain className="h-6 w-6 mb-2" />
                          <span className="text-xs">Knowledge</span>
                        </Button>
                      </Link>
                      <Link href="/3d-modeling">
                        <Button variant="outline" className="w-full h-20 flex flex-col">
                          <Layers className="h-6 w-6 mb-2" />
                          <span className="text-xs">3D Modeling</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${realtimeStatus ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>Real-time Connection</span>
                        </div>
                        <Badge variant={realtimeStatus ? 'default' : 'destructive'}>
                          {realtimeStatus ? 'Online' : 'Offline'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${voiceActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span>Voice Assistant</span>
                        </div>
                        <Badge variant={voiceActive ? 'default' : 'secondary'}>
                          {voiceActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${productivitySession ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span>Productivity Monitoring</span>
                        </div>
                        <Badge variant={productivitySession ? 'default' : 'secondary'}>
                          {productivitySession ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${modelingScene ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span>3D Modeling</span>
                        </div>
                        <Badge variant={modelingScene ? 'default' : 'secondary'}>
                          {modelingScene ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${messagingChannels.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span>Messaging</span>
                        </div>
                        <Badge variant={messagingChannels.length > 0 ? 'default' : 'secondary'}>
                          {messagingChannels.length > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                {activity.type === 'login' && <Users className="h-4 w-4" />}
                                {activity.type === 'message' && <MessageSquare className="h-4 w-4" />}
                                {activity.type === 'create' && <FileText className="h-4 w-4" />}
                                {activity.type === 'update' && <Settings className="h-4 w-4" />}
                                {activity.type === 'delete' && <Hash className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium">{activity.title}</p>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {formatTimeAgo(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Storage Usage</span>
                          <span className="text-sm">{formatBytes(stats.storageUsed)}</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">API Calls Today</span>
                          <span className="text-sm">{stats.apiCalls}</span>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Error Rate</span>
                          <span className="text-sm">{stats.errorsLogged}</span>
                        </div>
                        <Progress value={5} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Sparkles className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">AI Services</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          OpenAI, Gemini, Claude integration
                        </p>
                        <Badge variant="outline" className="mt-2">Connected</Badge>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Database</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          PostgreSQL with Supabase
                        </p>
                        <Badge variant="outline" className="mt-2">Connected</Badge>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Globe className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">Real-time</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WebSocket connections
                        </p>
                        <Badge variant={realtimeStatus ? "outline" : "destructive"} className="mt-2">
                          {realtimeStatus ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Palette className="h-5 w-5 text-orange-500" />
                          <span className="font-medium">Storage</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          File and media storage
                        </p>
                        <Badge variant="outline" className="mt-2">Available</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Voice Assistant Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="h-5 w-5" />
                  <span>Voice Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={voiceActive ? 'default' : 'secondary'}>
                      {voiceActive ? 'Listening' : 'Ready'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Say "Hey Atlas" to activate
                  </p>
                  <Link href="/voice-assistant">
                    <Button variant="outline" size="sm" className="w-full">
                      Open Voice Assistant
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Active Now</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-sm text-muted-foreground">
                    Users online
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Knowledge Items</span>
                    <span className="font-medium">{knowledgeItems.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages Today</span>
                    <span className="font-medium">{stats.messagesToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Apps Installed</span>
                    <span className="font-medium">{stats.totalApps}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}