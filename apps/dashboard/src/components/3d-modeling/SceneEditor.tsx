'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/logger';
import { Scene, Mesh } from '@/services/3d-modeling-service';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Settings,
  Download,
  Eye,
  EyeOff,
  Play,
  Pause,
  Layers,
  Grid3X3,
  Lightbulb,
  Camera
} from 'lucide-react';

interface SceneEditorProps {
  scene: Scene;
}

export function SceneEditor({ scene }: SceneEditorProps) {
  const { actions } = useModeling();
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAddMesh = async (type: Mesh['type']) => {
    const meshName = prompt(`${type.charAt(0).toUpperCase() + type.slice(1)} name:`);
    if (!meshName) return;

    try {
      await actions.addMesh(scene.id, {
        name: meshName,
        type,
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
      logger.error('scene-editor', 'Failed to add mesh', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteMesh = async (meshId: string) => {
    if (confirm('Are you sure you want to delete this object?')) {
      try {
        await actions.deleteMesh(scene.id, meshId);
      } catch (error) {
        logger.error('scene-editor', 'Failed to delete mesh', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const handleToggleMeshVisibility = async (meshId: string, isVisible: boolean) => {
    try {
      await actions.updateMesh(scene.id, meshId, { isVisible: !isVisible });
    } catch (error) {
      logger.error('scene-editor', 'Failed to toggle mesh visibility', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleToggleMeshLock = async (meshId: string, isLocked: boolean) => {
    try {
      await actions.updateMesh(scene.id, meshId, { isLocked: !isLocked });
    } catch (error) {
      logger.error('scene-editor', 'Failed to toggle mesh lock', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleSceneAction = async (action: string) => {
    try {
      switch (action) {
        case 'toggleActive':
          await actions.updateScene(scene.id, { isActive: !scene.isActive });
          break;
        case 'exportOBJ':
          const objBlob = await actions.exportScene(scene.id, 'obj');
          downloadBlob(objBlob, `${scene.name}.obj`);
          break;
        case 'exportSTL':
          const stlBlob = await actions.exportScene(scene.id, 'stl');
          downloadBlob(stlBlob, `${scene.name}.stl`);
          break;
        case 'exportGLTF':
          const gltfBlob = await actions.exportScene(scene.id, 'gltf');
          downloadBlob(gltfBlob, `${scene.name}.gltf`);
          break;
      }
    } catch (error) {
      logger.error('scene-editor', 'Failed to perform scene action', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Scene Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scene Properties</span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={scene.isActive ? 'default' : 'outline'}
                onClick={() => handleSceneAction('toggleActive')}
              >
                {scene.isActive ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {scene.isActive ? 'Active' : 'Inactive'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={scene.name}
                  onChange={(e) => actions.updateScene(scene.id, { name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={scene.description}
                  onChange={(e) => actions.updateScene(scene.id, { description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <h3 className="font-medium">{scene.name}</h3>
                <p className="text-sm text-muted-foreground">{scene.description}</p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Created: {new Date(scene.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(scene.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Scene Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">{scene.meshes.length}</div>
              <div className="text-xs text-muted-foreground">Objects</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">{scene.lights.length}</div>
              <div className="text-xs text-muted-foreground">Lights</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500">{scene.cameras.length}</div>
              <div className="text-xs text-muted-foreground">Cameras</div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-3 w-3 mr-2" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
            {showAdvanced && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSceneAction('exportOBJ')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export OBJ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSceneAction('exportSTL')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export STL
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSceneAction('exportGLTF')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export GLTF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Object List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Objects</span>
            <Button size="sm" onClick={() => handleAddMesh('cube')}>
              <Plus className="h-3 w-3 mr-1" />
              Add Object
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scene.meshes.map((mesh) => (
            <div
              key={mesh.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: mesh.material.color }}
                />
                <div>
                  <div className="font-medium text-sm">{mesh.name}</div>
                  <div className="text-xs text-muted-foreground">{mesh.type}</div>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    {mesh.material.type}
                  </Badge>
                  {mesh.isLocked && (
                    <Badge variant="secondary" className="text-xs">
                      Locked
                    </Badge>
                  )}
                  {!mesh.isVisible && (
                    <Badge variant="outline" className="text-xs">
                      Hidden
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => actions.selectMesh(scene.id, mesh.id)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleMeshVisibility(mesh.id, mesh.isVisible)}
                >
                  {mesh.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleMeshLock(mesh.id, mesh.isLocked)}
                >
                  {mesh.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteMesh(mesh.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {scene.meshes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No objects in scene</p>
              <p className="text-xs">Add objects to start building your scene</p>
            </div>
          )}

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddMesh('cube')}
              className="text-xs"
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              Cube
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddMesh('sphere')}
              className="text-xs"
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              Sphere
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddMesh('cylinder')}
              className="text-xs"
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              Cylinder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddMesh('plane')}
              className="text-xs"
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              Plane
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Environment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Environment</span>
            <Badge variant="outline" className="text-xs">
              {scene.lights.length} Lights
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted rounded">
              <Lightbulb className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-sm font-medium">Lighting</div>
              <div className="text-xs text-muted-foreground">
                {scene.lights.length > 0 ? 'Configured' : 'Default'}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded">
              <Camera className="h-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium">Camera</div>
              <div className="text-xs text-muted-foreground">
                {scene.cameras.length > 0 ? 'Custom' : 'Default'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}