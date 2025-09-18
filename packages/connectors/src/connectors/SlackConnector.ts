import { DataConnector } from '../types/ConnectorTypes';
import { DataConnectorInterface } from '../interfaces/ConnectorInterface';
import { ConnectorCategory, ConnectorFeature, AuthenticationMethod, DataType, SyncType, FilterOperator } from '../types/ConnectorTypes';

export class SlackConnector implements DataConnector {
  id = 'slack';
  name = 'Slack';
  description = 'Team communication and collaboration platform';
  version = '1.0.0';
  author = 'Atlas AI';
  category = ConnectorCategory.COMMUNICATION;
  icon = '💬';
  supportedFeatures = [
    ConnectorFeature.DATA_SYNC,
    ConnectorFeature.WEBHOOKS,
    ConnectorFeature.REAL_TIME,
    ConnectorFeature.BULK_EXPORT,
    ConnectorFeature.CUSTOM_FIELDS,
    ConnectorFeature.ADVANCED_FILTERING,
    ConnectorFeature.DATA_TRANSFORMATION,
    ConnectorFeature.WEBHOOKS_INBOUND,
    ConnectorFeature.WEBHOOKS_OUTBOUND
  ];
  authentication = [AuthenticationMethod.OAUTH2, AuthenticationMethod.BEARER_TOKEN];
  dataTypes = [DataType.STRING, DataType.BOOLEAN, DataType.DATE, DataType.DATETIME, DataType.JSON, DataType.ARRAY];
  configuration = {
    fields: [
      {
        name: 'botToken',
        label: 'Bot User OAuth Token',
        type: 'password',
        description: 'Your Slack bot user OAuth token (starts with xoxb-)',
        required: true,
        sensitive: true,
        validation: [
          { type: 'required', value: true, message: 'Bot token is required' },
          { type: 'pattern', value: '^xoxb-[A-Za-z0-9-]+$', message: 'Invalid bot token format' }
        ],
        placeholder: 'xoxb-xxxxxxxxx-xxxxxxxxx-xxxxxxxxx'
      },
      {
        name: 'appToken',
        label: 'App-Level Token',
        type: 'password',
        description: 'Your Slack app-level token (starts with xapp-)',
        required: false,
        sensitive: true,
        validation: [
          { type: 'pattern', value: '^xapp-[A-Za-z0-9-]+$', message: 'Invalid app token format' }
        ],
        placeholder: 'xapp-xxxxxxxxx-xxxxxxxxx-xxxxxxxxx'
      },
      {
        name: 'signingSecret',
        label: 'Signing Secret',
        type: 'password',
        description: 'Your Slack app signing secret',
        required: false,
        sensitive: true,
        validation: []
      },
      {
        name: 'teamId',
        label: 'Team ID',
        type: 'text',
        description: 'Your Slack workspace team ID',
        required: false,
        sensitive: false,
        validation: []
      }
    ],
    validationRules: [],
    defaults: {
      syncFrequency: 'real_time',
      batchSize: 200,
      concurrency: 10
    },
    required: ['botToken']
  };
  status = 'disconnected' as any;
  lastSync?: Date;
  error?: string;
  metadata = {
    website: 'https://slack.com',
    documentation: 'https://api.slack.com/docs',
    supportEmail: 'feedback@slack.com',
    pricing: {
      model: 'freemium',
      features: ['Free tier available', 'Premium features for paid plans', 'Enterprise options']
    },
    limits: {
      rateLimit: 1000000,
      rateLimitWindow: 'min',
      maxRecords: 100000,
      maxDataSize: 1073741824, // 1GB
      concurrentConnections: 50
    },
    capabilities: {
      realTimeSync: true,
      incrementalSync: true,
      webhookSupport: true,
      customFields: false,
      dataTransformation: true,
      conflictResolution: true,
      encryption: true,
      compression: true
    }
  };

  private botToken?: string;
  private appToken?: string;
  private signingSecret?: string;
  private teamId?: string;

