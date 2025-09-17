export interface CaptureOptions {
  type: 'region' | 'window' | 'full';
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  windowId?: string;
  delay?: number;
  includeCursor?: boolean;
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
}

export interface CaptureResult {
  id: string;
  timestamp: Date;
  type: 'region' | 'window' | 'full';
  filePath: string;
  fileSize: number;
  format: string;
  width: number;
  height: number;
  metadata: {
    deviceScaleFactor?: number;
    windowTitle?: string;
    captureDuration?: number;
    cursorIncluded?: boolean;
  };
}

export interface PreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'png' | 'jpg';
  caching?: boolean;
}

export interface PreviewResult {
  id: string;
  originalId: string;
  data: string; // base64
  format: string;
  width: number;
  height: number;
  size: number;
  cached: boolean;
}

export interface CaptureError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type CaptureMode = 'region' | 'window' | 'full';

export interface DisplayInfo {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  isPrimary: boolean;
}

export interface WindowInfo {
  id: string;
  title: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  isMinimized: boolean;
  ownerName?: string;
}