'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
}

interface ToastSystemProps {
  children?: React.ReactNode;
}

export function ToastSystem({ children }: ToastSystemProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove if not persistent
    if (!newToast.persistent && newToast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration || 5000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Listen for custom toast events from validation service
  useEffect(() => {
    const handleToastEvent = (event: CustomEvent<Toast>) => {
      addToast(event.detail);
    };

    window.addEventListener('atlas-toast', handleToastEvent as EventListener);

    return () => {
      window.removeEventListener('atlas-toast', handleToastEvent as EventListener);
    };
  }, [addToast]);

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
        return 'border-blue-500';
    }
  };

  return (
    <div
      className={`
        ${getBackgroundColor()} ${getBorderColor()}
        border-l-4 rounded-lg shadow-lg p-4 transform transition-all duration-300
        animate-in slide-in-from-right-2 fade-in
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {toast.title}
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                {toast.message}
              </p>

              {toast.actions && toast.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {toast.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={() => {
                        action.onClick();
                        onDismiss();
                      }}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="flex-shrink-0 ml-2 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using toast system
export function useToast() {
  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const event = new CustomEvent('atlas-toast', { detail: toast });
    window.dispatchEvent(event);
    return `toast-${Date.now()}`;
  }, []);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return showToast({ type: 'success', title, message, ...options });
  }, [showToast]);

  const showError = useCallback((title: string, message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return showToast({ type: 'error', title, message, ...options });
  }, [showToast]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return showToast({ type: 'warning', title, message, ...options });
  }, [showToast]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return showToast({ type: 'info', title, message, ...options });
  }, [showToast]);

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// Utility functions for common toast patterns
export const ToastUtils = {
  validationError: (field: string, message: string) => ({
    type: 'error' as const,
    title: 'Validation Error',
    message: `${field}: ${message}`,
    duration: 7000,
    actions: [
      {
        label: 'View Details',
        onClick: () => console.log('Show validation details for:', field),
        variant: 'outline' as const
      }
    ]
  }),

  validationWarning: (field: string, message: string) => ({
    type: 'warning' as const,
    title: 'Validation Warning',
    message: `${field}: ${message}`,
    duration: 5000
  }),

  validationSuccess: (itemCount: number, warnings: number) => ({
    type: 'success' as const,
    title: 'Validation Complete',
    message: `Validated ${itemCount} items with ${warnings} warnings`,
    duration: 3000
  }),

  importSuccess: (itemCount: number) => ({
    type: 'success' as const,
    title: 'Import Complete',
    message: `Successfully imported ${itemCount} items`,
    duration: 5000
  }),

  exportSuccess: (fileName: string) => ({
    type: 'success' as const,
    title: 'Export Complete',
    message: `Data exported to ${fileName}`,
    duration: 5000
  }),

  autoFixApplied: (changesCount: number) => ({
    type: 'info' as const,
    title: 'Auto-Fix Applied',
    message: `Applied ${changesCount} automatic corrections`,
    duration: 4000,
    actions: [
      {
        label: 'View Changes',
        onClick: () => console.log('Show auto-fix changes'),
        variant: 'outline' as const
      }
    ]
  }),

  error: (title: string, message: string, persistent: boolean = false) => ({
    type: 'error' as const,
    title,
    message,
    duration: persistent ? 0 : 7000,
    persistent
  })
};