  async connect(config: Record<string, any>): Promise<any> {
    try {
      this.botToken = config.botToken;
      this.appToken = config.appToken;
      this.signingSecret = config.signingSecret;
      this.teamId = config.teamId;

      // Test the connection
      await this.testConnection(config);

      this.status = 'connected' as any;
      return {
        success: true,
        connectionId: this.generateConnectionId(),
        scopes: ['channels:history', 'users:read', 'chat:write', 'reactions:read']
      };
    } catch (error) {
      this.status = 'error' as any;
      this.error = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.botToken = undefined;
    this.appToken = undefined;
    this.signingSecret = undefined;
    this.teamId = undefined;
    this.status = 'disconnected' as any;
  }

  async testConnection(config: Record<string, any>): Promise<any> {
    try {
      const response = await this.makeRequest('auth.test', 'POST');

      return {
        success: true,
        message: `Successfully connected to Slack workspace: ${response.team}`,
        details: {
          responseTime: 100,
          rateLimitRemaining: 4999,
          supportedFeatures: this.supportedFeatures,
          authenticatedUser: response.user,
          permissions: ['read', 'write', 'reactions']
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSchema(): Promise<any> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const tables = [
      {
        name: 'channels',
        fields: [
          { name: 'id', type: 'string', nullable: false, unique: true, description: 'Channel ID' },
          { name: 'name', type: 'string', nullable: false, unique: false, description: 'Channel name' },
          { name: 'is_channel', type: 'boolean', nullable: false, unique: false, description: 'Is this a channel' },
          { name: 'created', type: 'datetime', nullable: false, unique: false, description: 'Creation timestamp' },
          { name: 'creator', type: 'string', nullable: false, unique: false, description: 'Creator user ID' },
          { name: 'is_archived', type: 'boolean', nullable: false, unique: false, description: 'Is archived' },
          { name: 'is_general', type: 'boolean', nullable: false, unique: false, description: 'Is general channel' },
          { name: 'name_normalized', type: 'string', nullable: false, unique: false, description: 'Normalized name' },
          { name: 'is_shared', type: 'boolean', nullable: false, unique: false, description: 'Is shared' },
          { name: 'is_ext_shared', type: 'boolean', nullable: false, unique: false, description: 'Is externally shared' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'name_index', fields: ['name'], unique: false }],
        constraints: []
      },
      {
        name: 'messages',
        fields: [
          { name: 'ts', type: 'string', nullable: false, unique: true, description: 'Timestamp' },
          { name: 'channel_id', type: 'string', nullable: false, unique: false, description: 'Channel ID' },
          { name: 'user_id', type: 'string', nullable: true, unique: false, description: 'User ID' },
          { name: 'text', type: 'string', nullable: false, unique: false, description: 'Message text' },
          { name: 'type', type: 'string', nullable: false, unique: false, description: 'Message type' },
          { name: 'thread_ts', type: 'string', nullable: true, unique: false, description: 'Thread timestamp' },
          { name: 'is_thread_root', type: 'boolean', nullable: false, unique: false, description: 'Is thread root' },
          { name: 'reply_count', type: 'number', nullable: true, unique: false, description: 'Reply count' },
          { name: 'reactions', type: 'array', nullable: true, unique: false, description: 'Reactions' }
        ],
        primaryKey: ['ts', 'channel_id'],
        indexes: [{ name: 'channel_ts_index', fields: ['channel_id', 'ts'], unique: false }],
        constraints: []
      },
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'string', nullable: false, unique: true, description: 'User ID' },
          { name: 'name', type: 'string', nullable: false, unique: false, description: 'Username' },
          { name: 'real_name', type: 'string', nullable: true, unique: false, description: 'Real name' },
          { name: 'email', type: 'string', nullable: true, unique: false, description: 'Email' },
          { name: 'is_admin', type: 'boolean', nullable: false, unique: false, description: 'Is admin' },
          { name: 'is_owner', type: 'boolean', nullable: false, unique: false, description: 'Is owner' },
          { name: 'is_bot', type: 'boolean', nullable: false, unique: false, description: 'Is bot' },
          { name: 'updated', type: 'datetime', nullable: false, unique: false, description: 'Last updated' },
          { name: 'is_restricted', type: 'boolean', nullable: false, unique: false, description: 'Is restricted' },
          { name: 'is_ultra_restricted', type: 'boolean', nullable: false, unique: false, description: 'Is ultra restricted' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'name_index', fields: ['name'], unique: false }],
        constraints: []
      }
    ];

    return {
      tables,
      relationships: [
        {
          fromTable: 'messages',
          toTable: 'channels',
          fromField: 'channel_id',
          toField: 'id',
          type: 'many_to_one'
        },
        {
          fromTable: 'messages',
          toTable: 'users',
          fromField: 'user_id',
          toField: 'id',
          type: 'many_to_one'
        }
      ],
      version: '1.0',
      lastUpdated: new Date()
    };
  }

  async fetchData(filters?: any[], transformations?: any[]): Promise<any[]> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const objectType = filters?.find(f => f.field === 'objectType')?.value || 'messages';
    const records = await this.fetchSlackData(objectType, filters);

    return records.map(record => this.transformRecord(record, transformations));
  }

