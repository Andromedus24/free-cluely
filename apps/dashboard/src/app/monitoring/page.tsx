"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RealTimeMonitoring from '@/components/real-time-monitoring';
import {
  Activity,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowLeft,
  BarChart3,
  Database,
  Wifi
} from 'lucide-react';
import Link from 'next/link';

export default function MonitoringPage() {
  const [selectedView, setSelectedView] = useState<'overview' | 'apps' | 'system' | 'events'>('overview');

  const monitoringStats = [
    { label: 'Apps Monitored', value: '12', icon: 'Database', color: 'text-blue-600', change: '+2' },
    { label: 'System Health', value: '98%', icon: 'Heart', color: 'text-green-600', change: '+1%' },
    { label: 'Avg Response Time', value: '45ms', icon: 'Zap', color: 'text-yellow-600', change: '-5ms' },
    { label: 'Uptime', value: '99.9%', icon: 'Clock', color: 'text-emerald-600', change: '+0.1%' }
  ];

  const features = [
    {
      title: 'Real-time Status',
      description: 'Live monitoring of all connected applications with instant updates',
      icon: 'Activity',
      color: 'text-blue-600'
    },
    {
      title: 'Health Monitoring',
      description: 'Comprehensive health checks and performance metrics',
      icon: 'Heart',
      color: 'text-green-600'
    },
    {
      title: 'Event Tracking',
      description: 'Detailed event logging with severity-based notifications',
      icon: 'Shield',
      color: 'text-purple-600'
    },
    {
      title: 'System Metrics',
      description: 'CPU, memory, disk, and network usage monitoring',
      icon: 'BarChart3',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Activity className="w-8 h-8 text-primary" />
                  System Monitoring
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time application and system health monitoring
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <Wifi className="w-4 h-4 mr-2" />
              Live Monitoring
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {monitoringStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <stat.icon className={`w-6 h-6 ${stat.color} opacity-50`} />
                      <Badge variant="outline" className="text-xs">
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Feature Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Monitoring Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-border/50 hover:border-primary/50 transition-colors h-full">
                    <CardContent className="pt-6 text-center">
                      <feature.icon className={`w-12 h-12 mx-auto mb-4 ${feature.color}`} />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Monitoring Component */}
        <RealTimeMonitoring />

        {/* Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">All Systems Operational</span>
                  </div>
                  <span className="text-sm text-green-600">99.9% uptime</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Optimal Performance</span>
                  </div>
                  <span className="text-sm text-blue-600">45ms avg response</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium">Minor Alerts</span>
                  </div>
                  <span className="text-sm text-yellow-600">2 warnings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Slack reconnected</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Performance optimization completed</p>
                    <p className="text-xs text-muted-foreground">5 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Database className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">GitHub sync completed</p>
                    <p className="text-xs text-muted-foreground">8 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">High memory usage detected</p>
                    <p className="text-xs text-muted-foreground">12 minutes ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}