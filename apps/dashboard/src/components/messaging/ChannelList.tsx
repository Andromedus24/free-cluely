'use client';

import React, { useState } from 'react';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Hash,
  Users,
  Lock,
  Globe,
  Plus,
  Search,
  MoreHorizontal,
  Bell,
  BellOff,
  Pin,
  Settings,
  Leave
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'group' | 'community' | 'direct' | 'broadcast';
  settings: {
    isPrivate: boolean;
    requireApproval: boolean;
  };
  members: string[];
  admins: string[];
  metadata?: {
    lastActivity: Date;
    popularTopics?: string[];
  };
}

interface ChannelListProps {
  onChannelSelect?: (channel: Channel) => void;
  selectedChannelId?: string;
  className?: string;
}

export function ChannelList({ onChannelSelect, selectedChannelId, className }: ChannelListProps) {
  const {
    channels,
    currentChannel,
    currentUser,
    createChannel,
    joinChannel,
    leaveChannel,
    setCurrentChannel
  } = useMessaging();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelType, setNewChannelType] = useState<'group' | 'community'>('group');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const channel = await createChannel(
        newChannelName.trim(),
        newChannelDescription.trim(),
        newChannelType,
        newChannelIsPrivate
      );
      setCurrentChannel(channel);
      setNewChannelName('');
      setNewChannelDescription('');
      setShowCreateForm(false);
      onChannelSelect?.(channel);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleChannelClick = (channel: Channel) => {
    setCurrentChannel(channel);
    onChannelSelect?.(channel);
  };

  const handleJoinChannel = async (channelId: string) => {
    try {
      await joinChannel(channelId);
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      await leaveChannel(channelId);
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
      }
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  const getChannelIcon = (type: Channel['type'], isPrivate: boolean) => {
    if (isPrivate) return <Lock className="h-4 w-4" />;
    if (type === 'community') return <Globe className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  const getChannelTypeLabel = (type: Channel['type'], isPrivate: boolean) => {
    if (isPrivate) return 'Private';
    if (type === 'direct') return 'Direct';
    if (type === 'community') return 'Community';
    if (type === 'broadcast') return 'Broadcast';
    return 'Group';
  };

  const formatLastActivity = (timestamp: Date) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'unknown';
    }
  };

  const getUserChannels = () => {
    if (!currentUser) return [];
    return filteredChannels.filter(channel => channel.members.includes(currentUser.id));
  };

  const getAvailableChannels = () => {
    if (!currentUser) return [];
    return filteredChannels.filter(channel => !channel.members.includes(currentUser.id));
  };

  const userChannels = getUserChannels();
  const availableChannels = getAvailableChannels();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Channels</h3>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Create Channel Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Channel name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newChannelDescription}
              onChange={(e) => setNewChannelDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={newChannelType === 'group' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewChannelType('group')}
              >
                Group
              </Button>
              <Button
                variant={newChannelType === 'community' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewChannelType('community')}
              >
                Community
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={newChannelIsPrivate}
                onChange={(e) => setNewChannelIsPrivate(e.target.checked)}
              />
              <label htmlFor="private" className="text-sm">Private channel</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Channels */}
      {userChannels.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Your Channels</h4>
          <div className="space-y-1">
            {userChannels.map((channel) => (
              <Card
                key={channel.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-sm',
                  selectedChannelId === channel.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleChannelClick(channel)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.type, channel.settings.isPrivate)}
                        <div>
                          <div className="font-medium">{channel.name}</div>
                          {channel.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {channel.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Channel Stats */}
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {channel.members.length}
                        </div>
                        <div>{formatLastActivity(channel.metadata?.lastActivity)}</div>
                      </div>

                      {/* Channel Type Badge */}
                      <Badge variant="secondary" className="text-xs">
                        {getChannelTypeLabel(channel.type, channel.settings.isPrivate)}
                      </Badge>

                      {/* Admin Badge */}
                      {channel.admins.includes(currentUser?.id) && (
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Popular Topics */}
                  {channel.metadata?.popularTopics && channel.metadata.popularTopics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {channel.metadata.popularTopics.slice(0, 3).map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Channels */}
      {availableChannels.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Available Channels</h4>
          <div className="space-y-1">
            {availableChannels.map((channel) => (
              <Card key={channel.id} className="opacity-75">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.type, channel.settings.isPrivate)}
                        <div>
                          <div className="font-medium">{channel.name}</div>
                          {channel.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {channel.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleJoinChannel(channel.id)}
                        disabled={channel.settings.requireApproval}
                      >
                        {channel.settings.requireApproval ? 'Request to Join' : 'Join'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredChannels.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No channels found</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Channel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}