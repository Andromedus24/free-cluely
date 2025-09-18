import {
  IModerationStorage,
  ModerationAnalysis,
  ModerationDecision,
  UserReport,
  ModerationAppeal,
  ModerationEvent,
  ModerationStats,
  ModerationFilters
} from '../types/ModerationTypes';

/**
 * In-Memory Moderation Storage
 * Provides storage interface for moderation data
 * Note: In production, this would be replaced with a database implementation
 */
export class ModerationStorage implements IModerationStorage {
  private analyses: Map<string, ModerationAnalysis> = new Map();
  private decisions: Map<string, ModerationDecision> = new Map();
  private reports: Map<string, UserReport> = new Map();
  private appeals: Map<string, ModerationAppeal> = new Map();
  private events: ModerationEvent[] = [];

  async saveAnalysis(analysis: ModerationAnalysis): Promise<void> {
    this.analyses.set(analysis.id, analysis);
  }

  async getAnalysis(id: string): Promise<ModerationAnalysis> {
    const analysis = this.analyses.get(id);
    if (!analysis) {
      throw new Error(`Analysis not found: ${id}`);
    }
    return analysis;
  }

  async saveDecision(decision: ModerationDecision): Promise<void> {
    this.decisions.set(decision.id, decision);
  }

  async getDecision(id: string): Promise<ModerationDecision> {
    const decision = this.decisions.get(id);
    if (!decision) {
      throw new Error(`Decision not found: ${id}`);
    }
    return decision;
  }

  async saveReport(report: UserReport): Promise<void> {
    this.reports.set(report.id, report);
  }

  async getReport(id: string): Promise<UserReport> {
    const report = this.reports.get(id);
    if (!report) {
      throw new Error(`Report not found: ${id}`);
    }
    return report;
  }

  async saveAppeal(appeal: ModerationAppeal): Promise<void> {
    this.appeals.set(appeal.id, appeal);
  }

  async getAppeal(id: string): Promise<ModerationAppeal> {
    const appeal = this.appeals.get(id);
    if (!appeal) {
      throw new Error(`Appeal not found: ${id}`);
    }
    return appeal;
  }

