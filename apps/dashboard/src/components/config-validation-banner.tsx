'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateConfig } from '@/lib/config-validator';

interface ConfigValidationBannerProps {
  className?: string;
}

export function ConfigValidationBanner({ className }: ConfigValidationBannerProps) {
  const [validation, setValidation] = useState(() => validateConfig());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Re-validate when environment changes
    const handleVisibilityChange = () => {
      setValidation(validateConfig());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!isVisible || validation.isValid) {
    return null;
  }

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (process.env.NODE_ENV === 'production' && hasErrors) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 ${className}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-red-800">Configuration Error</h3>
                <Badge variant="destructive" className="text-xs">
                  {validation.errors.length} {validation.errors.length === 1 ? 'error' : 'errors'}
                </Badge>
              </div>
              <p className="text-sm text-red-700 mb-2">
                The application has configuration issues that must be resolved:
              </p>
              <ul className="text-sm text-red-600 space-y-1 mb-3">
                {validation.errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>{error}</span>
                  </li>
                ))}
                {validation.errors.length > 5 && (
                  <li className="text-red-500">
                    +{validation.errors.length - 5} more errors...
                  </li>
                )}
              </ul>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Configuration Errors:\\n${validation.errors.join('\\n')}\\n\\nWarnings:\\n${validation.warnings.join('\\n')}`
                    );
                  }}
                >
                  Copy Errors
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/docs/configuration', '_blank')}
                >
                  View Documentation
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (hasWarnings) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 ${className}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-yellow-800">Configuration Warnings</h3>
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {validation.warnings.length} {validation.warnings.length === 1 ? 'warning' : 'warnings'}
                </Badge>
              </div>
              <p className="text-sm text-yellow-700 mb-2">
                The application has configuration warnings that should be addressed:
              </p>
              <ul className="text-sm text-yellow-600 space-y-1 mb-3">
                {validation.warnings.slice(0, 3).map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
                {validation.warnings.length > 3 && (
                  <li className="text-yellow-500">
                    +{validation.warnings.length - 3} more warnings...
                  </li>
                )}
              </ul>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Configuration Warnings:\\n${validation.warnings.join('\\n')}`
                    );
                  }}
                >
                  Copy Warnings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/docs/configuration', '_blank')}
                >
                  View Documentation
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success banner (when config is valid)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-green-50 border-b border-green-200 ${className}`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Configuration valid
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Development-only helper component
export function DevConfigHelper() {
  const [config, setConfig] = useState(() => validateConfig());

  useEffect(() => {
    const interval = setInterval(() => {
      setConfig(validateConfig());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <h4 className="font-semibold text-gray-800 mb-2">Config Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={config.isValid ? 'text-green-600' : 'text-red-600'}>
              {config.isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          {config.errors.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Errors:</span>
              <span className="text-red-600">{config.errors.length}</span>
            </div>
          )}
          {config.warnings.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Warnings:</span>
              <span className="text-yellow-600">{config.warnings.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}