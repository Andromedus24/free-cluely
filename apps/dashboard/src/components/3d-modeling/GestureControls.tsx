'use client';

import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useModeling } from '@/contexts/3d-modeling-context';
import { GestureEvent } from '@/services/3d-modeling-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Hand,
  Move,
  RotateCw,
  Maximize,
  Minimize,
  Zap,
  Settings,
  Play,
  Pause,
  Activity,
  AlertCircle
} from 'lucide-react';

export function GestureControls() {
  const { state, actions } = useModeling();
  const [isGesturing, setIsGesturing] = useState(false);
  const [gestureHistory, setGestureHistory] = useState<GestureEvent[]>([]);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (state.activeGesture) {
      setGestureHistory(prev => [...prev.slice(-9), state.activeGesture!]);
    }
  }, [state.activeGesture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw gesture visualization
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.activeGesture) {
      drawGesture(ctx, state.activeGesture, canvas.width, canvas.height);
    } else {
      drawIdleState(ctx, canvas.width, canvas.height);
    }
  }, [state.activeGesture]);

  const drawGesture = (ctx: CanvasRenderingContext2D, gesture: GestureEvent, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw hand outline
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw gesture type indicator
    ctx.fillStyle = '#3B82F6';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gesture.type, centerX, centerY - 80);

    // Draw confidence meter
    const confidenceWidth = 100;
    const confidenceHeight = 8;
    const confidenceX = centerX - confidenceWidth / 2;
    const confidenceY = centerY + 80;

    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(confidenceX, confidenceY, confidenceWidth, confidenceHeight);

    ctx.fillStyle = '#10B981';
    ctx.fillRect(confidenceX, confidenceY, confidenceWidth * gesture.confidence, confidenceHeight);

    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${(gesture.confidence * 100).toFixed(0)}%`, centerX, confidenceY + 20);

    // Draw hand position
    if (gesture.position) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(
        centerX + gesture.position.x * 50,
        centerY + gesture.position.y * 50,
        8,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    // Draw movement trail
    if (gesture.movement && gesture.movement.length > 1) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      gesture.movement.forEach((point, index) => {
        const x = centerX + point.x * 50;
        const y = centerY + point.y * 50;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
  };

  const drawIdleState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw waiting indicator
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw hand icon
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✋', centerX, centerY + 8);

    // Draw waiting text
    ctx.fillStyle = '#6B7280';
    ctx.font = '14px sans-serif';
    ctx.fillText('Waiting for gesture...', centerX, centerY + 40);
  };

  const simulateGesture = async (type: GestureEvent['type'], hand: GestureEvent['hand'] = 'right') => {
    const gesture: GestureEvent = {
      id: Date.now().toString(),
      type,
      hand,
      confidence: 0.8 + Math.random() * 0.2,
      timestamp: new Date(),
      position: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      },
      movement: Array.from({ length: 10 }, () => ({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      })),
      velocity: {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5
      },
      acceleration: {
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2,
        z: (Math.random() - 0.5) * 0.2
      },
      duration: 500 + Math.random() * 1000,
      fingers: Math.floor(Math.random() * 5) + 1,
      pressure: Math.random()
    };

    try {
      await actions.handleGesture(gesture);
    } catch (error) {
      logger.error('gesture-controls', 'Failed to handle gesture', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const toggleGesturing = () => {
    setIsGesturing(!isGesturing);
  };

  const startCalibration = () => {
    setCalibrationMode(true);
    // Simulate calibration process
    setTimeout(() => {
      setCalibrationMode(false);
    }, 3000);
  };

  const gestureTypes: GestureEvent['type'][] = [
    'swipe',
    'pinch',
    'rotate',
    'tap',
    'grab',
    'spread',
    'point',
    'fist'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hand className="h-5 w-5" />
            <span>Gesture Controls</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isGesturing ? 'destructive' : 'secondary'}>
              {isGesturing ? <Activity className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
              {isGesturing ? 'Active' : 'Inactive'}
            </Badge>
            {calibrationMode && (
              <Badge variant="outline">
                <Settings className="h-3 w-3 mr-1" />
                Calibrating
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gesture Visualization */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={200}
            className="w-full h-48 bg-muted rounded-lg border"
          />

          {/* Overlay Status */}
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs">
              {state.activeGesture ? 'Detecting' : 'Idle'}
            </Badge>
          </div>
        </div>

        {/* Active Gesture Info */}
        {state.activeGesture && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Gesture</span>
              <Badge variant="secondary" className="text-xs">
                {state.activeGesture.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Confidence</span>
              <span>{(state.activeGesture.confidence * 100).toFixed(0)}%</span>
            </div>
            <Progress value={state.activeGesture.confidence * 100} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Hand: {state.activeGesture.hand}</span>
              <span>Fingers: {state.activeGesture.fingers}</span>
              <span>Duration: {state.activeGesture.duration}ms</span>
            </div>
          </div>
        )}

        {/* Gesture History */}
        {gestureHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Gestures</h4>
            <div className="flex space-x-1">
              {gestureHistory.map((gesture, index) => (
                <Badge
                  key={gesture.id}
                  variant="outline"
                  className="text-xs"
                  style={{
                    opacity: 1 - (index / gestureHistory.length) * 0.5
                  }}
                >
                  {gesture.type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={isGesturing ? 'destructive' : 'default'}
            onClick={toggleGesturing}
          >
            {isGesturing ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {isGesturing ? 'Stop' : 'Start'}
          </Button>
          <Button size="sm" variant="outline" onClick={startCalibration}>
            <Settings className="h-3 w-3 mr-1" />
            Calibrate
          </Button>
        </div>

        {/* Gesture Simulation */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Simulate Gestures</h4>
          <div className="grid grid-cols-4 gap-1">
            {gestureTypes.slice(0, 4).map((type) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                onClick={() => simulateGesture(type)}
                className="text-xs"
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {gestureTypes.slice(4).map((type) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                onClick={() => simulateGesture(type)}
                className="text-xs"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>
            {calibrationMode
              ? 'Calibrating gesture recognition...'
              : isGesturing
              ? 'Gesture recognition active - make hand gestures'
              : 'Click Start to enable gesture controls'}
          </span>
        </div>

        {/* AI Features */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Zap className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">AI Gesture Recognition</span>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
            Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}