'use client';

import React, { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useMessaging } from '@/contexts/messaging-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  FileText,
  Hash,
  AtSign,
  Bot,
  Zap,
  Image,
  X
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

interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  isPublic?: boolean;
}

interface MessageInputProps {
  channelId?: string;
  receiverId?: string;
  placeholder?: string;
  className?: string;
  onSend?: (message: Message) => void;
}

export function MessageInput({
  channelId,
  receiverId,
  placeholder = "Type a message...",
  className,
  onSend
}: MessageInputProps) {
  const { sendMessage, currentChannel, currentUser, templates, useTemplate } = useMessaging();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  useEffect(() => {
    // Generate AI suggestions based on current context
    if (message.length > 10 && message.includes('?')) {
      generateAISuggestions();
    } else {
      setAiSuggestions([]);
    }
  }, [message]);

  const generateAISuggestions = () => {
    // Simulate AI-powered message completion suggestions
    const suggestions = [
      "Can you help me with this?",
      "I'd like to know more about...",
      "What do you think about...?",
      "How does this work?",
      "Could you explain this further?"
    ];
    setAiSuggestions(suggestions.slice(0, 3));
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    try {
      const sentMessage = await sendMessage(
        message.trim(),
        receiverId,
        channelId || currentChannel?.id
      );

      // Handle attachments (simulated)
      if (attachments.length > 0) {
        logger.info('message-input', 'Attachments to be processed', { attachments });
        setAttachments([]);
      }

      setMessage('');
      setAiSuggestions([]);
      setShowTemplates(false);
      setSelectedTemplate(null);
      setTemplateVariables({});

      if (onSend) {
        onSend(sentMessage);
      }
    } catch (error) {
      logger.error('message-input', 'Failed to send message', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateSelect = async (template: Template) => {
    setSelectedTemplate(template);
    setTemplateVariables({});

    // Initialize variables with default values
    const initialVariables: Record<string, string> = {};
    template.variables.forEach((variable: TemplateVariable) => {
      if (variable.defaultValue) {
        initialVariables[variable.name] = variable.defaultValue;
      }
    });
    setTemplateVariables(initialVariables);
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const content = await useTemplate(selectedTemplate.id, templateVariables);
      setMessage(content);
      setShowTemplates(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (error) {
      logger.error('message-input', 'Failed to apply template', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const insertMention = (type: 'user' | 'channel') => {
    const symbol = type === 'user' ? '@' : '#';
    setMessage(prev => prev + symbol);
    textareaRef.current?.focus();
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // Simulate voice recording
    setTimeout(() => {
      setIsRecording(false);
      setMessage(prev => prev + "[Voice message recorded]");
    }, 2000);
  };

  const commonEmojis = ['😊', '❤️', '👍', '😂', '🎉', '🔥', '💯', '🙏', '👏', '🤝'];

  return (
    <div className={cn('space-y-3', className)}>
      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">AI Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {aiSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Application */}
      {selectedTemplate && (
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Template: {selectedTemplate.name}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={applyTemplate}>
                  Apply
                </Button>
              </div>
            </div>

            {selectedTemplate.variables.length > 0 && (
              <div className="space-y-2">
                {selectedTemplate.variables.map((variable: TemplateVariable) => (
                  <div key={variable.name} className="flex items-center gap-2">
                    <span className="text-sm w-20">{{variable.name}}:</span>
                    <Input
                      placeholder={variable.description || variable.name}
                      value={templateVariables[variable.name] || ''}
                      onChange={(e) => setTemplateVariables(prev => ({
                        ...prev,
                        [variable.name]: e.target.value
                      }))}
                      className="flex-1 h-8"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message Input */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 items-end">
            {/* Input Area */}
            <div className="flex-1 space-y-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="min-h-[60px] max-h-32 resize-none"
                rows={1}
              />

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <FileText className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertMention('user')}
                >
                  <AtSign className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertMention('channel')}
                >
                  <Hash className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0',
                    isRecording && 'text-red-500 animate-pulse'
                  )}
                  onClick={startVoiceRecording}
                >
                  <Mic className="h-4 w-4" />
                </Button>

                {/* Character Counter */}
                <span className={cn(
                  'text-xs text-muted-foreground ml-auto',
                  message.length > 1800 && 'text-red-500'
                )}>
                  {message.length}/2000
                </span>
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!message.trim() && attachments.length === 0}
              className="h-10 w-10 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <Card className="mt-2 p-2">
              <div className="grid grid-cols-8 gap-1">
                {commonEmojis.map((emoji, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Template Selection */}
          {showTemplates && (
            <Card className="mt-2 max-h-48 overflow-y-auto">
              <CardContent className="p-2">
                <div className="space-y-1">
                  {templates.slice(0, 5).map((template) => (
                    <Button
                      key={template.id}
                      variant="ghost"
                      className="w-full justify-start text-sm h-8"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>{template.name}</span>
                        {template.isPublic && (
                          <Badge variant="secondary" className="text-xs">Public</Badge>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}