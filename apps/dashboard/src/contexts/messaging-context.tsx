'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { messagingService, Message, Channel, User, MessageTemplate, AutomationRule, MessagingConfig } from '@/services/messaging-service';

interface MessagingContextType {
  messages: Message[];
  channels: Channel[];
  users: User[];
  templates: MessageTemplate[];
  automationRules: AutomationRule[];
  config: MessagingConfig;
  isLoading: boolean;
  error: string | null;
  currentChannel: Channel | null;
  currentUser: User | null;

  // Message operations
  sendMessage: (content: string, receiverId?: string, channelId?: string) => Promise<Message>;
  editMessage: (messageId: string, newContent: string) => Promise<Message>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;

  // Channel operations
  createChannel: (name: string, description: string, type: Channel['type'], isPrivate?: boolean) => Promise<Channel>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  setCurrentChannel: (channel: Channel | null) => void;

  // Template operations
  createTemplate: (name: string, content: string, category: string, tags: string[], variables: { name: string; type: string; required?: boolean; defaultValue?: string }[], isPublic?: boolean) => Promise<MessageTemplate>;
  useTemplate: (templateId: string, variables: Record<string, string>) => Promise<string>;

  // Automation operations
  createAutomationRule: (name: string, description: string, trigger: { type: string; event: string }, actions: { type: string; config: Record<string, unknown> }[], conditions: { field: string; operator: string; value: string | number | boolean }[]) => Promise<AutomationRule>;

  // User operations
  setCurrentUser: (user: User) => void;
  updateUserStatus: (status: User['status']) => void;

  // Data operations
  refreshData: () => Promise<void>;
  updateConfig: (config: Partial<MessagingConfig>) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: ReactNode;
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load data from messaging service
      setMessages(messagingService.getMessages());
      setChannels(messagingService.getChannels());
      setUsers(messagingService.getUsers());
      setTemplates(messagingService.getTemplates());
      setAutomationRules(messagingService.getAutomationRules());

      // Set default user if none exists
      if (users.length === 0) {
        const defaultUser: User = {
          id: 'user-1',
          username: 'default_user',
          displayName: 'Default User',
          status: 'online',
          joinedAt: new Date(),
          stats: {
            messagesSent: 0,
            reactionsGiven: 0,
            connectionsCount: 0,
            reputation: 50
          },
          preferences: {
            notifications: true,
            sound: true,
            theme: 'dark',
            language: 'en'
          }
        };
        setUsers([defaultUser]);
        setCurrentUserState(defaultUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messaging data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sendMessage = async (content: string, receiverId?: string, channelId?: string): Promise<Message> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      const message = await messagingService.sendMessage(content, currentUser.id, receiverId, channelId);
      setMessages(messagingService.getMessages(channelId));
      return message;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  };

  const editMessage = async (messageId: string, newContent: string): Promise<Message> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      const message = await messagingService.editMessage(messageId, newContent, currentUser.id);
      setMessages(messagingService.getMessages(currentChannel?.id));
      return message;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit message');
      throw err;
    }
  };

  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      await messagingService.deleteMessage(messageId, currentUser.id);
      setMessages(messagingService.getMessages(currentChannel?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      throw err;
    }
  };

  const addReaction = async (messageId: string, emoji: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      await messagingService.addReaction(messageId, currentUser.id, emoji);
      setMessages(messagingService.getMessages(currentChannel?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
      throw err;
    }
  };

  const createChannel = async (
    name: string,
    description: string,
    type: Channel['type'],
    isPrivate: boolean = false
  ): Promise<Channel> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      const channel = await messagingService.createChannel(name, description, type, currentUser.id, isPrivate);
      setChannels(messagingService.getChannels());
      return channel;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
      throw err;
    }
  };

  const joinChannel = async (channelId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      await messagingService.joinChannel(channelId, currentUser.id);
      setChannels(messagingService.getChannels());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join channel');
      throw err;
    }
  };

  const leaveChannel = async (channelId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      await messagingService.leaveChannel(channelId, currentUser.id);
      setChannels(messagingService.getChannels());
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave channel');
      throw err;
    }
  };

  const createTemplate = async (
    name: string,
    content: string,
    category: string,
    tags: string[],
    variables: { name: string; type: string; required?: boolean; defaultValue?: string }[],
    isPublic: boolean = false
  ): Promise<MessageTemplate> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      const template = await messagingService.createTemplate(
        name, content, category, tags, variables, currentUser.id, isPublic
      );
      setTemplates(messagingService.getTemplates());
      return template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      throw err;
    }
  };

  const useTemplate = async (templateId: string, variables: Record<string, string>): Promise<string> => {
    try {
      return await messagingService.useTemplate(templateId, variables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use template');
      throw err;
    }
  };

  const createAutomationRule = async (
    name: string,
    description: string,
    trigger: { type: string; event: string },
    actions: { type: string; config: Record<string, unknown> }[],
    conditions: { field: string; operator: string; value: string | number | boolean }[]
  ): Promise<AutomationRule> => {
    if (!currentUser) {
      throw new Error('No current user set');
    }

    try {
      const rule = await messagingService.createAutomationRule(
        name, description, trigger, actions, conditions, currentUser.id
      );
      setAutomationRules(messagingService.getAutomationRules());
      return rule;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create automation rule');
      throw err;
    }
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
  };

  const updateUserStatus = (status: User['status']) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, status };
      setCurrentUserState(updatedUser);

      // Update user in service
      const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsers);
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadData();
  };

  const updateConfig = (config: Partial<MessagingConfig>): void => {
    messagingService.updateConfig(config);
  };

  const value: MessagingContextType = {
    messages,
    channels,
    users,
    templates,
    automationRules,
    config: messagingService.getConfig(),
    isLoading,
    error,
    currentChannel,
    currentUser,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    createChannel,
    joinChannel,
    leaveChannel,
    setCurrentChannel,
    createTemplate,
    useTemplate,
    createAutomationRule,
    setCurrentUser,
    updateUserStatus,
    refreshData,
    updateConfig,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}