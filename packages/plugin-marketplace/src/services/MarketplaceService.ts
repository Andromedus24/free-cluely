import axios from 'axios';
import { z } from 'zod';
import * as CryptoJS from 'crypto-js';
import {
  MarketplacePlugin,
  MarketplaceQuery,
  MarketplaceResponse,
  InstallationRequest,
  InstallationStatus,
  PluginReview,
  MarketplaceStats,
  SecurityScan,
  MarketplaceConfig,
  User,
  Transaction
} from '../types/MarketplaceTypes';
import {
  Marketplace,
  PluginInstaller,
  SecurityScanner,
  PaymentHandler,
  MarketplaceAnalytics,
  CacheManager,
  PluginValidator,
  NotificationSystem,
  MarketplaceApiClient,
  PluginStore
} from '../interfaces/MarketplaceInterfaces';
import { MarketplaceError, InstallationError, SecurityError, PaymentError } from '../types/MarketplaceTypes';

export class MarketplaceServiceImpl implements Marketplace {
  private config: MarketplaceConfig;
  private apiClient: MarketplaceApiClient;
  private store: PluginStore;
  private cache: CacheManager;
  private installer: PluginInstaller;
  private securityScanner: SecurityScanner;
  private paymentHandler: PaymentHandler;
  private analytics: MarketplaceAnalytics;
  private validator: PluginValidator;
  private notifications: NotificationSystem;

  constructor(
    config: MarketplaceConfig,
    apiClient: MarketplaceApiClient,
    store: PluginStore,
    cache: CacheManager,
    installer: PluginInstaller,
    securityScanner: SecurityScanner,
    paymentHandler: PaymentHandler,
    analytics: MarketplaceAnalytics,
    validator: PluginValidator,
    notifications: NotificationSystem
  ) {
    this.config = config;
    this.apiClient = apiClient;
    this.store = store;
    this.cache = cache;
    this.installer = installer;
    this.securityScanner = securityScanner;
    this.paymentHandler = paymentHandler;
    this.analytics = analytics;
    this.validator = validator;
    this.notifications = notifications;
  }

