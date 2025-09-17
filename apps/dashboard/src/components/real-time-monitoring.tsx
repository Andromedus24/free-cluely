"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Zap,
  Server,
  HardDrive,
  Cpu,
  RefreshCw,
  Clock,
  Signal,
  Heart,
  Shield
} from 'lucide-react';
import { monitoring, AppStatus, SystemMetrics, MonitoringEvent } from '@/lib/real-time-monitoring';

interface RealTimeMonitoringProps {
  className?: string;
}

export default function RealTimeMonitoring({ className }: RealTimeMonitoringProps) {
  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<MonitoringEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initialize data
    setAppStatuses(monitoring.getAllAppStatuses());
    setSystemMetrics(monitoring.getSystemMetrics());
    setRecentEvents(monitoring.getRecentEvents());

    // Subscribe to real-time updates
    const unsubscribe = monitoring.subscribe((event) => {
      setRecentEvents(prev => [event, ...prev].slice(0, 10));
      setAppStatuses(monitoring.getAllAppStatuses());
    });

    // Update system metrics periodically
    const metricsInterval = setInterval(() => {
      setSystemMetrics(monitoring.getSystemMetrics());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(metricsInterval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setAppStatuses(monitoring.getAllAppStatuses());
    setSystemMetrics(monitoring.getSystemMetrics());
    setRecentEvents(monitoring.getRecentEvents());

    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = (status: AppStatus['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AppStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthColor = (health: AppStatus['health']) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: MonitoringEvent['severity']) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricIcon = (metric: keyof SystemMetrics) => {
    switch (metric) {
      case 'cpu':
        return <Cpu className="w-4 h-4" />;
      case 'memory':
        return <Server className="w-4 h-4" />;
      case 'disk':
        return <HardDrive className="w-4 h-4" />;
      case 'network':
        return <Signal className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Real-time Monitoring</h2>
            <p className="text-muted-foreground">Live system status and app connectivity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Signal className="w-3 h-3 mr-1" />
            Live
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(systemMetrics).filter(([key]) => key !== 'timestamp').map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {getMetricIcon(key as keyof SystemMetrics)}
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">{value.toFixed(1)}%</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* App Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              App Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {appStatuses.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`border ${getStatusColor(app.status)}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(app.status)}
                            <div>
                              <h3 className="font-semibold">{app.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Last active: {app.lastActive.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getHealthColor(app.health)}>
                                {app.health}
                              </Badge>
                              <Badge variant="outline">
                                {app.responseTime.toFixed(0)}ms
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {app.uptime.toFixed(1)}h uptime
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {recentEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-border/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="secondary" className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                            <div>
                              <h3 className="font-medium text-sm">{event.message}</h3>
                              <p className="text-xs text-muted-foreground">
                                {event.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.type.replace('_', ' ')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">
                  {appStatuses.filter(s => s.status === 'connected').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-2xl font-bold">
                  {appStatuses.filter(s => s.health === 'warning').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold">
                  {appStatuses.filter(s => s.status === 'error').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold">
                  {appStatuses.length > 0
                    ? (appStatuses.reduce((sum, app) => sum + app.uptime, 0) / appStatuses.length).toFixed(1)
                    : '0'
                  }h
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Avg Uptime</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}