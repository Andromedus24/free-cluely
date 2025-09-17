export interface DashboardState {
  stats: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    activePlugins: number;
    totalScreenshots: number;
    aiInteractions: number;
    automationSuccess: number;
    revenueImpact: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'job' | 'screenshot' | 'plugin' | 'automation' | 'error';
    title: string;
    description: string;
    timestamp: Date;
    status: 'success' | 'error' | 'warning' | 'info';
  }>;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    plugins: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'error';
      uptime: number;
    }>;
  };
  jobs: Array<{
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
  }>;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxActivityItems: number;
  enableRealTimeUpdates: boolean;
  showAdvancedMetrics: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardEvent {
  type: 'stats_update' | 'activity_update' | 'health_update' | 'job_update';
  data: any;
  timestamp: Date;
}