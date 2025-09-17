"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
  MoreVertical,
  Eye,
  Trash2
} from 'lucide-react';

export function JobManagement() {
  const { state, createJob } = useDashboard();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'running':
        return <Play className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
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

  const handleCreateJob = async () => {
    await createJob('screenshot_analysis', {
      source: 'manual',
      priority: 'normal'
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Active Jobs</CardTitle>
          <Button size="sm" onClick={handleCreateJob}>
            Create Job
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {state.jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active jobs</p>
              <p className="text-sm">Create a job to get started</p>
            </div>
          ) : (
            state.jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted`}>
                    {getStatusIcon(job.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium capitalize">
                        {job.type.replace('_', ' ')}
                      </h4>
                      <Badge variant="outline" className="gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(job.status)}`} />
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatTimeAgo(job.createdAt)}</span>
                      {job.metadata && (
                        <span>
                          {Object.entries(job.metadata).map(([key, value]) => (
                            <span key={key}>
                              {key}: {value}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    {job.status === 'running' && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.progress}% complete
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>

                  {job.status === 'running' && (
                    <Button variant="ghost" size="sm">
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}

                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {state.jobs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View All Jobs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}