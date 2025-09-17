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
  Transaction,
  MonetizationConfig
} from '../types/MarketplaceTypes';

// Marketplace Core Interface
export interface Marketplace {
  // Plugin Discovery
  searchPlugins(query: MarketplaceQuery): Promise<MarketplaceResponse>;
  getPlugin(id: string): Promise<MarketplacePlugin>;
  getFeaturedPlugins(): Promise<MarketplacePlugin[]>;
  getTrendingPlugins(): Promise<MarketplacePlugin[]>;
  getPluginsByCategory(category: string): Promise<MarketplacePlugin[]>;
  getPluginsByAuthor(author: string): Promise<MarketplacePlugin[]>;

  // Plugin Management
  installPlugin(request: InstallationRequest): Promise<InstallationStatus>;
  uninstallPlugin(pluginId: string): Promise<void>;
  updatePlugin(pluginId: string, version?: string): Promise<InstallationStatus>;
  getInstallationStatus(pluginId: string): Promise<InstallationStatus>;
  getInstalledPlugins(): Promise<MarketplacePlugin[]>;

  // Reviews and Ratings
  getPluginReviews(pluginId: string): Promise<PluginReview[]>;
  addReview(review: Omit<PluginReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<PluginReview>;
  updateReview(id: string, updates: Partial<PluginReview>): Promise<PluginReview>;
  deleteReview(id: string): Promise<void>;
  markReviewHelpful(id: string): Promise<void>;

  // Security and Verification
  scanPlugin(pluginId: string): Promise<SecurityScan>;
  getSecurityScan(pluginId: string): Promise<SecurityScan>;
  verifyPlugin(pluginId: string): Promise<boolean>;

  // Statistics
  getMarketplaceStats(): Promise<MarketplaceStats>;
  getPluginStats(pluginId: string): Promise<{
    downloads: number;
    reviews: number;
    rating: number;
    revenue?: number;
  }>;

  // User Management
  getUserProfile(): Promise<User>;
  getUserPurchases(): Promise<Transaction[]>;
  getUserInstalledPlugins(): Promise<MarketplacePlugin[]>;
  purchasePlugin(pluginId: string, paymentMethod: 'stripe' | 'paypal'): Promise<Transaction>;

  // Marketplace Operations
  submitPlugin(plugin: Omit<MarketplacePlugin, 'id' | 'publishedAt' | 'updatedAt'>): Promise<MarketplacePlugin>;
  updatePluginListing(pluginId: string, updates: Partial<MarketplacePlugin>): Promise<MarketplacePlugin>;
  deletePluginListing(pluginId: string): Promise<void>;
}

// Plugin Installer Interface
export interface PluginInstaller {
  install(request: InstallationRequest): Promise<InstallationStatus>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string, version?: string): Promise<InstallationStatus>;
  verify(pluginId: string): Promise<boolean>;
  getInstalledPlugins(): Promise<Array<{
    id: string;
    name: string;
    version: string;
    installedAt: Date;
    source: 'marketplace' | 'url' | 'local';
  }>>;

  onInstallationProgress(callback: (status: InstallationStatus) => void): () => void;
  onInstallationComplete(callback: (pluginId: string) => void): () => void;
  onInstallationError(callback: (error: InstallationError) => void): () => void;
}

// Security Scanner Interface
export interface SecurityScanner {
  scanPlugin(pluginId: string, pluginData: Buffer | string): Promise<SecurityScan>;
  scanDependencies(dependencies: Record<string, string>): Promise<SecurityScan>;
  getVulnerabilities(): Promise<Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedPackages: string[];
    fixedIn?: string[];
  }>>;

  onScanProgress(callback: (progress: number) => void): () => void;
  onScanComplete(callback: (scan: SecurityScan) => void): () => void;
  onScanError(callback: (error: SecurityError) => void): () => void;
}

// Payment Handler Interface
export interface PaymentHandler {
  createPaymentIntent(
    pluginId: string,
    amount: number,
    currency: string,
    paymentMethod: 'stripe' | 'paypal'
  ): Promise<{
    clientSecret?: string;
    paymentUrl?: string;
    transactionId: string;
  }>;

  confirmPayment(transactionId: string, paymentData: any): Promise<Transaction>;
  refundPayment(transactionId: string, amount?: number): Promise<Transaction>;
  getTransaction(transactionId: string): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  onPaymentSuccess(callback: (transaction: Transaction) => void): () => void;
  onPaymentFailure(callback: (transactionId: string, error: PaymentError) => void): () => void;
  onRefund(callback: (transaction: Transaction) => void): () => void;
}

