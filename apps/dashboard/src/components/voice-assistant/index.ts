// Voice Assistant Components Export
export { VoiceAssistantUI } from './VoiceAssistantUI';
export { VoiceAssistantProvider, useVoiceAssistant } from './VoiceAssistantProvider';
export { VoiceAssistantToggle, FloatingVoiceAssistant, VoiceAssistantStatus } from './VoiceAssistantToggle';
export { VoiceMemoryViewer } from './VoiceMemoryViewer';

// Re-export types and service
export type {
  VoiceAssistantConfig,
  VoiceCommand,
  VoiceAction,
  VoiceMemory,
  HotwordDetectionConfig
} from '@/services/voice-assistant';

export { voiceAssistant } from '@/services/voice-assistant';
export default VoiceAssistantService;