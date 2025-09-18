'use client';

import React, { useState } from 'react';
import { Scene, Mesh, Material } from '@/services/3d-modeling-service';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Move,
  RotateCw,
  Maximize,
  Palette,
  Save,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Settings
} from 'lucide-react';

interface MeshEditorProps {
  scene: Scene;
  mesh: Mesh;
}

export function MeshEditor({ scene, mesh }: MeshEditorProps) {
  const { actions } = useModeling();
  const [isEditing, setIsEditing] = useState(false);

  const handleTransformUpdate = async (type: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number) => {
    try {
      const transform = { [type]: { ...mesh[type], [axis]: value } };
      await actions.transformMesh(scene.id, mesh.id, transform);
    } catch (error) {
      console.error('Failed to update transform:', error);
    }
  };

  const handleMaterialUpdate = async (updates: Partial<Material>) => {
    try {
      await actions.updateMesh(scene.id, mesh.id, { material: { ...mesh.material, ...updates } });
    } catch (error) {
      console.error('Failed to update material:', error);
    }
  };

  const handleMeshAction = async (action: string) => {
    try {
      switch (action) {
        case 'duplicate':
          await actions.duplicateMesh(scene.id, mesh.id);
          break;
        case 'toggleVisibility':
          await actions.updateMesh(scene.id, mesh.id, { isVisible: !mesh.isVisible });
          break;
        case 'toggleLock':
          await actions.updateMesh(scene.id, mesh.id, { isLocked: !mesh.isLocked });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this object?')) {
            await actions.deleteMesh(scene.id, mesh.id);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to perform mesh action:', error);
    }
  };

  const Vector3Input = ({ label, value, onChange }: { label: string; value: { x: number; y: number; z: number }; onChange: (axis: 'x' | 'y' | 'z', value: number) => void }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis}>
            <Label className="text-xs text-muted-foreground">{axis.toUpperCase()}</Label>
            <Input
              type="number"
              step="0.1"
              value={value[axis]}
              onChange={(e) => onChange(axis, parseFloat(e.target.value) || 0)}
              className="h-8"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: mesh.material.color }}
              />
              <span>{mesh.name}</span>
              <Badge variant="outline" className="text-xs">{mesh.type}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                <Settings className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleMeshAction('duplicate')}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleMeshAction('toggleVisibility')}>
                {mesh.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleMeshAction('toggleLock')}>
                {mesh.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleMeshAction('delete')}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Property Tabs */}
      <Tabs defaultValue="transform" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transform">
            <Move className="h-3 w-3 mr-1" />
            Transform
          </TabsTrigger>
          <TabsTrigger value="material">
            <Palette className="h-3 w-3 mr-1" />
            Material
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Settings className="h-3 w-3 mr-1" />
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transform" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Vector3Input
                label="Position"
                value={mesh.position}
                onChange={(axis, value) => handleTransformUpdate('position', axis, value)}
              />
              <Vector3Input
                label="Rotation"
                value={mesh.rotation}
                onChange={(axis, value) => handleTransformUpdate('rotation', axis, value)}
              />
              <Vector3Input
                label="Scale"
                value={mesh.scale}
                onChange={(axis, value) => handleTransformUpdate('scale', axis, value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Material Type</Label>
                <div className="flex space-x-2">
                  {(['standard', 'basic', 'phong', 'lambert'] as const).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={mesh.material.type === type ? 'default' : 'outline'}
                      onClick={() => handleMaterialUpdate({ type })}
                      className="text-xs"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={mesh.material.color}
                    onChange={(e) => handleMaterialUpdate({ color: e.target.value })}
                    className="w-8 h-8 rounded border"
                  />
                  <Input
                    value={mesh.material.color}
                    onChange={(e) => handleMaterialUpdate({ color: e.target.value })}
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {mesh.material.type === 'standard' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Roughness</Label>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mesh.material.roughness || 0.5}
                      onChange={(e) => handleMaterialUpdate({ roughness: parseFloat(e.target.value) })}
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      {((mesh.material.roughness || 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Metalness</Label>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mesh.material.metalness || 0.1}
                      onChange={(e) => handleMaterialUpdate({ metalness: parseFloat(e.target.value) })}
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      {((mesh.material.metalness || 0.1) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}

              {(mesh.material.type === 'phong' || mesh.material.type === 'lambert') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Opacity</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={mesh.material.opacity || 1}
                    onChange={(e) => handleMaterialUpdate({ opacity: parseFloat(e.target.value) })}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {((mesh.material.opacity || 1) * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input
                  value={mesh.name}
                  onChange={(e) => actions.updateMesh(scene.id, mesh.id, { name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{mesh.type}</Badge>
                  <div className="flex space-x-1">
                    {['cube', 'sphere', 'cylinder', 'plane'].map((type) => (
                      <Button
                        key={type}
                        size="sm"
                        variant={mesh.type === type ? 'default' : 'outline'}
                        onClick={() => actions.updateMesh(scene.id, mesh.id, { type: type as Mesh['type'] })}
                        className="text-xs"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Visible</Label>
                  <Button
                    size="sm"
                    variant={mesh.isVisible ? 'default' : 'outline'}
                    onClick={() => handleMeshAction('toggleVisibility')}
                    className="w-full"
                  >
                    {mesh.isVisible ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {mesh.isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Locked</Label>
                  <Button
                    size="sm"
                    variant={mesh.isLocked ? 'default' : 'outline'}
                    onClick={() => handleMeshAction('toggleLock')}
                    className="w-full"
                  >
                    {mesh.isLocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                    {mesh.isLocked ? 'Locked' : 'Unlocked'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Object ID</Label>
                <div className="p-2 bg-muted rounded text-xs font-mono">
                  {mesh.id}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => handleMeshAction('duplicate')}>
              <Copy className="h-3 w-3 mr-1" />
              Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleMeshAction('toggleVisibility')}>
              {mesh.isVisible ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {mesh.isVisible ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleMeshAction('toggleLock')}>
              {mesh.isLocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {mesh.isLocked ? 'Unlock' : 'Lock'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleMeshAction('delete')}>
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}