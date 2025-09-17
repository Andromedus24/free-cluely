'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Loader2, Image, Camera, Mic, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  attachments?: Array<{
    type: 'image' | 'screenshot' | 'file';
    url?: string;
    name: string;
    size?: number;
  }>;
}

interface OverlayChatProps {
  onSendMessage?: (message: string, attachments?: File[]) => Promise<void>;
  onTakeScreenshot?: () => Promise<void>;
  onAttachImage?: () => Promise<void>;
  onStartRecording?: () => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const OverlayChat: React.FC<OverlayChatProps> = ({
  onSendMessage,
  onTakeScreenshot,
  onAttachImage,
  onStartRecording,
  isLoading = false,
  placeholder = "Ask Atlas anything...",
  className
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm Atlas, your AI assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showActions, setShowActions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size
      }))
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachments([]);

    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    setMessages(prev => [...prev, {
      id: typingId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }]);

    try {
      await onSendMessage?.(inputValue, attachments);
    } catch (error) {
      // Remove typing indicator and add error message
      setMessages(prev => prev.filter(msg => msg.id !== typingId));
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        type: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    }
  }, [inputValue, attachments, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      await onTakeScreenshot?.();
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }, [onTakeScreenshot]);

  const handleImageAttach = useCallback(async () => {
    try {
      await onAttachImage?.();
    } catch (error) {
      console.error('Failed to attach image:', error);
    }
  }, [onAttachImage]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        await onStartRecording?.();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    } else {
      setIsRecording(true);
      try {
        await onStartRecording?.();
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
      }
    }
  }, [isRecording, onStartRecording]);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.type === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <div className={cn(
                  "flex-1 max-w-[70%]",
                  message.type === 'user' ? "text-right" : "text-left"
                )}>
                  <div className={cn(
                    "inline-block p-3 rounded-lg",
                    message.type === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}>
                    {message.isTyping ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-xs opacity-70"
                              >
                                {attachment.type === 'image' && <Image className="h-3 w-3" />}
                                {attachment.type === 'screenshot' && <Camera className="h-3 w-3" />}
                                <span>{attachment.name}</span>
                                {attachment.size && (
                                  <span>({(attachment.size / 1024).toFixed(1)}KB)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-4 space-y-3">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-destructive-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input controls */}
        <div className="flex gap-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScreenshot}
              disabled={isLoading}
              title="Take Screenshot"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImageAttach}
              disabled={isLoading}
              title="Attach Image"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="sm"
              onClick={handleToggleRecording}
              disabled={isLoading}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                  <span className="text-xs">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              disabled={isLoading}
              title="More Options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            ref={(el) => {
              if (el) {
                el.id = 'file-input-' + Date.now();
              }
            }}
          />

          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
          />

          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OverlayChat;