  // Plugin Discovery
  async searchPlugins(query: MarketplaceQuery): Promise<MarketplaceResponse> {
    const cacheKey = `search:${JSON.stringify(query)}`;
    const cached = await this.cache.getPlugins(query);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.apiClient.get<MarketplaceResponse>('/plugins/search', query);
      await this.cache.setPlugins(query, response);
      return response;
    } catch (error) {
      throw new MarketplaceError('Failed to search plugins', 'SEARCH_ERROR', error as Error);
    }
  }

  async getPlugin(id: string): Promise<MarketplacePlugin> {
    const cached = await this.cache.getPlugin(id);
    if (cached) {
      return cached;
    }

    try {
      const plugin = await this.apiClient.get<MarketplacePlugin>(`/plugins/${id}`);
      await this.cache.setPlugin(plugin);
      return plugin;
    } catch (error) {
      throw new MarketplaceError(`Failed to get plugin ${id}`, 'GET_PLUGIN_ERROR', error as Error);
    }
  }

  async getFeaturedPlugins(): Promise<MarketplacePlugin[]> {
    try {
      return await this.apiClient.get<MarketplacePlugin[]>('/plugins/featured');
    } catch (error) {
      throw new MarketplaceError('Failed to get featured plugins', 'GET_FEATURED_ERROR', error as Error);
    }
  }

  async getTrendingPlugins(): Promise<MarketplacePlugin[]> {
    try {
      return await this.apiClient.get<MarketplacePlugin[]>('/plugins/trending');
    } catch (error) {
      throw new MarketplaceError('Failed to get trending plugins', 'GET_TRENDING_ERROR', error as Error);
    }
  }

  async getPluginsByCategory(category: string): Promise<MarketplacePlugin[]> {
    try {
      return await this.apiClient.get<MarketplacePlugin[]>(`/plugins/category/${category}`);
    } catch (error) {
      throw new MarketplaceError(`Failed to get plugins in category ${category}`, 'GET_CATEGORY_ERROR', error as Error);
    }
  }

  async getPluginsByAuthor(author: string): Promise<MarketplacePlugin[]> {
    try {
      return await this.apiClient.get<MarketplacePlugin[]>(`/plugins/author/${author}`);
    } catch (error) {
      throw new MarketplaceError(`Failed to get plugins by author ${author}`, 'GET_AUTHOR_ERROR', error as Error);
    }
  }

  // Plugin Management
  async installPlugin(request: InstallationRequest): Promise<InstallationStatus> {
    try {
      // Get plugin details
      const plugin = await this.getPlugin(request.pluginId);

      // Validate security
      const securityValidation = await this.validator.validateSecurity(
        request.source === 'local' ? request.localPath! : JSON.stringify(plugin)
      );

      if (!securityValidation.valid) {
        throw new SecurityError(`Plugin failed security validation: ${securityValidation.vulnerabilities.map(v => v.description).join(', ')}`, request.pluginId);
      }

      // Install plugin
      const installation = await this.installer.install(request);

      // Track analytics
      await this.analytics.trackEvent({
        type: 'install',
        pluginId: request.pluginId,
        metadata: { version: request.version, source: request.source }
      });

      // Send notification
      await this.notifications.sendNotification({
        type: 'success',
        title: 'Plugin Installed',
        message: `${plugin.name} has been successfully installed`,
        pluginId: request.pluginId
      });

      return installation;
    } catch (error) {
      if (error instanceof SecurityError) {
        await this.notifications.sendNotification({
          type: 'error',
          title: 'Security Error',
          message: `Failed to install plugin due to security concerns`,
          pluginId: request.pluginId
        });
        throw error;
      }

      await this.notifications.sendNotification({
        type: 'error',
        title: 'Installation Failed',
        message: `Failed to install plugin: ${(error as Error).message}`,
        pluginId: request.pluginId
      });

      throw new InstallationError(`Failed to install plugin ${request.pluginId}`, request.pluginId, error as Error);
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      await this.installer.uninstall(pluginId);

      // Track analytics
      await this.analytics.trackEvent({
        type: 'uninstall',
        pluginId
      });

      // Send notification
      await this.notifications.sendNotification({
        type: 'success',
        title: 'Plugin Uninstalled',
        message: 'Plugin has been successfully uninstalled',
        pluginId
      });
    } catch (error) {
      throw new InstallationError(`Failed to uninstall plugin ${pluginId}`, pluginId, error as Error);
    }
  }

  async updatePlugin(pluginId: string, version?: string): Promise<InstallationStatus> {
    try {
      const installation = await this.installer.update(pluginId, version);

      // Track analytics
      await this.analytics.trackEvent({
        type: 'update',
        pluginId,
        metadata: { version }
      });

      // Send notification
      await this.notifications.sendNotification({
        type: 'success',
        title: 'Plugin Updated',
        message: 'Plugin has been successfully updated',
        pluginId
      });

      return installation;
    } catch (error) {
      throw new InstallationError(`Failed to update plugin ${pluginId}`, pluginId, error as Error);
    }
  }

  async getInstallationStatus(pluginId: string): Promise<InstallationStatus> {
    try {
      return await this.installer.getInstallationStatus(pluginId);
    } catch (error) {
      throw new InstallationError(`Failed to get installation status for plugin ${pluginId}`, pluginId, error as Error);
    }
  }

  async getInstalledPlugins(): Promise<MarketplacePlugin[]> {
    try {
      const installations = await this.installer.getInstalledPlugins();
      const pluginIds = installations.map(inst => inst.id);

      // Get plugin details for installed plugins
      const plugins = await Promise.all(
        pluginIds.map(id => this.getPlugin(id).catch(() => null))
      );

      return plugins.filter(plugin => plugin !== null) as MarketplacePlugin[];
    } catch (error) {
      throw new MarketplaceError('Failed to get installed plugins', 'GET_INSTALLED_ERROR', error as Error);
    }
  }

  // Reviews and Ratings
  async getPluginReviews(pluginId: string): Promise<PluginReview[]> {
    try {
      return await this.apiClient.get<PluginReview[]>(`/plugins/${pluginId}/reviews`);
    } catch (error) {
      throw new MarketplaceError(`Failed to get reviews for plugin ${pluginId}`, 'GET_REVIEWS_ERROR', error as Error);
    }
  }

  async addReview(review: Omit<PluginReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<PluginReview> {
    try {
      const newReview = await this.apiClient.post<PluginReview>(`/plugins/${review.pluginId}/reviews`, review);

      // Track analytics
      await this.analytics.trackEvent({
        type: 'review',
        pluginId: review.pluginId,
        metadata: { rating: review.rating }
      });

      return newReview;
    } catch (error) {
      throw new MarketplaceError('Failed to add review', 'ADD_REVIEW_ERROR', error as Error);
    }
  }

  async updateReview(id: string, updates: Partial<PluginReview>): Promise<PluginReview> {
    try {
      return await this.apiClient.put<PluginReview>(`/reviews/${id}`, updates);
    } catch (error) {
      throw new MarketplaceError(`Failed to update review ${id}`, 'UPDATE_REVIEW_ERROR', error as Error);
    }
  }

  async deleteReview(id: string): Promise<void> {
    try {
      await this.apiClient.delete(`/reviews/${id}`);
    } catch (error) {
      throw new MarketplaceError(`Failed to delete review ${id}`, 'DELETE_REVIEW_ERROR', error as Error);
    }
  }

  async markReviewHelpful(id: string): Promise<void> {
    try {
      await this.apiClient.post(`/reviews/${id}/helpful`, {});
    } catch (error) {
      throw new MarketplaceError(`Failed to mark review ${id} as helpful`, 'MARK_REVIEW_HELPFUL_ERROR', error as Error);
    }
  }

  // Security and Verification
  async scanPlugin(pluginId: string): Promise<SecurityScan> {
    try {
      const plugin = await this.getPlugin(pluginId);
      return await this.securityScanner.scanPlugin(pluginId, JSON.stringify(plugin));
    } catch (error) {
      throw new SecurityError(`Failed to scan plugin ${pluginId}`, pluginId);
    }
  }

  async getSecurityScan(pluginId: string): Promise<SecurityScan> {
    try {
      return await this.apiClient.get<SecurityScan>(`/plugins/${pluginId}/security`);
    } catch (error) {
      throw new SecurityError(`Failed to get security scan for plugin ${pluginId}`, pluginId);
    }
  }

  async verifyPlugin(pluginId: string): Promise<boolean> {
    try {
      const result = await this.apiClient.post<{ verified: boolean }>(`/plugins/${pluginId}/verify`, {});
      return result.verified;
    } catch (error) {
      throw new SecurityError(`Failed to verify plugin ${pluginId}`, pluginId);
    }
  }

  // Statistics
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    try {
      return await this.apiClient.get<MarketplaceStats>('/marketplace/stats');
    } catch (error) {
      throw new MarketplaceError('Failed to get marketplace stats', 'GET_STATS_ERROR', error as Error);
    }
  }

  async getPluginStats(pluginId: string): Promise<{
    downloads: number;
    reviews: number;
    rating: number;
    revenue?: number;
  }> {
    try {
      return await this.apiClient.get(`/plugins/${pluginId}/stats`);
    } catch (error) {
      throw new MarketplaceError(`Failed to get stats for plugin ${pluginId}`, 'GET_PLUGIN_STATS_ERROR', error as Error);
    }
  }

  // User Management
  async getUserProfile(): Promise<User> {
    try {
      return await this.apiClient.authGet<User>('/user/profile');
    } catch (error) {
      throw new MarketplaceError('Failed to get user profile', 'GET_USER_ERROR', error as Error);
    }
  }

  async getUserPurchases(): Promise<Transaction[]> {
    try {
      return await this.apiClient.authGet<Transaction[]>('/user/purchases');
    } catch (error) {
      throw new MarketplaceError('Failed to get user purchases', 'GET_PURCHASES_ERROR', error as Error);
    }
  }

  async getUserInstalledPlugins(): Promise<MarketplacePlugin[]> {
    try {
      const installations = await this.installer.getInstalledPlugins();
      const pluginIds = installations.map(inst => inst.id);

      // Get plugin details for installed plugins
      const plugins = await Promise.all(
        pluginIds.map(id => this.getPlugin(id).catch(() => null))
      );

      return plugins.filter(plugin => plugin !== null) as MarketplacePlugin[];
    } catch (error) {
      throw new MarketplaceError('Failed to get user installed plugins', 'GET_USER_PLUGINS_ERROR', error as Error);
    }
  }

  async purchasePlugin(pluginId: string, paymentMethod: 'stripe' | 'paypal'): Promise<Transaction> {
    try {
      const plugin = await this.getPlugin(pluginId);

      if (plugin.price.amount === 0) {
        throw new MarketplaceError('Plugin is free', 'FREE_PLUGIN_ERROR');
      }

      // Create payment intent
      const paymentIntent = await this.paymentHandler.createPaymentIntent(
        pluginId,
        plugin.price.amount,
        plugin.price.currency,
        paymentMethod
      );

      // In a real implementation, this would involve user interaction
      // For now, we'll simulate the payment completion
      const transaction = await this.paymentHandler.confirmPayment(paymentIntent.transactionId, {
        paymentMethodId: 'simulated'
      });

      // Track analytics
      await this.analytics.trackEvent({
        type: 'purchase',
        pluginId,
        metadata: { amount: plugin.price.amount, paymentMethod }
      });

      // Send notification
      await this.notifications.sendNotification({
        type: 'success',
        title: 'Purchase Successful',
        message: `You have successfully purchased ${plugin.name}`,
        pluginId
      });

      return transaction;
    } catch (error) {
      if (error instanceof PaymentError) {
        await this.notifications.sendNotification({
          type: 'error',
          title: 'Payment Failed',
          message: `Failed to complete payment: ${(error as Error).message}`,
          pluginId
        });
        throw error;
      }

      throw new MarketplaceError(`Failed to purchase plugin ${pluginId}`, 'PURCHASE_ERROR', error as Error);
    }
  }

  // Marketplace Operations
  async submitPlugin(plugin: Omit<MarketplacePlugin, 'id' | 'publishedAt' | 'updatedAt'>): Promise<MarketplacePlugin> {
    try {
      // Validate plugin data
      const validation = await this.validator.validateManifest(plugin.manifest);
      if (!validation.valid) {
        throw new MarketplaceError(`Plugin validation failed: ${validation.errors.join(', ')}`, 'VALIDATION_ERROR');
      }

      // Security scan
      const securityScan = await this.securityScanner.scanPlugin('temp', JSON.stringify(plugin));
      if (securityScan.score && securityScan.score < 70) {
        throw new SecurityError('Plugin security score is too low', 'temp');
      }

      // Submit plugin
      const submittedPlugin = await this.apiClient.authPost<MarketplacePlugin>('/plugins', plugin);

      // Send notification
      await this.notifications.sendNotification({
        type: 'success',
        title: 'Plugin Submitted',
        message: 'Your plugin has been submitted for review',
        pluginId: submittedPlugin.id
      });

      return submittedPlugin;
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new MarketplaceError('Failed to submit plugin', 'SUBMIT_ERROR', error as Error);
    }
  }

  async updatePluginListing(pluginId: string, updates: Partial<MarketplacePlugin>): Promise<MarketplacePlugin> {
    try {
      const updatedPlugin = await this.apiClient.authPut<MarketplacePlugin>(`/plugins/${pluginId}`, updates);

      // Invalidate cache
      await this.cache.invalidatePlugin(pluginId);

      return updatedPlugin;
    } catch (error) {
      throw new MarketplaceError(`Failed to update plugin listing ${pluginId}`, 'UPDATE_ERROR', error as Error);
    }
  }

  async deletePluginListing(pluginId: string): Promise<void> {
    try {
      await this.apiClient.authDelete(`/plugins/${pluginId}`);

      // Invalidate cache
      await this.cache.invalidatePlugin(pluginId);
    } catch (error) {
      throw new MarketplaceError(`Failed to delete plugin listing ${pluginId}`, 'DELETE_ERROR', error as Error);
    }
  }
}