// Analytics Interface
export interface MarketplaceAnalytics {
  trackEvent(event: {
    type: 'search' | 'view' | 'install' | 'purchase' | 'review' | 'update' | 'uninstall';
    pluginId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  getAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<{
    views: number;
    installs: number;
    purchases: number;
    revenue: number;
    topPlugins: Array<{
      pluginId: string;
      name: string;
      installs: number;
      revenue: number;
    }>;
    userRetention: number;
    conversionRate: number;
  }>;

  getPluginAnalytics(pluginId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<{
    views: number;
    installs: number;
    purchases: number;
    revenue: number;
    ratings: number;
    reviews: number;
    uninstalls: number;
    activeUsers: number;
  }>;
}

// Cache Manager Interface
export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;

  // Plugin-specific caching
  getPlugin(id: string): Promise<MarketplacePlugin | null>;
  setPlugin(plugin: MarketplacePlugin): Promise<void>;
  getPlugins(query: MarketplaceQuery): Promise<MarketplaceResponse | null>;
  setPlugins(query: MarketplaceQuery, response: MarketplaceResponse): Promise<void>;

  invalidatePlugin(pluginId: string): Promise<void>;
  invalidateCategory(category: string): Promise<void>;
  invalidateSearch(query: string): Promise<void>;
}

// Plugin Validator Interface
export interface PluginValidator {
  validateManifest(manifest: unknown): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  validateSecurity(pluginData: Buffer | string): Promise<{
    valid: boolean;
    score: number;
    vulnerabilities: SecurityScan['vulnerabilities'];
    recommendations: string[];
  }>;

  validateCompatibility(
    plugin: MarketplacePlugin,
    systemInfo: {
      os: string;
      arch: string;
      version: string;
    }
  ): Promise<{
    compatible: boolean;
    errors: string[];
    warnings: string[];
  }>;

  validateDependencies(dependencies: Record<string, string>): Promise<{
    valid: boolean;
    outdated: Array<{ name: string; current: string; latest: string }>;
    insecure: Array<{ name: string; version: string; vulnerability: string }>;
  }>;
}

// Notification System Interface
export interface NotificationSystem {
  sendNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    pluginId?: string;
    userId?: string;
    actions?: Array<{
      label: string;
      action: string;
      data?: Record<string, unknown>;
    }>;
  }): Promise<void>;

  getNotifications(userId?: string): Promise<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    pluginId?: string;
  }>>;

  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId?: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;

  onNotification(callback: (notification: any) => void): () => void;
}

// Marketplace Service Interface
export interface MarketplaceService {
  readonly config: MarketplaceConfig;
  readonly marketplace: Marketplace;
  readonly installer: PluginInstaller;
  readonly securityScanner: SecurityScanner;
  readonly paymentHandler: PaymentHandler;
  readonly analytics: MarketplaceAnalytics;
  readonly cache: CacheManager;
  readonly validator: PluginValidator;
  readonly notifications: NotificationSystem;

  initialize(config: MarketplaceConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Health checks
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    metrics: Record<string, number>;
  }>;

  // Event handlers
  onPluginInstalled(callback: (plugin: MarketplacePlugin) => void): () => void;
  onPluginUpdated(callback: (plugin: MarketplacePlugin) => void): () => void;
  onPluginUninstalled(callback: (pluginId: string) => void): () => void;
  onSecurityAlert(callback: (alert: SecurityScan) => void): () => void;
  onPaymentReceived(callback: (transaction: Transaction) => void): () => void;
}

// API Client Interface
export interface MarketplaceApiClient {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;

  // Authenticated requests
  authGet<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  authPost<T>(endpoint: string, data?: unknown): Promise<T>;
  authPut<T>(endpoint: string, data?: unknown): Promise<T>;
  authDelete<T>(endpoint: string): Promise<T>;

  setAuthToken(token: string): void;
  clearAuthToken(): void;

  // File operations
  uploadFile(endpoint: string, file: Buffer, filename: string): Promise<T>;
  downloadFile(endpoint: string): Promise<Buffer>;
}

// Plugin Store Interface (for persistence)
export interface PluginStore {
  // Plugin data
  savePlugin(plugin: MarketplacePlugin): Promise<void>;
  getPlugin(id: string): Promise<MarketplacePlugin | null>;
  getAllPlugins(): Promise<MarketplacePlugin[]>;
  searchPlugins(query: MarketplaceQuery): Promise<MarketplaceResponse>;
  deletePlugin(id: string): Promise<void>;

  // Installation data
  saveInstallation(installation: InstallationStatus): Promise<void>;
  getInstallation(pluginId: string): Promise<InstallationStatus | null>;
  getInstallations(): Promise<InstallationStatus[]>;
  deleteInstallation(pluginId: string): Promise<void>;

  // User data
  saveUser(user: User): Promise<void>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;

  // Transaction data
  saveTransaction(transaction: Transaction): Promise<void>;
  getTransaction(id: string): Promise<Transaction | null>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  // Reviews
  saveReview(review: PluginReview): Promise<void>;
  getReviews(pluginId: string): Promise<PluginReview[]>;
  getUserReviews(userId: string): Promise<PluginReview[]>;
  deleteReview(id: string): Promise<void>;
}