  async saveEvent(event: ModerationEvent): Promise<void> {
    this.events.push(event);

    // Keep only last 10000 events to prevent memory issues
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  async getEvents(filters: ModerationFilters): Promise<ModerationEvent[]> {
    let filteredEvents = [...this.events];

    // Apply filters
    if (filters.contentTypes) {
      filteredEvents = filteredEvents.filter(event =>
        filters.contentTypes!.includes(event.contentType)
      );
    }

    if (filters.categories) {
      filteredEvents = filteredEvents.filter(event =>
        event.category && filters.categories!.includes(event.category)
      );
    }

    if (filters.severities) {
      filteredEvents = filteredEvents.filter(event =>
        event.severity && filters.severities!.includes(event.severity)
      );
    }

    if (filters.dateRange) {
      filteredEvents = filteredEvents.filter(event =>
        event.timestamp >= filters.dateRange!.start &&
        event.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.userIds) {
      filteredEvents = filteredEvents.filter(event =>
        event.userId && filters.userIds!.includes(event.userId)
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filteredEvents;
  }

  async getStats(timeRange: { start: Date; end: Date }): Promise<ModerationStats> {
    const eventsInRange = this.events.filter(event =>
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const decisionsInRange = Array.from(this.decisions.values()).filter(decision =>
      decision.createdAt >= timeRange.start && decision.createdAt <= timeRange.end
    );

    const reportsInRange = Array.from(this.reports.values()).filter(report =>
      report.createdAt >= timeRange.start && report.createdAt <= timeRange.end
    );

    const analysesInRange = Array.from(this.analyses.values()).filter(analysis =>
      analysis.createdAt >= timeRange.start && analysis.createdAt <= timeRange.end
    );

    // Calculate basic statistics
    const totalContent = analysesInRange.length;
    const totalReports = reportsInRange.length;

    const pendingReviews = reportsInRange.filter(report =>
      report.status === 'pending'
    ).length;

    // Calculate average review time
    const reviewTimes = decisionsInRange
      .filter(decision => decision.reviewTime)
      .map(decision => decision.reviewTime);

    const averageReviewTime = reviewTimes.length > 0
      ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
      : 0;

    // Calculate category distribution
    const categoryCount = new Map<string, number>();
    analysesInRange.forEach(analysis => {
      const count = categoryCount.get(analysis.category) || 0;
      categoryCount.set(analysis.category, count + 1);
    });

    const totalAnalyses = analysesInRange.length;
    const topCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({
        category: category as any,
        count,
        percentage: totalAnalyses > 0 ? (count / totalAnalyses) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate action distribution
    const actionCount = new Map<string, number>();
    decisionsInRange.forEach(decision => {
      const count = actionCount.get(decision.action) || 0;
      actionCount.set(decision.action, count + 1);
    });

    const totalDecisions = decisionsInRange.length;
    const topActions = Array.from(actionCount.entries())
      .map(([action, count]) => ({
        action: action as any,
        count,
        percentage: totalDecisions > 0 ? (count / totalDecisions) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate moderator statistics
    const moderatorStats = new Map<string, { count: number; totalTime: number; correct: number }>();
    decisionsInRange.forEach(decision => {
      const moderatorId = decision.moderatorId;
      const current = moderatorStats.get(moderatorId) || { count: 0, totalTime: 0, correct: 0 };
      current.count += 1;
      current.totalTime += decision.reviewTime || 0;

      // Simple accuracy calculation (would be more sophisticated in production)
      if (decision.confidence && decision.confidence > 0.7) {
        current.correct += 1;
      }

      moderatorStats.set(moderatorId, current);
    });

    const moderatorStatsArray = Array.from(moderatorStats.entries())
      .map(([moderatorId, stats]) => ({
        moderatorId,
        decisionsCount: stats.count,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        accuracy: stats.count > 0 ? stats.correct / stats.count : 0
      }))
      .sort((a, b) => b.decisionsCount - a.decisionsCount);

    // Calculate accuracy metrics (simplified)
    const totalDecisionsWithConfidence = decisionsInRange.filter(d => d.confidence !== undefined).length;
    const highConfidenceDecisions = decisionsInRange.filter(d => (d.confidence || 0) > 0.7).length;
    const accuracy = totalDecisionsWithConfidence > 0 ? highConfidenceDecisions / totalDecisionsWithConfidence : 0;

    // False positive/negative rates (simplified calculation)
    const flaggedAnalyses = analysesInRange.filter(a => a.action === 'flag').length;
    const blockedAnalyses = analysesInRange.filter(a => a.action === 'block').length;
    const totalFlaggedBlocked = flaggedAnalyses + blockedAnalyses;

    // These would be calculated based on appeals and manual reviews in production
    const falsePositiveRate = totalFlaggedBlocked > 0 ? 0.05 : 0; // 5% assumed false positive rate
    const falseNegativeRate = totalAnalyses > 0 ? 0.02 : 0; // 2% assumed false negative rate

    return {
      totalContent,
      totalReports,
      pendingReviews,
      averageReviewTime,
      accuracy,
      falsePositiveRate,
      falseNegativeRate,
      topCategories,
      topActions,
      moderatorStats: moderatorStatsArray,
      timeRange
    };
  }

  // Additional utility methods
  async getAnalysesByContentId(contentId: string): Promise<ModerationAnalysis[]> {
    return Array.from(this.analyses.values()).filter(analysis =>
      analysis.contentId === contentId
    );
  }

  async getDecisionsByContentId(contentId: string): Promise<ModerationDecision[]> {
    return Array.from(this.decisions.values()).filter(decision =>
      decision.contentId === contentId
    );
  }

  async getReportsByContentId(contentId: string): Promise<UserReport[]> {
    return Array.from(this.reports.values()).filter(report =>
      report.contentId === contentId
    );
  }

  async getAppealsByDecisionId(decisionId: string): Promise<ModerationAppeal[]> {
    return Array.from(this.appeals.values()).filter(appeal =>
      appeal.decisionId === decisionId
    );
  }

  async cleanupOldData(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old analyses
    for (const [id, analysis] of this.analyses) {
      if (analysis.createdAt < cutoffDate) {
        this.analyses.delete(id);
      }
    }

    // Clean up old decisions
    for (const [id, decision] of this.decisions) {
      if (decision.createdAt < cutoffDate) {
        this.decisions.delete(id);
      }
    }

    // Clean up old reports
    for (const [id, report] of this.reports) {
      if (report.createdAt < cutoffDate) {
        this.reports.delete(id);
      }
    }

    // Clean up old appeals
    for (const [id, appeal] of this.appeals) {
      if (appeal.createdAt < cutoffDate) {
        this.appeals.delete(id);
      }
    }

    // Clean up old events
    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
  }

  async exportData(): Promise<{
    analyses: ModerationAnalysis[];
    decisions: ModerationDecision[];
    reports: UserReport[];
    appeals: ModerationAppeal[];
    events: ModerationEvent[];
  }> {
    return {
      analyses: Array.from(this.analyses.values()),
      decisions: Array.from(this.decisions.values()),
      reports: Array.from(this.reports.values()),
      appeals: Array.from(this.appeals.values()),
      events: [...this.events]
    };
  }

  async importData(data: {
    analyses: ModerationAnalysis[];
    decisions: ModerationDecision[];
    reports: UserReport[];
    appeals: ModerationAppeal[];
    events: ModerationEvent[];
  }): Promise<void> {
    // Clear existing data
    this.analyses.clear();
    this.decisions.clear();
    this.reports.clear();
    this.appeals.clear();
    this.events.length = 0;

    // Import new data
    data.analyses.forEach(analysis => this.analyses.set(analysis.id, analysis));
    data.decisions.forEach(decision => this.decisions.set(decision.id, decision));
    data.reports.forEach(report => this.reports.set(report.id, report));
    data.appeals.forEach(appeal => this.appeals.set(appeal.id, appeal));
    this.events.push(...data.events);
  }

  getStorageInfo(): {
    analysesCount: number;
    decisionsCount: number;
    reportsCount: number;
    appealsCount: number;
    eventsCount: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      analysesCount: this.analyses.size,
      decisionsCount: this.decisions.size,
      reportsCount: this.reports.size,
      appealsCount: this.appeals.size,
      eventsCount: this.events.length,
      memoryUsage: process.memoryUsage()
    };
  }
}