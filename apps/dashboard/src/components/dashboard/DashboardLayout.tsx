"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  RefreshCw,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Camera
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { state, loading, error, refreshData, config } = useDashboard();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <Badge variant="outline" className="gap-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor('healthy')}`} />
                System Healthy
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {error && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {error}
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{state.stats.totalJobs}</p>
                  <p className="text-xs text-muted-foreground">
                    {state.stats.completedJobs} completed
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Interactions</p>
                  <p className="text-2xl font-bold">{state.stats.aiInteractions}</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Automation</p>
                  <p className="text-2xl font-bold">{state.stats.automationSuccess}%</p>
                  <p className="text-xs text-muted-foreground">Success rate</p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold">${state.stats.revenueImpact}</p>
                  <p className="text-xs text-muted-foreground">Estimated</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {children}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">{state.systemHealth.cpu}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.systemHealth.cpu}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory</span>
                    <span className="text-sm font-medium">{state.systemHealth.memory}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.systemHealth.memory}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Disk</span>
                    <span className="text-sm font-medium">{state.systemHealth.disk}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.systemHealth.disk}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <h4 className="text-sm font-medium mb-3">Plugin Status</h4>
                  <div className="space-y-2">
                    {state.systemHealth.plugins.map((plugin, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{plugin.name}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(plugin.status)}`} />
                          <span className="text-xs text-muted-foreground">{plugin.uptime}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Camera className="w-4 h-4" />
                  Take Screenshot
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Start Chat
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Zap className="w-4 h-4" />
                  Run Automation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}