/**
 * Hotword Detector Types
 */

export interface HotwordDetector {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: 'hotword', callback: (hotword: string) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'ready', callback: () => void): void;
  removeListener(event: string, callback: Function): void;
  isRunning(): boolean;
}

export interface HotwordDetectorConfig {
  sensitivity: number;
  hotwords: string[];
  audioContext: AudioContext;
}

export interface HotwordEvent {
  hotword: string;
  confidence: number;
  timestamp: Date;
}