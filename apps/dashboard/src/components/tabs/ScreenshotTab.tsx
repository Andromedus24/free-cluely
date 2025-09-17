'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Trash2, 
  Download, 
  Eye, 
  EyeOff,
  Settings,
  HardDrive,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';
import Image from 'next/image';

interface ScreenshotItem {
  id: string;
  filename: string;
  base64: string;
  timestamp: number;
  type: 'problem' | 'debug';
  size: number;
}

interface ScreenshotConfig {
  maxQueues: number;
  saveDirectory: string;
  format: 'png' | 'jpg';
  quality: number;
  autoHideOverlay: boolean;
  hotkey: string;
}

interface ScreenshotTabProps {
  onCommand?: (command: string, data?: any) => Promise<any>;
}

export default function ScreenshotTab({ onCommand }: ScreenshotTabProps) {
  const [problemQueue, setProblemQueue] = useState<ScreenshotItem[]>([]);
  const [debugQueue, setDebugQueue] = useState<ScreenshotItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [config, setConfig] = useState<ScreenshotConfig>({
    maxQueues: 5,
    saveDirectory: 'screenshots',
    format: 'png',
    quality: 90,
    autoHideOverlay: true,
    hotkey: 'Cmd/Ctrl+H'
  });

  useEffect(() => {
    // Load initial queues
    loadQueues();
  }, []);

  const loadQueues = async () => {
    try {
      const queues = await onCommand?.('screenshot:getQueues');
      if (queues) {
        setProblemQueue(queues.problem || []);
        setDebugQueue(queues.debug || []);
      }
    } catch (error) {
      console.error('Failed to load queues:', error);
    }
  };

  const captureScreenshot = async (type: 'problem' | 'debug' = 'problem') => {
    try {
      const screenshot = await onCommand?.('screenshot:capture', { type });
      if (screenshot) {
        await loadQueues();
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  const deleteScreenshot = async (id: string) => {
    try {
      await onCommand?.('screenshot:delete', { id });
      await loadQueues();
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  };

  const clearQueue = async (type: 'problem' | 'debug' | 'all' = 'all') => {
    try {
      await onCommand?.('screenshot:clear', { type });
      await loadQueues();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  };

  const processScreenshot = async (id: string) => {
    try {
      await onCommand?.('screenshot:process', { id });
    } catch (error) {
      console.error('Failed to process screenshot:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const downloadScreenshot = (screenshot: ScreenshotItem) => {
    const link = document.createElement('a');
    link.href = `data:image/${screenshot.type === 'problem' ? 'png' : 'jpg'};base64,${screenshot.base64}`;
    link.download = screenshot.filename;
    link.click();
  };

  const QueueComponent = ({ 
    title, 
    items, 
    type, 
    color 
  }: { 
    title: string; 
    items: ScreenshotItem[]; 
    type: 'problem' | 'debug'; 
    color: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
            <Badge variant="outline">{items.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => captureScreenshot(type)}
            >
              <Camera className="w-4 h-4 mr-1" />
              Capture
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => clearQueue(type)}
              disabled={items.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No screenshots in queue</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => captureScreenshot(type)}
            >
              Capture First Screenshot
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={type === 'problem' ? 'destructive' : 'secondary'}>
                        {type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>{formatFileSize(item.size)}</span>
                      <span>{item.filename}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedImage(item.base64)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadScreenshot(item)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => processScreenshot(item.id)}
                      disabled={type !== 'problem'}
                    >
                      <Zap className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteScreenshot(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Screenshot Management</h2>
          <p className="text-muted-foreground">
            Capture, manage, and process screenshots with AI analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => captureScreenshot('problem')}>
            <Camera className="w-4 h-4 mr-2" />
            Problem Screenshot
          </Button>
          <Button onClick={() => captureScreenshot('debug')} variant="outline">
            <Camera className="w-4 h-4 mr-2" />
            Debug Screenshot
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Problem Queue</p>
                <p className="text-2xl font-bold">{problemQueue.length}</p>
              </div>
              <Camera className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Debug Queue</p>
                <p className="text-2xl font-bold">{debugQueue.length}</p>
              </div>
              <Camera className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(
                    [...problemQueue, ...debugQueue].reduce((sum, item) => sum + item.size, 0)
                  )}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hotkey</p>
                <p className="text-sm font-mono">{config.hotkey}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Screenshot Preview</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedImage(null)}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
            <div className="p-4">
              <img 
                src={`data:image/png;base64,${selectedImage}`}
                alt="Screenshot"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueComponent 
          title="Problem Screenshots" 
          items={problemQueue} 
          type="problem" 
          color="red" 
        />
        <QueueComponent 
          title="Debug Screenshots" 
          items={debugQueue} 
          type="debug" 
          color="blue" 
        />
      </div>
    </div>
  );
}