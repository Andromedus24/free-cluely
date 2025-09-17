"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DashboardService } from '@/lib/dashboard-service';
import { DashboardState, DashboardConfig, DashboardEvent } from '@/types/dashboard';

interface DashboardContextType {
  state: DashboardState;
  config: DashboardConfig;
  service: DashboardService;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createJob: (type: string, metadata?: Record<string, any>) => Promise<void>;
  updateConfig: (config: Partial<DashboardConfig>) => void;
}

type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_STATE'; payload: DashboardState }
  | { type: 'UPDATE_CONFIG'; payload: Partial<DashboardConfig> }
  | { type: 'ADD_ACTIVITY'; payload: any }
  | { type: 'UPDATE_JOB'; payload: any };

const initialState: DashboardState = {
  stats: {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activePlugins: 0,
    totalScreenshots: 0,
    aiInteractions: 0,
    automationSuccess: 0,
    revenueImpact: 0
  },
  recentActivity: [],
  systemHealth: {
    cpu: 0,
    memory: 0,
    disk: 0,
    plugins: []
  },
  jobs: []
};

const defaultConfig: DashboardConfig = {
  refreshInterval: 5000,
  maxActivityItems: 50,
  enableRealTimeUpdates: true,
  showAdvancedMetrics: false,
  theme: 'auto'
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'UPDATE_STATE':
      return action.payload;
    case 'ADD_ACTIVITY':
      return {
        ...state,
        recentActivity: [action.payload, ...state.recentActivity].slice(0, 50)
      };
    case 'UPDATE_JOB':
      const jobIndex = state.jobs.findIndex(job => job.id === action.payload.id);
      if (jobIndex !== -1) {
        const updatedJobs = [...state.jobs];
        updatedJobs[jobIndex] = { ...updatedJobs[jobIndex], ...action.payload };
        return { ...state, jobs: updatedJobs };
      }
      return { ...state, jobs: [action.payload, ...state.jobs] };
    default:
      return state;
  }
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
  config?: Partial<DashboardConfig>;
}

export function DashboardProvider({ children, config: userConfig }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<DashboardConfig>({ ...defaultConfig, ...userConfig });

  const serviceRef = React.useRef<DashboardService | null>(null);

  React.useEffect(() => {
    const service = new DashboardService(config);
    serviceRef.current = service;

    // Setup event listeners
    service.on('state_update', (newState: DashboardState) => {
      dispatch({ type: 'UPDATE_STATE', payload: newState });
    });

    service.on('config_update', (newConfig: DashboardConfig) => {
      setConfig(newConfig);
    });

    service.on('connection_change', (data: { online: boolean }) => {
      if (!data.online) {
        setError('Connection lost. Working in offline mode.');
      } else {
        setError(null);
      }
    });

    // Initialize service
    service.initialize()
      .then(() => {
        setLoading(false);
        dispatch({ type: 'UPDATE_STATE', payload: service.getState() });
      })
      .catch((err) => {
        setLoading(false);
        setError(`Failed to initialize dashboard: ${err.message}`);
      });

    return () => {
      service.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  }, [config]);

  const refreshData = async () => {
    if (serviceRef.current) {
      try {
        setLoading(true);
        await serviceRef.current.refreshData();
        setLoading(false);
      } catch (err) {
        setError(`Failed to refresh data: ${err.message}`);
        setLoading(false);
      }
    }
  };

  const createJob = async (type: string, metadata?: Record<string, any>) => {
    if (serviceRef.current) {
      try {
        await serviceRef.current.createJob(type, metadata);
      } catch (err) {
        setError(`Failed to create job: ${err.message}`);
      }
    }
  };

  const updateConfig = (newConfig: Partial<DashboardConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const value: DashboardContextType = {
    state,
    config,
    service: serviceRef.current!,
    loading,
    error,
    refreshData,
    createJob,
    updateConfig
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}