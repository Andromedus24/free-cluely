"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function StatCard({ title, value, change, icon, description, color }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {change && (
            <Badge variant="outline" className={`gap-1 ${
              change.type === 'increase' ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'
            }`}>
              {change.type === 'increase' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change.value)}%
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold mb-1">{value}</p>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsOverview() {
  const { state } = useDashboard();

  const successRate = state.stats.totalJobs > 0
    ? Math.round((state.stats.completedJobs / state.stats.totalJobs) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Jobs"
        value={state.stats.totalJobs}
        change={{ value: 12, type: 'increase' }}
        icon={<BarChart3 className="w-6 h-6" />}
        description={`${state.stats.completedJobs} completed, ${state.stats.failedJobs} failed`}
        color="blue"
      />

      <StatCard
        title="AI Interactions"
        value={state.stats.aiInteractions.toLocaleString()}
        change={{ value: 8, type: 'increase' }}
        icon={<Activity className="w-6 h-6" />}
        description="Chat sessions and assistant usage"
        color="purple"
      />

      <StatCard
        title="Automation Success"
        value={`${state.stats.automationSuccess}%`}
        change={{ value: 3, type: 'increase' }}
        icon={<Zap className="w-6 h-6" />}
        description="Workflow completion rate"
        color="green"
      />

      <StatCard
        title="Revenue Impact"
        value={`$${state.stats.revenueImpact.toLocaleString()}`}
        change={{ value: 15, type: 'increase' }}
        icon={<DollarSign className="w-6 h-6" />}
        description="Estimated value from AI assistance"
        color="orange"
      />
    </div>
  );
}

export function DetailedStats() {
  const { state } = useDashboard();

  const completionRate = state.stats.totalJobs > 0
    ? (state.stats.completedJobs / state.stats.totalJobs) * 100
    : 0;

  const failureRate = state.stats.totalJobs > 0
    ? (state.stats.failedJobs / state.stats.totalJobs) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Job Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Job Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Completion Rate</span>
              <span className="text-sm font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Failure Rate</span>
              <span className="text-sm font-medium">{failureRate.toFixed(1)}%</span>
            </div>
            <Progress value={failureRate} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{state.stats.completedJobs}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{state.stats.totalJobs - state.stats.completedJobs - state.stats.failedJobs}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{state.stats.failedJobs}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plugin Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Plugin Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Plugins</span>
              <span className="text-sm font-medium">{state.stats.activePlugins}</span>
            </div>

            <div className="space-y-2">
              {state.systemHealth.plugins.map((plugin, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{plugin.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      plugin.status === 'healthy' ? 'bg-green-500' :
                      plugin.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs text-muted-foreground">{plugin.uptime}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">CPU Usage</span>
                <span className="text-sm font-medium">{state.systemHealth.cpu}%</span>
              </div>
              <Progress value={state.systemHealth.cpu} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Memory</span>
                <span className="text-sm font-medium">{state.systemHealth.memory}%</span>
              </div>
              <Progress value={state.systemHealth.memory} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Disk Space</span>
                <span className="text-sm font-medium">{state.systemHealth.disk}%</span>
              </div>
              <Progress value={state.systemHealth.disk} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}