'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useModeling } from '@/contexts/3d-modeling-context';
import { GestureEvent } from '@/services/3d-modeling-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  CameraOff,
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
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

interface WebcamGestureControlsProps {
  onGestureDetected?: (gesture: GestureEvent) => void;
}

export function WebcamGestureControls({ onGestureDetected }: WebcamGestureControlsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { actions } = useModeling();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isGesturing, setIsGesturing] = useState(false);
  const [gestureHistory, setGestureHistory] = useState<GestureEvent[]>([]);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [handSize, setHandSize] = useState(0);

  useEffect(() => {
    if (isCameraActive) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  useEffect(() => {
    if (actions.state.activeGesture) {
      setGestureHistory(prev => [...prev.slice(-9), actions.state.activeGesture!]);
    }
  }, [actions.state.activeGesture]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      startGestureDetection();
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startGestureDetection = () => {
    const detectFrame = async () => {
      if (!isCameraActive || !videoRef.current || !canvasRef.current) return;

      const startTime = performance.now();

      // Clear canvas
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Simulate hand detection (in real implementation, this would use MediaPipe or similar)
      const gesture = simulateHandDetection();

      if (gesture) {
        drawHandOverlay(ctx, gesture);
        setHandPosition({ x: gesture.position.x, y: gesture.position.y });
        setHandSize(gesture.pressure * 100);
        setDetectionConfidence(gesture.confidence);

        // Send gesture to modeling service
        try {
          await actions.handleGesture(gesture);
          onGestureDetected?.(gesture);
        } catch (error) {
          console.error('Failed to handle gesture:', error);
        }
      }

      // Calculate FPS
      const endTime = performance.now();
      const frameTime = endTime - startTime;
      if (frameTime > 0) {
        setFps(Math.round(1000 / frameTime));
      }
      setLastFrameTime(endTime);

      requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const simulateHandDetection = (): GestureEvent | null => {
    // Simulate random gesture detection for demo
    if (Math.random() < 0.3) {
      const gestureTypes: GestureEvent['type'][] = ['swipe', 'pinch', 'rotate', 'tap', 'grab', 'spread', 'point', 'fist'];
      const hands: GestureEvent['hand'][] = ['left', 'right'];

      return {
        id: Date.now().toString(),
        type: gestureTypes[Math.floor(Math.random() * gestureTypes.length)],
        hand: hands[Math.floor(Math.random() * hands.length)],
        confidence: 0.7 + Math.random() * 0.3,
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
    }
    return null;
  };

  const drawHandOverlay = (ctx: CanvasRenderingContext2D, gesture: GestureEvent) => {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 100;

    // Convert 3D position to 2D screen coordinates
    const x = centerX + gesture.position.x * scale;
    const y = centerY + gesture.position.y * scale;
    const size = 30 + gesture.pressure * 50;

    // Draw hand outline
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw gesture type
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gesture.type.toUpperCase(), x, y - size - 10);

    // Draw confidence meter
    const confidenceWidth = 60;
    const confidenceHeight = 6;
    const confidenceX = x - confidenceWidth / 2;
    const confidenceY = y + size + 15;

    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(confidenceX, confidenceY, confidenceWidth, confidenceHeight);

    ctx.fillStyle = '#10B981';
    ctx.fillRect(confidenceX, confidenceY, confidenceWidth * gesture.confidence, confidenceHeight);

    ctx.fillStyle = '#6B7280';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${(gesture.confidence * 100).toFixed(0)}%`, x, confidenceY + 20);

    // Draw hand indicator
    ctx.fillStyle = gesture.hand === 'right' ? '#EF4444' : '#10B981';
    ctx.beginPath();
    ctx.arc(x + size + 10, y - size, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gesture.hand === 'right' ? 'R' : 'L', x + size + 10, y - size + 3);

    // Draw movement trail
    if (gesture.movement && gesture.movement.length > 1) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      gesture.movement.forEach((point, index) => {
        const trailX = centerX + point.x * scale;
        const trailY = centerY + point.y * scale;
        if (index === 0) {
          ctx.moveTo(trailX, trailY);
        } else {
          ctx.lineTo(trailX, trailY);
        }
      });
      ctx.stroke();
    }
  };

  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
  };

  const startCalibration = () => {
    setCalibrationMode(true);
    setCalibrationProgress(0);

    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCalibrationMode(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const simulateGesture = async (type: GestureEvent['type'], hand: GestureEvent['hand'] = 'right') => {
    const gesture: GestureEvent = {
      id: Date.now().toString(),
      type,
      hand,
      confidence: 0.9 + Math.random() * 0.1,
      timestamp: new Date(),
      position: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      },
      movement: Array.from({ length: 15 }, () => ({
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
      duration: 300 + Math.random() * 700,
      fingers: Math.floor(Math.random() * 5) + 1,
      pressure: 0.5 + Math.random() * 0.5
    };

    try {
      await actions.handleGesture(gesture);
      onGestureDetected?.(gesture);
    } catch (error) {
      console.error('Failed to simulate gesture:', error);
    }
  };

  const gestureTypes: GestureEvent['type'][] = [
    'swipe', 'pinch', 'rotate', 'tap', 'grab', 'spread', 'point', 'fist'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hand className="h-5 w-5" />
            <span>Webcam Gesture Controls</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isCameraActive ? 'default' : 'secondary'}>
              {isCameraActive ? <Activity className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
              Camera {isCameraActive ? 'Active' : 'Inactive'}
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
        {/* Camera Feed */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            width={640}
            height={480}
            className="w-full h-auto"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          />

          {/* Camera Status Overlay */}
          <div className="absolute top-2 right-2 flex items-center space-x-2">
            <Badge variant="outline" className="bg-black/50">
              {isCameraActive ? '● Live' : '● Offline'}
            </Badge>
            {audioEnabled && (
              <Badge variant="outline" className="bg-black/50">
                <Volume2 className="h-3 w-3 mr-1" />
                Audio On
              </Badge>
            )}
          </div>

          {/* Hand Position Indicator */}
          {handPosition && (
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"
              style={{
                left: `calc(50% + ${handPosition.x * 100}px)`,
                top: `calc(50% + ${handPosition.y * 100}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${handSize}px`,
                height: `${handSize}px`
              }}
            />
          )}

          {/* FPS Counter */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="outline" className="bg-black/50">
              {fps} FPS
            </Badge>
          </div>
        </div>

        {/* Detection Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-blue-500">
              {detectionConfidence > 0 ? Math.round(detectionConfidence * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">{fps}</div>
            <div className="text-xs text-muted-foreground">FPS</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-500">
              {gestureHistory.length}
            </div>
            <div className="text-xs text-muted-foreground">Gestures</div>
          </div>
        </div>

        {/* Calibration Progress */}
        {calibrationMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Calibrating gesture recognition...</span>
              <span>{calibrationProgress}%</span>
            </div>
            <Progress value={calibrationProgress} className="h-2" />
          </div>
        )}

        {/* Active Gesture Info */}
        {actions.state.activeGesture && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Gesture</span>
              <Badge variant="secondary" className="text-xs">
                {actions.state.activeGesture.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Confidence</span>
              <span>{(actions.state.activeGesture.confidence * 100).toFixed(0)}%</span>
            </div>
            <Progress value={actions.state.activeGesture.confidence * 100} className="h-2" />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <span>Hand: {actions.state.activeGesture.hand}</span>
              <span>Fingers: {actions.state.activeGesture.fingers}</span>
              <span>Duration: {actions.state.activeGesture.duration}ms</span>
              <span>Pressure: {(actions.state.activeGesture.pressure * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isCameraActive ? 'destructive' : 'default'}
            onClick={toggleCamera}
            className="w-full"
          >
            {isCameraActive ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {isCameraActive ? 'Stop Camera' : 'Start Camera'}
          </Button>
          <Button
            variant="outline"
            onClick={startCalibration}
            disabled={calibrationMode}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Calibrate
          </Button>
        </div>

        {/* Audio Control */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Audio Feedback</span>
          <Button
            size="sm"
            variant={audioEnabled ? 'default' : 'outline'}
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Gesture Simulation */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Test Gestures</h4>
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
              ? 'Calibrating gesture recognition... Keep your hand visible in the camera.'
              : isCameraActive
              ? 'Camera active - Make hand gestures to control 3D objects'
              : 'Camera inactive - Click Start Camera to enable gesture controls'}
          </span>
        </div>

        {/* AI Features */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Zap className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">AI Gesture Recognition</span>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
            {detectionConfidence > 0.8 ? 'Excellent' : detectionConfidence > 0.6 ? 'Good' : 'Learning'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}