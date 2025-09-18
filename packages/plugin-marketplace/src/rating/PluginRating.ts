import { z } from 'zod';
import { PluginManifest } from '../sdk/PluginSDK';

export enum RatingType {
  OVERALL = 'overall',
  FUNCTIONALITY = 'functionality',
  RELIABILITY = 'reliability',
  PERFORMANCE = 'performance',
  USABILITY = 'usability',
  SUPPORT = 'support',
  DOCUMENTATION = 'documentation',
  VALUE = 'value'
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  HIDDEN = 'hidden'
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  HARASSMENT = 'harassment',
  MISINFORMATION = 'misinformation',
  OFF_TOPIC = 'off_topic',
  VIOLATION = 'violation',
  OTHER = 'other'
}

export interface PluginRating {
  id: string;
  pluginId: string;
  userId: string;
  type: RatingType;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  version?: string;
  status: ReviewStatus;
  helpful: number;
  unhelpful: number;
  userVote?: 'helpful' | 'unhelpful';
  response?: {
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  };
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface RatingAggregate {
  pluginId: string;
  totalRatings: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  categoryAverages: {
    [key in RatingType]: {
      average: number;
      count: number;
    };
  };
  trend: {
    period: string; // YYYY-MM
    average: number;
    count: number;
  }[];
  updatedAt: Date;
}

export interface RatingFilter {
  pluginId?: string;
  userId?: string;
  rating?: number | [number, number]; // single rating or range
  type?: RatingType;
  status?: ReviewStatus;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  version?: string;
  hasResponse?: boolean;
  sortBy?: 'rating' | 'date' | 'helpful' | 'version';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface RatingReport {
  id: string;
  ratingId: string;
  reporterId: string;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingModeration {
  id: string;
  ratingId: string;
  moderatorId: string;
  action: 'approve' | 'reject' | 'flag' | 'hide' | 'delete';
  reason: string;
  notes?: string;
  createdAt: Date;
}

export interface RatingAnalytics {
  pluginId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalRatings: number;
    averageRating: number;
    responseRate: number;
    flagRate: number;
    deletionRate: number;
    trending: 'up' | 'down' | 'stable';
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  breakdown: {
    byRating: {
      rating: number;
      count: number;
      percentage: number;
    }[];
    byType: {
      type: RatingType;
      average: number;
      count: number;
    }[];
    byVersion: {
      version: string;
      average: number;
      count: number;
    }[];
    byDate: {
      date: string;
      count: number;
      average: number;
    }[];
  };
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface RatingExport {
  id: string;
  format: 'csv' | 'json' | 'excel';
  filters: RatingFilter;
  data: any[];
  generatedAt: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface RatingNotification {
  id: string;
  type: 'new_rating' | 'rating_response' | 'rating_report' | 'rating_moderation';
  pluginId: string;
  userId: string;
  ratingId?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// Schemas
export const PluginRatingSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  type: z.nativeEnum(RatingType),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  version: z.string().optional(),
  status: z.nativeEnum(ReviewStatus),
  helpful: z.number().min(0).default(0),
  unhelpful: z.number().min(0).default(0),
  userVote: z.enum(['helpful', 'unhelpful']).optional(),
  response: z.object({
    authorId: z.string(),
    authorName: z.string(),
    content: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
  }).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional()
});

export const RatingAggregateSchema = z.object({
  pluginId: z.string(),
  totalRatings: z.number().min(0),
  averageRating: z.number().min(0).max(5),
  distribution: z.object({
    1: z.number().min(0),
    2: z.number().min(0),
    3: z.number().min(0),
    4: z.number().min(0),
    5: z.number().min(0)
  }),
  categoryAverages: z.record(z.object({
    average: z.number().min(0).max(5),
    count: z.number().min(0)
  })),
  trend: z.array(z.object({
    period: z.string(),
    average: z.number().min(0).max(5),
    count: z.number().min(0)
  })),
  updatedAt: z.date()
});

export const RatingFilterSchema = z.object({
  pluginId: z.string().optional(),
  userId: z.string().optional(),
  rating: z.union([z.number().min(1).max(5), z.tuple([z.number().min(1).max(5), z.number().min(1).max(5)])]).optional(),
  type: z.nativeEnum(RatingType).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }).optional(),
  version: z.string().optional(),
  hasResponse: z.boolean().optional(),
  sortBy: z.enum(['rating', 'date', 'helpful', 'version']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional()
});

export const RatingReportSchema = z.object({
  id: z.string(),
  ratingId: z.string(),
  reporterId: z.string(),
  reason: z.nativeEnum(ReportReason),
  description: z.string(),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  resolution: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const RatingModerationSchema = z.object({
  id: z.string(),
  ratingId: z.string(),
  moderatorId: z.string(),
  action: z.enum(['approve', 'reject', 'flag', 'hide', 'delete']),
  reason: z.string(),
  notes: z.string().optional(),
  createdAt: z.date()
});

export const RatingAnalyticsSchema = z.object({
  pluginId: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  metrics: z.object({
    totalRatings: z.number().min(0),
    averageRating: z.number().min(0).max(5),
    responseRate: z.number().min(0).max(1),
    flagRate: z.number().min(0).max(1),
    deletionRate: z.number().min(0).max(1),
    trending: z.enum(['up', 'down', 'stable']),
    sentiment: z.enum(['positive', 'neutral', 'negative'])
  }),
  breakdown: z.object({
    byRating: z.array(z.object({
      rating: z.number().min(1).max(5),
      count: z.number().min(0),
      percentage: z.number()
    })),
    byType: z.array(z.object({
      type: z.nativeEnum(RatingType),
      average: z.number().min(0).max(5),
      count: z.number().min(0)
    })),
    byVersion: z.array(z.object({
      version: z.string(),
      average: z.number().min(0).max(5),
      count: z.number().min(0)
    })),
    byDate: z.array(z.object({
      date: z.string(),
      count: z.number().min(0),
      average: z.number().min(0).max(5)
    }))
  }),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  generatedAt: z.date()
});

export const RatingExportSchema = z.object({
  id: z.string(),
  format: z.enum(['csv', 'json', 'excel']),
  filters: RatingFilterSchema,
  data: z.array(z.any()),
  generatedAt: z.date(),
  downloadUrl: z.string().url().optional(),
  expiresAt: z.date().optional()
});

export const RatingNotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['new_rating', 'rating_response', 'rating_report', 'rating_moderation']),
  pluginId: z.string(),
  userId: z.string(),
  ratingId: z.string().optional(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.date()
});

// Type exports
export type PluginRatingType = z.infer<typeof PluginRatingSchema>;
export type RatingAggregateType = z.infer<typeof RatingAggregateSchema>;
export type RatingFilterType = z.infer<typeof RatingFilterSchema>;
export type RatingReportType = z.infer<typeof RatingReportSchema>;
export type RatingModerationType = z.infer<typeof RatingModerationSchema>;
export type RatingAnalyticsType = z.infer<typeof RatingAnalyticsSchema>;
export type RatingExportType = z.infer<typeof RatingExportSchema>;
export type RatingNotificationType = z.infer<typeof RatingNotificationSchema>;

// Plugin Rating Service
export class PluginRatingService {
  private ratings: Map<string, PluginRating> = new Map();
  private aggregates: Map<string, RatingAggregate> = new Map();
  private reports: Map<string, RatingReport> = new Map();
  private moderations: Map<string, RatingModeration> = new Map();
  private notifications: Map<string, RatingNotification> = new Map();
  private userVotes: Map<string, Set<string>> = new Map(); // userId -> ratingIds

  constructor() {
    this.initializeDefaultAggregates();
    this.startPeriodicTasks();
  }

  private initializeDefaultAggregates(): void {
    // Initialize default rating aggregates for plugins
    // This would typically be loaded from database
  }

  private startPeriodicTasks(): void {
    // Start background tasks for rating management
    this.startAggregationTask();
    this.startAnalyticsTask();
    this.startCleanupTask();
  }

  async createRating(
    pluginId: string,
    userId: string,
    ratingData: {
      type: RatingType;
      rating: number;
      title?: string;
      comment?: string;
      version?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<PluginRating> {
    const ratingId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rating: PluginRating = {
      id: ratingId,
      pluginId,
      userId,
      type: ratingData.type,
      rating: ratingData.rating,
      title: ratingData.title,
      comment: ratingData.comment,
      version: ratingData.version,
      status: ReviewStatus.PENDING,
      helpful: 0,
      unhelpful: 0,
      tags: ratingData.tags || [],
      metadata: ratingData.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate rating
    PluginRatingSchema.parse(rating);

    // Check if user has already rated this plugin
    const existingRating = Array.from(this.ratings.values()).find(r =>
      r.pluginId === pluginId && r.userId === userId && !r.deletedAt
    );

    if (existingRating) {
      throw new Error('User has already rated this plugin');
    }

    // Store rating
    this.ratings.set(ratingId, rating);

    // Update aggregate
    await this.updateAggregate(pluginId);

    // Send notification
    await this.sendNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'new_rating',
      pluginId,
      userId,
      ratingId,
      message: `New ${ratingData.rating}-star rating for plugin ${pluginId}`,
      read: false,
      createdAt: new Date()
    });

    return rating;
  }

  async updateRating(
    ratingId: string,
    userId: string,
    updates: {
      rating?: number;
      title?: string;
      comment?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<PluginRating> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.userId !== userId) {
      throw new Error('User can only update their own ratings');
    }

    if (rating.deletedAt) {
      throw new Error('Cannot update deleted rating');
    }

    // Update rating
    if (updates.rating !== undefined) {
      rating.rating = updates.rating;
    }
    if (updates.title !== undefined) {
      rating.title = updates.title;
    }
    if (updates.comment !== undefined) {
      rating.comment = updates.comment;
    }
    if (updates.tags !== undefined) {
      rating.tags = updates.tags;
    }
    if (updates.metadata !== undefined) {
      rating.metadata = updates.metadata;
    }

    rating.updatedAt = new Date();

    // Validate updated rating
    PluginRatingSchema.parse(rating);

    // Store updated rating
    this.ratings.set(ratingId, rating);

    // Update aggregate
    await this.updateAggregate(rating.pluginId);

    return rating;
  }

  async deleteRating(ratingId: string, userId: string): Promise<void> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.userId !== userId) {
      throw new Error('User can only delete their own ratings');
    }

    rating.deletedAt = new Date();
    rating.updatedAt = new Date();

    this.ratings.set(ratingId, rating);

    // Update aggregate
    await this.updateAggregate(rating.pluginId);
  }

  async getRatings(filter: RatingFilterType = {}): Promise<{ ratings: PluginRating[]; total: number }> {
    let filteredRatings = Array.from(this.ratings.values()).filter(rating => !rating.deletedAt);

    // Apply filters
    if (filter.pluginId) {
      filteredRatings = filteredRatings.filter(r => r.pluginId === filter.pluginId);
    }

    if (filter.userId) {
      filteredRatings = filteredRatings.filter(r => r.userId === filter.userId);
    }

    if (filter.rating) {
      if (Array.isArray(filter.rating)) {
        const [min, max] = filter.rating;
        filteredRatings = filteredRatings.filter(r => r.rating >= min && r.rating <= max);
      } else {
        filteredRatings = filteredRatings.filter(r => r.rating === filter.rating);
      }
    }

    if (filter.type) {
      filteredRatings = filteredRatings.filter(r => r.type === filter.type);
    }

    if (filter.status) {
      filteredRatings = filteredRatings.filter(r => r.status === filter.status);
    }

    if (filter.tags && filter.tags.length > 0) {
      filteredRatings = filteredRatings.filter(r =>
        filter.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (filter.dateRange) {
      filteredRatings = filteredRatings.filter(r =>
        r.createdAt >= filter.dateRange!.start && r.createdAt <= filter.dateRange!.end
      );
    }

    if (filter.version) {
      filteredRatings = filteredRatings.filter(r => r.version === filter.version);
    }

    if (filter.hasResponse !== undefined) {
      filteredRatings = filteredRatings.filter(r =>
        filter.hasResponse ? !!r.response : !r.response
      );
    }

    // Sort results
    const sortBy = filter.sortBy || 'date';
    const sortOrder = filter.sortOrder || 'desc';

    filteredRatings.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'helpful':
          comparison = a.helpful - b.helpful;
          break;
        case 'version':
          comparison = (a.version || '').localeCompare(b.version || '');
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const total = filteredRatings.length;
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const paginatedRatings = filteredRatings.slice(offset, offset + limit);

    return { ratings: paginatedRatings, total };
  }

  async getRating(ratingId: string): Promise<PluginRating | null> {
    const rating = this.ratings.get(ratingId);
    return rating && !rating.deletedAt ? rating : null;
  }

  async getAggregate(pluginId: string): Promise<RatingAggregate | null> {
    return this.aggregates.get(pluginId) || null;
  }

  async markHelpful(ratingId: string, userId: string, helpful: boolean): Promise<PluginRating> {
    const rating = this.ratings.get(ratingId);
    if (!rating || rating.deletedAt) {
      throw new Error('Rating not found');
    }

    // Check if user has already voted
    const userVoteKey = `${userId}:${ratingId}`;
    const hasVoted = this.userVotes.get(userId)?.has(ratingId) || false;

    if (hasVoted) {
      throw new Error('User has already voted on this rating');
    }

    // Update vote counts
    if (helpful) {
      rating.helpful++;
    } else {
      rating.unhelpful++;
    }

    // Record user vote
    if (!this.userVotes.has(userId)) {
      this.userVotes.set(userId, new Set());
    }
    this.userVotes.get(userId)!.add(ratingId);

    // Update user's vote preference
    rating.userVote = helpful ? 'helpful' : 'unhelpful';
    rating.updatedAt = new Date();

    this.ratings.set(ratingId, rating);

    return rating;
  }

  async respondToRating(
    ratingId: string,
    authorId: string,
    authorName: string,
    response: string
  ): Promise<PluginRating> {
    const rating = this.ratings.get(ratingId);
    if (!rating || rating.deletedAt) {
      throw new Error('Rating not found');
    }

    rating.response = {
      authorId,
      authorName,
      content: response,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    rating.updatedAt = new Date();

    this.ratings.set(ratingId, rating);

    // Send notification
    await this.sendNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rating_response',
      pluginId: rating.pluginId,
      userId: rating.userId,
      ratingId,
      message: `Response to your ${rating.rating}-star rating`,
      read: false,
      createdAt: new Date()
    });

    return rating;
  }

  async reportRating(
    ratingId: string,
    reporterId: string,
    reason: ReportReason,
    description: string
  ): Promise<RatingReport> {
    const rating = this.ratings.get(ratingId);
    if (!rating || rating.deletedAt) {
      throw new Error('Rating not found');
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: RatingReport = {
      id: reportId,
      ratingId,
      reporterId,
      reason,
      description,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reports.set(reportId, report);

    // Update rating status
    rating.status = ReviewStatus.FLAGGED;
    rating.updatedAt = new Date();
    this.ratings.set(ratingId, rating);

    // Send notification
    await this.sendNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rating_report',
      pluginId: rating.pluginId,
      userId: reporterId,
      ratingId,
      message: `Rating reported for ${reason}`,
      read: false,
      createdAt: new Date()
    });

    return report;
  }

  async moderateRating(
    ratingId: string,
    moderatorId: string,
    action: RatingModeration['action'],
    reason: string,
    notes?: string
  ): Promise<RatingModeration> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    const moderationId = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const moderation: RatingModeration = {
      id: moderationId,
      ratingId,
      moderatorId,
      action,
      reason,
      notes,
      createdAt: new Date()
    };

    this.moderations.set(moderationId, moderation);

    // Update rating status based on action
    switch (action) {
      case 'approve':
        rating.status = ReviewStatus.APPROVED;
        break;
      case 'reject':
        rating.status = ReviewStatus.REJECTED;
        break;
      case 'flag':
        rating.status = ReviewStatus.FLAGGED;
        break;
      case 'hide':
        rating.status = ReviewStatus.HIDDEN;
        break;
      case 'delete':
        rating.deletedAt = new Date();
        rating.status = ReviewStatus.REJECTED;
        break;
    }

    rating.updatedAt = new Date();
    this.ratings.set(ratingId, rating);

    // Update aggregate if rating was deleted
    if (action === 'delete') {
      await this.updateAggregate(rating.pluginId);
    }

    // Send notification
    await this.sendNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rating_moderation',
      pluginId: rating.pluginId,
      userId: rating.userId,
      ratingId,
      message: `Your rating has been ${action}d by moderator`,
      read: false,
      createdAt: new Date()
    });

