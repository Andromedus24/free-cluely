'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverlayProps {
  isVisible: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onSizeChange?: (width: number, height: number) => void;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  isResizable?: boolean;
  isDraggable?: boolean;
  alwaysOnTop?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  initialX: number;
  initialY: number;
}

interface ResizeState {
  isResizing: boolean;
  resizeStartX: number;
  resizeStartY: number;
  initialWidth: number;
  initialHeight: number;
}

export const Overlay: React.FC<OverlayProps> = ({
  isVisible,
  onClose,
  onMinimize,
  onPositionChange,
  onSizeChange,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 600 },
  isResizable = true,
  isDraggable = true,
  alwaysOnTop = true,
  children,
  className
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialX: 0,
    initialY: 0
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizeStartX: 0,
    resizeStartY: 0,
    initialWidth: 0,
    initialHeight: 0
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Update position when initialPosition changes
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  // Update size when initialSize changes
  useEffect(() => {
    setSize(initialSize);
  }, [initialSize]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return;

    e.preventDefault();
    setDragState({
      isDragging: true,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      initialX: position.x,
      initialY: position.y
    });

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [isDraggable, position.x, position.y]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const deltaX = e.clientX - dragState.dragStartX;
    const deltaY = e.clientY - dragState.dragStartY;

    const newX = Math.max(0, dragState.initialX + deltaX);
    const newY = Math.max(0, dragState.initialY + deltaY);

    setPosition({ x: newX, y: newY });
    onPositionChange?.(newX, newY);
  }, [dragState, onPositionChange]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isResizable) return;

    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      isResizing: true,
      resizeStartX: e.clientX,
      resizeStartY: e.clientY,
      initialWidth: size.width,
      initialHeight: size.height
    });

    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  }, [isResizable, size.width, size.height]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing) return;

    const deltaX = e.clientX - resizeState.resizeStartX;
    const deltaY = e.clientY - resizeState.resizeStartY;

    const newWidth = Math.max(300, resizeState.initialWidth + deltaX);
    const newHeight = Math.max(200, resizeState.initialHeight + deltaY);

    setSize({ width: newWidth, height: newHeight });
    onSizeChange?.(newWidth, newHeight);
  }, [resizeState, onSizeChange]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setResizeState(prev => ({ ...prev, isResizing: false }));
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add event listeners for drag and resize
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    if (resizeState.isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [dragState.isDragging, resizeState.isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      // Escape to close
      if (e.key === 'Escape') {
        onClose?.();
      }

      // Ctrl/Cmd + M to minimize
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        onMinimize?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose, onMinimize]);

  // Focus overlay when shown
  useEffect(() => {
    if (isVisible && overlayRef.current) {
      overlayRef.current.focus();
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={overlayRef}
          tabIndex={0}
          className={cn(
            "fixed z-[9999] bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-2xl",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            className
          )}
          style={{
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            cursor: dragState.isDragging ? 'grabbing' : isDraggable ? 'grab' : 'default'
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header with drag handle */}
          <div
            className={cn(
              "flex items-center justify-between p-3 border-b border-border",
              "bg-muted/50 rounded-t-lg cursor-grab select-none"
            )}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Atlas Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {onMinimize && (
                <button
                  onClick={onMinimize}
                  className="p-1 rounded hover:bg-muted-foreground/20 transition-colors"
                  title="Minimize (Ctrl/Cmd + M)"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-destructive/20 text-destructive-foreground transition-colors"
                  title="Close (Escape)"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {/* Resize handle */}
          {isResizable && (
            <div
              ref={resizeHandleRef}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
              onMouseDown={handleResizeStart}
            >
              <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/50" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Overlay;