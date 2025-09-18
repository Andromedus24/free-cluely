'use client';

import React, { useState, useEffect } from 'react';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Hash,
  Users,
  Bell,
  TrendingUp,
  Activity,
  Plus,
  MoreHorizontal,
  Zap,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagingWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function MessagingWidget({ className, variant = 'compact' }: MessagingWidgetProps) {
  const {
    messages,
    channels,
    users,
    currentChannel,
    currentUser,
    setCurrentChannel,
    createChannel
  } = useMessaging();

  const [unreadCount, setUnreadCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    // Calculate unread messages count
    const unread = messages.filter(m => !m.readBy?.includes(currentUser?.id)).length;
    setUnreadCount(unread);

    // Count active users
    const active = users.filter(u => u.status === 'online').length;
    setActiveUsers(active);
  }, [messages, users, currentUser]);

  const recentMessages = messages.slice(-5);
  const userChannels = channels.filter(c => c.members.includes(currentUser?.id));

  const handleChannelSelect = (channel: any) => {
    setCurrentChannel(channel);
    // Navigate to messaging page or open chat overlay
    window.open('/messaging', '_blank');
  };

  const handleCreateChannel = async () => {
    try {
      const channel = await createChannel(
        'New Channel',
        'A new channel for conversation',
        'group',
        false
      );
      setCurrentChannel(channel);
      window.open('/messaging', '_blank');
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Messaging</span>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {channels.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">
                {activeUsers}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">
                {userChannels.length}
              </div>
              <div className="text-xs text-muted-foreground">Channels</div>
            </div>
          </div>

          <Button size="sm" className="w-full">
            <Plus className="h-3 w-3 mr-1" />
            New Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Messaging Hub</span>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
            <Button size="sm" variant="ghost">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-500">
              {messages.length}
            </div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">
              {userChannels.length}
            </div>
            <div className="text-xs text-muted-foreground">Channels</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-500">
              {activeUsers}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>

        {/* Current Channel */}
        {currentChannel && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Hash className="h-3 w-3" />
              <span>Current Channel</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded text-xs">
              <div className="flex items-center space-x-2">
                <span className="truncate flex-1">{currentChannel.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>{currentChannel.members.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Messages */}
        {recentMessages.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>Recent Activity</span>
            </div>
            <div className="space-y-1">
              {recentMessages.slice(0, 3).map((message) => {
                const sender = users.find(u => u.id === message.senderId);
                return (
                  <div key={message.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {sender?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1">
                        {sender?.displayName || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Channels */}
        {userChannels.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Hash className="h-3 w-3" />
              <span>Your Channels</span>
            </div>
            <div className="space-y-1">
              {userChannels.slice(0, 3).map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-2 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleChannelSelect(channel)}
                >
                  <div className="flex items-center space-x-2">
                    <Hash className="h-3 w-3 text-blue-500" />
                    <span className="truncate flex-1">{channel.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{channel.members.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Features */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Bot className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">AI Active</span>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
            <Zap className="h-2 w-2 mr-1" />
            Enhanced
          </Badge>
        </div>

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start a conversation</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1">
            <MessageSquare className="h-3 w-3 mr-1" />
            Browse
          </Button>
          <Button size="sm" className="flex-1" onClick={handleCreateChannel}>
            <Plus className="h-3 w-3 mr-1" />
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}