    return moderation;
  }

  async getAnalytics(
    pluginId: string,
    period: { start: Date; end: Date }
  ): Promise<RatingAnalytics> {
    const ratings = Array.from(this.ratings.values()).filter(r =>
      r.pluginId === pluginId &&
      !r.deletedAt &&
      r.createdAt >= period.start &&
      r.createdAt <= period.end
    );

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 ?
      ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;

    const ratingsWithResponse = ratings.filter(r => !!r.response);
    const responseRate = totalRatings > 0 ? ratingsWithResponse.length / totalRatings : 0;

    const flaggedRatings = ratings.filter(r => r.status === ReviewStatus.FLAGGED);
    const flagRate = totalRatings > 0 ? flaggedRatings.length / totalRatings : 0;

    const deletedRatings = Array.from(this.ratings.values()).filter(r =>
      r.pluginId === pluginId &&
      r.deletedAt &&
      r.deletedAt >= period.start &&
      r.deletedAt <= period.end
    );
    const deletionRate = (totalRatings + deletedRatings.length) > 0 ?
      deletedRatings.length / (totalRatings + deletedRatings.length) : 0;

    // Calculate trend
    const trend = this.calculateTrend(ratings);

    // Calculate sentiment
    const sentiment = averageRating >= 4 ? 'positive' : averageRating >= 3 ? 'neutral' : 'negative';

    // Generate breakdowns
    const breakdown = {
      byRating: this.calculateRatingBreakdown(ratings),
      byType: this.calculateTypeBreakdown(ratings),
      byVersion: this.calculateVersionBreakdown(ratings),
      byDate: this.calculateDateBreakdown(ratings, period)
    };

    // Generate insights and recommendations
    const insights = await this.generateInsights(pluginId, ratings);
    const recommendations = await this.generateRecommendations(pluginId, ratings);

    const analytics: RatingAnalytics = {
      pluginId,
      period,
      metrics: {
        totalRatings,
        averageRating,
        responseRate,
        flagRate,
        deletionRate,
        trending: trend,
        sentiment
      },
      breakdown,
      insights,
      recommendations,
      generatedAt: new Date()
    };

    return analytics;
  }

