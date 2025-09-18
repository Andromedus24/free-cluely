'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { productivityMonitor, ProductivityMetrics, ActivityEvent, SessionData } from '@/services/productivity-monitoring';
import { useToast } from '@/hooks/use-toast';

interface ProductivityContextType {
  isMonitoring: boolean;
  currentMetrics: ProductivityMetrics;
  currentSession: SessionData | null;
  recentSessions: SessionData[];
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  getMetrics: () => ProductivityMetrics;
  getSessions: () => SessionData[];
}

const ProductivityContext = createContext<ProductivityContextType | undefined>(undefined);

export function ProductivityProvider({ children }: { children: React.ReactNode }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<ProductivityMetrics>(productivityMonitor.getMetrics());
  const [currentSession, setCurrentSession] = useState<SessionData | null>(productivityMonitor.getCurrentSession());
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Set up activity listener
    productivityMonitor.onActivity((event) => {
      // Show toast for important activities
      if (event.type === 'deep_work' && event.confidence > 0.8) {
        toast({
          title: "Deep Work Detected",
          description: "Excellent focus session in progress!",
          duration: 3000,
        });
      }

      if (event.type === 'distraction' && event.confidence > 0.7) {
        toast({
          title: "Distraction Detected",
          description: "Consider minimizing interruptions",
          variant: "destructive",
          duration: 3000,
        });
      }
    });

    // Set up metrics listener
    productivityMonitor.onMetrics((metrics) => {
      setCurrentMetrics(metrics);
      setCurrentSession(productivityMonitor.getCurrentSession());

      // Check for productivity milestones
      if (metrics.productivity_score >= 80 && metrics.productivity_score < 85) {
        toast({
          title: "Productivity Milestone!",
          description: "You've reached 80% productivity. Great job!",
          duration: 4000,
        });
      }
    });

    // Load recent sessions
    setRecentSessions(productivityMonitor.getSavedSessions().slice(-10));

    // Set up status monitoring
    const interval = setInterval(() => {
      const monitoringStatus = productivityMonitor.isActive;
      setIsMonitoring(monitoringStatus);
      setCurrentSession(productivityMonitor.getCurrentSession());
    }, 1000);

    return () => {
      clearInterval(interval);
      productivityMonitor.destroy();
    };
  }, [toast]);

  const startMonitoring = async () => {
    try {
      await productivityMonitor.startMonitoring();
      toast({
        title: "Productivity Monitoring Started",
        description: "AI-powered activity tracking is now active",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error Starting Monitoring",
        description: "Please check camera permissions and try again",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopMonitoring = () => {
    productivityMonitor.stopMonitoring();

    if (currentSession) {
      const finalMetrics = currentSession.metrics;
      toast({
        title: "Session Completed",
        description: `Productivity Score: ${finalMetrics.productivity_score.toFixed(0)}%`,
        duration: 5000,
      });
    }
  };

  const getMetrics = () => productivityMonitor.getMetrics();
  const getSessions = () => productivityMonitor.getSavedSessions();

  return (
    <ProductivityContext.Provider value={{
      isMonitoring,
      currentMetrics,
      currentSession,
      recentSessions,
      startMonitoring,
      stopMonitoring,
      getMetrics,
      getSessions,
    }}>
      {children}
    </ProductivityContext.Provider>
  );
}

export const useProductivity = () => {
  const context = useContext(ProductivityContext);
  if (context === undefined) {
    throw new Error('useProductivity must be used within a ProductivityProvider');
  }
  return context;
};