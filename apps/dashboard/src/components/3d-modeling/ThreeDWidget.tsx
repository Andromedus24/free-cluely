'use client';

import React, { useState, useEffect } from 'react';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cube,
  Box,
  Move3D,
  RotateCcw,
  Save,
  Download,
  Play,
  Pause,
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreeDWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function ThreeDWidget({ className, variant = 'compact' }: ThreeDWidgetProps) {
  const { state, actions } = useModeling();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await actions.createScene('Test Scene', 'Auto-created for widget');
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
  }, [actions]);

  const totalMeshes = Array.from(state.scenes.values()).reduce((acc, scene) => acc + scene.meshes.length, 0);
  const activeScenes = Array.from(state.scenes.values()).filter(scene => scene.isActive).length;

  const handleQuickScene = async () => {
    try {
      const scene = await actions.createScene('Quick Scene', 'Created from widget');
      await actions.addMesh(scene.id, {
        name: 'Cube',
        type: 'cube',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: {
          type: 'standard',
          color: '#4f46e5',
          roughness: 0.5,
          metalness: 0.1
        },
        isVisible: true,
        isLocked: false
      });
    } catch (error) {
      console.error('Failed to create quick scene:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <Cube className="h-4 w-4" />
              <span>3D Modeling</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
                {isConnected ? 'Ready' : 'Offline'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {state.scenes.size}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">
                {totalMeshes}
              </div>
              <div className="text-xs text-muted-foreground">Objects</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">
                {activeScenes}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>

          <Button size="sm" className="w-full" onClick={handleQuickScene}>
            <Box className="h-3 w-3 mr-1" />
            Quick Scene
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cube className="h-5 w-5" />
            <span>3D Modeling Studio</span>
          </div>
          <div className="flex items-center space-x-2">
            {state.isModeling && (
              <Badge variant="destructive" className="text-xs">
                <Play className="h-2 w-2 mr-1" />
                Recording
              </Badge>
            )}
            <Button size="sm" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-500">
              {state.scenes.size}
            </div>
            <div className="text-xs text-muted-foreground">Scenes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">
              {totalMeshes}
            </div>
            <div className="text-xs text-muted-foreground">Objects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-500">
              {state.presets.size}
            </div>
            <div className="text-xs text-muted-foreground">Presets</div>
          </div>
        </div>

        {/* Current Scene */}
        {state.currentScene && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Move3D className="h-3 w-3" />
              <span>Current Scene</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded text-xs">
              <div className="flex items-center space-x-2">
                <span className="truncate flex-1">{state.currentScene.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Box className="h-3 w-3 text-muted-foreground" />
                <span>{state.currentScene.meshes.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Object */}
        {state.selectedMesh && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Cube className="h-3 w-3" />
              <span>Selected Object</span>
            </div>
            <div className="p-2 bg-muted rounded text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{state.selectedMesh.name}</span>
                <Badge variant="outline" className="text-xs">
                  {state.selectedMesh.type}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                Position: ({state.selectedMesh.position.x.toFixed(1)}, {state.selectedMesh.position.y.toFixed(1)}, {state.selectedMesh.position.z.toFixed(1)})
              </div>
            </div>
          </div>
        )}

        {/* Active Gesture */}
        {state.activeGesture && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Move3D className="h-3 w-3" />
              <span>Active Gesture</span>
            </div>
            <div className="p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded border border-blue-200 dark:border-blue-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{state.activeGesture.type}</span>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                  {state.activeGesture.confidence.toFixed(2)}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                {state.activeGesture.hand === 'left' ? 'Left' : 'Right'} hand
              </div>
            </div>
          </div>
        )}

        {/* AI Features */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">AI Assistant</span>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
            <Zap className="h-2 w-2 mr-1" />
            Active
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleQuickScene}>
            <Box className="h-3 w-3 mr-1" />
            New Scene
          </Button>
          <Button size="sm" className="flex-1" onClick={() => window.open('/3d-modeling', '_blank')}>
            <Play className="h-3 w-3 mr-1" />
            Open Studio
          </Button>
        </div>

        {/* Empty State */}
        {state.scenes.size === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Cube className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Create your first 3D scene</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}