'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { voiceAssistant, VoiceCommand, VoiceAction } from '@/services/voice-assistant';
import { useToast } from '@/hooks/use-toast';

interface MemoryItem {
  id: string;
  content: string;
  timestamp: Date;
  type: string;
  metadata?: Record<string, unknown>;
}

interface VoiceAssistantContextType {
  isActive: boolean;
  isListening: boolean;
  commands: VoiceCommand[];
  startAssistant: () => Promise<void>;
  stopAssistant: () => void;
  speak: (text: string) => void;
  clearCommands: () => void;
  memory: MemoryItem[];
  searchMemory: (query: string) => MemoryItem[];
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Set up command listener
    voiceAssistant.onCommand((command) => {
      setCommands(prev => [...prev, command]);

      // Show toast for important commands
      if (command.action && command.action.type !== 'chat') {
        toast({
          title: `Voice Command: ${command.intent}`,
          description: command.transcript,
          duration: 3000,
        });
      }
    });

    voiceAssistant.onHotword(() => {
      toast({
        title: "Voice Assistant Activated",
        description: "Say your command...",
        duration: 2000,
      });
    });

    // Set up status monitoring
    const interval = setInterval(() => {
      setIsActive(voiceAssistant.isActive);
    }, 1000);

    return () => {
      clearInterval(interval);
      voiceAssistant.destroy();
    };
  }, [toast]);

  const startAssistant = async () => {
    try {
      await voiceAssistant.startHotwordDetection();
      setIsActive(true);
      toast({
        title: "Voice Assistant Started",
        description: "Say 'Hey Atlas' to activate",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error Starting Voice Assistant",
        description: "Please check microphone permissions",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopAssistant = () => {
    voiceAssistant.stopHotwordDetection();
    setIsActive(false);
    toast({
      title: "Voice Assistant Stopped",
      description: "Voice assistant has been deactivated",
      duration: 3000,
    });
  };

  const speak = (text: string) => {
    voiceAssistant.speak(text);
  };

  const clearCommands = () => {
    setCommands([]);
  };

  const memory = voiceAssistant.getMemory();
  const searchMemory = (query: string) => voiceAssistant.searchMemory(query);

  return (
    <VoiceAssistantContext.Provider value={{
      isActive,
      isListening,
      commands,
      startAssistant,
      stopAssistant,
      speak,
      clearCommands,
      memory,
      searchMemory,
    }}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};