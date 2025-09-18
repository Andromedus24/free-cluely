'use client';

import React, { useState } from 'react';
import { Scene, LayoutPreset } from '@/services/3d-modeling-service';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  LayoutTemplate,
  Plus,
  Save,
  Download,
  Trash2,
  Apply,
  Settings,
  Grid3X3,
  Layers,
  Zap,
  Star
} from 'lucide-react';

interface LayoutPresetsProps {
  scene: Scene;
}

export function LayoutPresets({ scene }: LayoutPresetsProps) {
  const { state, actions } = useModeling();
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return;

    try {
      const tags = prompt('Tags (comma-separated):')?.split(',').map(tag => tag.trim()).filter(Boolean) || [];
      await actions.createPreset(newPresetName, scene.id, tags);
      setNewPresetName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create preset:', error);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      await actions.applyPreset(presetId, scene.id);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      try {
        await actions.deletePreset(presetId);
      } catch (error) {
        console.error('Failed to delete preset:', error);
      }
    }
  };

  const handleExportPreset = async (preset: LayoutPreset) => {
    try {
      const data = JSON.stringify(preset, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preset_${preset.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export preset:', error);
    }
  };

  const presets = Array.from(state.presets.values());
  const scenePresets = presets.filter(preset => preset.sourceSceneId === scene.id);
  const otherPresets = presets.filter(preset => preset.sourceSceneId !== scene.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LayoutTemplate className="h-5 w-5" />
            <span>Layout Presets</span>
          </div>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Create Preset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Preset */}
        {isCreating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Preset Name</label>
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleCreatePreset} disabled={!newPresetName.trim()}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scene Presets */}
        {scenePresets.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">From This Scene</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenePresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  scene={scene}
                  onApply={handleApplyPreset}
                  onDelete={handleDeletePreset}
                  onExport={handleExportPreset}
                  isFromCurrentScene={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Presets */}
        {otherPresets.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Other Scenes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  scene={scene}
                  onApply={handleApplyPreset}
                  onDelete={handleDeletePreset}
                  onExport={handleExportPreset}
                  isFromCurrentScene={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {presets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No presets yet</p>
            <p className="text-xs">Create a preset to save your layout arrangements</p>
          </div>
        )}

        {/* Preset Stats */}
        <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t">
          <div>
            <div className="text-lg font-bold text-blue-500">{presets.length}</div>
            <div className="text-xs text-muted-foreground">Total Presets</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">{scenePresets.length}</div>
            <div className="text-xs text-muted-foreground">From This Scene</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-500">
              {presets.reduce((acc, preset) => acc + preset.layouts.length, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Layouts</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PresetCardProps {
  preset: LayoutPreset;
  scene: Scene;
  onApply: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onExport: (preset: LayoutPreset) => void;
  isFromCurrentScene: boolean;
}

function PresetCard({ preset, scene, onApply, onDelete, onExport, isFromCurrentScene }: PresetCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const canApply = preset.sourceSceneId === scene.id || preset.layouts.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{preset.name}</h4>
            <p className="text-xs text-muted-foreground mb-2">{preset.description}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {preset.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {preset.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{preset.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
          {isFromCurrentScene && (
            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 ml-2" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Layers className="h-3 w-3" />
            <span>{preset.layouts.length} layouts</span>
          </div>
          <div className="flex items-center space-x-1">
            <Grid3X3 className="h-3 w-3" />
            <span>{preset.meshes.length} objects</span>
          </div>
        </div>

        {showDetails && (
          <div className="mb-3 p-2 bg-muted rounded text-xs">
            <div className="space-y-1">
              <div>Created: {new Date(preset.createdAt).toLocaleDateString()}</div>
              <div>Updated: {new Date(preset.updatedAt).toLocaleDateString()}</div>
              <div>Source: {preset.sourceSceneId === scene.id ? 'This Scene' : 'Other Scene'}</div>
              {preset.aiOptimized && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Zap className="h-3 w-3" />
                  <span>AI Optimized</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={canApply ? 'default' : 'secondary'}
            onClick={() => onApply(preset.id)}
            disabled={!canApply}
            className="flex-1"
          >
            <Apply className="h-3 w-3 mr-1" />
            Apply
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDetails(!showDetails)}>
            <Settings className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport(preset)}>
            <Download className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(preset.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}