'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Overlay from '@/components/Overlay';
import OverlayChat from '@/components/OverlayChat';
import { motion } from 'motion/react';

interface OverlayPageProps {
  // These will be passed from Electron via query params or IPC
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  isAlwaysOnTop?: boolean;
}

export default function OverlayPage({
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 600 },
  isAlwaysOnTop = true
}: OverlayPageProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  // Handle position persistence
  const handlePositionChange = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    // Send position to main process via IPC
    if (window.electronAPI) {
      window.electronAPI.send('overlay:positionChanged', { x, y });
    }
  }, []);

  // Handle size persistence
  const handleSizeChange = useCallback((width: number, height: number) => {
    setSize({ width, height });
    // Send size to main process via IPC
    if (window.electronAPI) {
      window.electronAPI.send('overlay:sizeChanged', { width, height });
    }
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Send close event to main process via IPC
    if (window.electronAPI) {
      window.electronAPI.send('overlay:close');
    }
  }, []);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    setIsVisible(false);
    // Send minimize event to main process via IPC
    if (window.electronAPI) {
      window.electronAPI.send('overlay:minimize');
    }
  }, []);

  // Handle screenshot
  const handleTakeScreenshot = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('overlay:takeScreenshot');
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }, []);

  // Handle image attachment
  const handleAttachImage = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('overlay:attachImage');
        if (result) {
          // Handle selected image
          console.log('Image attached:', result);
        }
      }
    } catch (error) {
      console.error('Failed to attach image:', error);
    }
  }, []);

  // Handle voice recording
  const handleStartRecording = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('overlay:startRecording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  // Handle message sending
  const handleSendMessage = useCallback(async (message: string, attachments?: File[]) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('overlay:sendMessage', {
          message,
          attachments: attachments?.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          }))
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  // Listen for IPC events from main process
  useEffect(() => {
    const handleShow = () => setIsVisible(true);
    const handleHide = () => setIsVisible(false);
    const handleToggle = () => setIsVisible(prev => !prev);

    if (window.electronAPI) {
      window.electronAPI.on('overlay:show', handleShow);
      window.electronAPI.on('overlay:hide', handleHide);
      window.electronAPI.on('overlay:toggle', handleToggle);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.off('overlay:show', handleShow);
        window.electronAPI.off('overlay:hide', handleHide);
        window.electronAPI.off('overlay:toggle', handleToggle);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Overlay
        isVisible={isVisible}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onPositionChange={handlePositionChange}
        onSizeChange={handleSizeChange}
        initialPosition={position}
        initialSize={size}
        alwaysOnTop={isAlwaysOnTop}
        className="shadow-2xl"
      >
        <OverlayChat
          onSendMessage={handleSendMessage}
          onTakeScreenshot={handleTakeScreenshot}
          onAttachImage={handleAttachImage}
          onStartRecording={handleStartRecording}
          placeholder="Ask Atlas anything..."
        />
      </Overlay>

      {/* Hidden content for when overlay is minimized */}
      {!isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Overlay is minimized</p>
            <p className="text-sm text-muted-foreground">
              Press the overlay hotkey to restore
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Electron API types
declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data?: any) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, callback: Function) => void;
      off: (channel: string, callback: Function) => void;
    };
  }
}