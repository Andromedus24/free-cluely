'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Scene, Mesh } from '@/services/3d-modeling-service';
import { useModeling } from '@/contexts/3d-modeling-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Grid3X3,
  Box,
  Sphere,
  Cylinder,
  Square
} from 'lucide-react';

interface ThreeDViewerProps {
  scene: Scene;
  className?: string;
}

interface Camera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom: number;
}

interface TransformTool {
  type: 'translate' | 'rotate' | 'scale';
  axis: 'x' | 'y' | 'z' | 'all';
}

export const ThreeDViewer = React.memo(function ThreeDViewer({ scene, className }: ThreeDViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { actions } = useModeling();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'points'>('solid');
  const [camera, setCamera] = useState<Camera>({
    position: { x: 5, y: 5, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    zoom: 1
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [transformTool, setTransformTool] = useState<TransformTool>({ type: 'translate', axis: 'all' });
  const [animationTime, setAnimationTime] = useState(0);

  // Animation loop with performance optimization
  useEffect(() => {
    let animationFrame: number;
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
        setAnimationTime(prev => prev + 0.016); // ~60fps
        renderScene();
        lastTime = currentTime;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [scene, camera, showGrid, showAxes, renderMode]);

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 40 * camera.zoom;

    // Apply camera transform
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw grid with perspective
    if (showGrid) {
      drawGrid(ctx, camera);
    }

    // Draw axes with 3D projection
    if (showAxes) {
      drawAxes(ctx, camera);
    }

    // Sort meshes by z-depth for proper rendering (memoized)
    const sortedMeshes = useMemo(() => {
      return [...scene.meshes].sort((a, b) => {
        const depthA = calculateDepth(a.position, camera);
        const depthB = calculateDepth(b.position, camera);
        return depthB - depthA;
      });
    }, [scene.meshes, camera]);

    // Draw meshes with 3D projection
    sortedMeshes.forEach(mesh => {
      if (mesh.isVisible) {
        drawMesh3D(ctx, mesh, camera, renderMode);
      }
    });

    // Draw selection highlight
    if (actions.state.selectedMesh) {
      const selectedMesh = actions.state.selectedMesh;
      if (selectedMesh.isVisible) {
        drawSelection3D(ctx, selectedMesh, camera);
      }
    }

    ctx.restore();

    // Draw HUD overlay
    drawHUD(ctx, canvas.width, canvas.height);

  }, [scene, camera, showGrid, showAxes, renderMode, actions.state.selectedMesh, calculateDepth, project3D, drawGrid, drawAxes, drawMesh3D]);

  const calculateDepth = useCallback((position: { x: number; y: number; z: number }, camera: Camera): number => {
    const dx = position.x - camera.position.x;
    const dy = position.y - camera.position.y;
    const dz = position.z - camera.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, []);

  const project3D = useCallback((point: { x: number; y: number; z: number }, camera: Camera): { x: number; y: number } => {
    // Simple perspective projection
    const dx = point.x - camera.position.x;
    const dy = point.y - camera.position.y;
    const dz = point.z - camera.position.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const scale = 200 / (distance + 1);

    return {
      x: dx * scale,
      y: -dy * scale // Flip Y for screen coordinates
    };
  };

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, camera: Camera) => {
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
    ctx.lineWidth = 0.5;

    const gridSize = 20;
    const gridCount = 10;

    for (let i = -gridCount; i <= gridCount; i++) {
      // X-axis lines
      ctx.beginPath();
      const start1 = project3D({ x: i * gridSize, y: 0, z: -gridCount * gridSize }, camera);
      const end1 = project3D({ x: i * gridSize, y: 0, z: gridCount * gridSize }, camera);
      ctx.moveTo(start1.x, start1.y);
      ctx.lineTo(end1.x, end1.y);
      ctx.stroke();

      // Z-axis lines
      ctx.beginPath();
      const start2 = project3D({ x: -gridCount * gridSize, y: 0, z: i * gridSize }, camera);
      const end2 = project3D({ x: gridCount * gridSize, y: 0, z: i * gridSize }, camera);
      ctx.moveTo(start2.x, start2.y);
      ctx.lineTo(end2.x, end2.y);
      ctx.stroke();
    }
  };

  const drawAxes = useCallback((ctx: CanvasRenderingContext2D, camera: Camera) => {
    const axisLength = 5;

    // X-axis (red)
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const xStart = project3D({ x: 0, y: 0, z: 0 }, camera);
    const xEnd = project3D({ x: axisLength, y: 0, z: 0 }, camera);
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();

    // Y-axis (green)
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    const yEnd = project3D({ x: 0, y: axisLength, z: 0 }, camera);
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();

    // Z-axis (blue)
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    const zEnd = project3D({ x: 0, y: 0, z: axisLength }, camera);
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(zEnd.x, zEnd.y);
    ctx.stroke();
  };

  const drawMesh3D = useCallback((ctx: CanvasRenderingContext2D, mesh: Mesh, camera: Camera, mode: 'solid' | 'wireframe' | 'points') => {
    const projected = project3D(mesh.position, camera);

    // Calculate size based on distance
    const distance = calculateDepth(mesh.position, camera);
    const baseSize = mesh.scale.x;
    const visualSize = baseSize * (200 / (distance + 1));

    ctx.save();
    ctx.translate(projected.x, projected.y);

    // Apply rotation
    ctx.rotate(mesh.rotation.y);
    ctx.rotate(mesh.rotation.x * 0.5);

    if (mode === 'wireframe') {
      ctx.strokeStyle = mesh.material.color;
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = mesh.material.color;
    }

    // Draw based on mesh type with 3D appearance
    switch (mesh.type) {
      case 'cube':
        drawCube3D(ctx, visualSize, mode);
        break;
      case 'sphere':
        drawSphere3D(ctx, visualSize, mode);
        break;
      case 'cylinder':
        drawCylinder3D(ctx, visualSize, mode);
        break;
      case 'plane':
        drawPlane3D(ctx, visualSize, mode);
        break;
    }

    ctx.restore();

    // Draw mesh name
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mesh.name, projected.x, projected.y + visualSize + 15);
  };

  const drawCube3D = (ctx: CanvasRenderingContext2D, size: number, mode: 'solid' | 'wireframe' | 'points') => {
    const half = size / 2;

    if (mode === 'solid') {
      // Draw cube with shading
      const gradient = ctx.createLinearGradient(-half, -half, half, half);
      gradient.addColorStop(0, ctx.fillStyle as string);
      gradient.addColorStop(1, shadeColor(ctx.fillStyle as string, -30));
      ctx.fillStyle = gradient;
      ctx.fillRect(-half, -half, size, size);

      // Add 3D effect
      ctx.strokeStyle = shadeColor(ctx.fillStyle as string, -50);
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, size, size);
    } else if (mode === 'wireframe') {
      ctx.strokeRect(-half, -half, size, size);
      // Draw inner lines for 3D effect
      ctx.beginPath();
      ctx.moveTo(-half, -half);
      ctx.lineTo(-half + size/4, -half - size/4);
      ctx.moveTo(half, -half);
      ctx.lineTo(half - size/4, -half - size/4);
      ctx.moveTo(half, half);
      ctx.lineTo(half - size/4, half - size/4);
      ctx.stroke();
    }
  };

  const drawSphere3D = (ctx: CanvasRenderingContext2D, size: number, mode: 'solid' | 'wireframe' | 'points') => {
    const radius = size / 2;

    if (mode === 'solid') {
      // Draw sphere with gradient
      const gradient = ctx.createRadialGradient(-radius/3, -radius/3, 0, 0, 0, radius);
      gradient.addColorStop(0, shadeColor(ctx.fillStyle as string, 40));
      gradient.addColorStop(0.7, ctx.fillStyle as string);
      gradient.addColorStop(1, shadeColor(ctx.fillStyle as string, -40));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else if (mode === 'wireframe') {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.stroke();
      // Draw latitude lines
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * (1 - i * 0.25), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const drawCylinder3D = (ctx: CanvasRenderingContext2D, size: number, mode: 'solid' | 'wireframe' | 'points') => {
    const radius = size / 4;
    const height = size;

    if (mode === 'solid') {
      const gradient = ctx.createLinearGradient(-radius, -height/2, radius, height/2);
      gradient.addColorStop(0, shadeColor(ctx.fillStyle as string, 30));
      gradient.addColorStop(0.5, ctx.fillStyle as string);
      gradient.addColorStop(1, shadeColor(ctx.fillStyle as string, -30));
      ctx.fillStyle = gradient;
      ctx.fillRect(-radius, -height/2, radius * 2, height);

      // Draw ellipses for 3D effect
      ctx.beginPath();
      ctx.ellipse(0, -height/2, radius, radius/3, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, height/2, radius, radius/3, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else if (mode === 'wireframe') {
      ctx.strokeRect(-radius, -height/2, radius * 2, height);
      ctx.beginPath();
      ctx.ellipse(0, -height/2, radius, radius/3, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, height/2, radius, radius/3, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const drawPlane3D = (ctx: CanvasRenderingContext2D, size: number, mode: 'solid' | 'wireframe' | 'points') => {
    const width = size * 2;
    const height = size;

    if (mode === 'solid') {
      ctx.fillRect(-width/2, -height/2, width, height);
    } else if (mode === 'wireframe') {
      ctx.strokeRect(-width/2, -height/2, width, height);
      // Draw grid pattern
      const gridSize = size / 4;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-width/2 + i * gridSize, -height/2);
        ctx.lineTo(-width/2 + i * gridSize, height/2);
        ctx.stroke();
      }
    }
  };

  const drawSelection3D = (ctx: CanvasRenderingContext2D, mesh: Mesh, camera: Camera) => {
    const projected = project3D(mesh.position, camera);
    const distance = calculateDepth(mesh.position, camera);
    const visualSize = mesh.scale.x * (200 / (distance + 1));

    ctx.save();
    ctx.translate(projected.x, projected.y);

    // Animated selection border
    const pulse = Math.sin(animationTime * 5) * 0.1 + 1;
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.8 * pulse})`;
    ctx.lineWidth = 3 * pulse;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -animationTime * 10;

    const half = visualSize / 2;
    ctx.strokeRect(-half - 5, -half - 5, visualSize + 10, visualSize + 10);

    ctx.restore();
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw camera info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);

    ctx.fillStyle = '#E5E7EB';
    ctx.font = '12px monospace';
    ctx.fillText(`Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`, 15, 30);
    ctx.fillText(`Zoom: ${camera.zoom.toFixed(2)}x`, 15, 50);
    ctx.fillText(`Objects: ${scene.meshes.length}`, 15, 70);

    // Draw performance info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - 150, 10, 140, 50);

    ctx.fillStyle = '#10B981';
    ctx.fillText(`FPS: ${(1000 / 16.67).toFixed(0)}`, width - 145, 30);
    ctx.fillText(`Render: ${renderMode}`, width - 145, 50);
  };

  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked mesh using screen coordinates
    for (const mesh of scene.meshes) {
      if (!mesh.isVisible) continue;

      const projected = project3D(mesh.position, camera);
      const distance = calculateDepth(mesh.position, camera);
      const visualSize = mesh.scale.x * (200 / (distance + 1));

      // Check if click is within mesh bounds
      if (Math.abs(x - (canvas.width/2 + projected.x)) < visualSize/2 &&
          Math.abs(y - (canvas.height/2 + projected.y)) < visualSize/2) {
        actions.selectMesh(scene.id, mesh.id);
        break;
      }
    }
  };

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    setCamera(prev => ({
      ...prev,
      rotation: {
        x: prev.rotation.x + deltaY * 0.01,
        y: prev.rotation.y + deltaX * 0.01,
        z: prev.rotation.z
      }
    }));

    setDragStart({ x: event.clientX, y: event.clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * zoomFactor))
    }));
  }, []);

  const handleObjectAction = useCallback(async (action: string) => {
    if (!actions.state.selectedMesh) return;

    try {
      switch (action) {
        case 'duplicate':
          await actions.duplicateMesh(scene.id, actions.state.selectedMesh.id);
          break;
        case 'toggleVisibility':
          await actions.updateMesh(scene.id, actions.state.selectedMesh.id, {
            isVisible: !actions.state.selectedMesh.isVisible
          });
          break;
        case 'toggleLock':
          await actions.updateMesh(scene.id, actions.state.selectedMesh.id, {
            isLocked: !actions.state.selectedMesh.isLocked
          });
          break;
      }
    } catch (error) {
      console.error('Failed to perform object action:', error);
    }
  }, [actions, scene]);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
          <Button size="sm" variant="ghost" onClick={() => setShowGrid(!showGrid)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAxes(!showAxes)}>
            <Move className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-600" />
          <Button size="sm" variant={renderMode === 'solid' ? 'default' : 'ghost'} onClick={() => setRenderMode('solid')}>
            <Box className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={renderMode === 'wireframe' ? 'default' : 'ghost'} onClick={() => setRenderMode('wireframe')}>
            <Square className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={renderMode === 'points' ? 'default' : 'ghost'} onClick={() => setRenderMode('points')}>
            <Sphere className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-black/50">
            {scene.meshes.length} objects
          </Badge>
          <Badge variant={actions.state.isModeling ? 'destructive' : 'secondary'} className="bg-black/50">
            {actions.state.isModeling ? '● Recording' : '● Ready'}
          </Badge>
        </div>
      </div>

      {/* Transform Tools */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <Button size="sm" variant={transformTool.type === 'translate' ? 'default' : 'ghost'} onClick={() => setTransformTool({ ...transformTool, type: 'translate' })}>
            <Move className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={transformTool.type === 'rotate' ? 'default' : 'ghost'} onClick={() => setTransformTool({ ...transformTool, type: 'rotate' })}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-600" />
          <Button size="sm" variant={transformTool.axis === 'x' ? 'default' : 'ghost'} onClick={() => setTransformTool({ ...transformTool, axis: 'x' })}>
            X
          </Button>
          <Button size="sm" variant={transformTool.axis === 'y' ? 'default' : 'ghost'} onClick={() => setTransformTool({ ...transformTool, axis: 'y' })}>
            Y
          </Button>
          <Button size="sm" variant={transformTool.axis === 'z' ? 'default' : 'ghost'} onClick={() => setTransformTool({ ...transformTool, axis: 'z' })}>
            Z
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2">
        <div className="flex flex-col items-center space-y-2">
          <Button size="sm" variant="ghost" onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="text-xs text-gray-400 min-w-[3rem] text-center">
            {Math.round(camera.zoom * 100)}%
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Object Controls (when object selected) */}
      {actions.state.selectedMesh && (
        <div className="absolute top-20 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2">
          <div className="flex flex-col space-y-2">
            <Button size="sm" variant="ghost" onClick={() => handleObjectAction('duplicate')}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleObjectAction('toggleVisibility')}>
              {actions.state.selectedMesh.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleObjectAction('toggleLock')}>
              {actions.state.selectedMesh.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Selected Object Info */}
      {actions.state.selectedMesh && (
        <div className="absolute top-20 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
          <div className="flex items-center space-x-2 mb-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: actions.state.selectedMesh.material.color }}
            />
            <h3 className="font-medium text-white">{actions.state.selectedMesh.name}</h3>
          </div>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Type: {actions.state.selectedMesh.type}</div>
            <div>Pos: ({actions.state.selectedMesh.position.x.toFixed(1)}, {actions.state.selectedMesh.position.y.toFixed(1)}, {actions.state.selectedMesh.position.z.toFixed(1)})</div>
            <div>Rot: ({actions.state.selectedMesh.rotation.x.toFixed(0)}°, {actions.state.selectedMesh.rotation.y.toFixed(0)}°, {actions.state.selectedMesh.rotation.z.toFixed(0)}°)</div>
          </div>
        </div>
      )}

      {/* Instructions Overlay */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-xs text-gray-300 text-center">
          Click to select • Drag to rotate • Scroll to zoom • Right-click for context menu
        </div>
      </div>
    </div>
  );
});