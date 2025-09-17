"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  Camera,
  MessageCircle,
  Zap,
  Settings,
  FileText,
  Plus,
  Search,
  Download,
  Upload,
  BarChart3,
  Users,
  Clock,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
  category: 'capture' | 'communication' | 'automation' | 'analysis' | 'management';
}

export function QuickActions() {
  const { createJob } = useDashboard();

  const quickActions: QuickAction[] = [
    {
      id: 'screenshot',
      title: 'Take Screenshot',
      description: 'Capture screen for analysis',
      icon: <Camera className="w-5 h-5" />,
      action: () => createJob('screenshot_analysis'),
      category: 'capture'
    },
    {
      id: 'chat',
      title: 'Start Chat',
      description: 'Begin conversation with AI',
      icon: <MessageCircle className="w-5 h-5" />,
      action: () => console.log('Start chat'),
      category: 'communication'
    },
    {
      id: 'automation',
      title: 'Run Automation',
      description: 'Execute automated workflow',
      icon: <Zap className="w-5 h-5" />,
      action: () => createJob('automation_workflow'),
      badge: 'New',
      category: 'automation'
    },
    {
      id: 'analyze',
      title: 'Analyze Files',
      description: 'Process documents or images',
      icon: <FileText className="w-5 h-5" />,
      action: () => createJob('file_analysis'),
      category: 'analysis'
    },
    {
      id: 'search',
      title: 'Smart Search',
      description: 'Find information across apps',
      icon: <Search className="w-5 h-5" />,
      action: () => console.log('Smart search'),
      category: 'management'
    },
    {
      id: 'export',
      title: 'Export Data',
      description: 'Download reports and analytics',
      icon: <Download className="w-5 h-5" />,
      action: () => console.log('Export data'),
      category: 'management'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'capture': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'communication': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'automation': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'analysis': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'management': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleAction = (action: QuickAction) => {
    try {
      action.action();
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-3 hover:bg-muted/50 transition-colors"
              onClick={() => handleAction(action)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="p-2 rounded bg-muted">
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-left">{action.title}</h4>
                  {action.badge && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {action.badge}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-left line-clamp-2">
                {action.description}
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${getCategoryColor(action.category)}`}
              >
                {action.category}
              </Badge>
            </Button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Most used: Screenshots, Chat, Automation
            </p>
            <Button variant="ghost" size="sm">
              Customize
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  status: 'success' | 'error' | 'warning';
}

function RecentAction({ icon, title, description, time, status }: RecentActionProps) {
  const statusColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{title}</h4>
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <div className="flex-shrink-0 text-xs text-muted-foreground">
        {time}
      </div>
    </div>
  );
}

export function RecentActions() {
  const recentActions = [
    {
      icon: <Camera className="w-4 h-4 text-purple-500" />,
      title: 'Screenshot Analysis',
      description: 'Completed analysis of desktop screenshot',
      time: '2m ago',
      status: 'success' as const
    },
    {
      icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
      title: 'AI Chat Session',
      description: 'Conversation about code optimization',
      time: '15m ago',
      status: 'success' as const
    },
    {
      icon: <Zap className="w-4 h-4 text-green-500" />,
      title: 'Email Automation',
      description: 'Processed 25 incoming emails',
      time: '1h ago',
      status: 'success' as const
    },
    {
      icon: <FileText className="w-4 h-4 text-orange-500" />,
      title: 'Document Analysis',
      description: 'Failed to analyze PDF document',
      time: '2h ago',
      status: 'error' as const
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentActions.map((action, index) => (
            <RecentAction
              key={index}
              icon={action.icon}
              title={action.title}
              description={action.description}
              time={action.time}
              status={action.status}
            />
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full">
            View All Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}