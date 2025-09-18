import {
  SyncJob,
  SyncType,
  SyncStatus,
  DataRecord,
  SyncError,
  ConflictResolutionStrategy,
  DataFilter,
  DataTransformation
} from '../types/ConnectorTypes';
import { DataConnectorManager } from '../interfaces/ConnectorInterface';

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  concurrency: number;
  timeout: number;
  conflictResolution: ConflictResolutionStrategy;
}

export interface SyncResult {
  jobId: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsSkipped: number;
  conflicts: number;
  errors: SyncError[];
  duration: number;
  startTime: Date;
  endTime: Date;
}

export interface Conflict {
  id: string;
  type: 'create' | 'update' | 'delete';
  localRecord?: DataRecord;
  remoteRecord?: DataRecord;
  conflictReason: string;
  detectedAt: Date;
  resolved: boolean;
  resolution?: 'use_local' | 'use_remote' | 'merge' | 'manual';
  resolutionData?: DataRecord;
}

export class SynchronizationEngine {
  private manager: DataConnectorManager;
  private config: SyncConfig;
  private activeJobs: Map<string, SyncJob> = new Map();
  private conflicts: Map<string, Conflict[]> = new Map();

  constructor(manager: DataConnectorManager, config: Partial<SyncConfig> = {}) {
    this.manager = manager;
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 100,
      concurrency: 5,
      timeout: 300000, // 5 minutes
      conflictResolution: {
        type: 'use_remote'
      },
      ...config
    };
  }

  async startSync(
    dataSourceId: string,
    syncType: SyncType,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
      incremental?: boolean;
    }
  ): Promise<SyncResult> {
    const startTime = new Date();
    const jobId = this.generateJobId();

    // Create sync job
    const job: SyncJob = {
      id: jobId,
      dataSourceId,
      type: syncType,
      status: SyncStatus.RUNNING,
      startTime,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      metadata: {
        options,
        config: this.config
      }
    };

    this.activeJobs.set(jobId, job);

    try {
      const result = await this.executeSync(job, options);
      this.activeJobs.delete(jobId);
      return result;
    } catch (error) {
      job.status = SyncStatus.FAILED;
      job.errors.push({
        id: this.generateErrorId(),
        type: 'sync_failure' as any,
        message: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date(),
        resolved: false
      });
      job.endTime = new Date();

      this.activeJobs.delete(jobId);

      throw error;
    }
  }

  async stopSync(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === SyncStatus.RUNNING) {
      job.status = SyncStatus.CANCELLED;
      job.endTime = new Date();
      this.activeJobs.delete(jobId);
    }
  }

  async getSyncStatus(jobId: string): Promise<SyncJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  async getActiveSyncs(): Promise<SyncJob[]> {
    return Array.from(this.activeJobs.values()).filter(job => job.status === SyncStatus.RUNNING);
  }

  async getConflicts(dataSourceId?: string): Promise<Conflict[]> {
    const allConflicts: Conflict[] = [];
    for (const [dsId, conflicts] of this.conflicts) {
      if (!dataSourceId || dsId === dataSourceId) {
        allConflicts.push(...conflicts);
      }
    }
    return allConflicts.filter(c => !c.resolved);
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'use_local' | 'use_remote' | 'merge' | 'manual',
    resolutionData?: DataRecord
  ): Promise<void> {
    // Find and resolve the conflict
    for (const conflicts of this.conflicts.values()) {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (conflict) {
        conflict.resolved = true;
        conflict.resolution = resolution;
        conflict.resolutionData = resolutionData;

        // Apply the resolution
        await this.applyConflictResolution(conflict);
        break;
      }
    }
  }

  private async executeSync(
    job: SyncJob,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
      incremental?: boolean;
    }
  ): Promise<SyncResult> {
    const startTime = job.startTime;
    const conflictResolution = options?.conflictResolution || this.config.conflictResolution;

    try {
      // Get data source
      const dataSource = await this.manager.getDataSource(job.dataSourceId);
      if (!dataSource) {
        throw new Error(`Data source not found: ${job.dataSourceId}`);
      }

      // Execute sync based on type
      switch (job.type) {
        case SyncType.FULL:
          return await this.executeFullSync(job, dataSource, options);
        case SyncType.INCREMENTAL:
          return await this.executeIncrementalSync(job, dataSource, options);
        case SyncType.REAL_TIME:
          return await this.executeRealTimeSync(job, dataSource, options);
        case SyncType.WEBHOOK:
          return await this.executeWebhookSync(job, dataSource, options);
        default:
          throw new Error(`Unsupported sync type: ${job.type}`);
      }
    } finally {
      job.endTime = new Date();
    }
  }

  private async executeFullSync(
    job: SyncJob,
    dataSource: any,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
    }
  ): Promise<SyncResult> {
    const connector = await this.manager.getConnector(dataSource.connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${dataSource.connectorId}`);
    }

    // Fetch all records from the data source
    const remoteRecords = await this.fetchAllRecords(connector, dataSource, options?.filters);

    // Get existing local records for comparison
    const localRecords = await this.getLocalRecords(job.dataSourceId);

    // Perform sync with conflict detection
    const syncResult = await this.syncRecords(
      job,
      localRecords,
      remoteRecords,
      options?.transformations,
      options?.conflictResolution
    );

    return syncResult;
  }

  private async executeIncrementalSync(
    job: SyncJob,
    dataSource: any,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
    }
  ): Promise<SyncResult> {
    const connector = await this.manager.getConnector(dataSource.connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${dataSource.connectorId}`);
    }

    // Fetch records modified since last sync
    const filters = [...(options?.filters || [])];

    if (dataSource.lastSyncAt) {
      filters.push({
        id: 'modified_since',
        field: 'last_modified',
        operator: 'greater_than' as any,
        value: dataSource.lastSyncAt,
        dataType: 'datetime' as any,
        isActive: true
      });
    }

    const remoteRecords = await this.fetchAllRecords(connector, dataSource, filters);
    const localRecords = await this.getLocalRecords(job.dataSourceId);

    const syncResult = await this.syncRecords(
      job,
      localRecords,
      remoteRecords,
      options?.transformations,
      options?.conflictResolution
    );

    // Update last sync time
    await this.updateDataSourceSyncTime(job.dataSourceId);

    return syncResult;
  }

  private async executeRealTimeSync(
    job: SyncJob,
    dataSource: any,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
    }
  ): Promise<SyncResult> {
    // Real-time sync typically uses webhooks or long polling
    // This is a simplified implementation
    console.log('Real-time sync started for data source:', job.dataSourceId);

    return {
      jobId: job.id,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      recordsSkipped: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
      startTime: job.startTime,
      endTime: new Date()
    };
  }

  private async executeWebhookSync(
    job: SyncJob,
    dataSource: any,
    options?: {
      filters?: DataFilter[];
      transformations?: DataTransformation[];
      conflictResolution?: ConflictResolutionStrategy;
    }
  ): Promise<SyncResult> {
    // Webhook-based sync processes incoming webhook events
    console.log('Webhook sync processed for data source:', job.dataSourceId);

    return {
      jobId: job.id,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      recordsSkipped: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
      startTime: job.startTime,
      endTime: new Date()
    };
  }

  private async fetchAllRecords(
    connector: any,
    dataSource: any,
    filters?: DataFilter[]
  ): Promise<DataRecord[]> {
    const allRecords: DataRecord[] = [];
    let page = 1;
    const batchSize = this.config.batchSize;

    while (true) {
      const pageFilters = [
        ...(filters || []),
        {
          id: `pagination_${page}`,
          field: 'page',
          operator: 'equals' as any,
          value: page,
          dataType: 'number' as any,
          isActive: true
        },
        {
          id: `batch_${page}`,
          field: 'limit',
          operator: 'equals' as any,
          value: batchSize,
          dataType: 'number' as any,
          isActive: true
        }
      ];

      const records = await connector.fetchData(pageFilters);

      if (records.length === 0) {
        break;
      }

      allRecords.push(...records);
      page++;

      // Break if we got fewer records than batch size (end of data)
      if (records.length < batchSize) {
        break;
      }
    }

    return allRecords;
  }

  private async getLocalRecords(dataSourceId: string): Promise<DataRecord[]> {
    // This would query the local database for existing records
    // For now, return empty array
    return [];
  }

  private async syncRecords(
    job: SyncJob,
    localRecords: DataRecord[],
    remoteRecords: DataRecord[],
    transformations?: DataTransformation[],
    conflictResolution?: ConflictResolutionStrategy
  ): Promise<SyncResult> {
    const startTime = job.startTime;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
    let recordsSkipped = 0;
    let conflicts = 0;

    const localRecordMap = new Map(localRecords.map(r => [r.externalId, r]));
    const remoteRecordMap = new Map(remoteRecords.map(r => [r.externalId, r]));

    // Process records in batches
    const batchSize = this.config.batchSize;
    const remoteIds = Array.from(remoteRecordMap.keys());

    for (let i = 0; i < remoteIds.length; i += batchSize) {
      const batchIds = remoteIds.slice(i, i + batchSize);

      for (const externalId of batchIds) {
        const localRecord = localRecordMap.get(externalId);
        const remoteRecord = remoteRecordMap.get(externalId);

        if (!localRecord) {
          // New record
          await this.createRecord(remoteRecord!, transformations);
          recordsCreated++;
        } else if (this.isRecordChanged(localRecord, remoteRecord!)) {
          // Check for conflicts
          if (this.isConflict(localRecord, remoteRecord!)) {
            conflicts++;
            await this.handleConflict(localRecord, remoteRecord!, conflictResolution);
          } else {
            // Update record
            await this.updateRecord(localRecord, remoteRecord!, transformations);
            recordsUpdated++;
          }
        } else {
          // No changes needed
          recordsSkipped++;
        }
      }

      // Update job progress
      job.recordsProcessed = i + batchIds.length;
    }

    // Check for deleted records (records in local but not in remote)
    for (const [externalId, localRecord] of localRecordMap) {
      if (!remoteRecordMap.has(externalId)) {
        await this.deleteRecord(localRecord);
        recordsDeleted++;
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      jobId: job.id,
      status: SyncStatus.COMPLETED,
      recordsProcessed: recordsCreated + recordsUpdated + recordsDeleted + recordsSkipped,
      recordsCreated,
      recordsUpdated,
      recordsDeleted,
      recordsSkipped,
      conflicts,
      errors: job.errors,
      duration,
      startTime,
      endTime
    };
  }

  private isRecordChanged(localRecord: DataRecord, remoteRecord: DataRecord): boolean {
    // Compare records to detect changes
    const localData = JSON.stringify(localRecord.data);
    const remoteData = JSON.stringify(remoteRecord.data);
    return localData !== remoteData;
  }

  private isConflict(localRecord: DataRecord, remoteRecord: DataRecord): boolean {
    // Check if both records have been modified since last sync
    const localModified = localRecord.updatedAt;
    const remoteModified = remoteRecord.updatedAt;

    // If both were modified after the last sync time, it's a conflict
    const lastSyncTime = localRecord.syncedAt;
    if (lastSyncTime && localModified > lastSyncTime && remoteModified > lastSyncTime) {
      return true;
    }

    return false;
  }

  private async handleConflict(
    localRecord: DataRecord,
    remoteRecord: DataRecord,
    conflictResolution?: ConflictResolutionStrategy
  ): Promise<void> {
    const conflict: Conflict = {
      id: this.generateConflictId(),
      type: 'update',
      localRecord,
      remoteRecord,
      conflictReason: 'Both records modified since last sync',
      detectedAt: new Date(),
      resolved: false
    };

    // Store conflict for manual resolution
    const dataSourceId = localRecord.dataSourceId;
    if (!this.conflicts.has(dataSourceId)) {
      this.conflicts.set(dataSourceId, []);
    }
    this.conflicts.get(dataSourceId)!.push(conflict);

    // Apply automatic resolution if configured
    if (conflictResolution) {
      await this.applyConflictResolution(conflict, conflictResolution);
    }
  }

  private async applyConflictResolution(
    conflict: Conflict,
    resolution?: ConflictResolutionStrategy
  ): Promise<void> {
    if (!resolution) return;

    switch (resolution.type) {
      case 'use_local':
        // Keep local version, do nothing
        break;
      case 'use_remote':
        // Update with remote version
        if (conflict.localRecord && conflict.remoteRecord) {
          await this.updateRecord(conflict.localRecord, conflict.remoteRecord);
        }
        break;
      case 'merge':
        // Merge both versions
        if (conflict.localRecord && conflict.remoteRecord) {
          const mergedData = this.mergeRecords(conflict.localRecord, conflict.remoteRecord);
          await this.updateRecord(conflict.localRecord, conflict.remoteRecord, undefined, mergedData);
        }
        break;
      case 'manual':
        // Wait for manual resolution
        break;
    }
  }

  private mergeRecords(localRecord: DataRecord, remoteRecord: DataRecord): Record<string, any> {
    // Simple merge strategy - combine fields from both records
    const merged: Record<string, any> = { ...localRecord.data };

    Object.keys(remoteRecord.data).forEach(key => {
      if (!(key in merged)) {
        merged[key] = remoteRecord.data[key];
      }
    });

    return merged;
  }

  private async createRecord(record: DataRecord, transformations?: DataTransformation[]): Promise<void> {
    // Apply transformations if any
    let transformedData = record.data;
    if (transformations) {
      transformedData = this.applyTransformations(transformedData, transformations);
    }

    // Create the record in local database
    // This would call the data repository to save the record
    console.log('Creating record:', record.externalId);
  }

  private async updateRecord(
    localRecord: DataRecord,
    remoteRecord: DataRecord,
    transformations?: DataTransformation[],
    mergedData?: Record<string, any>
  ): Promise<void> {
    // Apply transformations if any
    let updateData = mergedData || remoteRecord.data;
    if (transformations) {
      updateData = this.applyTransformations(updateData, transformations);
    }

    // Update the record in local database
    console.log('Updating record:', localRecord.externalId);
  }

  private async deleteRecord(record: DataRecord): Promise<void> {
    // Delete the record from local database
    console.log('Deleting record:', record.externalId);
  }

  private async updateDataSourceSyncTime(dataSourceId: string): Promise<void> {
    // Update the last sync time for the data source
    console.log('Updating sync time for data source:', dataSourceId);
  }

  private applyTransformations(data: Record<string, any>, transformations: DataTransformation[]): Record<string, any> {
    let transformed = { ...data };

    transformations.forEach(t => {
      if (!t.isActive) return;

      switch (t.type) {
        case 'field_mapping':
          if (t.fieldMapping) {
            t.fieldMapping.forEach(mapping => {
              if (transformed[mapping.sourceField]) {
                transformed[mapping.targetField] = transformed[mapping.sourceField];
                if (mapping.sourceField !== mapping.targetField) {
                  delete transformed[mapping.sourceField];
                }
              }
            });
          }
          break;
        case 'data_type_conversion':
          // Apply data type conversions
          break;
        case 'value_transformation':
          // Apply value transformations
          break;
        case 'validation':
          // Apply validation rules
          break;
        case 'enrichment':
          // Apply data enrichment
          break;
      }
    });

    return transformed;
  }

  private generateJobId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}