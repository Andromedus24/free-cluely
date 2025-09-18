/**
 * Voice Assistant Service for Atlas AI
 * Integrates hotword detection, speech recognition, and AI responses
 * Based on Tango voice assistant architecture
 */

import { HotwordDetector } from '@/types/hotword-detector';
import { logger } from '@/lib/logger';

export interface VoiceAssistantConfig {
  hotword: string;
  aiProvider: 'openai' | 'anthropic' | 'local';
  voiceSettings: {
    enabled: boolean;
    ttsProvider: 'elevenlabs' | 'openai' | 'system';
    voiceId?: string;
    rate: number;
    pitch: number;
    volume: number;
  };
  permissions: {
    microphone: boolean;
    storage: boolean;
    network: boolean;
  };
}

export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
  response?: string;
  action?: VoiceAction;
}

export interface VoiceAction {
  type: 'search' | 'create' | 'update' | 'delete' | 'navigate' | 'system';
  target: string;
  parameters: Record<string, any>;
}

export interface VoiceMemory {
  id: string;
  userId: string;
  context: string;
  timestamp: Date;
  tags: string[];
  importance: number;
}

export interface HotwordDetectionConfig {
  sensitivity: number;
  threshold: number;
  audioGain: number;
  model: string;
}

class VoiceAssistantService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private hotwordDetector: HotwordDetector | null = null;
  private isListening = false;
  private isHotwordActive = false;
  private memory: VoiceMemory[] = [];
  private config: VoiceAssistantConfig;
  private onCommandCallback?: (command: VoiceCommand) => void;
  private onHotwordCallback?: () => void;

  constructor(config: VoiceAssistantConfig) {
    this.config = config;
    this.initializeServices();
  }

  private initializeServices() {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }

    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis;

    // Initialize hotword detection (simplified implementation)
    this.initializeHotwordDetection();
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.processVoiceCommand(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      logger.error('voice-assistant', 'Speech recognition error', undefined, { error: event.error });
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.isHotwordActive) {
        // Restart recognition if hotword detection is active
        setTimeout(() => this.startListening(), 100);
      }
    };
  }

  private initializeHotwordDetection() {
    // Simplified hotword detection using audio analysis
    // In a real implementation, this would use a dedicated library like Porcupine
    this.hotwordDetector = {
      isActive: false,
      start: () => {
        this.hotwordDetector.isActive = true;
        this.startListening();
      },
      stop: () => {
        this.hotwordDetector.isActive = false;
        this.stopListening();
      }
    };
  }

  public async startHotwordDetection() {
    if (!this.hasMicrophonePermission()) {
      const granted = await this.requestMicrophonePermission();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }
    }

    this.isHotwordActive = true;
    this.hotwordDetector?.start();
  }

  public stopHotwordDetection() {
    this.isHotwordActive = false;
    this.hotwordDetector?.stop();
  }

  public startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        logger.error('voice-assistant', 'Error starting speech recognition', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  private async processVoiceCommand(transcript: string) {
    const command: VoiceCommand = {
      id: this.generateId(),
      transcript: transcript.toLowerCase(),
      confidence: 0.8, // Default confidence
      timestamp: new Date()
    };

    // Check for hotword
    if (transcript.toLowerCase().includes(this.config.hotword.toLowerCase())) {
      this.onHotwordCallback?.();
      return;
    }

    // Extract intent and entities
    const parsed = await this.parseIntent(transcript);
    command.intent = parsed.intent;
    command.entities = parsed.entities;

    // Execute action if needed
    const action = this.generateAction(command);
    if (action) {
      command.action = action;
      await this.executeAction(action);
    }

    // Generate AI response
    const response = await this.generateAIResponse(command);
    command.response = response;

    // Store in memory
    this.addToMemory(command);

    // Notify callback
    this.onCommandCallback?.(command);

    // Speak response if enabled
    if (this.config.voiceSettings.enabled && response) {
      this.speak(response);
    }
  }

  private async parseIntent(transcript: string): Promise<{ intent: string; entities: Record<string, any> }> {
    // Simple intent parsing - in production, use NLP services
    const lowerTranscript = transcript.toLowerCase();

    if (lowerTranscript.includes('search') || lowerTranscript.includes('find')) {
      return { intent: 'search', entities: { query: transcript } };
    }

    if (lowerTranscript.includes('create') || lowerTranscript.includes('make')) {
      return { intent: 'create', entities: { type: 'item', description: transcript } };
    }

    if (lowerTranscript.includes('help') || lowerTranscript.includes('assist')) {
      return { intent: 'help', entities: {} };
    }

    return { intent: 'chat', entities: { message: transcript } };
  }

  private generateAction(command: VoiceCommand): VoiceAction | null {
    switch (command.intent) {
      case 'search':
        return {
          type: 'search',
          target: 'global',
          parameters: { query: command.transcript }
        };

      case 'create':
        return {
          type: 'create',
          target: 'note',
          parameters: { content: command.transcript }
        };

      default:
        return null;
    }
  }

  private async executeAction(action: VoiceAction) {
    // Dispatch action to the application
    window.dispatchEvent(new CustomEvent('voiceAction', { detail: action }));
  }

  private async generateAIResponse(command: VoiceCommand): Promise<string> {
    // Simulate AI response generation
    const responses = {
      search: "I'll search for that information.",
      create: "I've created that for you.",
      help: "I'm here to help. What would you like to know?",
      chat: "I understand. How can I assist you further?"
    };

    return responses[command.intent as keyof typeof responses] || "I understand your request.";
  }

  public speak(text: string) {
    if (!this.synthesis || !this.config.voiceSettings.enabled) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.config.voiceSettings.rate;
    utterance.pitch = this.config.voiceSettings.pitch;
    utterance.volume = this.config.voiceSettings.volume;

    this.synthesis.speak(utterance);
  }

  private addToMemory(command: VoiceCommand) {
    const memory: VoiceMemory = {
      id: this.generateId(),
      userId: 'default', // Would be actual user ID
      context: JSON.stringify({
        transcript: command.transcript,
        intent: command.intent,
        response: command.response
      }),
      timestamp: command.timestamp,
      tags: [command.intent || 'chat'],
      importance: 1
    };

    this.memory.push(memory);

    // Keep only last 100 memories
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(-100);
    }
  }

  public getMemory(limit: number = 10): VoiceMemory[] {
    return this.memory.slice(-limit);
  }

  public searchMemory(query: string): VoiceMemory[] {
    return this.memory.filter(memory =>
      memory.context.toLowerCase().includes(query.toLowerCase()) ||
      memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  private async hasMicrophonePermission(): Promise<boolean> {
    try {
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permissions.state === 'granted';
    } catch {
      return false;
    }
  }

  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  public onCommand(callback: (command: VoiceCommand) => void) {
    this.onCommandCallback = callback;
  }

  public onHotword(callback: () => void) {
    this.onHotwordCallback = callback;
  }

  public updateConfig(config: Partial<VoiceAssistantConfig>) {
    this.config = { ...this.config, ...config };
  }

  public get isActive(): boolean {
    return this.isHotwordActive || this.isListening;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public destroy() {
    this.stopHotwordDetection();
    this.stopListening();
    this.onCommandCallback = undefined;
    this.onHotwordCallback = undefined;
  }
}

// Export singleton instance
export const voiceAssistant = new VoiceAssistantService({
  hotword: 'hey atlas',
  aiProvider: 'openai',
  voiceSettings: {
    enabled: true,
    ttsProvider: 'system',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  },
  permissions: {
    microphone: true,
    storage: true,
    network: true
  }
});

export default VoiceAssistantService;