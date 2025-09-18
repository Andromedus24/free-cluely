'use client';

import React, { useState, useEffect, useRef } from 'react';
import { voiceAssistant, VoiceCommand } from '@/services/voice-assistant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingButton } from '@/components/ui/loading-states';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useGlobalErrorHandling } from '@/providers/ErrorHandlingProvider';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Brain,
  Clock,
  MessageSquare,
  Settings,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceAction {
  type: string;
  target: string;
  data?: Record<string, unknown>;
}

interface VoiceAssistantUIProps {
  className?: string;
  onAction?: (action: VoiceAction) => void;
}

export function VoiceAssistantUI({ className, onAction }: VoiceAssistantUIProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [volumeEnabled, setVolumeEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const commandsEndRef = useRef<HTMLDivElement>(null);
  const { handleError } = useGlobalErrorHandling();

  useEffect(() => {
    // Set up command listener
    voiceAssistant.onCommand((command) => {
      setCommands(prev => [...prev, command]);
      setTranscript('');

      if (onAction && command.action) {
        onAction(command.action);
      }
    });

    voiceAssistant.onHotword(() => {
      setTranscript('Listening...');
      setTimeout(() => setTranscript(''), 2000);
    });

    // Set up action listener
    const handleVoiceAction = (event: CustomEvent) => {
      if (onAction) {
        onAction(event.detail);
      }
    };

    window.addEventListener('voiceAction', handleVoiceAction as EventListener);

    return () => {
      window.removeEventListener('voiceAction', handleVoiceAction as EventListener);
    };
  }, [onAction]);

  useEffect(() => {
    // Auto-scroll to bottom of commands
    commandsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commands]);

  const toggleHotwordDetection = async () => {
    setLoading(true);
    try {
      if (isActive) {
        voiceAssistant.stopHotwordDetection();
        setIsActive(false);
        setIsListening(false);
      } else {
        await voiceAssistant.startHotwordDetection();
        setIsActive(true);
        setIsListening(true);
      }
    } catch (error) {
      const voiceError = error instanceof Error ? error : new Error('Failed to toggle voice detection');

      handleError(voiceError, {
        type: 'error',
        title: 'Voice Assistant Error',
        message: 'Failed to toggle voice detection',
        component: 'VoiceAssistantUI'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVolume = () => {
    voiceAssistant.updateConfig({
      voiceSettings: {
        ...voiceAssistant['config'].voiceSettings,
        enabled: !volumeEnabled
      }
    });
    setVolumeEnabled(!volumeEnabled);
  };

  const clearCommands = () => {
    setCommands([]);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getIntentColor = (intent: string) => {
    const colors = {
      search: 'bg-blue-100 text-blue-800',
      create: 'bg-green-100 text-green-800',
      help: 'bg-yellow-100 text-yellow-800',
      chat: 'bg-purple-100 text-purple-800'
    };
    return colors[intent as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <ErrorBoundary context="VoiceAssistantUI">
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Voice Assistant</span>
            {loading && <LoadingSpinner size="sm" />}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVolume}
              className="h-8 w-8 p-0"
            >
              {volumeEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LoadingButton
              onClick={toggleHotwordDetection}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="flex items-center space-x-2"
              isLoading={loading}
              loadingText={isActive ? "Stopping..." : "Starting..."}
            >
              {isActive ? (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Listening</span>
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>Start</span>
                </>
              )}
            </LoadingButton>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {commands.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCommands}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Current Transcript */}
        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Listening:</span>
              <span className="font-medium">{transcript}</span>
            </div>
          </div>
        )}

        {/* Commands History */}
        {commands.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recent Commands</span>
              <span className="text-xs text-muted-foreground">
                {commands.length} commands
              </span>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <div className="p-3 space-y-3">
                {commands.map((command) => (
                  <div key={command.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={getIntentColor(command.intent || 'chat')}
                          >
                            {command.intent || 'chat'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(command.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {command.transcript}
                        </p>
                        {command.response && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {command.response}
                          </p>
                        )}
                      </div>
                    </div>
                    {command.action && (
                      <div className="text-xs bg-muted p-2 rounded">
                        <span className="text-muted-foreground">Action: </span>
                        <span className="font-mono">
                          {command.action.type} → {command.action.target}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={commandsEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <h4 className="text-sm font-medium">Settings</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Hotword:</span>
                <code className="bg-background px-1 rounded">
                  {voiceAssistant['config'].hotword}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span>AI Provider:</span>
                <code className="bg-background px-1 rounded">
                  {voiceAssistant['config'].aiProvider}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span>Voice Settings:</span>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline">
                    {voiceAssistant['config'].voiceSettings.ttsProvider}
                  </Badge>
                  {volumeEnabled && (
                    <Badge variant="outline">ON</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Memory:</span>
                <span>{voiceAssistant.getMemory().length} items</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Try saying:</span>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              "Hey Atlas, search for..."
            </Badge>
            <Badge variant="outline" className="text-xs">
              "Hey Atlas, create a note..."
            </Badge>
            <Badge variant="outline" className="text-xs">
              "Hey Atlas, help me..."
            </Badge>
          </div>
        </div>
      </CardContent>
      </Card>
    </ErrorBoundary>
  );
}