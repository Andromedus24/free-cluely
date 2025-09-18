/**
 * API Service for Backend Integration
 * Handles all communication with the Atlas backend services
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { security } from '@/lib/security';
import { retryManager } from '@/lib/retry';
import { validate, sanitize } from '@/lib/validation';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  integrations: IntegrationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  desktop: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  data_collection: boolean;
  analytics: boolean;
}

export interface IntegrationSettings {
  google: boolean;
  github: boolean;
  slack: boolean;
  discord: boolean;
}

export interface App {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  url: string;
  is_premium: boolean;
  rating: number;
  downloads: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface UserApp {
  id: string;
  user_id: string;
  app_id: string;
  installed_at: string;
  settings: Record<string, any>;
  is_active: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  app_id: string;
  score: number;
  reason: string;
  created_at: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    auth: boolean;
    storage: boolean;
    realtime: boolean;
    functions: boolean;
  };
  metrics: {
    uptime: number;
    response_time: number;
    error_rate: number;
  };
}

class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          ...this.headers,
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (error) {
      logger.error('Failed to get auth headers', error);
    }
    return this.headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    // Sanitize input
    if (options.body) {
      options.body = JSON.stringify(options.body);
    }

    const response = await retryManager.execute(
      async () => {
        const res = await fetch(url, {
          ...options,
          headers,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      },
      {
        maxAttempts: 3,
        retryCondition: (error) => {
          return error.status >= 500 || error.code === 'ECONNABORTED';
        },
      }
    );

    return {
      data: response.data,
      success: true,
      timestamp: new Date().toISOString(),
      ...response,
    };
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<HealthCheck>> {
    return this.request<HealthCheck>('/health');
  }

  // User Management
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/me');
  }

  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    // Validate and sanitize user profile data
    const sanitizedData = {
      full_name: data.full_name ? sanitize.input(data.full_name, { maxLength: 50 }) : undefined,
      email: data.email ? sanitize.input(data.email, { maxLength: 100 }) : undefined,
      avatar_url: data.avatar_url ? sanitize.input(data.avatar_url, { maxLength: 500 }) : undefined,
    };

    return this.request<User>('/users/me', {
      method: 'PUT',
      body: sanitizedData,
    });
  }

  async updateUserSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    // Validate settings data
    const sanitizedSettings = {
      theme: settings.theme,
      language: settings.language ? sanitize.input(settings.language, { maxLength: 5 }) : undefined,
      timezone: settings.timezone ? sanitize.input(settings.timezone, { maxLength: 50 }) : undefined,
      notifications: settings.notifications,
      privacy: settings.privacy,
      integrations: settings.integrations,
    };

    return this.request<UserSettings>('/users/me/settings', {
      method: 'PUT',
      body: sanitizedSettings,
    });
  }

  // Apps Management
  async getApps(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PaginatedResponse<App>>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', sanitize.input(params.category, { maxLength: 50 }));
    if (params?.search) searchParams.append('search', sanitize.input(params.search, { maxLength: 100 }));
    if (params?.limit) searchParams.append('limit', Math.max(1, Math.min(100, params.limit)).toString());
    if (params?.offset) searchParams.append('offset', Math.max(0, params.offset).toString());

    const endpoint = `/apps${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<App>>(endpoint);
  }

  async getApp(id: string): Promise<ApiResponse<App>> {
    return this.request<App>(`/apps/${id}`);
  }

  async installApp(appId: string): Promise<ApiResponse<UserApp>> {
    return this.request<UserApp>('/users/me/apps', {
      method: 'POST',
      body: { app_id: appId },
    });
  }

  async uninstallApp(userAppId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/me/apps/${userAppId}`, {
      method: 'DELETE',
    });
  }

  async getUserApps(): Promise<ApiResponse<UserApp[]>> {
    return this.request<UserApp[]>('/users/me/apps');
  }

  // Activity Logging
  async logActivity(action: string, resourceType: string, resourceId: string, metadata?: Record<string, any>): Promise<ApiResponse<ActivityLog>> {
    return this.request<ActivityLog>('/users/me/activity', {
      method: 'POST',
      body: {
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
      },
    });
  }

  async getActivityLogs(params?: {
    limit?: number;
    offset?: number;
    action?: string;
  }): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.action) searchParams.append('action', params.action);

    const endpoint = `/users/me/activity${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<ActivityLog>>(endpoint);
  }

  // Recommendations
  async getRecommendations(): Promise<ApiResponse<Recommendation[]>> {
    return this.request<Recommendation[]>('/users/me/recommendations');
  }

  async dismissRecommendation(recommendationId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/me/recommendations/${recommendationId}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getUserAnalytics(): Promise<ApiResponse<{
    total_apps: number;
    total_activity: number;
    activity_by_day: Array<{ date: string; count: number }>;
    popular_categories: Array<{ category: string; count: number }>;
  }>> {
    return this.request('/users/me/analytics');
  }

  // File Upload
  async uploadFile(file: File, path: string): Promise<ApiResponse<{ url: string; path: string }>> {
    // Validate file
    const validationResult = ValidationHelper.validateFile(file, {
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt']
    });

    if (!validationResult.valid) {
      throw new Error(validationResult.error);
    }

    // Sanitize path
    const sanitizedPath = sanitize.path(path);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', sanitizedPath);

    const headers = await this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set content type for form data

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      data,
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Voice Assistant Integration
  async processVoiceCommand(transcript: string): Promise<ApiResponse<{
    response: string;
    intent: string;
    action?: {
      type: string;
      parameters: Record<string, any>;
    };
  }>> {
    return this.request('/voice/process', {
      method: 'POST',
      body: { transcript },
    });
  }

  // 3D Modeling Operations
  async save3DScene(scene: any): Promise<ApiResponse<{ id: string; url: string }>> {
    return this.request('/3d/scenes', {
      method: 'POST',
      body: scene,
    });
  }

  async load3DScene(sceneId: string): Promise<ApiResponse<any>> {
    return this.request(`/3d/scenes/${sceneId}`);
  }

  async getUser3DScenes(): Promise<ApiResponse<Array<{ id: string; name: string; created_at: string }>>> {
    return this.request('/3d/scenes');
  }

  // Knowledge Management
  async createKnowledgeItem(data: {
    title: string;
    content: string;
    type: 'note' | 'article' | 'video' | 'document';
    tags?: string[];
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/knowledge/items', {
      method: 'POST',
      body: data,
    });
  }

  async getKnowledgeItems(params?: {
    type?: string;
    tag?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.search) searchParams.append('search', params.search);

    const endpoint = `/knowledge/items${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  // Messaging
  async getChannels(): Promise<ApiResponse<any[]>> {
    return this.request('/messaging/channels');
  }

  async getMessages(channelId: string, params?: {
    limit?: number;
    before?: string;
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.before) searchParams.append('before', params.before);

    const endpoint = `/messaging/channels/${channelId}/messages${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async sendMessage(channelId: string, content: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/messaging/channels/${channelId}/messages`, {
      method: 'POST',
      body: { content },
    });
  }

  // Real-time subscriptions
  subscribeToUserActivity(callback: (activity: ActivityLog) => void) {
    return supabase
      .channel('user-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `user_id=eq.${supabase.auth.getUser().then(user => user.id)}`,
        },
        (payload) => {
          callback(payload.new as ActivityLog);
        }
      )
      .subscribe();
  }

  subscribeToNotifications(callback: (notification: any) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(user => user.id)}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Hook for API operations
export function useApi() {
  return {
    api: apiService,
    // Common operations with loading states
    useQuery: async <T>(endpoint: string, options?: RequestInit) => {
      try {
        return await apiService.request<T>(endpoint, options);
      } catch (error) {
        logger.error('API query failed', error);
        throw error;
      }
    },
    useMutation: async <T>(endpoint: string, options: RequestInit = {}) => {
      try {
        return await apiService.request<T>(endpoint, options);
      } catch (error) {
        logger.error('API mutation failed', error);
        throw error;
      }
    },
  };
}

export default ApiService;