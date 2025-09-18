// Profiling Service Implementation
// ==============================

import { EventEmitter } from 'events';
import {
  ProfileData,
  ProfileConfig,
  ProfileSession,
  ProfileReport,
  ProfileType,
  HotSpot,
  CallGraph,
  MemoryProfile,
  CPUProfile,
  ObservabilityEventType
} from '../types';

/**
 * Advanced profiling service for performance analysis
 */
export class ProfilingService extends EventEmitter {
  private config: ProfileConfig;
  private activeSessions: Map<string, ProfileSession> = new Map();
  private profiles: Map<string, ProfileData> = new Map();
  private isRunning: boolean = false;

  constructor(config: ProfileConfig) {
    super();
    this.config = config;
  }

  /**
   * Start profiling service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startBackgroundProfiling();

    this.emit('started');
  }

  /**
   * Stop profiling service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopBackgroundProfiling();
    this.stopAllSessions();

    this.emit('stopped');
  }

  /**
   * Start a profiling session
   */
  startProfile(type: ProfileType, options?: {
    name?: string;
    duration?: number;
    sampleRate?: number;
    target?: string;
  }): string {
    const sessionId = this.generateSessionId();
    const session: ProfileSession = {
      id: sessionId,
      type,
      startTime: Date.now(),
      status: 'running',
      name: options?.name || `${type}_${sessionId}`,
      sampleRate: options?.sampleRate || this.config.defaultSampleRate,
      target: options?.target,
      duration: options?.duration,
      samples: [],
      memorySamples: [],
    };

    this.activeSessions.set(sessionId, session);

    // Start specific profiling based on type
    switch (type) {
      case 'cpu':
        this.startCPUProfiling(session);
        break;
      case 'memory':
        this.startMemoryProfiling(session);
        break;
      case 'heap':
        this.startHeapProfiling(session);
        break;
      case 'execution':
        this.startExecutionProfiling(session);
        break;
      case 'custom':
        this.startCustomProfiling(session);
        break;
    }

    this.emit('sessionStarted', session);

    return sessionId;
  }

  /**
   * Stop a profiling session
   */
  stopProfile(sessionId: string): ProfileData | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.endTime = Date.now();
    session.status = 'completed';

    // Stop specific profiling based on type
    switch (session.type) {
      case 'cpu':
        this.stopCPUProfiling(session);
        break;
      case 'memory':
        this.stopMemoryProfiling(session);
        break;
      case 'heap':
        this.stopHeapProfiling(session);
        break;
      case 'execution':
        this.stopExecutionProfiling(session);
        break;
      case 'custom':
        this.stopCustomProfiling(session);
        break;
    }

    // Process and analyze profile data
    const profileData = this.processProfileData(session);
    this.profiles.set(sessionId, profileData);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    this.emit('sessionStopped', session);
    this.emit('profileComplete', profileData);

