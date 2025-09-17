import { z } from 'zod';

// Plugin Types
export const PluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  main: z.string(),
  permissions: z.array(z.enum(['screen', 'clipboard', 'automation', 'network'])).default([]),
  dependencies: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Overlay Plugin Types
export const OverlayConfigSchema = z.object({
  width: z.number().default(400),
  height: z.number().default(600),
  alwaysOnTop: z.boolean().default(true),
  transparent: z.boolean().default(true),
  frameless: z.boolean().default(true),
  movable: z.boolean().default(true),
  resizable: z.boolean().default(false),
});

export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;

export const WindowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type WindowPosition = z.infer<typeof WindowPositionSchema>;

// Screenshot Plugin Types
export const ScreenshotConfigSchema = z.object({
  maxQueues: z.number().default(5),
  saveDirectory: z.string().default('screenshots'),
  format: z.enum(['png', 'jpg']).default('png'),
  quality: z.number().min(1).max(100).default(90),
  autoHideOverlay: z.boolean().default(true),
  hotkey: z.string().default('CmdOrCtrl+H'),
  defaultCaptureMode: z.enum(['full', 'window', 'region']).default('full'),
  regionSelectionDelay: z.number().default(200),
  windowHighlightDelay: z.number().default(1000),
  includeCursor: z.boolean().default(true),
  captureDelay: z.number().default(100),
  enablePreviews: z.boolean().default(true),
  previewSize: z.object({
    width: z.number().default(320),
    height: z.number().default(240),
    quality: z.number().min(1).max(100).default(80)
  }).default({}),
  previewCacheTTL: z.number().default(3600000), // 1 hour in milliseconds
  maxPreviewCacheSize: z.number().default(100), // Max number of cached previews
  // Timeout and cancellation settings
  timeouts: z.object({
    fullScreenCapture: z.number().default(10000), // 10 seconds
    windowCapture: z.number().default(15000), // 15 seconds
    regionCapture: z.number().default(45000), // 45 seconds (includes user interaction)
    previewGeneration: z.number().default(10000), // 10 seconds
    artifactAttachment: z.number().default(15000), // 15 seconds
    screenshotProcessing: z.number().default(60000), // 60 seconds
    regionSelection: z.number().default(30000), // 30 seconds
    baseOperation: z.number().default(30000), // 30 seconds base timeout
  }).default({}),
  enableCancellation: z.boolean().default(true),
  cancellationTimeout: z.number().default(5000), // 5 seconds to wait for cancellation to complete
});

export type ScreenshotConfig = z.infer<typeof ScreenshotConfigSchema>;

export const CaptureModeSchema = z.enum(['full', 'window', 'region']);
export type CaptureMode = z.infer<typeof CaptureModeSchema>;

export const RegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type Region = z.infer<typeof RegionSchema>;

export const WindowInfoSchema = z.object({
  id: number,
  title: string,
  bounds: RegionSchema,
  ownerName: string,
});

export type WindowInfo = z.infer<typeof WindowInfoSchema>;

export const ScreenshotItemSchema = z.object({
  id: z.string(),
  filename: z.string(),
  path: z.string(),
  base64: z.string(),
  timestamp: z.number(),
  type: z.enum(['problem', 'debug']),
  size: z.number(),
  captureMode: CaptureModeSchema.default('full'),
  region: RegionSchema.optional(),
  windowInfo: WindowInfoSchema.optional(),
  preview: z.object({
    base64: z.string(),
    width: z.number(),
    height: z.number(),
    size: z.number(),
    generatedAt: z.number()
  }).optional(),
  artifactId: z.string().optional(),
});

export type ScreenshotItem = z.infer<typeof ScreenshotItemSchema>;

// Cancellation and Status Types
export const CancellationRequestSchema = z.object({
  operationId: z.string().optional(),
  reason: z.string().optional(),
});

export type CancellationRequest = z.infer<typeof CancellationRequestSchema>;

export const ScreenshotStatusSchema = z.object({
  pendingCapture: z.boolean(),
  hasActiveOperation: z.boolean(),
  isOperationCancelled: z.boolean(),
  overlayHidden: z.boolean(),
  currentOperation: z.string().optional(),
  operationStartTime: z.number().optional(),
});

export type ScreenshotStatus = z.infer<typeof ScreenshotStatusSchema>;

// Timeout Error Types
export const TimeoutErrorSchema = z.object({
  operation: z.string(),
  timeoutMs: z.number(),
  message: z.string(),
});

export type TimeoutErrorType = z.infer<typeof TimeoutErrorSchema>;

// Plugin Bus Types
export const PluginMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['request', 'response', 'event']),
  plugin: z.string(),
  method: z.string(),
  payload: z.unknown(),
  timestamp: z.number(),
});

export type PluginMessage = z.infer<typeof PluginMessageSchema>;

export const PluginResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

export type PluginResponse = z.infer<typeof PluginResponseSchema>;

// Permission Types
export const PermissionSchema = z.object({
  screen: z.boolean().default(false),
  clipboard: z.boolean().default(false),
  automation: z.boolean().default(false),
  network: z.boolean().default(false),
});

export type Permission = z.infer<typeof PermissionSchema>;

// Config Types
export const AppConfigSchema = z.object({
  llm: z.object({
    provider: z.enum(['gemini', 'ollama']).default('gemini'),
    apiKey: z.string().optional(),
    host: z.string().default('http://localhost:11434'),
    model: z.string().default('llama3.2'),
  }),
  permissions: PermissionSchema,
  automation: z.object({
    allowlist: z.array(z.string()).default([]),
    enabled: z.boolean().default(false),
  }),
  dashboard: z.object({
    port: z.number().default(3000),
    enabled: z.boolean().default(true),
  }),
  telemetry: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().optional(),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// LLM Types
export const LLMMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().optional(),
});

export type LLMMessage = z.infer<typeof LLMMessageSchema>;

export const LLMRequestSchema = z.object({
  messages: z.array(LLMMessageSchema),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().optional(),
  stream: z.boolean().default(false),
});

export type LLMRequest = z.infer<typeof LLMRequestSchema>;

export const LLMResponseSchema = z.object({
  content: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }).optional(),
  timestamp: z.number(),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// Vision Service Types
export const VisionRequestSchema = z.object({
  image: z.union([z.string(), z.instanceof(Buffer)]),
  prompt: z.string().optional(),
  format: z.enum(['json', 'text']).default('json'),
});

export type VisionRequest = z.infer<typeof VisionRequestSchema>;

export const VisionResponseSchema = z.object({
  text: z.string(),
  json: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1),
  timestamp: z.number(),
});

export type VisionResponse = z.infer<typeof VisionResponseSchema>;

// Puppeteer Worker Types
export const PuppeteerRequestSchema = z.object({
  url: z.string(),
  action: z.enum(['navigate', 'click', 'type', 'screenshot', 'extract', 'wait']),
  selector: z.string().optional(),
  text: z.string().optional(),
  timeout: z.number().default(30000),
  options: z.record(z.unknown()).optional(),
});

export type PuppeteerRequest = z.infer<typeof PuppeteerRequestSchema>;

export const PuppeteerResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  screenshot: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

export type PuppeteerResponse = z.infer<typeof PuppeteerResponseSchema>;

// Log Types
export const LogEntrySchema = z.object({
  id: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  plugin: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// IPC Types
export const IPCMessageSchema = z.object({
  type: z.enum(['plugin-bus', 'log', 'config', 'llm', 'vision', 'puppeteer']),
  payload: z.unknown(),
  timestamp: z.number(),
});

export type IPCMessage = z.infer<typeof IPCMessageSchema>;