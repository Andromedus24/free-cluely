import {
  DataSource,
  DataRecord,
  SyncJob,
  SyncType,
  SyncStatus,
  DataFilter,
  DataTransformation,
  ConnectionResult,
  ConnectionTestResult,
  ValidationResult,
  DataQuery,
  ConnectorMetrics,
  SyncMetrics,
  DataUsageStats,
  AuditAction
} from '../types/ConnectorTypes';
import { DataConnectorInterface, DataConnectorManager, DataSourceConfig } from '../interfaces/ConnectorInterface';
import { ConnectorRegistry } from './ConnectorRegistry';
import { v4 as uuidv4 } from 'uuid';

export class ConnectorManager implements DataConnectorManager {
  private static instance: ConnectorManager;
  private dataSources: Map<string, DataSource> = new Map();
  private syncJobs: Map<string, SyncJob> = new Map();
  private dataRecords: Map<string, Map<string, DataRecord>> = new Map(); // dataSourceId -> recordId -> record

  private constructor() {
    // Initialize registry
    ConnectorRegistry.initializeConnectors();
  }

  public static getInstance(): ConnectorManager {
    if (!ConnectorManager.instance) {
      ConnectorManager.instance = new ConnectorManager();
    }
    return ConnectorManager.instance;
  }

  // Connector Lifecycle Management
  async registerConnector(connector: any): Promise<void> {
    ConnectorRegistry.getInstance().register(connector);
  }

  async unregisterConnector(connectorId: string): Promise<void> {
    ConnectorRegistry.getInstance().unregister(connectorId);
  }

  async getConnector(connectorId: string): Promise<any> {
    const connector = ConnectorRegistry.getInstance().getConnector(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }
    return connector;
  }

  async listConnectors(filters?: any): Promise<any[]> {
    const registry = ConnectorRegistry.getInstance();
    const connectors = registry.getAllConnectors();

    if (!filters) {
      return connectors;
    }

    return connectors.filter(connector => {
      if (filters.category && connector.category !== filters.category) return false;
      if (filters.authentication && !connector.authentication.includes(filters.authentication)) return false;
      if (filters.features && !filters.features.every((f: string) => connector.supportedFeatures.includes(f))) return false;
      if (filters.status && connector.status !== filters.status) return false;
      return true;
    });
  }

