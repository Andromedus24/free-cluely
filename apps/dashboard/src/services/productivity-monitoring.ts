/**
 * Productivity Monitoring Service for Atlas AI
 * Integrates computer vision, activity tracking, and AI-powered insights
 * Based on HackTheNorth productivity monitoring architecture
 */

import { errorHandlingService } from './error-handling';
import { logger } from '@/lib/logger';

export interface ActivityEvent {
  id: string;
  type: 'focus' | 'break' | 'distraction' | 'meeting' | 'deep_work';
  timestamp: Date;
  duration: number; // in seconds
  confidence: number;
  data: {
    activity?: string;
    app?: string;
    website?: string;
    people_detected?: number;
    screen_time?: number;
    productivity_score?: number;
  };
  metadata?: {
    camera_position?: string;
    lighting_conditions?: string;
    session_id?: string;
  };
}

export interface ProductivityMetrics {
  focus_time: number;
  break_time: number;
  distraction_time: number;
  meeting_time: number;
  deep_work_time: number;
  total_screen_time: number;
  productivity_score: number;
  efficiency: number;
  recommendations: string[];
}

export interface MonitoringConfig {
  camera: {
    enabled: boolean;
    resolution: string;
    fps: number;
    privacy_mode: boolean;
  };
  ai: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    sensitivity: number;
  };
  notifications: {
    enabled: boolean;
    break_reminders: boolean;
    focus_achievements: boolean;
    productivity_insights: boolean;
  };
  privacy: {
    data_retention_days: number;
    anonymize_data: boolean;
    local_processing: boolean;
  };
}

export interface SessionData {
  id: string;
  start_time: Date;
  end_time?: Date;
  activities: ActivityEvent[];
  metrics: ProductivityMetrics;
  goals?: {
    focus_target: number;
    break_target: number;
  };
}

class ProductivityMonitoringService {
  private config: MonitoringConfig;
  private currentSession: SessionData | null = null;
  private isMonitoring = false;
  private cameraStream: MediaStream | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private eventCallbacks: ((event: ActivityEvent) => void)[] = [];
  private metricsCallbacks: ((metrics: ProductivityMetrics) => void)[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeService();
  }

  private initializeService() {
    // Load configuration from localStorage if available
    const savedConfig = localStorage.getItem('atlas-productivity-config');
    if (savedConfig) {
      try {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      } catch (error) {
        const configError = error instanceof Error ? error : new Error('Failed to parse config');
        errorHandlingService.handleError(configError, {
          type: 'client',
          severity: 'low',
          component: 'ProductivityMonitoringService',
          context: { action: 'initializeService' }
        });
      }
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('productivity-monitoring', 'Productivity monitoring is already active');
      return;
    }

    try {
      // Request camera permissions
      if (this.config.camera.enabled) {
        await this.initializeCamera();
      }

      // Start new session
      this.currentSession = {
        id: this.generateId(),
        start_time: new Date(),
        activities: [],
        metrics: this.initializeMetrics(),
        goals: {
          focus_target: 25 * 60, // 25 minutes focus target
          break_target: 5 * 60   // 5 minutes break target
        }
      };

      this.isMonitoring = true;

      // Start monitoring loop
      this.startMonitoringLoop();

      logger.info('productivity-monitoring', 'Productivity monitoring started');
    } catch (error) {
      const startError = error instanceof Error ? error : new Error('Failed to start monitoring');

      errorHandlingService.handleError(startError, {
        type: 'client',
        severity: 'high',
        component: 'ProductivityMonitoringService',
        context: { action: 'startMonitoring' }
      });

      throw startError;
    }
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('productivity-monitoring', 'Productivity monitoring is not active');
      return;
    }

    // Stop camera
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    // Stop monitoring loop
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Finalize session
    if (this.currentSession) {
      this.currentSession.end_time = new Date();
      this.finalizeSessionMetrics();
    }

