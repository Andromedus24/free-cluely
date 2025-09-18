// Productivity Monitoring Components Export
export { ProductivityDashboard } from './ProductivityDashboard';
export { ProductivityProvider, useProductivity } from './ProductivityProvider';
export { ProductivityWidget, ProductivityIndicator } from './ProductivityWidget';

// Re-export types and service
export type {
  ActivityEvent,
  ProductivityMetrics,
  MonitoringConfig,
  SessionData
} from '@/services/productivity-monitoring';

export { productivityMonitor } from '@/services/productivity-monitoring';
export default ProductivityMonitoringService;