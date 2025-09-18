'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Heart,
  ThumbsUp,
  Laugh,
  Shocked,
  Frown,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  Copy,
  Flag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages?: any[];
  onMessageClick?: (message: any) => void;
  className?: string;
}

export function MessageList({ messages: propMessages, onMessageClick, className }: MessageListProps) {
  const { messages: contextMessages, currentUser, addReaction, editMessage, deleteMessage } = useMessaging();
  const messages = propMessages || contextMessages;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp: Date) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleEdit = async (messageId: string, currentContent: string) => {
    const newContent = prompt('Edit message:', currentContent);
    if (newContent && newContent.trim() && newContent !== currentContent) {
      try {
        await editMessage(messageId, newContent.trim());
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    }
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const getMessageReactions = (reactions: any[]) => {
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { count: 0, users: [] };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.userId);
      return acc;
    }, {});

    return Object.entries(grouped).map(([emoji, data]: [string, any]) => ({
      emoji,
      count: data.count,
      hasReacted: data.users.includes(currentUser?.id)
    }));
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRelevanceColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn('space-y-4 p-4', className)}>
      {messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.senderId === currentUser?.id;
          const sender = message.senderId === currentUser?.id ? currentUser : {
            displayName: 'User',
            username: 'user'
          };

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 group',
                isOwnMessage && 'flex-row-reverse'
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={sender.avatar} />
                <AvatarFallback>
                  {sender.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className={cn(
                'flex-1 space-y-1',
                isOwnMessage && 'text-right'
              )}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">{sender.displayName}</span>
                  <span>•</span>
                  <span>{formatMessageTime(message.timestamp)}</span>
                  {message.isEdited && <span>(edited)</span>}

                  {/* AI Analysis Indicators */}
                  {message.aiData && (
                    <div className="flex items-center gap-1 ml-2">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        getRelevanceColor(message.aiData.relevanceScore)
                      )} />
                      {message.aiData.sentiment && (
                        <span className={cn('text-xs', getSentimentColor(message.aiData.sentiment))}>
                          {message.aiData.sentiment}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Card className={cn(
                  'inline-block max-w-lg',
                  isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <CardContent
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onMessageClick?.(message)}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment: any) => (
                          <div key={attachment.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{attachment.filename}</span>
                            <span className="text-muted-foreground">
                              ({(attachment.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {message.metadata?.tags && message.metadata.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.metadata.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className={cn(
                    'flex items-center gap-1',
                    isOwnMessage && 'justify-end'
                  )}>
                    {getMessageReactions(message.reactions).map((reaction, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-6 px-2 text-xs',
                          reaction.hasReacted && 'bg-primary text-primary-foreground'
                        )}
                        onClick={() => handleReaction(message.id, reaction.emoji)}
                      >
                        {reaction.emoji} {reaction.count > 1 && reaction.count}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
                <div className={cn(
                  'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                  isOwnMessage ? 'justify-end' : 'justify-start'
                )}>
                  {/* Reaction Buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleReaction(message.id, '❤️')}
                  >
                    <Heart className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleReaction(message.id, '👍')}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleReaction(message.id, '😄')}
                  >
                    <Laugh className="h-3 w-3" />
                  </Button>

                  {/* Edit/Delete for own messages */}
                  {isOwnMessage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEdit(message.id, message.content)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(message.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  {/* Other actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => navigator.clipboard.writeText(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* AI Suggested Responses */}
                {message.aiData?.suggestedResponses && message.aiData.suggestedResponses.length > 0 && (
                  <div className={cn(
                    'flex flex-wrap gap-1 mt-1',
                    isOwnMessage && 'justify-end'
                  )}>
                    {message.aiData.suggestedResponses.map((response: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => onMessageClick?.({ ...message, suggestedResponse: response })}
                      >
                        {response}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}