  // Data Source Management
  async createDataSource(config: DataSourceConfig): Promise<DataSource> {
    const id = uuidv4();
    const now = new Date();

    // Validate connector exists
    const connector = await this.getConnector(config.connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${config.connectorId}`);
    }

    // Validate configuration
    const validation = await this.validateConfiguration(config.connectorId, config.configuration);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dataSource: DataSource = {
      id,
      name: config.name,
      connectorId: config.connectorId,
      configuration: config.configuration,
      isEnabled: config.isEnabled,
      syncStatus: SyncStatus.PENDING,
      syncFrequency: config.syncFrequency as any,
      dataRetention: config.dataRetention || {
        enabled: false,
        retentionPeriod: 365,
        action: 'delete'
      },
      filters: config.filters || [],
      transformations: config.transformations || [],
      createdAt: now,
      updatedAt: now
    };

    this.dataSources.set(id, dataSource);
    this.dataRecords.set(id, new Map());

    // Initialize data records map for this data source
    console.log(`Created data source: ${dataSource.name} (${id})`);

    return dataSource;
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    const updatedDataSource = {
      ...dataSource,
      ...updates,
      updatedAt: new Date()
    };

    // If configuration is being updated, validate it
    if (updates.configuration) {
      const validation = await this.validateConfiguration(dataSource.connectorId, updates.configuration);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    this.dataSources.set(id, updatedDataSource);
    console.log(`Updated data source: ${updatedDataSource.name}`);

    return updatedDataSource;
  }

  async deleteDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    // Clean up data records
    this.dataRecords.delete(id);

    // Remove any pending sync jobs
    const pendingJobs = Array.from(this.syncJobs.values()).filter(job => job.dataSourceId === id && job.status === SyncStatus.RUNNING);
    for (const job of pendingJobs) {
      await this.cancelSync(job.id);
    }

    this.dataSources.delete(id);
    console.log(`Deleted data source: ${dataSource.name}`);
  }

  async getDataSource(id: string): Promise<DataSource | null> {
    return this.dataSources.get(id) || null;
  }

  async listDataSources(userId?: string): Promise<DataSource[]> {
    // For now, return all data sources
    // In a real implementation, this would filter by user ownership/permissions
    return Array.from(this.dataSources.values());
  }

  // Sync Management
  async scheduleSync(dataSourceId: string, options: any = {}): Promise<SyncJob> {
    const dataSource = await this.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    if (!dataSource.isEnabled) {
      throw new Error(`Data source is disabled: ${dataSourceId}`);
    }

    const jobId = uuidv4();
    const now = new Date();

    const syncJob: SyncJob = {
      id: jobId,
      dataSourceId,
      type: options.type || SyncType.INCREMENTAL,
      status: SyncStatus.PENDING,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      metadata: {
        filters: dataSource.filters,
        transformations: dataSource.transformations,
        ...options
      }
    };

    this.syncJobs.set(jobId, syncJob);

    // Start the sync process
    this.executeSync(jobId).catch(error => {
      console.error(`Sync job ${jobId} failed:`, error);
    });

    return syncJob;
  }

  async cancelSync(jobId: string): Promise<void> {
    const job = this.syncJobs.get(jobId);
    if (!job) {
      throw new Error(`Sync job not found: ${jobId}`);
    }

    if (job.status === SyncStatus.RUNNING) {
      job.status = SyncStatus.CANCELLED;
      job.endTime = new Date();
      this.syncJobs.set(jobId, job);
      console.log(`Cancelled sync job: ${jobId}`);
    }
  }

  async getSyncJobs(dataSourceId?: string): Promise<SyncJob[]> {
    const jobs = Array.from(this.syncJobs.values());
    return dataSourceId ? jobs.filter(job => job.dataSourceId === dataSourceId) : jobs;
  }

  async getSyncJob(jobId: string): Promise<SyncJob | null> {
    return this.syncJobs.get(jobId) || null;
  }

  // Data Operations
  async queryData(query: DataQuery): Promise<DataRecord[]> {
    let results: DataRecord[] = [];

    // If specific data sources are requested, query only those
    const sourceIds = query.dataSourceIds || Array.from(this.dataSources.keys());

    for (const sourceId of sourceIds) {
      const sourceRecords = this.dataRecords.get(sourceId);
      if (!sourceRecords) continue;

      let sourceResults = Array.from(sourceRecords.values());

      // Apply filters
      if (query.filters) {
        sourceResults = this.applyFilters(sourceResults, query.filters);
      }

      // Apply transformations
      if (query.transformations) {
        sourceResults = this.applyTransformations(sourceResults, query.transformations);
      }

      // Apply ordering
      if (query.orderBy) {
        sourceResults = this.applyOrdering(sourceResults, query.orderBy);
      }

      // Apply limit and offset
      if (query.offset) {
        sourceResults = sourceResults.slice(query.offset);
      }
      if (query.limit) {
        sourceResults = sourceResults.slice(0, query.limit);
      }

      results = results.concat(sourceResults);
    }

    return results;
  }

  async getDataRecord(recordId: string): Promise<DataRecord | null> {
    // Search all data sources for the record
    for (const [sourceId, records] of this.dataRecords.entries()) {
      const record = records.get(recordId);
      if (record) {
        return record;
      }
    }
    return null;
  }

  async createDataRecord(record: Omit<DataRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataRecord> {
    const id = uuidv4();
    const now = new Date();

    const fullRecord: DataRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    };

    const sourceRecords = this.dataRecords.get(record.dataSourceId);
    if (!sourceRecords) {
      throw new Error(`Data source not found: ${record.dataSourceId}`);
    }

    sourceRecords.set(id, fullRecord);
    return fullRecord;
  }

  async updateDataRecord(recordId: string, updates: Partial<DataRecord>): Promise<DataRecord> {
    // Find the record
    let record: DataRecord | null = null;
    let sourceId: string | null = null;

    for (const [sid, records] of this.dataRecords.entries()) {
      const found = records.get(recordId);
      if (found) {
        record = found;
        sourceId = sid;
        break;
      }
    }

    if (!record || !sourceId) {
      throw new Error(`Record not found: ${recordId}`);
    }

    const updatedRecord = {
      ...record,
      ...updates,
      updatedAt: new Date(),
      version: record.version + 1
    };

    const sourceRecords = this.dataRecords.get(sourceId)!;
    sourceRecords.set(recordId, updatedRecord);

    return updatedRecord;
  }

  async deleteDataRecord(recordId: string): Promise<void> {
    // Find and delete the record
    for (const [sourceId, records] of this.dataRecords.entries()) {
      if (records.has(recordId)) {
        records.delete(recordId);
        return;
      }
    }

    throw new Error(`Record not found: ${recordId}`);
  }

  // Monitoring & Analytics
  async getConnectorMetrics(connectorId: string, period: string): Promise<ConnectorMetrics> {
    const sources = Array.from(this.dataSources.values()).filter(s => s.connectorId === connectorId);
    const jobs = Array.from(this.syncJobs.values()).filter(j => sources.some(s => s.id === j.dataSourceId));

    const totalConnections = sources.length;
    const activeConnections = sources.filter(s => s.isEnabled).length;
    const totalSyncs = jobs.length;
    const failedSyncs = jobs.filter(j => j.status === SyncStatus.FAILED).length;

    const syncTimes = jobs
      .filter(j => j.startTime && j.endTime)
      .map(j => j.endTime!.getTime() - j.startTime!.getTime());

    const averageSyncTime = syncTimes.length > 0
      ? syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length
      : 0;

    const dataVolume = Array.from(this.dataRecords.values())
      .reduce((total, records) => total + records.size, 0);

    const errorRate = totalSyncs > 0 ? (failedSyncs / totalSyncs) * 100 : 0;

    // Calculate uptime (simplified)
    const uptime = activeConnections > 0 ? 95 : 0; // Mock value

    return {
      totalConnections,
      activeConnections,
      totalSyncs,
      failedSyncs,
      averageSyncTime,
      dataVolume,
      errorRate,
      uptime
    };
  }

  async getSyncMetrics(dataSourceId: string, period: string): Promise<SyncMetrics> {
    const jobs = Array.from(this.syncJobs.values()).filter(j => j.dataSourceId === dataSourceId);
    const sourceRecords = this.dataRecords.get(dataSourceId) || new Map();

    const totalRecords = sourceRecords.size;
    const recordsSynced = jobs.reduce((sum, job) => sum + job.recordsProcessed, 0);
    const recordsCreated = jobs.reduce((sum, job) => sum + job.recordsCreated, 0);
    const recordsUpdated = jobs.reduce((sum, job) => sum + job.recordsUpdated, 0);
    const recordsDeleted = jobs.reduce((sum, job) => sum + job.recordsDeleted, 0);
    const conflicts = jobs.reduce((sum, job) => sum + (job.metadata.conflicts || 0), 0);
    const errors = jobs.reduce((sum, job) => sum + job.errors.length, 0);

    const completedJobs = jobs.filter(j => j.status === SyncStatus.COMPLETED && j.startTime && j.endTime);
    const durations = completedJobs.map(j => j.endTime!.getTime() - j.startTime!.getTime());
    const lastSyncDuration = durations.length > 0 ? durations[durations.length - 1] : 0;
    const averageSyncDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalRecords,
      recordsSynced,
      recordsCreated,
      recordsUpdated,
      recordsDeleted,
      conflicts,
      errors,
      lastSyncDuration,
      averageSyncDuration
    };
  }

  async getDataUsageStats(userId?: string): Promise<DataUsageStats> {
    const allRecords = Array.from(this.dataRecords.values())
      .flatMap(records => Array.from(records.values()));

    const totalRecords = allRecords.length;
    const totalDataSize = allRecords.reduce((sum, record) => {
      return sum + JSON.stringify(record.data).length;
    }, 0);

    const dataByConnector: Record<string, { records: number; size: number }> = {};

    for (const [sourceId, records] of this.dataRecords.entries()) {
      const dataSource = this.dataSources.get(sourceId);
      if (!dataSource) continue;

      const connectorId = dataSource.connectorId;
      const connectorRecords = Array.from(records.values());
      const connectorSize = connectorRecords.reduce((sum, record) => {
        return sum + JSON.stringify(record.data).length;
      }, 0);

      dataByConnector[connectorId] = {
        records: connectorRecords.length,
        size: connectorSize
      };
    }

    const syncCount = Array.from(this.syncJobs.values()).length;
    const apiCalls = syncCount * 10; // Mock value

    return {
      totalRecords,
      totalDataSize,
      dataByConnector,
      syncCount,
      apiCalls
    };
  }

  // Security & Compliance
  async validateAccess(userId: string, resourceId: string, permission: string): Promise<boolean> {
    // Simplified access control - in real implementation would check user permissions
    return true;
  }

  async auditLog(action: AuditAction): Promise<void> {
    // Store audit log entry
    console.log(`Audit Log: ${action.userId} ${action.action} ${action.resource} (${action.resourceId})`);
    // In real implementation, this would store to database
  }

  async encryptData(data: string, keyId?: string): Promise<string> {
    // Simplified encryption - in real implementation would use proper encryption
    return Buffer.from(data).toString('base64');
  }

  async decryptData(encryptedData: string, keyId?: string): Promise<string> {
    // Simplified decryption
    return Buffer.from(encryptedData, 'base64').toString();
  }

  // Helper Methods
  private async executeSync(jobId: string): Promise<void> {
    const job = this.syncJobs.get(jobId);
    if (!job) return;

    job.status = SyncStatus.RUNNING;
    job.startTime = new Date();
    this.syncJobs.set(jobId, job);

    try {
      const dataSource = this.dataSources.get(job.dataSourceId);
      if (!dataSource) {
        throw new Error(`Data source not found: ${job.dataSourceId}`);
      }

      const connector = await this.getConnector(dataSource.connectorId);

      // Test connection
      const testResult = await connector.testConnection(dataSource.configuration);
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }

      // Fetch data
      const records = await connector.fetchData(
        job.metadata.filters,
        job.metadata.transformations
      );

      // Process records
      let created = 0;
      let updated = 0;
      let deleted = 0;

      const sourceRecords = this.dataRecords.get(job.dataSourceId) || new Map();

      for (const record of records) {
        const existing = sourceRecords.get(record.id);
        if (existing) {
          // Update existing record
          await this.updateDataRecord(record.id, record);
          updated++;
        } else {
          // Create new record
          await this.createDataRecord({
            ...record,
            dataSourceId: job.dataSourceId,
            syncedAt: new Date()
          });
          created++;
        }
      }

      // Update job status
      job.status = SyncStatus.COMPLETED;
      job.endTime = new Date();
      job.recordsProcessed = records.length;
      job.recordsCreated = created;
      job.recordsUpdated = updated;
      job.recordsDeleted = deleted;

      // Update data source sync status
      dataSource.syncStatus = SyncStatus.COMPLETED;
      dataSource.lastSync = job.endTime;
      this.dataSources.set(dataSource.id, dataSource);

      console.log(`Sync job ${jobId} completed: ${created} created, ${updated} updated`);

    } catch (error) {
      job.status = SyncStatus.FAILED;
      job.endTime = new Date();
      job.errors.push({
        id: uuidv4(),
        type: 'internal' as any,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        resolved: false
      });

      console.error(`Sync job ${jobId} failed:`, error);
    } finally {
      this.syncJobs.set(jobId, job);
    }
  }

  private applyFilters(records: DataRecord[], filters: DataFilter[]): DataRecord[] {
    return records.filter(record => {
      return filters.every(filter => {
        const value = this.getNestedValue(record.data, filter.field);
        return this.evaluateFilter(value, filter.operator, filter.value);
      });
    });
  }

  private applyTransformations(records: DataRecord[], transformations: DataTransformation[]): DataRecord[] {
    return records.map(record => {
      let transformed = { ...record };
      transformations.forEach(transformation => {
        transformed = this.applyTransformation(transformed, transformation);
      });
      return transformed;
    });
  }

  private applyOrdering(records: DataRecord[], orderBy: any[]): DataRecord[] {
    return records.sort((a, b) => {
      for (const order of orderBy) {
        const aValue = this.getNestedValue(a.data, order.field);
        const bValue = this.getNestedValue(b.data, order.field);

        if (aValue < bValue) return order.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return order.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals': return value === filterValue;
      case 'contains': return String(value).includes(String(filterValue));
      case 'greater_than': return value > filterValue;
      case 'less_than': return value < filterValue;
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      default: return true;
    }
  }

  private applyTransformation(record: DataRecord, transformation: DataTransformation): DataRecord {
    // Simplified transformation logic
    switch (transformation.type) {
      case 'field_mapping':
        if (transformation.fieldMapping) {
          const newData = { ...record.data };
          transformation.fieldMapping.forEach(mapping => {
            const sourceValue = this.getNestedValue(record.data, mapping.sourceField);
            // Simple field renaming
            newData[mapping.targetField] = sourceValue;
          });
          return { ...record, data: newData };
        }
        break;
      default:
        return record;
    }
    return record;
  }

  private async validateConfiguration(connectorId: string, config: Record<string, any>): Promise<ValidationResult> {
    try {
      const connector = await this.getConnector(connectorId);
      return await connector.validateConfiguration(config);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'configuration',
          message: error instanceof Error ? error.message : String(error),
          type: 'validation',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }
}