'use client';

import { useState } from 'react';
import { MessagingDashboard } from '@/components/messaging';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Users,
  Hash,
  Bot,
  RefreshCw,
  Settings,
  Search,
  Plus,
  Filter
} from 'lucide-react';

export default function MessagingPage() {
  const {
    channels,
    users,
    messages,
    templates,
    automationRules,
    isLoading,
    error,
    currentChannel,
    currentUser,
    createChannel,
    refreshData
  } = useMessaging();

  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const stats = {
    totalMessages: messages.length,
    totalChannels: channels.length,
    totalUsers: users.length,
    totalTemplates: templates.length,
    totalAutomationRules: automationRules.length,
    unreadMessages: messages.filter(m => !m.readBy?.includes(currentUser?.id)).length
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading messaging hub...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <Button onClick={refreshData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Messaging Hub</h1>
            <p className="text-muted-foreground">AI-powered social messaging and automation platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-xs">
            <Bot className="w-3 h-3 mr-1" />
            AI Enhanced
          </Badge>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateChannel(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Messages</div>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Channels</div>
            <div className="text-2xl font-bold">{stats.totalChannels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Users</div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Templates</div>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Automation</div>
            <div className="text-2xl font-bold">{stats.totalAutomationRules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Unread</div>
            <div className="text-2xl font-bold text-red-500">{stats.unreadMessages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <MessagingDashboard />
    </div>
  );
}