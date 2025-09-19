import { z } from 'zod';
import { 
  PluginManifest, 
  PluginMessage, 
  PluginResponse, 
  AppConfig,
  LogEntry,
  VisionRequest,
  VisionResponse
} from './types';

// Plugin Bus Interface
export interface PluginBus {
  register(manifest: PluginManifest): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  send(message: PluginMessage): Promise<PluginResponse>;
  broadcast(event: Omit<PluginMessage, 'id' | 'type'>): void;
  onMessage(handler: (message: PluginMessage) => void): () => void;
  getPlugins(): PluginManifest[];
}

// Config Manager Interface
export interface ConfigManager {
  getConfig(): AppConfig;
  updateConfig(updates: Partial<AppConfig>): Promise<void>;
  onConfigChange(handler: (config: AppConfig) => void): () => void;
  validateConfig(config: unknown): AppConfig;
}

// Logger Interface
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>, plugin?: string): void;
  info(message: string, metadata?: Record<string, unknown>, plugin?: string): void;
  warn(message: string, metadata?: Record<string, unknown>, plugin?: string): void;
  error(message: string, metadata?: Record<string, unknown>, plugin?: string): void;
  getLogs(level?: LogEntry['level'], limit?: number): LogEntry[];
  onLogEntry(handler: (entry: LogEntry) => void): () => void;
}

// Permission Manager Interface
export interface PermissionManager {
  hasPermission(permission: keyof AppConfig['permissions']): boolean;
  requestPermission(permission: keyof AppConfig['permissions']): Promise<boolean>;
  getPermissions(): AppConfig['permissions'];
  onPermissionChange(handler: (permissions: AppConfig['permissions']) => void): () => void;
}

// LLM Interface
export interface LLMService {
  chat(request: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number }): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }>;
  stream(request: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number }): AsyncIterable<{ content: string; done?: boolean }>;
}

// Provider Adapter Interface
export interface ProviderAdapter {
  // Core chat functionality
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;

  // Vision analysis
  visionAnalyze(request: VisionRequest): Promise<VisionResponse>;

  // Image generation
  imageGenerate(request: ImageGenerateRequest): Promise<ImageGenerateResponse>;

  // Model management
  listModels(): Promise<string[]>;
  testConnection(): Promise<boolean>;

  // Provider metadata
  getProviderInfo(): ProviderInfo;
}

// Chat Types
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: Array<{
      type: 'image' | 'file' | 'url';
      content: string | Buffer;
      metadata?: Record<string, unknown>;
    }>;
  }>;
  temperature?: number;
  maxTokens?: number;
  mode?: 'general' | 'code' | 'vision' | 'automation';
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ChatStreamChunk {
  content: string;
  done?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// Vision types are now imported from ./types

// Image Generation Types
export interface ImageGenerateRequest {
  prompt: string;
  options?: {
    quality?: 'standard' | 'hd';
    aspect?: 'square' | 'portrait' | 'landscape';
    style?: 'natural' | 'vivid';
    compression?: 'none' | 'webp';
    count?: number;
    responseFormat?: 'url' | 'b64_json';
  };
}

export interface ImageGenerateResponse {
  images: Array<{
    url?: string;
    base64?: string;
    revisedPrompt?: string;
    metadata?: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    cost?: number;
  };
  timestamp: number;
}

// Provider Types
export interface ProviderInfo {
  name: string;
  version: string;
  description: string;
  capabilities: Array<'chat' | 'stream' | 'vision' | 'image_generation'>;
  models: Array<{
    id: string;
    name: string;
    capabilities: Array<'chat' | 'stream' | 'vision' | 'image_generation'>;
    maxTokens?: number;
    supportsStreaming?: boolean;
    supportsVision?: boolean;
    supportsImageGeneration?: boolean;
  }>;
  pricing?: Record<string, number>;
  endpoints?: Record<string, string>;
}

// Provider Errors
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderConnectionError extends ProviderError {
  constructor(message: string, provider: string, cause?: Error) {
    super(message, provider, 'CONNECTION_ERROR', cause);
    this.name = 'ProviderConnectionError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string, provider: string, public retryAfter?: number) {
    super(message, provider, 'RATE_LIMIT_ERROR');
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, 'AUTH_ERROR');
    this.name = 'ProviderAuthError';
  }
}

// Vision Service Interface
export interface VisionService {
  analyze(request: { image: string | Buffer; prompt?: string }): Promise<{ text: string; confidence: number; json?: Record<string, unknown> }>;
  extractText(image: string | Buffer): Promise<{ text: string; confidence: number }>;
}

// Puppeteer Worker Interface
export interface PuppeteerWorker {
  navigate(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<boolean>;
  click(selector: string, options?: { timeout?: number; button?: string }): Promise<boolean>;
  type(selector: string, text: string, options?: { delay?: number; timeout?: number }): Promise<boolean>;
  screenshot(options?: { fullPage?: boolean; selector?: string }): Promise<string>;
  extract(selector: string, options?: { attribute?: string; multiple?: boolean }): Promise<string | string[]>;
  wait(selector: string, options?: { timeout?: number; visible?: boolean }): Promise<boolean>;
}

// Plugin Base Interface
export interface Plugin {
  name: string;
  version: string;
  description: string;
  permissions: string[];
  initialize(bus: PluginBus, config: ConfigManager, logger: Logger): Promise<void>;
  destroy(): Promise<void>;
}

// IPC Message Handlers
export type IPCMessageHandler = (payload: unknown, sender: unknown) => Promise<unknown>;

// Error Types
export class PluginError extends Error {
  constructor(
    message: string,
    public plugin?: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PermissionError extends Error {
  constructor(message: string, public permission: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ConfigError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Utility Functions
export const createPluginId = (name: string): string => {
  return `${name}-${Date.now()}`;
};

export const validateManifest = (manifest: unknown): PluginManifest => {
  return z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    main: z.string(),
    permissions: z.array(z.enum(['screen', 'clipboard', 'automation', 'network'])).default([]),
    dependencies: z.record(z.string(), z.string()).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).parse(manifest);
};

export const createLogEntry = (
  level: LogEntry['level'],
  message: string,
  plugin?: string,
  metadata?: Record<string, unknown>
): LogEntry => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    level,
    message,
    plugin,
    timestamp: Date.now(),
    metadata,
  };
};