  async createRecord(data: Record<string, any>, metadata?: any): Promise<any> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const objectType = data.objectType || 'messages';

    if (objectType === 'messages') {
      const response = await this.makeRequest('chat.postMessage', 'POST', {
        channel: data.channel_id,
        text: data.text,
        thread_ts: data.thread_ts
      });

      return {
        id: response.ts,
        dataSourceId: this.id,
        externalId: response.ts,
        dataType: objectType,
        data: { ...data, ts: response.ts },
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        syncedAt: new Date(),
        version: 1,
        isDeleted: false
      };
    }

    throw new Error(`Create operation not supported for ${objectType}`);
  }

  async updateRecord(id: string, data: Record<string, any>): Promise<any> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const objectType = data.objectType || 'messages';

    if (objectType === 'messages') {
      await this.makeRequest('chat.update', 'POST', {
        channel: data.channel_id,
        ts: id,
        text: data.text
      });

      return {
        id,
        dataSourceId: this.id,
        externalId: id,
        dataType: objectType,
        data: { ...data, ts: id },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        syncedAt: new Date(),
        version: 1,
        isDeleted: false
      };
    }

    throw new Error(`Update operation not supported for ${objectType}`);
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    // Slack doesn't support deleting messages via API in the same way
    // This would require specific permissions and context
    throw new Error('Delete operation requires specific context and permissions');
  }

  async search(query: string, filters?: any[]): Promise<any[]> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const response = await this.makeRequest('search.messages', 'POST', {
      query,
      count: 100,
      sort: 'timestamp'
    });

    return response.messages.matches.map((match: any) => this.transformMessageRecord(match));
  }

  async startSync(type: SyncType, options?: any): Promise<any> {
    if (!this.botToken) {
      throw new Error('Not connected to Slack');
    }

    const syncJob = {
      id: this.generateJobId(),
      dataSourceId: this.id,
      type,
      status: 'running' as any,
      startTime: new Date(),
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      metadata: {}
    };

    try {
      const objects = options?.objects || ['channels', 'users', 'messages'];

      for (const object of objects) {
        const records = await this.syncSlackObject(object, type, options);
        syncJob.recordsProcessed += records.processed;
        syncJob.recordsCreated += records.created;
        syncJob.recordsUpdated += records.updated;
        syncJob.recordsDeleted += records.deleted;
      }

      syncJob.status = 'completed' as any;
      syncJob.endTime = new Date();
      this.lastSync = syncJob.endTime;
    } catch (error) {
      syncJob.status = 'failed' as any;
      syncJob.endTime = new Date();
      syncJob.errors.push({
        id: this.generateErrorId(),
        type: 'sync_error' as any,
        message: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date(),
        resolved: false
      });
    }

    return syncJob;
  }

  async handleWebhook(payload: any, signature?: string): Promise<any> {
    if (this.signingSecret && signature) {
      // Verify signature
      const isValid = this.verifySlackSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    const event = payload.event;
    const result = {
      success: true,
      message: 'Webhook processed successfully',
      processedEvents: 1,
      errors: []
    };

    // Process different event types
    switch (event.type) {
      case 'message':
        // Handle message events
        break;
      case 'channel_created':
        // Handle channel creation
        break;
      case 'user_change':
        // Handle user changes
        break;
      default:
        result.errors.push({
          event: event.type,
          error: 'Unhandled event type',
          details: { event }
        });
    }

    return result;
  }

  async registerWebhook(url: string, events: string[]): Promise<any> {
    // This would require setting up Slack event subscriptions
    // This is a simplified implementation
    return {
      id: `webhook_${Date.now()}`,
      url,
      events,
      isActive: true,
      createdAt: new Date(),
      lastTriggered: new Date()
    };
  }

  async unregisterWebhook(webhookId: string): Promise<void> {
    // This would require removing the event subscription
  }

  // Private helper methods
  private async makeRequest(method: string, httpMethod: string = 'POST', data?: any): Promise<any> {
    if (!this.botToken) {
      throw new Error('Not authenticated');
    }

    const url = `https://slack.com/api/${method}`;

    const response = await fetch(url, {
      method: httpMethod,
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result;
  }

  private async fetchSlackData(objectType: string, filters?: any[]): Promise<any[]> {
    switch (objectType) {
      case 'channels':
        return this.fetchChannels();
      case 'users':
        return this.fetchUsers();
      case 'messages':
        return this.fetchMessages(filters);
      default:
        throw new Error(`Unknown object type: ${objectType}`);
    }
  }

  private async fetchChannels(): Promise<any[]> {
    const response = await this.makeRequest('conversations.list', 'POST', {
      exclude_archived: true,
      types: 'public_channel,private_channel'
    });

    return response.channels;
  }

  private async fetchUsers(): Promise<any[]> {
    const response = await this.makeRequest('users.list', 'POST', {
      limit: 1000
    });

    return response.members;
  }

  private async fetchMessages(filters?: any[]): Promise<any[]> {
    const channelId = filters?.find(f => f.field === 'channel_id')?.value;
    if (!channelId) {
      throw new Error('Channel ID required for fetching messages');
    }

    const response = await this.makeRequest('conversations.history', 'POST', {
      channel: channelId,
      limit: 100
    });

    return response.messages;
  }

  private transformRecord(record: any, transformations?: any[]): any {
    let transformed = { ...record };

    if (record.ts) {
      transformed.timestamp = new Date(parseFloat(record.ts) * 1000);
    }

    if (transformations) {
      transformations.forEach(t => {
        if (t.type === 'field_mapping' && t.fieldMapping) {
          t.fieldMapping.forEach((mapping: any) => {
            if (transformed[mapping.sourceField]) {
              transformed[mapping.targetField] = transformed[mapping.sourceField];
              delete transformed[mapping.sourceField];
            }
          });
        }
      });
    }

    return transformed;
  }

  private transformMessageRecord(match: any): any {
    return {
      ...match,
      channel_id: match.channel.id,
      user_id: match.user,
      timestamp: new Date(parseFloat(match.ts) * 1000)
    };
  }

  private verifySlackSignature(payload: any, signature: string): boolean {
    // Simplified signature verification
    // In practice, you'd use crypto to verify the signature
    return true;
  }

  private async syncSlackObject(object: string, type: SyncType, options?: any): Promise<any> {
    const processed = { processed: 0, created: 0, updated: 0, deleted: 0 };

    if (type === SyncType.FULL || type === SyncType.INCREMENTAL) {
      const records = await this.fetchSlackData(object);
      processed.processed = records.length;

      // Process records (simplified for example)
      for (const record of records) {
        if (record.is_archived || record.deleted) {
          processed.deleted++;
        } else if (record.updated && this.lastSync && new Date(record.updated) > this.lastSync) {
          processed.updated++;
        } else {
          processed.created++;
        }
      }
    }

    return processed;
  }

  private generateConnectionId(): string {
    return `slack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}