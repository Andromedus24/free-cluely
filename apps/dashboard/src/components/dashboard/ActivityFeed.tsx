"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  MessageSquare,
  Zap,
  Camera,
  Settings,
  ExternalLink
} from 'lucide-react';

export function ActivityFeed() {
  const { state } = useDashboard();

  const getEventIcon = (type: string, status: string) => {
    const iconProps = "w-4 h-4";

    switch (type) {
      case 'job':
        switch (status) {
          case 'success':
            return <CheckCircle className={`${iconProps} text-green-500`} />;
          case 'error':
            return <XCircle className={`${iconProps} text-red-500`} />;
          case 'warning':
            return <AlertTriangle className={`${iconProps} text-yellow-500`} />;
          default:
            return <Clock className={`${iconProps} text-blue-500`} />;
        }
      case 'screenshot':
        return <Camera className={`${iconProps} text-purple-500`} />;
      case 'plugin':
        return <Settings className={`${iconProps} text-gray-500`} />;
      case 'automation':
        return <Zap className={`${iconProps} text-orange-500`} />;
      case 'error':
        return <XCircle className={`${iconProps} text-red-500`} />;
      default:
        return <Info className={`${iconProps} text-blue-500`} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500 border-green-500/20 bg-green-500/10';
      case 'error':
        return 'text-red-500 border-red-500/20 bg-red-500/10';
      case 'warning':
        return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
      case 'info':
      default:
        return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {state.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as events occur</p>
              </div>
            ) : (
              state.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getEventIcon(activity.type, activity.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {activity.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(activity.status)}`}
                        >
                          {activity.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {activity.type}
                      </Badge>

                      {activity.type === 'job' && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {state.recentActivity.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View All Activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}