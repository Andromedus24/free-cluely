'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { use3DModeling } from '@/contexts/3d-modeling-context';
import { ThreeDViewer } from '@/components/3d-modeling/ThreeDViewer';
import { WebcamGestureControls } from '@/components/3d-modeling/WebcamGestureControls';
import {
  Cube,
  Box,
  Sphere,
  Camera,
  RotateCcw,
  Save,
  Download,
  Upload,
  Settings,
  Layers,
  Grid,
  Maximize,
  Minimize,
  Hand,
  MousePointer,
  Zap,
  Palette,
  Lightbulb,
  Move,
  Scale,
  Rotate3d
} from 'lucide-react';

export default function ThreeDModelingPage() {
  const {
    currentScene,
    isLoading,
    error,
    createScene,
    addObject,
    updateObject,
    deleteObject,
    applyLayout,
    exportScene,
    importScene
  } = use3DModeling();

  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [cameraDistance, setCameraDistance] = useState([10]);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'points'>('solid');
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sceneName, setSceneName] = useState('Untitled Scene');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!currentScene) {
      createScene('default');
    }
  }, [currentScene, createScene]);

  const handleAddObject = (type: 'cube' | 'sphere' | 'cylinder' | 'plane') => {
    if (!currentScene) return;

    const object = {
      id: `object_${Date.now()}`,
      type,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      created: new Date().toISOString()
    };

    addObject(object);
  };

  const handleGestureDetected = (gesture: string) => {
    if (!currentScene || !selectedObject) return;

    switch (gesture) {
      case 'rotate':
        updateObject(selectedObject, {
          rotation: {
            x: Math.random() * Math.PI,
            y: Math.random() * Math.PI,
            z: Math.random() * Math.PI
          }
        });
        break;
      case 'scale':
        updateObject(selectedObject, {
          scale: {
            x: 1 + Math.random(),
            y: 1 + Math.random(),
            z: 1 + Math.random()
          }
        });
        break;
      case 'move':
        updateObject(selectedObject, {
          position: {
            x: (Math.random() - 0.5) * 5,
            y: (Math.random() - 0.5) * 5,
            z: (Math.random() - 0.5) * 5
          }
        });
        break;
    }
  };

  const handleExport = async () => {
    if (!currentScene) return;

    try {
      const exported = await exportScene(currentScene.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sceneName || 'scene'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export scene:', error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const sceneData = JSON.parse(e.target?.result as string);
        await importScene(sceneData);
        setSceneName(sceneData.name || 'Imported Scene');
      } catch (error) {
        console.error('Failed to import scene:', error);
      }
    };
    reader.readAsText(file);
  };

  const sceneStats = currentScene ? {
    objects: currentScene.objects.length,
    vertices: currentScene.objects.reduce((sum, obj) => sum + (obj.vertices || 8), 0),
    faces: currentScene.objects.reduce((sum, obj) => sum + (obj.faces || 6), 0),
    memory: JSON.stringify(currentScene).length / 1024 // KB
  } : null;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading 3D Modeling Studio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-red-500">
            <p>Error loading 3D Modeling Studio: {error.message}</p>
            <Button onClick={() => createScene('default')} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Cube className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">3D Modeling Studio</h1>
            <p className="text-muted-foreground">Create stunning 3D scenes with AI assistance</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">
            {sceneStats ? `${sceneStats.objects} objects` : 'No scene'}
          </Badge>
          {gestureEnabled && (
            <Badge variant="default" className="bg-green-500">
              <Hand className="h-3 w-3 mr-1" />
              Gestures ON
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Tools */}
        <div className="lg:col-span-1 space-y-4">
          {/* Object Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Box className="h-5 w-5" />
                <span>Add Objects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddObject('cube')}
                  className="flex flex-col items-center space-y-1 h-20"
                >
                  <Cube className="h-6 w-6" />
                  <span className="text-xs">Cube</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddObject('sphere')}
                  className="flex flex-col items-center space-y-1 h-20"
                >
                  <Sphere className="h-6 w-6" />
                  <span className="text-xs">Sphere</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddObject('cylinder')}
                  className="flex flex-col items-center space-y-1 h-20"
                >
                  <Box className="h-6 w-6" />
                  <span className="text-xs">Cylinder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddObject('plane')}
                  className="flex flex-col items-center space-y-1 h-20"
                >
                  <Grid className="h-6 w-6" />
                  <span className="text-xs">Plane</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transform Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Move className="h-5 w-5" />
                <span>Transform</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedObject ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" step="0.1" />
                      <Input type="number" placeholder="Y" step="0.1" />
                      <Input type="number" placeholder="Z" step="0.1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rotation</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" step="0.1" />
                      <Input type="number" placeholder="Y" step="0.1" />
                      <Input type="number" placeholder="Z" step="0.1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Scale</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" step="0.1" defaultValue="1" />
                      <Input type="number" placeholder="Y" step="0.1" defaultValue="1" />
                      <Input type="number" placeholder="Z" step="0.1" defaultValue="1" />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select an object to transform</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gesture-toggle">Gesture Control</Label>
                  <Switch
                    id="gesture-toggle"
                    checked={gestureEnabled}
                    onCheckedChange={setGestureEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="grid-toggle">Show Grid</Label>
                  <Switch
                    id="grid-toggle"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="axes-toggle">Show Axes</Label>
                  <Switch
                    id="axes-toggle"
                    checked={showAxes}
                    onCheckedChange={setShowAxes}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main 3D Viewport */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Viewport</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{renderMode}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative" style={{ height: isFullscreen ? '80vh' : '600px' }}>
                {currentScene && (
                  <ThreeDViewer
                    scene={currentScene}
                    className="w-full h-full"
                    cameraDistance={cameraDistance[0]}
                    showGrid={showGrid}
                    showAxes={showAxes}
                    renderMode={renderMode}
                    onObjectSelect={setSelectedObject}
                  />
                )}

                {/* Camera Controls */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/50 rounded-lg p-2">
                  <Button variant="ghost" size="sm" onClick={() => setCameraDistance([5])}>
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={cameraDistance}
                    onValueChange={setCameraDistance}
                    max={50}
                    min={5}
                    step={1}
                    className="w-24"
                  />
                </div>

                {/* Render Mode Controls */}
                <div className="absolute top-4 right-4 flex items-center space-x-1 bg-black/50 rounded-lg p-1">
                  {(['solid', 'wireframe', 'points'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={renderMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRenderMode(mode)}
                      className="text-xs h-8"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Properties & Layers */}
        <div className="lg:col-span-1 space-y-4">
          {/* Scene Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="h-5 w-5" />
                <span>Scene Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="scene-name">Scene Name</Label>
                <Input
                  id="scene-name"
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                />
              </div>
              {sceneStats && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Objects:</span>
                    <span>{sceneStats.objects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vertices:</span>
                    <span>{sceneStats.vertices.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faces:</span>
                    <span>{sceneStats.faces.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span>{sceneStats.memory.toFixed(1)} KB</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Save className="h-5 w-5" />
                <span>File</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Scene
              </Button>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-scene"
                />
                <Button asChild variant="outline" className="w-full">
                  <label htmlFor="import-scene" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Scene
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Object List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MousePointer className="h-5 w-5" />
                <span>Objects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentScene?.objects.map((obj) => (
                  <div
                    key={obj.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedObject === obj.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedObject(obj.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{obj.type}</span>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: obj.color }}
                      />
                    </div>
                    <p className="text-xs opacity-70">
                      {obj.position.x.toFixed(1)}, {obj.position.y.toFixed(1)}, {obj.position.z.toFixed(1)}
                    </p>
                  </div>
                ))}
                {(!currentScene || currentScene.objects.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No objects in scene
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gesture Controls */}
          {gestureEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Hand className="h-5 w-5" />
                  <span>Gestures</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WebcamGestureControls onGestureDetected={handleGestureDetected} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}