  async exportRatings(filter: RatingFilterType, format: 'csv' | 'json' | 'excel'): Promise<RatingExport> {
    const { ratings } = await this.getRatings(filter);

    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    let data: any[];
    let downloadUrl: string | undefined;

    switch (format) {
      case 'json':
        data = ratings;
        break;
      case 'csv':
        data = this.convertToCSV(ratings);
        break;
      case 'excel':
        data = this.convertToExcel(ratings);
        break;
    }

    const exportData: RatingExport = {
      id: exportId,
      format,
      filters: filter,
      data,
      generatedAt,
      downloadUrl,
      expiresAt
    };

    return exportData;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<RatingNotification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && (!unreadOnly || !n.read))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);
  }

  private async updateAggregate(pluginId: string): Promise<void> {
    const ratings = Array.from(this.ratings.values()).filter(r =>
      r.pluginId === pluginId && !r.deletedAt && r.status === ReviewStatus.APPROVED
    );

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 ?
      ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    // Calculate category averages
    const categoryAverages: RatingAggregate['categoryAverages'] = {} as any;
    const categoryTypes = Object.values(RatingType);

    for (const type of categoryTypes) {
      const typeRatings = ratings.filter(r => r.type === type);
      const typeAverage = typeRatings.length > 0 ?
        typeRatings.reduce((sum, r) => sum + r.rating, 0) / typeRatings.length : 0;

      categoryAverages[type] = {
        average: typeAverage,
        count: typeRatings.length
      };
    }

    // Calculate trend
    const trend = this.calculateMonthlyTrend(ratings);

    const aggregate: RatingAggregate = {
      pluginId,
      totalRatings,
      averageRating,
      distribution,
      categoryAverages,
      trend,
      updatedAt: new Date()
    };

    this.aggregates.set(pluginId, aggregate);
  }

  private calculateTrend(ratings: PluginRating[]): 'up' | 'down' | 'stable' {
    if (ratings.length < 2) return 'stable';

    const sortedRatings = ratings.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstHalf = sortedRatings.slice(0, Math.floor(sortedRatings.length / 2));
    const secondHalf = sortedRatings.slice(Math.floor(sortedRatings.length / 2));

    const firstAvg = firstHalf.length > 0 ?
      firstHalf.reduce((sum, r) => sum + r.rating, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ?
      secondHalf.reduce((sum, r) => sum + r.rating, 0) / secondHalf.length : 0;

    const diff = secondAvg - firstAvg;
    if (diff > 0.5) return 'up';
    if (diff < -0.5) return 'down';
    return 'stable';
  }

  private calculateMonthlyTrend(ratings: PluginRating[]): RatingAggregate['trend'] {
    const monthlyData = new Map<string, { sum: number; count: number }>();

    ratings.forEach(rating => {
      const month = rating.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { sum: 0, count: 0 });
      }
      const data = monthlyData.get(month)!;
      data.sum += rating.rating;
      data.count++;
    });

    return Array.from(monthlyData.entries())
      .map(([period, data]) => ({
        period,
        average: data.count > 0 ? data.sum / data.count : 0,
        count: data.count
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculateRatingBreakdown(ratings: PluginRating[]) {
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const total = ratings.length;

    ratings.forEach(r => {
      breakdown[r.rating as keyof typeof breakdown]++;
    });

    return Object.entries(breakdown).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  private calculateTypeBreakdown(ratings: PluginRating[]) {
    const typeMap = new Map<RatingType, { sum: number; count: number }>();

    ratings.forEach(r => {
      if (!typeMap.has(r.type)) {
        typeMap.set(r.type, { sum: 0, count: 0 });
      }
      const data = typeMap.get(r.type)!;
      data.sum += r.rating;
      data.count++;
    });

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      average: data.count > 0 ? data.sum / data.count : 0,
      count: data.count
    }));
  }

  private calculateVersionBreakdown(ratings: PluginRating[]) {
    const versionMap = new Map<string, { sum: number; count: number }>();

    ratings.forEach(r => {
      const version = r.version || 'unknown';
      if (!versionMap.has(version)) {
        versionMap.set(version, { sum: 0, count: 0 });
      }
      const data = versionMap.get(version)!;
      data.sum += r.rating;
      data.count++;
    });

    return Array.from(versionMap.entries()).map(([version, data]) => ({
      version,
      average: data.count > 0 ? data.sum / data.count : 0,
      count: data.count
    }));
  }

  private calculateDateBreakdown(ratings: PluginRating[], period: { start: Date; end: Date }) {
    const dateMap = new Map<string, { sum: number; count: number }>();

    ratings.forEach(r => {
      const date = r.createdAt.toISOString().substring(0, 10); // YYYY-MM-DD
      if (!dateMap.has(date)) {
        dateMap.set(date, { sum: 0, count: 0 });
      }
      const data = dateMap.get(date)!;
      data.sum += r.rating;
      data.count++;
    });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      average: data.count > 0 ? data.sum / data.count : 0
    }));
  }

  private async generateInsights(pluginId: string, ratings: PluginRating[]): Promise<string[]> {
    const insights: string[] = [];

    if (ratings.length === 0) {
      insights.push('No ratings available for analysis');
      return insights;
    }

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const highRatings = ratings.filter(r => r.rating >= 4).length;
    const lowRatings = ratings.filter(r => r.rating <= 2).length;

    if (avgRating >= 4.5) {
      insights.push('Excellent user satisfaction with very high ratings');
    } else if (avgRating >= 4.0) {
      insights.push('Good user satisfaction with above-average ratings');
    } else if (avgRating >= 3.0) {
      insights.push('Average user satisfaction with room for improvement');
    } else {
      insights.push('Below average user satisfaction requires attention');
    }

    if (highRatings / ratings.length > 0.8) {
      insights.push('Strong positive sentiment among users');
    } else if (lowRatings / ratings.length > 0.3) {
      insights.push('Significant number of dissatisfied users');
    }

    const recentRatings = ratings.filter(r =>
      r.createdAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    if (recentRatings.length > 0) {
      const recentAvg = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
      if (recentAvg > avgRating) {
        insights.push('Recent ratings show improvement trend');
      } else if (recentAvg < avgRating) {
        insights.push('Recent ratings show declining satisfaction');
      }
    }

    return insights;
  }

  private async generateRecommendations(pluginId: string, ratings: PluginRating[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (ratings.length === 0) {
      recommendations.push('Encourage users to leave ratings to gather feedback');
      return recommendations;
    }

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const responseRate = ratings.filter(r => !!r.response).length / ratings.length;

    if (avgRating < 3.5) {
      recommendations.push('Investigate common issues mentioned in low ratings');
      recommendations.push('Consider reaching out to dissatisfied users for feedback');
    }

    if (responseRate < 0.5) {
      recommendations.push('Improve response rate to user ratings');
      recommendations.push('Set up automated responses for common feedback');
    }

    const lowFunctionality = ratings.filter(r => r.type === RatingType.FUNCTIONALITY && r.rating <= 2);
    if (lowFunctionality.length > ratings.length * 0.2) {
      recommendations.push('Focus on improving core functionality based on user feedback');
    }

    const lowPerformance = ratings.filter(r => r.type === RatingType.PERFORMANCE && r.rating <= 2);
    if (lowPerformance.length > ratings.length * 0.2) {
      recommendations.push('Optimize performance and address speed issues');
    }

    recommendations.push('Monitor rating trends regularly for early issue detection');
    recommendations.push('Use feedback to prioritize feature development');

    return recommendations;
  }

  private convertToCSV(ratings: PluginRating[]): any[] {
    return ratings.map(rating => ({
      id: rating.id,
      pluginId: rating.pluginId,
      userId: rating.userId,
      type: rating.type,
      rating: rating.rating,
      title: rating.title || '',
      comment: rating.comment || '',
      version: rating.version || '',
      status: rating.status,
      helpful: rating.helpful,
      unhelpful: rating.unhelpful,
      hasResponse: !!rating.response,
      tags: rating.tags.join(','),
      createdAt: rating.createdAt.toISOString(),
      updatedAt: rating.updatedAt.toISOString()
    }));
  }

  private convertToExcel(ratings: PluginRating[]): any[] {
    // For Excel export, return structured data that can be processed by Excel libraries
    return {
      worksheet: 'Ratings',
      data: this.convertToCSV(ratings),
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Plugin ID', key: 'pluginId' },
        { header: 'User ID', key: 'userId' },
        { header: 'Type', key: 'type' },
        { header: 'Rating', key: 'rating' },
        { header: 'Title', key: 'title' },
        { header: 'Comment', key: 'comment' },
        { header: 'Version', key: 'version' },
        { header: 'Status', key: 'status' },
        { header: 'Helpful', key: 'helpful' },
        { header: 'Unhelpful', key: 'unhelpful' },
        { header: 'Has Response', key: 'hasResponse' },
        { header: 'Tags', key: 'tags' },
        { header: 'Created At', key: 'createdAt' },
        { header: 'Updated At', key: 'updatedAt' }
      ]
    };
  }

  private async sendNotification(notification: RatingNotification): Promise<void> {
    this.notifications.set(notification.id, notification);
  }

  private startAggregationTask(): void {
    // Update rating aggregates periodically
    setInterval(async () => {
      const uniquePlugins = new Set(Array.from(this.ratings.values()).map(r => r.pluginId));
      for (const pluginId of uniquePlugins) {
        await this.updateAggregate(pluginId);
      }
    }, 60 * 60 * 1000); // Hourly
  }

  private startAnalyticsTask(): void {
    // Generate analytics periodically
    setInterval(async () => {
      // Generate analytics for all plugins
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private startCleanupTask(): void {
    // Clean up old notifications and expired exports
    setInterval(async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

      // Clean up old notifications
      for (const [id, notification] of this.notifications.entries()) {
        if (notification.createdAt < cutoffDate && notification.read) {
          this.notifications.delete(id);
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }
}