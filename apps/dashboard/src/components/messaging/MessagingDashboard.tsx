'use client';

import React, { useState, useEffect } from 'react';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChannelList } from './ChannelList';
import {
  MessageSquare,
  Users,
  Hash,
  Settings,
  Bot,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  Bell,
  Search,
  Plus,
  MoreHorizontal,
  Pin,
  Archive,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  timestamp: Date;
  readBy?: string[];
  aiData?: unknown;
}

interface MessagingDashboardProps {
  className?: string;
}

export function MessagingDashboard({ className }: MessagingDashboardProps) {
  const {
    messages,
    channels,
    users,
    currentChannel,
    currentUser,
    sendMessage,
    setCurrentChannel,
    refreshData
  } = useMessaging();

  const [activeTab, setActiveTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const channelMessages = currentChannel
    ? filteredMessages.filter(m => m.channelId === currentChannel.id)
    : [];

  const directMessages = filteredMessages.filter(m => m.receiverId === currentUser?.id);

  const stats = {
    totalMessages: messages.length,
    totalChannels: channels.length,
    totalUsers: users.length,
    unreadMessages: messages.filter(m => !m.readBy?.includes(currentUser?.id)).length,
    activeUsers: users.filter(u => u.status === 'online').length,
    aiAnalyzedMessages: messages.filter(m => m.aiData).length
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const handleMessageSend = (message: Message) => {
    console.log('Message sent:', message);
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Messaging Hub</h1>
            <p className="text-muted-foreground">AI-powered social messaging and automation</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-xs">
            <Bot className="w-3 h-3 mr-1" />
            AI Enhanced
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Messages</span>
            </div>
            <div className="text-xl font-bold">{formatNumber(stats.totalMessages)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Channels</span>
            </div>
            <div className="text-xl font-bold">{stats.totalChannels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Users</span>
            </div>
            <div className="text-xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-muted-foreground">AI Analyzed</span>
            </div>
            <div className="text-xl font-bold">{stats.aiAnalyzedMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Unread</span>
            </div>
            <div className="text-xl font-bold">{stats.unreadMessages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="channels" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="channels" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="direct" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Direct
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="channels">
              <ChannelList
                onChannelSelect={setCurrentChannel}
                selectedChannelId={currentChannel?.id}
              />
            </TabsContent>

            <TabsContent value="direct">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Direct Messages</span>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {users
                      .filter(u => u.id !== currentUser?.id)
                      .map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <div className="relative">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                              {user.displayName?.charAt(0).toUpperCase()}
                            </div>
                            <div className={cn(
                              'absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-background',
                              user.status === 'online' ? 'bg-green-500' :
                              user.status === 'away' ? 'bg-yellow-500' :
                              user.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{user.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.status === 'online' ? 'Online' :
                               user.status === 'away' ? 'Away' :
                               user.status === 'busy' ? 'Busy' : 'Offline'}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {messages.slice(-10).map(message => (
                      <div key={message.id} className="p-2 rounded border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {users.find(u => u.id === message.senderId)?.displayName || 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm mt-1 truncate">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="h-[600px] flex flex-col">
            {/* Channel Header */}
            {currentChannel ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{currentChannel.name}</h3>
                        {currentChannel.description && (
                          <p className="text-sm text-muted-foreground">{currentChannel.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {currentChannel.members.length} members
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Pin className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Bell className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Select a Channel</h3>
                  <p className="text-muted-foreground">
                    Choose a channel from the sidebar to start messaging
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Messages */}
            <Card className="flex-1 mt-4">
              <CardContent className="p-0 h-full">
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <MessageList
                      messages={channelMessages}
                      onMessageClick={handleMessageClick}
                    />
                  </div>
                  {currentChannel && (
                    <div className="border-t p-4">
                      <MessageInput
                        channelId={currentChannel.id}
                        placeholder={`Message #${currentChannel.name}`}
                        onSend={handleMessageSend}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            <span>AI-Powered Features</span>
            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">Content Ranking</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI analyzes and ranks messages based on relevance, engagement, and quality
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Smart Moderation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatic spam detection, toxicity filtering, and content moderation
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Automation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create intelligent automation rules for message handling and responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}