    return profileData;
  }

  /**
   * Get active profiling sessions
   */
  getActiveSessions(): ProfileSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get profile data
   */
  getProfile(sessionId: string): ProfileData | null {
    return this.profiles.get(sessionId) || null;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ProfileData[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profiles by type
   */
  getProfilesByType(type: ProfileType): ProfileData[] {
    return Array.from(this.profiles.values()).filter(p => p.type === type);
  }

  /**
   * Generate profile report
   */
  generateReport(sessionId: string): ProfileReport | null {
    const profile = this.profiles.get(sessionId);
    if (!profile) {
      return null;
    }

    const report: ProfileReport = {
      sessionId,
      type: profile.type,
      generatedAt: Date.now(),
      summary: this.generateProfileSummary(profile),
      hotSpots: this.identifyHotSpots(profile),
      callGraph: this.generateCallGraph(profile),
      recommendations: this.generateProfileRecommendations(profile),
      metrics: this.calculateProfileMetrics(profile),
      metadata: {
        duration: profile.endTime! - profile.startTime,
        sampleCount: profile.samples.length,
        target: profile.target
      }
    };

    return report;
  }

  /**
   * Compare two profiles
   */
  compareProfiles(sessionId1: string, sessionId2: string): {
    profile1: ProfileData;
    profile2: ProfileData;
    differences: Array<{
      metric: string;
      value1: number;
      value2: number;
      change: number;
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }>;
    summary: string;
  } | null {
    const profile1 = this.profiles.get(sessionId1);
    const profile2 = this.profiles.get(sessionId2);

    if (!profile1 || !profile2) {
      return null;
    }

    const differences = this.calculateProfileDifferences(profile1, profile2);
    const summary = this.generateComparisonSummary(profile1, profile2, differences);

    return {
      profile1,
      profile2,
      differences,
      summary
    };
  }

  /**
   * Add custom sample to profile
   */
  addSample(sessionId: string, sample: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.samples.push({
      timestamp: Date.now(),
      data: sample
    });

    this.emit('sampleAdded', { sessionId, sample });
  }

  /**
   * Add memory sample to profile
   */
  addMemorySample(sessionId: string, sample: MemoryProfile): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.memorySamples!.push(sample);
    this.emit('memorySampleAdded', { sessionId, sample });
  }

  // Private methods
  private startBackgroundProfiling(): void {
    // Start periodic sampling for system metrics
    setInterval(() => {
      if (this.isRunning) {
        this.collectSystemMetrics();
      }
    }, this.config.systemSampleInterval);
  }

  private stopBackgroundProfiling(): void {
    // Background profiling will stop automatically when interval is cleared
  }

  private stopAllSessions(): void {
    for (const sessionId of this.activeSessions.keys()) {
      this.stopProfile(sessionId);
    }
  }

  private startCPUProfiling(session: ProfileSession): void {
    // Mock CPU profiling - in real implementation, use V8 profiler or similar
    const interval = setInterval(() => {
      if (session.status === 'running') {
        const sample: CPUProfile = {
          timestamp: Date.now(),
          stack: this.generateMockStack(),
          cpuTime: Math.random() * 100,
          memoryUsage: Math.random() * 100 * 1024 * 1024, // Random memory usage
          function: this.getRandomFunction()
        };

        session.samples.push(sample);
      }
    }, 1000 / session.sampleRate!);

    session.profileInterval = interval;
  }

  private stopCPUProfiling(session: ProfileSession): void {
    if (session.profileInterval) {
      clearInterval(session.profileInterval);
    }
  }

  private startMemoryProfiling(session: ProfileSession): void {
    // Mock memory profiling - in real implementation, use heap profiler
    const interval = setInterval(() => {
      if (session.status === 'running') {
        const sample: MemoryProfile = {
          timestamp: Date.now(),
          heapUsed: Math.random() * 100 * 1024 * 1024,
          heapTotal: Math.random() * 200 * 1024 * 1024,
          external: Math.random() * 50 * 1024 * 1024,
          rss: Math.random() * 300 * 1024 * 1024,
          heapLimit: 500 * 1024 * 1024
        };

        session.memorySamples!.push(sample);
      }
    }, 1000 / session.sampleRate!);

    session.profileInterval = interval;
  }

  private stopMemoryProfiling(session: ProfileSession): void {
    if (session.profileInterval) {
      clearInterval(session.profileInterval);
    }
  }

  private startHeapProfiling(session: ProfileSession): void {
    // Mock heap profiling - in real implementation, use heap snapshot
    const interval = setInterval(() => {
      if (session.status === 'running') {
        const sample = {
          timestamp: Date.now(),
          heapSnapshot: this.generateMockHeapSnapshot()
        };

        session.samples.push(sample);
      }
    }, 5000 / session.sampleRate!); // Heap profiling is less frequent

    session.profileInterval = interval;
  }

  private stopHeapProfiling(session: ProfileSession): void {
    if (session.profileInterval) {
      clearInterval(session.profileInterval);
    }
  }

  private startExecutionProfiling(session: ProfileSession): void {
    // Mock execution profiling - in real implementation, use execution tracer
    const interval = setInterval(() => {
      if (session.status === 'running') {
        const sample = {
          timestamp: Date.now(),
          executionTime: Math.random() * 1000,
          callStack: this.generateMockStack(),
          function: this.getRandomFunction()
        };

        session.samples.push(sample);
      }
    }, 100 / session.sampleRate!); // Execution profiling is high frequency

    session.profileInterval = interval;
  }

  private stopExecutionProfiling(session: ProfileSession): void {
    if (session.profileInterval) {
      clearInterval(session.profileInterval);
    }
  }

  private startCustomProfiling(session: ProfileSession): void {
    // Custom profiling doesn't start automatic sampling
    // Relies on manual samples via addSample()
  }

  private stopCustomProfiling(session: ProfileSession): void {
    // Custom profiling cleanup
  }

  private generateMockStack(): string[] {
    const functions = [
      'processRequest',
      'handleData',
      'validateInput',
      'queryDatabase',
      'renderResponse',
      'calculateMetrics',
      'updateCache',
      'logActivity',
      'sendNotification'
    ];

    const stackDepth = Math.floor(Math.random() * 8) + 1;
    const stack = [];

    for (let i = 0; i < stackDepth; i++) {
      stack.push(functions[Math.floor(Math.random() * functions.length)]);
    }

    return stack;
  }

  private getRandomFunction(): string {
    const functions = [
      'main',
      'init',
      'process',
      'handle',
      'execute',
      'run',
      'compute',
      'transform',
      'validate',
      'render'
    ];

    return functions[Math.floor(Math.random() * functions.length)];
  }

  private generateMockHeapSnapshot(): any {
    return {
      nodes: Math.floor(Math.random() * 10000) + 1000,
      edges: Math.floor(Math.random() * 20000) + 2000,
      totalSize: Math.floor(Math.random() * 100 * 1024 * 1024),
      largestObject: Math.floor(Math.random() * 10 * 1024 * 1024),
      objectCount: Math.floor(Math.random() * 5000) + 500
    };
  }

  private collectSystemMetrics(): void {
    // Collect system-wide metrics
    const metrics = {
      timestamp: Date.now(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkIO: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000)
      }
    };

    this.emit('systemMetricsCollected', metrics);
  }

  private processProfileData(session: ProfileSession): ProfileData {
    const profileData: ProfileData = {
      id: session.id,
      type: session.type,
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime!,
      duration: session.endTime! - session.startTime,
      target: session.target,
      samples: session.samples,
      memorySamples: session.memorySamples || [],
      metadata: {
        sampleRate: session.sampleRate,
        sampleCount: session.samples.length,
        memorySampleCount: session.memorySamples?.length || 0
      }
    };

    return profileData;
  }

  private generateProfileSummary(profile: ProfileData): string {
    const summary = [];

    summary.push(`Profile type: ${profile.type}`);
    summary.push(`Duration: ${(profile.duration / 1000).toFixed(2)} seconds`);
    summary.push(`Samples collected: ${profile.samples.length}`);

    if (profile.memorySamples && profile.memorySamples.length > 0) {
      const avgMemory = profile.memorySamples.reduce((sum, s) => sum + s.heapUsed, 0) / profile.memorySamples.length;
      summary.push(`Average memory usage: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
    }

    return summary.join('. ');
  }

  private identifyHotSpots(profile: ProfileData): HotSpot[] {
    const hotSpots: HotSpot[] = [];

    // Analyze samples to find hot spots
    const functionCounts = new Map<string, { count: number; totalTime: number }>();

    for (const sample of profile.samples) {
      if (sample.data?.function) {
        const func = sample.data.function;
        const existing = functionCounts.get(func) || { count: 0, totalTime: 0 };

        existing.count++;
        existing.totalTime += sample.data.cpuTime || sample.data.executionTime || 0;

        functionCounts.set(func, existing);
      }
    }

    // Convert to hot spots
    for (const [func, stats] of functionCounts.entries()) {
      const avgTime = stats.totalTime / stats.count;
      const percentage = (stats.count / profile.samples.length) * 100;

      if (percentage > 1) { // Only include significant hot spots
        hotSpots.push({
          function: func,
          percentage,
          averageTime: avgTime,
          totalTime: stats.totalTime,
          callCount: stats.count
        });
      }
    }

    // Sort by percentage
    return hotSpots.sort((a, b) => b.percentage - a.percentage).slice(0, 10);
  }

  private generateCallGraph(profile: ProfileData): CallGraph {
    const callGraph: CallGraph = {
      nodes: [],
      edges: []
    };

    // Generate nodes from functions
    const functions = new Set<string>();
    const callCounts = new Map<string, number>();

    for (const sample of profile.samples) {
      if (sample.data?.stack) {
        for (const func of sample.data.stack) {
          functions.add(func);
          callCounts.set(func, (callCounts.get(func) || 0) + 1);
        }
      }
    }

    // Create nodes
    for (const func of functions) {
      callGraph.nodes.push({
        id: func,
        name: func,
        value: callCounts.get(func) || 0,
        type: 'function'
      });
    }

    // Generate edges from call stacks
    const edgeCounts = new Map<string, number>();

    for (const sample of profile.samples) {
      if (sample.data?.stack && sample.data.stack.length > 1) {
        for (let i = 0; i < sample.data.stack.length - 1; i++) {
          const from = sample.data.stack[i];
          const to = sample.data.stack[i + 1];
          const edgeKey = `${from}->${to}`;

          edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1);
        }
      }
    }

    // Create edges
    for (const [edgeKey, count] of edgeCounts.entries()) {
      const [from, to] = edgeKey.split('->');

      callGraph.edges.push({
        from,
        to,
        value: count
      });
    }

    return callGraph;
  }

  private generateProfileRecommendations(profile: ProfileData): string[] {
    const recommendations: string[] = [];
    const hotSpots = this.identifyHotSpots(profile);

    // Analyze hot spots
    for (const hotSpot of hotSpots.slice(0, 3)) {
      if (hotSpot.percentage > 10) {
        recommendations.push(`Optimize ${hotSpot.function} which consumes ${hotSpot.percentage.toFixed(1)}% of execution time`);
      }
    }

    // Memory analysis
    if (profile.memorySamples && profile.memorySamples.length > 0) {
      const memoryGrowth = this.calculateMemoryGrowth(profile.memorySamples);
      if (memoryGrowth > 0.1) { // 10% growth
        recommendations.push('Investigate potential memory leaks detected during profiling');
      }
    }

    // Sample rate analysis
    if (profile.samples.length < 100) {
      recommendations.push('Consider increasing sample rate for more accurate profiling results');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance profile looks healthy with no significant issues detected');
    }

    return recommendations;
  }

  private calculateProfileMetrics(profile: ProfileData): {
    totalSamples: number;
    sampleRate: number;
    averageSampleInterval: number;
    memoryGrowth: number;
    peakMemory: number;
    averageFunctionTime: number;
  } {
    const totalSamples = profile.samples.length;
    const sampleRate = totalSamples / (profile.duration / 1000); // samples per second
    const averageSampleInterval = profile.duration / totalSamples;

    let memoryGrowth = 0;
    let peakMemory = 0;

    if (profile.memorySamples && profile.memorySamples.length > 0) {
      const firstMemory = profile.memorySamples[0].heapUsed;
      const lastMemory = profile.memorySamples[profile.memorySamples.length - 1].heapUsed;
      memoryGrowth = (lastMemory - firstMemory) / firstMemory;

      peakMemory = Math.max(...profile.memorySamples.map(s => s.heapUsed));
    }

    // Calculate average function time
    let totalFunctionTime = 0;
    let functionCount = 0;

    for (const sample of profile.samples) {
      if (sample.data?.cpuTime || sample.data?.executionTime) {
        totalFunctionTime += sample.data.cpuTime || sample.data.executionTime || 0;
        functionCount++;
      }
    }

    const averageFunctionTime = functionCount > 0 ? totalFunctionTime / functionCount : 0;

    return {
      totalSamples,
      sampleRate,
      averageSampleInterval,
      memoryGrowth,
      peakMemory,
      averageFunctionTime
    };
  }

  private calculateMemoryGrowth(memorySamples: MemoryProfile[]): number {
    if (memorySamples.length < 2) {
      return 0;
    }

    const firstMemory = memorySamples[0].heapUsed;
    const lastMemory = memorySamples[memorySamples.length - 1].heapUsed;

    return (lastMemory - firstMemory) / firstMemory;
  }

  private calculateProfileDifferences(
    profile1: ProfileData,
    profile2: ProfileData
  ): Array<{
    metric: string;
    value1: number;
    value2: number;
    change: number;
    changePercent: number;
    significance: 'low' | 'medium' | 'high';
  }> {
    const differences: Array<{
      metric: string;
      value1: number;
      value2: number;
      change: number;
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }> = [];

    // Compare basic metrics
    const metrics = [
      { key: 'duration', getter: (p: ProfileData) => p.duration },
      { key: 'sampleCount', getter: (p: ProfileData) => p.samples.length },
      { key: 'averageSampleInterval', getter: (p: ProfileData) => p.duration / p.samples.length }
    ];

    for (const metric of metrics) {
      const value1 = metric.getter(profile1);
      const value2 = metric.getter(profile2);
      const change = value2 - value1;
      const changePercent = value1 !== 0 ? (change / value1) * 100 : 0;

      let significance: 'low' | 'medium' | 'high' = 'low';
      if (Math.abs(changePercent) > 20) {
        significance = 'high';
      } else if (Math.abs(changePercent) > 10) {
        significance = 'medium';
      }

      differences.push({
        metric: metric.key,
        value1,
        value2,
        change,
        changePercent,
        significance
      });
    }

    return differences;
  }

  private generateComparisonSummary(
    profile1: ProfileData,
    profile2: ProfileData,
    differences: Array<{
      metric: string;
      value1: number;
      value2: number;
      change: number;
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }>
  ): string {
    const significantChanges = differences.filter(d => d.significance === 'high');

    if (significantChanges.length === 0) {
      return 'No significant differences found between profiles';
    }

    const changes = significantChanges.map(d =>
      `${d.metric}: ${d.changePercent > 0 ? '+' : ''}${d.changePercent.toFixed(1)}%`
    );

    return `Significant differences detected: ${changes.join(', ')}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}