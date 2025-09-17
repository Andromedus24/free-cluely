export interface AppStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastActive: Date;
  health: 'healthy' | 'warning' | 'critical';
  responseTime: number; // in ms
  uptime: number; // in hours
  message?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}

export interface MonitoringEvent {
  id: string;
  type: 'status_change' | 'health_update' | 'connection_lost' | 'connection_restored';
  appId: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export class RealTimeMonitoring {
  private appStatuses: Map<string, AppStatus> = new Map();
  private eventLog: MonitoringEvent[] = [];
  private subscribers: Set<(event: MonitoringEvent) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Initialize with some sample apps
    const sampleApps = [
      { id: 'slack', name: 'Slack' },
      { id: 'google-calendar', name: 'Google Calendar' },
      { id: 'github', name: 'GitHub' },
      { id: 'notion', name: 'Notion' },
      { id: 'figma', name: 'Figma' },
    ];

    sampleApps.forEach(app => {
      this.appStatuses.set(app.id, {
        ...app,
        status: 'connected',
        lastActive: new Date(),
        health: 'healthy',
        responseTime: Math.random() * 100 + 50,
        uptime: Math.random() * 100 + 20,
      });
    });

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring() {
    this.intervalId = setInterval(() => {
      this.updateStatuses();
      this.generateRandomEvents();
    }, 5000); // Update every 5 seconds
  }

  private updateStatuses() {
    this.appStatuses.forEach((status, appId) => {
      // Simulate random status changes
      const random = Math.random();
      let newStatus = status.status;
      let newHealth = status.health;

      if (random < 0.05) { // 5% chance of status change
        const statuses: AppStatus['status'][] = ['connected', 'disconnected', 'connecting', 'error'];
        newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      }

      if (random < 0.03) { // 3% chance of health change
        const healths: AppStatus['health'][] = ['healthy', 'warning', 'critical'];
        newHealth = healths[Math.floor(Math.random() * healths.length)];
      }

      // Update response time
      const newResponseTime = Math.random() * 200 + 30;

      const updatedStatus: AppStatus = {
        ...status,
        status: newStatus,
        health: newHealth,
        responseTime: newResponseTime,
        lastActive: new Date(),
      };

      this.appStatuses.set(appId, updatedStatus);

      // Notify subscribers of significant changes
      if (status.status !== newStatus) {
        this.notifySubscribers({
          id: `event_${Date.now()}_${appId}`,
          type: newStatus === 'connected' ? 'connection_restored' : 'connection_lost',
          appId,
          message: `${status.name} ${newStatus === 'connected' ? 'reconnected' : 'disconnected'}`,
          severity: newStatus === 'connected' ? 'info' : 'warning',
          timestamp: new Date(),
        });
      }
    });
  }

  private generateRandomEvents() {
    // Occasionally generate random events
    if (Math.random() < 0.1) { // 10% chance
      const appIds = Array.from(this.appStatuses.keys());
      const appId = appIds[Math.floor(Math.random() * appIds.length)];
      const app = this.appStatuses.get(appId)!;

      const events: MonitoringEvent[] = [
        {
          id: `event_${Date.now()}_${appId}_1`,
          type: 'health_update',
          appId,
          message: `${app.name} performance optimized`,
          severity: 'info',
          timestamp: new Date(),
        },
        {
          id: `event_${Date.now()}_${appId}_2`,
          type: 'status_change',
          appId,
          message: `${app.name} sync completed`,
          severity: 'info',
          timestamp: new Date(),
        }
      ];

      const event = events[Math.floor(Math.random() * events.length)];
      this.notifySubscribers(event);
    }
  }

  private notifySubscribers(event: MonitoringEvent) {
    this.eventLog.push(event);
    // Keep only last 100 events
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }

    this.subscribers.forEach(callback => callback(event));
  }

  // Public API
  getAppStatus(appId: string): AppStatus | undefined {
    return this.appStatuses.get(appId);
  }

  getAllAppStatuses(): AppStatus[] {
    return Array.from(this.appStatuses.values());
  }

  getSystemMetrics(): SystemMetrics {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      timestamp: new Date(),
    };
  }

  getRecentEvents(limit: number = 10): MonitoringEvent[] {
    return this.eventLog.slice(-limit).reverse();
  }

  subscribe(callback: (event: MonitoringEvent) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  forceStatusUpdate(appId: string, status: AppStatus['status']) {
    const current = this.appStatuses.get(appId);
    if (current) {
      const updated = { ...current, status, lastActive: new Date() };
      this.appStatuses.set(appId, updated);

      this.notifySubscribers({
        id: `event_${Date.now()}_${appId}`,
        type: 'status_change',
        appId,
        message: `${current.name} status changed to ${status}`,
        severity: 'info',
        timestamp: new Date(),
      });
    }
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Singleton instance
export const monitoring = new RealTimeMonitoring();