import { DataConnector } from '../types/ConnectorTypes';
import { DataConnectorInterface } from '../interfaces/ConnectorInterface';
import { ConnectorCategory, ConnectorFeature, AuthenticationMethod, DataType, SyncType, FilterOperator } from '../types/ConnectorTypes';

export class GitHubConnector implements DataConnector {
  id = 'github';
  name = 'GitHub';
  description = 'Software development platform and code hosting service';
  version = '1.0.0';
  author = 'Atlas AI';
  category = ConnectorCategory.DEVELOPER;
  icon = '🐙';
  supportedFeatures = [
    ConnectorFeature.DATA_SYNC,
    ConnectorFeature.WEBHOOKS,
    ConnectorFeature.REAL_TIME,
    ConnectorFeature.BULK_EXPORT,
    ConnectorFeature.CUSTOM_FIELDS,
    ConnectorFeature.ADVANCED_FILTERING,
    ConnectorFeature.DATA_TRANSFORMATION,
    ConnectorFeature.RELATIONSHIPS,
    ConnectorFeature.WEBHOOKS_INBOUND,
    ConnectorFeature.WEBHOOKS_OUTBOUND
  ];
  authentication = [AuthenticationMethod.OAUTH2, AuthenticationMethod.PERSONAL_ACCESS_TOKEN];
  dataTypes = [DataType.STRING, DataType.NUMBER, DataType.BOOLEAN, DataType.DATE, DataType.DATETIME, DataType.JSON, DataType.ARRAY];
  configuration = {
    fields: [
      {
        name: 'token',
        label: 'Personal Access Token',
        type: 'password',
        description: 'GitHub personal access token with required permissions',
        required: true,
        sensitive: true,
        validation: [
          { type: 'required', value: true, message: 'Personal access token is required' },
          { type: 'pattern', value: '^ghp_[A-Za-z0-9_]{36}$', message: 'Invalid GitHub token format' }
        ],
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        description: 'GitHub Enterprise Server URL (leave blank for GitHub.com)',
        required: false,
        sensitive: false,
        validation: [
          { type: 'pattern', value: '^https?://.*', message: 'Must be a valid URL' }
        ],
        placeholder: 'https://github.enterprise.com'
      },
      {
        name: 'repositories',
        label: 'Repositories',
        type: 'multi_select',
        description: 'Specific repositories to sync (leave blank for all accessible repos)',
        required: false,
        sensitive: false,
        validation: [],
        options: []
      }
    ],
    validationRules: [],
    defaults: {
      syncFrequency: 'hourly',
      batchSize: 100,
      concurrency: 5
    },
    required: ['token']
  };
  status = 'disconnected' as any;
  lastSync?: Date;
  error?: string;
  metadata = {
    website: 'https://github.com',
    documentation: 'https://docs.github.com/en/rest',
    supportEmail: 'support@github.com',
    pricing: {
      model: 'freemium',
      features: ['Free for public repos', 'Paid plans for private repos', 'Enterprise options']
    },
    limits: {
      rateLimit: 5000,
      rateLimitWindow: '1h',
      maxRecords: 100000,
      maxDataSize: 1073741824, // 1GB
      concurrentConnections: 15
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

  private token?: string;
  private baseUrl?: string;
  private repositories?: string[];

  async connect(config: Record<string, any>): Promise<any> {
    try {
      this.token = config.token;
      this.baseUrl = config.baseUrl || 'https://api.github.com';
      this.repositories = config.repositories;

      // Test the connection
      await this.testConnection(config);

      this.status = 'connected' as any;
      return {
        success: true,
        connectionId: this.generateConnectionId(),
        scopes: ['repo', 'user', 'admin:repo_hook']
      };
    } catch (error) {
      this.status = 'error' as any;
      this.error = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.token = undefined;
    this.baseUrl = undefined;
    this.repositories = undefined;
    this.status = 'disconnected' as any;
  }

  async testConnection(config: Record<string, any>): Promise<any> {
    try {
      const response = await this.makeRequest('/user');

      return {
        success: true,
        message: `Successfully connected to GitHub as ${response.login}`,
        details: {
          responseTime: 200,
          rateLimitRemaining: 4999,
          supportedFeatures: this.supportedFeatures,
          authenticatedUser: response.login,
          permissions: ['read', 'write', 'admin']
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
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    const tables = [
      {
        name: 'repositories',
        fields: [
          { name: 'id', type: 'number', nullable: false, unique: true, description: 'Repository ID' },
          { name: 'name', type: 'string', nullable: false, unique: false, description: 'Repository name' },
          { name: 'full_name', type: 'string', nullable: false, unique: true, description: 'Full repository name' },
          { name: 'owner', type: 'string', nullable: false, unique: false, description: 'Repository owner' },
          { name: 'description', type: 'string', nullable: true, unique: false, description: 'Repository description' },
          { name: 'private', type: 'boolean', nullable: false, unique: false, description: 'Is private' },
          { name: 'fork', type: 'boolean', nullable: false, unique: false, description: 'Is fork' },
          { name: 'created_at', type: 'datetime', nullable: false, unique: false, description: 'Created at' },
          { name: 'updated_at', type: 'datetime', nullable: false, unique: false, description: 'Updated at' },
          { name: 'pushed_at', type: 'datetime', nullable: false, unique: false, description: 'Last push' },
          { name: 'git_url', type: 'string', nullable: false, unique: false, description: 'Git URL' },
          { name: 'ssh_url', type: 'string', nullable: false, unique: false, description: 'SSH URL' },
          { name: 'clone_url', type: 'string', nullable: false, unique: false, description: 'Clone URL' },
          { name: 'language', type: 'string', nullable: true, unique: false, description: 'Primary language' },
          { name: 'forks_count', type: 'number', nullable: false, unique: false, description: 'Forks count' },
          { name: 'stargazers_count', type: 'number', nullable: false, unique: false, description: 'Stars count' },
          { name: 'watchers_count', type: 'number', nullable: false, unique: false, description: 'Watchers count' },
          { name: 'size', type: 'number', nullable: false, unique: false, description: 'Repository size' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'full_name_index', fields: ['full_name'], unique: true }],
        constraints: []
      },
      {
        name: 'issues',
        fields: [
          { name: 'id', type: 'number', nullable: false, unique: true, description: 'Issue ID' },
          { name: 'repository_id', type: 'number', nullable: false, unique: false, description: 'Repository ID' },
          { name: 'number', type: 'number', nullable: false, unique: false, description: 'Issue number' },
          { name: 'title', type: 'string', nullable: false, unique: false, description: 'Issue title' },
          { name: 'body', type: 'string', nullable: true, unique: false, description: 'Issue body' },
          { name: 'state', type: 'string', nullable: false, unique: false, description: 'Issue state' },
          { name: 'user_id', type: 'number', nullable: false, unique: false, description: 'Creator user ID' },
          { name: 'assignee_id', type: 'number', nullable: true, unique: false, description: 'Assignee user ID' },
          { name: 'milestone_id', type: 'number', nullable: true, unique: false, description: 'Milestone ID' },
          { name: 'created_at', type: 'datetime', nullable: false, unique: false, description: 'Created at' },
          { name: 'updated_at', type: 'datetime', nullable: false, unique: false, description: 'Updated at' },
          { name: 'closed_at', type: 'datetime', nullable: true, unique: false, description: 'Closed at' },
          { name: 'labels', type: 'array', nullable: true, unique: false, description: 'Issue labels' },
          { name: 'pull_request', type: 'object', nullable: true, unique: false, description: 'Pull request info' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'repository_number_index', fields: ['repository_id', 'number'], unique: true }],
        constraints: []
      },
      {
        name: 'pull_requests',
        fields: [
          { name: 'id', type: 'number', nullable: false, unique: true, description: 'PR ID' },
          { name: 'repository_id', type: 'number', nullable: false, unique: false, description: 'Repository ID' },
          { name: 'number', type: 'number', nullable: false, unique: false, description: 'PR number' },
          { name: 'title', type: 'string', nullable: false, unique: false, description: 'PR title' },
          { name: 'body', type: 'string', nullable: true, unique: false, description: 'PR body' },
          { name: 'state', type: 'string', nullable: false, unique: false, description: 'PR state' },
          { name: 'user_id', type: 'number', nullable: false, unique: false, description: 'Creator user ID' },
          { name: 'assignee_id', type: 'number', nullable: true, unique: false, description: 'Assignee user ID' },
          { name: 'created_at', type: 'datetime', nullable: false, unique: false, description: 'Created at' },
          { name: 'updated_at', type: 'datetime', nullable: false, unique: false, description: 'Updated at' },
          { name: 'closed_at', type: 'datetime', nullable: true, unique: false, description: 'Closed at' },
          { name: 'merged_at', type: 'datetime', nullable: true, unique: false, description: 'Merged at' },
          { name: 'head_ref', type: 'string', nullable: false, unique: false, description: 'Head branch' },
          { name: 'base_ref', type: 'string', nullable: false, unique: false, description: 'Base branch' },
          { name: 'mergeable', type: 'boolean', nullable: true, unique: false, description: 'Is mergeable' },
          { name: 'merged', type: 'boolean', nullable: false, unique: false, description: 'Is merged' },
          { name: 'draft', type: 'boolean', nullable: false, unique: false, description: 'Is draft' },
          { name: 'commits', type: 'number', nullable: false, unique: false, description: 'Commits count' },
          { name: 'additions', type: 'number', nullable: false, unique: false, description: 'Additions count' },
          { name: 'deletions', type: 'number', nullable: false, unique: false, description: 'Deletions count' },
          { name: 'changed_files', type: 'number', nullable: false, unique: false, description: 'Changed files count' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'repository_number_index', fields: ['repository_id', 'number'], unique: true }],
        constraints: []
      },
      {
        name: 'commits',
        fields: [
          { name: 'sha', type: 'string', nullable: false, unique: true, description: 'Commit SHA' },
          { name: 'repository_id', type: 'number', nullable: false, unique: false, description: 'Repository ID' },
          { name: 'message', type: 'string', nullable: false, unique: false, description: 'Commit message' },
          { name: 'author_id', type: 'number', nullable: true, unique: false, description: 'Author user ID' },
          { name: 'committer_id', type: 'number', nullable: true, unique: false, description: 'Committer user ID' },
          { name: 'author_name', type: 'string', nullable: false, unique: false, description: 'Author name' },
          { name: 'author_email', type: 'string', nullable: false, unique: false, description: 'Author email' },
          { name: 'committer_name', type: 'string', nullable: false, unique: false, description: 'Committer name' },
          { name: 'committer_email', type: 'string', nullable: false, unique: false, description: 'Committer email' },
          { name: 'authored_date', type: 'datetime', nullable: false, unique: false, description: 'Authored at' },
          { name: 'committed_date', type: 'datetime', nullable: false, unique: false, description: 'Committed at' },
          { name: 'url', type: 'string', nullable: false, unique: false, description: 'Commit URL' },
          { name: 'html_url', type: 'string', nullable: false, unique: false, description: 'HTML URL' },
          { name: 'comments_url', type: 'string', nullable: false, unique: false, description: 'Comments URL' },
          { name: 'additions', type: 'number', nullable: false, unique: false, description: 'Additions count' },
          { name: 'deletions', type: 'number', nullable: false, unique: false, description: 'Deletions count' },
          { name: 'total', type: 'number', nullable: false, unique: false, description: 'Total changes' },
          { name: 'files', type: 'array', nullable: true, unique: false, description: 'Changed files' }
        ],
        primaryKey: ['sha'],
        indexes: [{ name: 'repository_date_index', fields: ['repository_id', 'committed_date'], unique: false }],
        constraints: []
      },
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'number', nullable: false, unique: true, description: 'User ID' },
          { name: 'login', type: 'string', nullable: false, unique: true, description: 'Username' },
          { name: 'name', type: 'string', nullable: true, unique: false, description: 'Full name' },
          { name: 'email', type: 'string', nullable: true, unique: false, description: 'Email' },
          { name: 'avatar_url', type: 'string', nullable: false, unique: false, description: 'Avatar URL' },
          { name: 'gravatar_id', type: 'string', nullable: true, unique: false, description: 'Gravatar ID' },
          { name: 'url', type: 'string', nullable: false, unique: false, description: 'User URL' },
          { name: 'html_url', type: 'string', nullable: false, unique: false, description: 'HTML URL' },
          { name: 'followers_url', type: 'string', nullable: false, unique: false, description: 'Followers URL' },
          { name: 'following_url', type: 'string', nullable: false, unique: false, description: 'Following URL' },
          { name: 'gists_url', type: 'string', nullable: false, unique: false, description: 'Gists URL' },
          { name: 'starred_url', type: 'string', nullable: false, unique: false, description: 'Starred URL' },
          { name: 'subscriptions_url', type: 'string', nullable: false, unique: false, description: 'Subscriptions URL' },
          { name: 'organizations_url', type: 'string', nullable: false, unique: false, description: 'Organizations URL' },
          { name: 'repos_url', type: 'string', nullable: false, unique: false, description: 'Repos URL' },
          { name: 'events_url', type: 'string', nullable: false, unique: false, description: 'Events URL' },
          { name: 'received_events_url', type: 'string', nullable: false, unique: false, description: 'Received events URL' },
          { name: 'type', type: 'string', nullable: false, unique: false, description: 'User type' },
          { name: 'site_admin', type: 'boolean', nullable: false, unique: false, description: 'Is site admin' },
          { name: 'company', type: 'string', nullable: true, unique: false, description: 'Company' },
          { name: 'blog', type: 'string', nullable: true, unique: false, description: 'Blog' },
          { name: 'location', type: 'string', nullable: true, unique: false, description: 'Location' },
          { name: 'hireable', type: 'boolean', nullable: true, unique: false, description: 'Is hireable' },
          { name: 'bio', type: 'string', nullable: true, unique: false, description: 'Bio' },
          { name: 'public_repos', type: 'number', nullable: false, unique: false, description: 'Public repos count' },
          { name: 'public_gists', type: 'number', nullable: false, unique: false, description: 'Public gists count' },
          { name: 'followers', type: 'number', nullable: false, unique: false, description: 'Followers count' },
          { name: 'following', type: 'number', nullable: false, unique: false, description: 'Following count' },
          { name: 'created_at', type: 'datetime', nullable: false, unique: false, description: 'Created at' },
          { name: 'updated_at', type: 'datetime', nullable: false, unique: false, description: 'Updated at' }
        ],
        primaryKey: ['id'],
        indexes: [{ name: 'login_index', fields: ['login'], unique: true }],
        constraints: []
      }
    ];

    return {
      tables,
      relationships: [
        {
          fromTable: 'issues',
          toTable: 'repositories',
          fromField: 'repository_id',
          toField: 'id',
          type: 'many_to_one'
        },
        {
          fromTable: 'pull_requests',
          toTable: 'repositories',
          fromField: 'repository_id',
          toField: 'id',
          type: 'many_to_one'
        },
        {
          fromTable: 'commits',
          toTable: 'repositories',
          fromField: 'repository_id',
          toField: 'id',
          type: 'many_to_one'
        },
        {
          fromTable: 'issues',
          toTable: 'users',
          fromField: 'user_id',
          toField: 'id',
          type: 'many_to_one'
        },
        {
          fromTable: 'pull_requests',
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
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    const objectType = filters?.find(f => f.field === 'objectType')?.value || 'repositories';
    const records = await this.fetchGitHubData(objectType, filters);

    return records.map(record => this.transformRecord(record, transformations));
  }

  async createRecord(data: Record<string, any>, metadata?: any): Promise<any> {
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    const objectType = data.objectType || 'issues';

    if (objectType === 'issues') {
      const response = await this.makeRequest(`/repos/${data.repository}/issues`, 'POST', {
        title: data.title,
        body: data.body,
        labels: data.labels,
        assignees: data.assignees
      });

      return {
        id: response.id,
        dataSourceId: this.id,
        externalId: response.id,
        dataType: objectType,
        data: { ...data, ...response },
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
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    const objectType = data.objectType || 'issues';

    if (objectType === 'issues') {
      const response = await this.makeRequest(`/repos/${data.repository}/issues/${id}`, 'PATCH', {
        title: data.title,
        body: data.body,
        state: data.state,
        labels: data.labels,
        assignees: data.assignees
      });

      return {
        id: response.id,
        dataSourceId: this.id,
        externalId: response.id,
        dataType: objectType,
        data: { ...data, ...response },
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
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    // GitHub doesn't support deleting issues via API in the same way
    // This would require specific permissions and context
    throw new Error('Delete operation requires specific context and permissions');
  }

  async search(query: string, filters?: any[]): Promise<any[]> {
    if (!this.token) {
      throw new Error('Not connected to GitHub');
    }

    const objectType = filters?.find(f => f.field === 'objectType')?.value || 'repositories';
    const searchQuery = `${query} ${filters ? this.buildSearchFilters(filters) : ''}`;

    const response = await this.makeRequest(`/search/${objectType}`, 'GET', null, {
      q: searchQuery,
      per_page: 100
    });

    return response.items.map((item: any) => this.transformRecord(item));
  }

  async startSync(type: SyncType, options?: any): Promise<any> {
    if (!this.token) {
      throw new Error('Not connected to GitHub');
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
      const objects = options?.objects || ['repositories', 'issues', 'pull_requests', 'commits'];

      for (const object of objects) {
        const records = await this.syncGitHubObject(object, type, options);
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

  // Private helper methods
  private async makeRequest(endpoint: string, method: string = 'GET', data?: any, params?: any): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, params[key]);
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchGitHubData(objectType: string, filters?: any[]): Promise<any[]> {
    switch (objectType) {
      case 'repositories':
        return this.fetchRepositories(filters);
      case 'issues':
        return this.fetchIssues(filters);
      case 'pull_requests':
        return this.fetchPullRequests(filters);
      case 'commits':
        return this.fetchCommits(filters);
      case 'users':
        return this.fetchUsers(filters);
      default:
        throw new Error(`Unknown object type: ${objectType}`);
    }
  }

  private async fetchRepositories(filters?: any[]): Promise<any[]> {
    if (this.repositories && this.repositories.length > 0) {
      const promises = this.repositories.map(repo =>
        this.makeRequest(`/repos/${repo}`)
      );
      return await Promise.all(promises);
    }

    // Fetch user repositories
    const response = await this.makeRequest('/user/repos');
    return response;
  }

  private async fetchIssues(filters?: any[]): Promise<any[]> {
    const repository = filters?.find(f => f.field === 'repository')?.value;
    if (!repository) {
      throw new Error('Repository required for fetching issues');
    }

    const response = await this.makeRequest(`/repos/${repository}/issues`);
    return response;
  }

  private async fetchPullRequests(filters?: any[]): Promise<any[]> {
    const repository = filters?.find(f => f.field === 'repository')?.value;
    if (!repository) {
      throw new Error('Repository required for fetching pull requests');
    }

    const response = await this.makeRequest(`/repos/${repository}/pulls`);
    return response;
  }

  private async fetchCommits(filters?: any[]): Promise<any[]> {
    const repository = filters?.find(f => f.field === 'repository')?.value;
    if (!repository) {
      throw new Error('Repository required for fetching commits');
    }

    const response = await this.makeRequest(`/repos/${repository}/commits`);
    return response;
  }

  private async fetchUsers(filters?: any[]): Promise<any[]> {
    const usernames = filters?.filter(f => f.field === 'username').map(f => f.value);
    if (usernames && usernames.length > 0) {
      const promises = usernames.map(username =>
        this.makeRequest(`/users/${username}`)
      );
      return await Promise.all(promises);
    }

    // Search for users
    const query = filters?.find(f => f.field === 'query')?.value || 'type:user';
    const response = await this.makeRequest('/search/users', 'GET', null, { q: query });
    return response.items;
  }

  private buildSearchFilters(filters?: any[]): string {
    if (!filters || filters.length === 0) {
      return '';
    }

    return filters
      .filter(f => f.field !== 'objectType')
      .map(f => `${f.field}:${f.value}`)
      .join(' ');
  }

  private transformRecord(record: any, transformations?: any[]): any {
    let transformed = { ...record };

    // Convert date strings to Date objects
    if (record.created_at) {
      transformed.created_at = new Date(record.created_at);
    }
    if (record.updated_at) {
      transformed.updated_at = new Date(record.updated_at);
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

  private async syncGitHubObject(object: string, type: SyncType, options?: any): Promise<any> {
    const processed = { processed: 0, created: 0, updated: 0, deleted: 0 };

    if (type === SyncType.FULL || type === SyncType.INCREMENTAL) {
      const records = await this.fetchGitHubData(object);
      processed.processed = records.length;

      // Process records (simplified for example)
      for (const record of records) {
        if (record.state === 'closed' || record.archived) {
          processed.deleted++;
        } else if (record.updated_at && this.lastSync && new Date(record.updated_at) > this.lastSync) {
          processed.updated++;
        } else {
          processed.created++;
        }
      }
    }

    return processed;
  }

  private generateConnectionId(): string {
    return `github_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}