'use client';

import React from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Activity } from 'lucide-react';

interface VoiceAssistantToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function VoiceAssistantToggle({
  className,
  variant = 'outline',
  size = 'sm'
}: VoiceAssistantToggleProps) {
  const { isActive, startAssistant, stopAssistant } = useVoiceAssistant();

  const handleClick = async () => {
    if (isActive) {
      stopAssistant();
    } else {
      await startAssistant();
    }
  };

  return (
    <Button
      variant={isActive ? 'default' : variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      {isActive ? (
        <>
          <Mic className="h-4 w-4 mr-2" />
          <span>Listening</span>
          <Activity className="h-3 w-3 ml-2 animate-pulse" />
        </>
      ) : (
        <>
          <MicOff className="h-4 w-4 mr-2" />
          <span>Voice</span>
        </>
      )}
    </Button>
  );
}

// Floating voice assistant button for easy access
export function FloatingVoiceAssistant() {
  const { isActive, startAssistant, stopAssistant } = useVoiceAssistant();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className={`rounded-full w-14 h-14 shadow-lg ${
          isActive
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        onClick={async () => {
          if (isActive) {
            stopAssistant();
          } else {
            await startAssistant();
          }
        }}
      >
        {isActive ? (
          <Mic className="h-6 w-6" />
        ) : (
          <MicOff className="h-6 w-6" />
        )}
      </Button>

      {/* Status indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-green-500 text-white animate-pulse">
            Active
          </Badge>
        </div>
      )}
    </div>
  );
}

// Voice assistant status widget
export function VoiceAssistantStatus() {
  const { isActive, commands } = useVoiceAssistant();

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
      }`} />
      <span className="text-sm text-muted-foreground">
        {isActive ? 'Voice Assistant Active' : 'Voice Assistant Ready'}
      </span>
      {commands.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {commands.length}
        </Badge>
      )}
    </div>
  );
}