    this.isMonitoring = false;
    logger.info('productivity-monitoring', 'Productivity monitoring stopped');
  }

  private async initializeCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: this.config.camera.fps }
        }
      });
      this.cameraStream = stream;
    } catch (error) {
      const cameraError = error instanceof Error ? error : new Error('Camera initialization failed');

      errorHandlingService.handleError(cameraError, {
        type: 'client',
        severity: 'medium',
        component: 'ProductivityMonitoringService',
        context: { action: 'initializeCamera' }
      });

      throw new Error('Camera permission denied or not available');
    }
  }

  private startMonitoringLoop(): void {
    // Simulate activity detection (in real implementation, this would use computer vision)
    this.intervalId = setInterval(async () => {
      if (!this.currentSession) return;

      try {
        const activity = await this.detectActivity();
        this.processActivity(activity);
      } catch (error) {
        const detectionError = error instanceof Error ? error : new Error('Activity detection failed');

        errorHandlingService.handleError(detectionError, {
          type: 'client',
          severity: 'medium',
          component: 'ProductivityMonitoringService',
          context: { action: 'detectActivity' }
        });

        logger.warn('productivity-monitoring', 'Activity detection failed, continuing monitoring', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 5000); // Check every 5 seconds
  }

  private async detectActivity(): Promise<ActivityEvent> {
    // Simulate activity detection (replace with actual computer vision)
    const activities = [
      { type: 'focus', confidence: 0.8, data: { activity: 'coding', productivity_score: 85 } },
      { type: 'break', confidence: 0.7, data: { activity: 'resting', productivity_score: 30 } },
      { type: 'distraction', confidence: 0.6, data: { activity: 'social_media', productivity_score: 10 } },
      { type: 'meeting', confidence: 0.9, data: { activity: 'video_call', people_detected: 3 } },
      { type: 'deep_work', confidence: 0.95, data: { activity: 'writing', productivity_score: 95 } }
    ];

    // Random selection for demo (in real implementation, use CV + AI)
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    return {
      id: this.generateId(),
      type: randomActivity.type as ActivityEvent['type'],
      timestamp: new Date(),
      duration: 5, // 5 seconds interval
      confidence: randomActivity.confidence,
      data: randomActivity.data,
      metadata: {
        camera_position: 'desktop',
        lighting_conditions: 'good',
        session_id: this.currentSession?.id
      }
    };
  }

  private processActivity(activity: ActivityEvent): void {
    if (!this.currentSession) return;

    // Add to current session
    this.currentSession.activities.push(activity);

    // Update metrics
    this.updateMetrics(activity);

    // Notify callbacks
    this.eventCallbacks.forEach(callback => callback(activity));

    // Generate insights and notifications
    this.generateInsights(activity);
  }

  private updateMetrics(activity: ActivityEvent): void {
    if (!this.currentSession) return;

    const metrics = this.currentSession.metrics;

    switch (activity.type) {
      case 'focus':
        metrics.focus_time += activity.duration;
        break;
      case 'break':
        metrics.break_time += activity.duration;
        break;
      case 'distraction':
        metrics.distraction_time += activity.duration;
        break;
      case 'meeting':
        metrics.meeting_time += activity.duration;
        break;
      case 'deep_work':
        metrics.deep_work_time += activity.duration;
        break;
    }

    // Calculate productivity score
    const productiveTime = metrics.focus_time + metrics.deep_work_time;
    const totalActiveTime = productiveTime + metrics.distraction_time;
    metrics.productivity_score = totalActiveTime > 0 ? (productiveTime / totalActiveTime) * 100 : 0;

    // Calculate efficiency
    metrics.efficiency = this.calculateEfficiency();

    // Update total screen time
    metrics.total_screen_time += activity.duration;

    // Notify metrics callbacks
    this.metricsCallbacks.forEach(callback => callback(metrics));
  }

  private calculateEfficiency(): number {
    if (!this.currentSession) return 0;

    const { metrics, goals } = this.currentSession;
    if (!goals) return 0;

    const focusEfficiency = Math.min((metrics.focus_time / goals.focus_target) * 100, 100);
    const breakEfficiency = Math.min((metrics.break_time / goals.break_target) * 100, 100);
    const distractionPenalty = Math.max(0, 100 - (metrics.distraction_time / 60) * 10); // 10% penalty per minute of distraction

    return (focusEfficiency * 0.6 + breakEfficiency * 0.2 + distractionPenalty * 0.2);
  }

  private generateInsights(activity: ActivityEvent): void {
    if (!this.currentSession || !this.config.notifications.enabled) return;

    const insights: string[] = [];

    // Focus session achievements
    if (activity.type === 'focus' && this.currentSession.metrics.focus_time >= 25 * 60) {
      insights.push('🎯 25-minute focus session completed!');
    }

    // Break reminders
    if (this.currentSession.metrics.focus_time >= 45 * 60 && this.currentSession.metrics.break_time < 5 * 60) {
      insights.push('☕ Time for a break! Your focus session has been long.');
    }

    // Distraction warnings
    if (activity.type === 'distraction' && this.currentSession.metrics.distraction_time > 10 * 60) {
      insights.push('⚠️ High distraction time detected. Consider minimizing interruptions.');
    }

    // Productivity milestones
    if (this.currentSession.metrics.productivity_score >= 80) {
      insights.push('🚀 Excellent productivity! Keep up the great work.');
    }

    // Add insights to metrics
    this.currentSession.metrics.recommendations.push(...insights);

    // Show notifications (in real implementation, use a notification system)
    if (insights.length > 0) {
      logger.info('productivity-monitoring', 'Productivity Insight', { insight: insights[0] });
    }
  }

  private initializeMetrics(): ProductivityMetrics {
    return {
      focus_time: 0,
      break_time: 0,
      distraction_time: 0,
      meeting_time: 0,
      deep_work_time: 0,
      total_screen_time: 0,
      productivity_score: 0,
      efficiency: 0,
      recommendations: []
    };
  }

  private finalizeSessionMetrics(): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const duration = session.end_time
      ? (session.end_time.getTime() - session.start_time.getTime()) / 1000
      : 0;

    // Final productivity calculations
    session.metrics.productivity_score = this.calculateFinalProductivityScore(duration);
    session.metrics.efficiency = this.calculateEfficiency();

    // Generate final recommendations
    session.metrics.recommendations = this.generateFinalRecommendations();

    // Save session to localStorage
    this.saveSession(session);
  }

  private calculateFinalProductivityScore(duration: number): number {
    if (!this.currentSession || duration === 0) return 0;

    const { metrics } = this.currentSession;
    const productiveTime = metrics.focus_time + metrics.deep_work_time;
    const activeTime = productiveTime + metrics.distraction_time;

    if (activeTime === 0) return 0;

    let score = (productiveTime / activeTime) * 100;

    // Bonus for deep work sessions
    if (metrics.deep_work_time > 30 * 60) { // 30+ minutes of deep work
      score += 10;
    }

    // Penalty for excessive distraction time
    if (metrics.distraction_time > duration * 0.3) { // >30% distraction
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateFinalRecommendations(): string[] {
    if (!this.currentSession) return [];

    const { metrics } = this.currentSession;
    const recommendations: string[] = [];

    if (metrics.focus_time < 20 * 60) {
      recommendations.push('📈 Try to increase your focused work sessions. Aim for at least 20 minutes at a time.');
    }

    if (metrics.break_time < 5 * 60) {
      recommendations.push('🧘 Remember to take regular breaks to maintain productivity and avoid burnout.');
    }

    if (metrics.distraction_time > 15 * 60) {
      recommendations.push('🚫 Consider using website blockers or focus apps to reduce distractions.');
    }

    if (metrics.deep_work_time < 10 * 60) {
      recommendations.push('🎯 Schedule dedicated deep work sessions for important tasks.');
    }

    if (metrics.productivity_score >= 80) {
      recommendations.push('🌟 Excellent productivity! Maintain this great work rhythm.');
    }

    return recommendations;
  }

  private saveSession(session: SessionData): void {
    try {
      const sessions = this.getSavedSessions();
      sessions.push(session);

      // Keep only last 30 days of sessions
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.privacy.data_retention_days);
      const filteredSessions = sessions.filter(s => s.start_time > cutoffDate);

      localStorage.setItem('atlas-productivity-sessions', JSON.stringify(filteredSessions));
    } catch (error) {
      logger.error('productivity-monitoring', 'Failed to save productivity session', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public getSavedSessions(): SessionData[] {
    try {
      const saved = localStorage.getItem('atlas-productivity-sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  public getMetrics(): ProductivityMetrics {
    return this.currentSession?.metrics || this.initializeMetrics();
  }

  public onActivity(callback: (event: ActivityEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  public onMetrics(callback: (metrics: ProductivityMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('atlas-productivity-config', JSON.stringify(this.config));
  }

  public getConfig(): MonitoringConfig {
    return this.config;
  }

  public get isActive(): boolean {
    return this.isMonitoring;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public destroy(): void {
    this.stopMonitoring();
    this.eventCallbacks = [];
    this.metricsCallbacks = [];
  }
}

// Export singleton instance
export const productivityMonitor = new ProductivityMonitoringService({
  camera: {
    enabled: false,
    resolution: '1280x720',
    fps: 30,
    privacy_mode: true
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4',
    sensitivity: 0.7
  },
  notifications: {
    enabled: true,
    break_reminders: true,
    focus_achievements: true,
    productivity_insights: true
  },
  privacy: {
    data_retention_days: 30,
    anonymize_data: true,
    local_processing: true
  }
});

export default ProductivityMonitoringService;