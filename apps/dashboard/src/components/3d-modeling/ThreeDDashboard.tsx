'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Cube,
  Plus,
  Trash2,
  Save,
  Download,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Move,
  Settings,
  Layers,
  Grid3X3,
  Hand,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { ThreeDViewer } from './ThreeDViewer';
import { SceneEditor } from './SceneEditor';
import { MeshEditor } from './MeshEditor';
import { LayoutPresets } from './LayoutPresets';
import { GestureControls } from './GestureControls';

export function ThreeDDashboard() {
  const { state, actions } = useModeling();
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (state.currentScene) {
      setSelectedSceneId(state.currentScene.id);
    }
  }, [state.currentScene]);

  const handleCreateScene = async () => {
    const name = prompt('Scene name:');
    if (name) {
      try {
        const scene = await actions.createScene(name, 'Created from dashboard');
        setSelectedSceneId(scene.id);
      } catch (error) {
        logger.error('3d-dashboard', 'Failed to create scene', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (confirm('Are you sure you want to delete this scene?')) {
      try {
        await actions.deleteScene(sceneId);
        if (selectedSceneId === sceneId) {
          setSelectedSceneId('');
        }
      } catch (error) {
        logger.error('3d-dashboard', 'Failed to delete scene', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const handleStartSession = async () => {
    if (selectedSceneId) {
      try {
        await actions.startModelingSession(selectedSceneId);
        setIsPlaying(true);
      } catch (error) {
        logger.error('3d-dashboard', 'Failed to start session', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const handleEndSession = async () => {
    if (state.currentSession) {
      try {
        await actions.endModelingSession(state.currentSession.id);
        setIsPlaying(false);
      } catch (error) {
        logger.error('3d-dashboard', 'Failed to end session', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const handleExportScene = async (sceneId: string, format: string) => {
    try {
      const blob = await actions.exportScene(sceneId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_${sceneId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('3d-dashboard', 'Failed to export scene', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const selectedScene = state.scenes.get(selectedSceneId);
  const scenesList = Array.from(state.scenes.values());

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">3D Modeling Studio</h1>
          <p className="text-muted-foreground">
            Create, edit, and animate 3D scenes with AI-powered assistance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {state.isModeling ? (
            <Button variant="destructive" onClick={handleEndSession}>
              <Pause className="h-4 w-4 mr-2" />
              End Session
            </Button>
          ) : (
            <Button onClick={handleStartSession} disabled={!selectedScene}>
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          )}
          <Button onClick={handleCreateScene}>
            <Plus className="h-4 w-4 mr-2" />
            New Scene
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Cube className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{state.scenes.size} Scenes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-green-500" />
                <span className="font-medium">
                  {scenesList.reduce((acc, scene) => acc + scene.meshes.length, 0)} Objects
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Grid3X3 className="h-5 w-5 text-purple-500" />
                <span className="font-medium">{state.presets.size} Presets</span>
              </div>
              <div className="flex items-center space-x-2">
                <Hand className="h-5 w-5 text-orange-500" />
                <span className="font-medium">
                  {state.activeGesture ? state.activeGesture.type : 'No'} Gesture
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {state.isModeling && (
                <Badge variant="destructive">
                  <Play className="h-3 w-3 mr-1" />
                  Recording
                </Badge>
              )}
              {state.config.enableAI && (
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Active
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scene List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Scenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenesList.map((scene) => (
              <div
                key={scene.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSceneId === scene.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-blue-300'
                }`}
                onClick={() => setSelectedSceneId(scene.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{scene.name}</h3>
                  <div className="flex items-center space-x-1">
                    {scene.isActive && (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(scene.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{scene.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{scene.meshes.length} objects</span>
                  <span>{new Date(scene.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {scenesList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Cube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scenes yet</p>
                <p className="text-xs">Create your first scene to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Viewport */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>3D Viewport</span>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => actions.undo()} disabled={!state.currentSession}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Undo
                </Button>
                <Button size="sm" variant="outline" onClick={() => actions.redo()} disabled={!state.currentSession}>
                  <RotateCcw className="h-3 w-3 mr-1 transform rotate-180" />
                  Redo
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
              {selectedScene ? (
                <ThreeDViewer scene={selectedScene} />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Cube className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a scene to view</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedScene ? (
              <Tabs defaultValue="scene" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scene">Scene</TabsTrigger>
                  <TabsTrigger value="object">Object</TabsTrigger>
                </TabsList>
                <TabsContent value="scene" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={selectedScene.name}
                        onChange={(e) => actions.updateScene(selectedScene.id, { name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={selectedScene.description}
                        onChange={(e) => actions.updateScene(selectedScene.id, { description: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.updateScene(selectedScene.id, { isActive: !selectedScene.isActive })}
                      >
                        {selectedScene.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setShowAdvanced(!showAdvanced)}>
                        <Settings className="h-3 w-3 mr-2" />
                        {showAdvanced ? 'Hide' : 'Show'} Advanced
                      </Button>
                      {showAdvanced && (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleExportScene(selectedScene.id, 'obj')}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            Export OBJ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleExportScene(selectedScene.id, 'stl')}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            Export STL
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="object" className="space-y-4">
                  {state.selectedMesh ? (
                    <MeshEditor scene={selectedScene} mesh={state.selectedMesh} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No object selected</p>
                      <p className="text-xs">Select an object in the viewport</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scene selected</p>
                <p className="text-xs">Select a scene to edit properties</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Features */}
      {selectedScene && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LayoutPresets scene={selectedScene} />
          <GestureControls />
        </div>
      )}
    </div>
  );
}