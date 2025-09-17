'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Move, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Keyboard,
  Camera,
  RefreshCw
} from 'lucide-react';

interface OverlayState {
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  alwaysOnTop: boolean;
  transparent: boolean;
  movable: boolean;
}

interface OverlayTabProps {
  onCommand?: (command: string, data?: any) => void;
}

export default function OverlayTab({ onCommand }: OverlayTabProps) {
  const [overlayState, setOverlayState] = useState<OverlayState>({
    visible: false,
    position: { x: 100, y: 100 },
    size: { width: 400, height: 600 },
    alwaysOnTop: true,
    transparent: true,
    movable: true
  });

  const [config, setConfig] = useState({
    width: 400,
    height: 600,
    alwaysOnTop: true,
    transparent: true,
    frameless: true,
    movable: true,
    resizable: false
  });

  const hotkeys = [
    { key: 'Cmd/Ctrl + Shift + Space', action: 'Toggle Visibility' },
    { key: 'Cmd/Ctrl + Shift + C', action: 'Center Window' },
    { key: 'Cmd/Ctrl + Arrow Keys', action: 'Move Window' },
    { key: 'Cmd/Ctrl + R', action: 'Reset Position' },
    { key: 'Cmd/Ctrl + H', action: 'Take Screenshot' }
  ];

  const handleToggleVisibility = async () => {
    try {
      const command = overlayState.visible ? 'overlay:hide' : 'overlay:show';
      await onCommand?.(command);
      setOverlayState(prev => ({ ...prev, visible: !prev.visible }));
    } catch (error) {
      console.error('Failed to toggle overlay:', error);
    }
  };

  const handleCenter = async () => {
    try {
      await onCommand?.('overlay:center');
    } catch (error) {
      console.error('Failed to center overlay:', error);
    }
  };

  const handleUpdateConfig = async (key: string, value: any) => {
    try {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      await onCommand?.('overlay:setConfig', newConfig);
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const handleRefreshState = async () => {
    try {
      // This would fetch the current state from the backend
      await onCommand?.('overlay:getState');
    } catch (error) {
      console.error('Failed to refresh state:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overlay Management</h2>
          <p className="text-muted-foreground">
            Control the overlay window appearance and behavior
          </p>
        </div>
        <Button onClick={handleRefreshState} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move className="w-5 h-5" />
            Overlay Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={overlayState.visible ? "default" : "secondary"}>
                {overlayState.visible ? "Visible" : "Hidden"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Position: ({overlayState.position.x}, {overlayState.position.y})
              </span>
            </div>
            <Button
              onClick={handleToggleVisibility}
              variant={overlayState.visible ? "destructive" : "default"}
            >
              {overlayState.visible ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleCenter} variant="outline">
              <Maximize2 className="w-4 h-4 mr-2" />
              Center Window
            </Button>
            <Button 
              onClick={() => onCommand?.('screenshot:capture')} 
              variant="outline"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Screenshot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Overlay Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width (px)</Label>
              <Input
                id="width"
                type="number"
                value={config.width}
                onChange={(e) => handleUpdateConfig('width', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={config.height}
                onChange={(e) => handleUpdateConfig('height', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="alwaysOnTop">Always on Top</Label>
              <Switch
                id="alwaysOnTop"
                checked={config.alwaysOnTop}
                onCheckedChange={(checked) => handleUpdateConfig('alwaysOnTop', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="transparent">Transparent Background</Label>
              <Switch
                id="transparent"
                checked={config.transparent}
                onCheckedChange={(checked) => handleUpdateConfig('transparent', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="frameless">Frameless Window</Label>
              <Switch
                id="frameless"
                checked={config.frameless}
                onCheckedChange={(checked) => handleUpdateConfig('frameless', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="movable">Movable</Label>
              <Switch
                id="movable"
                checked={config.movable}
                onCheckedChange={(checked) => handleUpdateConfig('movable', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="resizable">Resizable</Label>
              <Switch
                id="resizable"
                checked={config.resizable}
                onCheckedChange={(checked) => handleUpdateConfig('resizable', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hotkeys.map((hotkey, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-mono">{hotkey.key}</span>
                <span className="text-sm text-muted-foreground">{hotkey.action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}