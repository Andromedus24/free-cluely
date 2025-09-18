'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading-states";

// Lazy load heavy components
const FloatingVoiceAssistant = lazy(() => import('@/components/voice-assistant').then(mod => ({ default: mod.FloatingVoiceAssistant })));
const ProductivityWidget = lazy(() => import('@/components/productivity-monitoring').then(mod => ({ default: mod.ProductivityWidget })));
const KnowledgeWidget = lazy(() => import('@/components/knowledge').then(mod => ({ default: mod.KnowledgeWidget })));
const MessagingWidget = lazy(() => import('@/components/messaging').then(mod => ({ default: mod.MessagingWidget })));
const ThreeDWidget = lazy(() => import('@/components/3d-modeling').then(mod => ({ default: mod.ThreeDWidget })));

// Loading fallback component
const WidgetLoading = () => (
  <LoadingCard className="h-64" />
);

interface LazyWidgetsProps {
  className?: string;
}

export function LazyWidgets({ className }: LazyWidgetsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Voice Assistant Widget */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="h-5 w-5 text-blue-600" />
              <span>Voice Assistant</span>
            </div>
            <Badge variant="secondary">AI-Powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetLoading />}>
            <FloatingVoiceAssistant />
          </Suspense>
        </CardContent>
      </Card>

      {/* Productivity Widget */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span>Productivity Monitor</span>
            </div>
            <Badge variant="secondary">Live Tracking</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetLoading />}>
            <ProductivityWidget />
          </Suspense>
        </CardContent>
      </Card>

      {/* Knowledge Widget */}
      <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <span>Knowledge Base</span>
            </div>
            <Badge variant="secondary">Smart Learning</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetLoading />}>
            <KnowledgeWidget />
          </Suspense>
        </CardContent>
      </Card>

      {/* Messaging Widget */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <span>Social Messaging</span>
            </div>
            <Badge variant="secondary">Real-time</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetLoading />}>
            <MessagingWidget />
          </Suspense>
        </CardContent>
      </Card>

      {/* 3D Modeling Widget */}
      <Card className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-900 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cube className="h-5 w-5 text-red-600" />
              <span>3D Modeling Studio</span>
            </div>
            <Badge variant="secondary">Gesture Control</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WidgetLoading />}>
            <ThreeDWidget />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual lazy components for specific use cases
export const LazyVoiceAssistant = () => (
  <Suspense fallback={<WidgetLoading />}>
    <FloatingVoiceAssistant />
  </Suspense>
);

export const LazyProductivityWidget = () => (
  <Suspense fallback={<WidgetLoading />}>
    <ProductivityWidget />
  </Suspense>
);

export const LazyKnowledgeWidget = () => (
  <Suspense fallback={<WidgetLoading />}>
    <KnowledgeWidget />
  </Suspense>
);

export const LazyMessagingWidget = () => (
  <Suspense fallback={<WidgetLoading />}>
    <MessagingWidget />
  </Suspense>
);

export const Lazy3DWidget = () => (
  <Suspense fallback={<WidgetLoading />}>
    <ThreeDWidget />
  </Suspense>
);