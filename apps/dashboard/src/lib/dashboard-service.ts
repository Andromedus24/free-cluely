import { DashboardState, DashboardConfig, DashboardEvent } from '@/types/dashboard';
import { RealtimeUpdates } from '@/lib/realtime-updates';

export class DashboardService {
  private state: DashboardState;
  private config: DashboardConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private refreshInterval?: NodeJS.Timeout;
  private realtimeUpdates?: RealtimeUpdates;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      refreshInterval: 5000,
      maxActivityItems: 50,
      enableRealTimeUpdates: true,
      showAdvancedMetrics: false,
      theme: 'auto',
      ...config
    };

    this.state = this.getInitialState();
  }

  private getInitialState(): DashboardState {
    return {
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
  }

  async initialize(): Promise<void> {
    await this.loadInitialData();
    this.setupEventListeners();
    this.startRealTimeUpdates();
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Simulate API calls - in real implementation, these would be actual API calls
      const [stats, activity, health, jobs] = await Promise.all([
        this.fetchStats(),
        this.fetchRecentActivity(),
        this.fetchSystemHealth(),
        this.fetchJobs()
      ]);

      this.state = {
        stats,
        activity,
        systemHealth: health,
        jobs
      };

      this.emit('state_update', this.state);
    } catch (error) {
      console.error('Failed to load initial dashboard data:', error);
    }
  }

  private async fetchStats(): Promise<DashboardState['stats']> {
    // Simulate API call - replace with actual implementation
    return {
      totalJobs: 156,
      completedJobs: 142,
      failedJobs: 8,
      activePlugins: 12,
      totalScreenshots: 89,
      aiInteractions: 1247,
      automationSuccess: 89,
      revenueImpact: 2400
    };
  }

  private async fetchRecentActivity(): Promise<DashboardState['recentActivity']> {
    // Simulate API call - replace with actual implementation
    return [
      {
        id: '1',
        type: 'job',
        title: 'Email Analysis Completed',
        description: 'Successfully analyzed 25 emails for spam and prioritization',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'success'
      },
      {
        id: '2',
        type: 'plugin',
        title: 'Gmail Plugin Installed',
        description: 'New Gmail integration plugin added to workspace',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'info'
      },
      {
        id: '3',
        type: 'automation',
        title: 'Code Review Workflow',
        description: 'AI assistant completed code review for 3 pull requests',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        status: 'success'
      }
    ];
  }

  private async fetchSystemHealth(): Promise<DashboardState['systemHealth']> {
    // Simulate API call - replace with actual implementation
    return {
      cpu: 45,
      memory: 67,
      disk: 82,
      plugins: [
        { name: 'llm-plugin', status: 'healthy', uptime: 99.9 },
        { name: 'vision-plugin', status: 'healthy', uptime: 99.8 },
        { name: 'screenshot-plugin', status: 'warning', uptime: 95.2 }
      ]
    };
  }

  private async fetchJobs(): Promise<DashboardState['jobs']> {
    // Simulate API call - replace with actual implementation
    return [
      {
        id: '1',
        type: 'email_analysis',
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 1000),
        metadata: { emailsProcessed: 25 }
      },
      {
        id: '2',
        type: 'screenshot_analysis',
        status: 'running',
        progress: 65,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 1000)
      },
      {
        id: '3',
        type: 'automation_workflow',
        status: 'pending',
        progress: 0,
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000)
      }
    ];
  }

  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for system events
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Listen for visibility changes to optimize performance
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseUpdates();
        } else {
          this.resumeUpdates();
        }
      });
    }
  }

  private startRealTimeUpdates(): void {
    if (this.config.enableRealTimeUpdates) {
      this.refreshInterval = setInterval(() => {
        this.updateState();
      }, this.config.refreshInterval);

      // Setup WebSocket for real-time updates
      this.setupWebSocket();
    }
  }

  private setupWebSocket(): void {
    try {
      this.realtimeUpdates = new RealtimeUpdates({
        websocketUrl: 'ws://localhost:3000/ws/dashboard',
        reconnectInterval: 5000,
        maxReconnectAttempts: 5
      });

      // Setup event listeners
      this.realtimeUpdates.on('connected', () => {
        this.emit('connection_status', { connected: true });
      });

      this.realtimeUpdates.on('disconnected', (data) => {
        this.emit('connection_status', { connected: false, ...data });
      });

      this.realtimeUpdates.on('stats_update', (data) => {
        this.handleRealTimeEvent({ type: 'stats_update', data, timestamp: new Date() });
      });

      this.realtimeUpdates.on('activity_update', (data) => {
        this.handleRealTimeEvent({ type: 'activity_update', data, timestamp: new Date() });
      });

      this.realtimeUpdates.on('health_update', (data) => {
        this.handleRealTimeEvent({ type: 'health_update', data, timestamp: new Date() });
      });

      this.realtimeUpdates.on('job_update', (data) => {
        this.handleRealTimeEvent({ type: 'job_update', data, timestamp: new Date() });
      });

      this.realtimeUpdates.connect();

    } catch (error) {
      console.error('Failed to setup real-time updates:', error);
    }
  }

  private handleRealTimeEvent(event: DashboardEvent): void {
    switch (event.type) {
      case 'stats_update':
        this.state.stats = { ...this.state.stats, ...event.data };
        break;
      case 'activity_update':
        this.addActivityItem(event.data);
        break;
      case 'health_update':
        this.state.systemHealth = { ...this.state.systemHealth, ...event.data };
        break;
      case 'job_update':
        this.updateJob(event.data);
        break;
    }

    this.emit('state_update', this.state);
  }

  private addActivityItem(item: any): void {
    this.state.recentActivity.unshift({
      ...item,
      timestamp: new Date(item.timestamp)
    });

    // Keep only the most recent items
    if (this.state.recentActivity.length > this.config.maxActivityItems) {
      this.state.recentActivity = this.state.recentActivity.slice(0, this.config.maxActivityItems);
    }
  }

  private updateJob(updatedJob: any): void {
    const index = this.state.jobs.findIndex(job => job.id === updatedJob.id);
    if (index !== -1) {
      this.state.jobs[index] = { ...this.state.jobs[index], ...updatedJob };
    } else {
      this.state.jobs.unshift(updatedJob);
    }
  }

  private async updateState(): Promise<void> {
    try {
      const [stats, health] = await Promise.all([
        this.fetchStats(),
        this.fetchSystemHealth()
      ]);

      this.state.stats = stats;
      this.state.systemHealth = health;

      this.emit('state_update', this.state);
    } catch (error) {
      console.error('Failed to update dashboard state:', error);
    }
  }

  private handleOnline(): void {
    this.resumeUpdates();
    this.emit('connection_change', { online: true });
  }

  private handleOffline(): void {
    this.pauseUpdates();
    this.emit('connection_change', { online: false });
  }

  private pauseUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private resumeUpdates(): void {
    if (!this.refreshInterval && this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }
  }

  // Event emitter methods
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // Public methods
  getState(): DashboardState {
    return { ...this.state };
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart updates if needed
    if (this.refreshInterval) {
      this.pauseUpdates();
      this.resumeUpdates();
    }

    this.emit('config_update', this.config);
  }

  async refreshData(): Promise<void> {
    await this.loadInitialData();
  }

  async createJob(type: string, metadata?: Record<string, any>): Promise<void> {
    // Simulate job creation - replace with actual implementation
    const newJob = {
      id: Date.now().toString(),
      type,
      status: 'pending' as const,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };

    this.state.jobs.unshift(newJob);
    this.emit('job_created', newJob);
  }

  destroy(): void {
    this.pauseUpdates();

    if (this.realtimeUpdates) {
      this.realtimeUpdates.disconnect();
      this.realtimeUpdates = undefined;
    }

    this.eventListeners.clear();
  }
}