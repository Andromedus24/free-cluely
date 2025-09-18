import {
  DataConnector,
  ConnectorCategory,
  AuthenticationMethod,
  ConnectorFeature,
  DataType
} from '../types/ConnectorTypes';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, DataConnector> = new Map();
  private connectorClasses: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  /**
   * Register a new connector
   */
  public register(connectorClass: any): void {
    const connector = new connectorClass();

    if (!this.validateConnector(connector)) {
      throw new Error(`Invalid connector: ${connector.id}`);
    }

    this.connectors.set(connector.id, connector);
    this.connectorClasses.set(connector.id, connectorClass);

    console.log(`Registered connector: ${connector.name} (${connector.id})`);
  }

  /**
   * Unregister a connector
   */
  public unregister(connectorId: string): boolean {
    const removed = this.connectors.delete(connectorId);
    this.connectorClasses.delete(connectorId);

    if (removed) {
      console.log(`Unregistered connector: ${connectorId}`);
    }

    return removed;
  }

  /**
   * Get a connector by ID
   */
  public getConnector(connectorId: string): DataConnector | null {
    return this.connectors.get(connectorId) || null;
  }

  /**
   * Get all registered connectors
   */
  public getAllConnectors(): DataConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get connectors by category
   */
  public getConnectorsByCategory(category: ConnectorCategory): DataConnector[] {
    return this.getAllConnectors().filter(connector => connector.category === category);
  }

  /**
   * Get connectors by authentication method
   */
  public getConnectorsByAuthentication(authMethod: AuthenticationMethod): DataConnector[] {
    return this.getAllConnectors().filter(connector =>
      connector.authentication.includes(authMethod)
    );
  }

  /**
   * Get connectors by feature
   */
  public getConnectorsByFeature(feature: ConnectorFeature): DataConnector[] {
    return this.getAllConnectors().filter(connector =>
      connector.supportedFeatures.includes(feature)
    );
  }

  /**
   * Get connectors by data type
   */
  public getConnectorsByDataType(dataType: DataType): DataConnector[] {
    return this.getAllConnectors().filter(connector =>
      connector.dataTypes.includes(dataType)
    );
  }

  /**
   * Search connectors by name or description
   */
  public searchConnectors(query: string): DataConnector[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllConnectors().filter(connector =>
      connector.name.toLowerCase().includes(lowerQuery) ||
      connector.description.toLowerCase().includes(lowerQuery) ||
      connector.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get popular connectors (most used or featured)
   */
  public getPopularConnectors(limit: number = 10): DataConnector[] {
    // For now, return connectors marked as popular or with high usage
    return this.getAllConnectors()
      .sort((a, b) => {
        // Sort by popularity indicators - could be based on usage metrics later
        const aScore = this.calculatePopularityScore(a);
        const bScore = this.calculatePopularityScore(b);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get recommended connectors for user based on their profile
   */
  public getRecommendedConnectors(userProfile: {
    industry?: string;
    companySize?: string;
    existingConnectors?: string[];
    preferences?: string[];
  }): DataConnector[] {
    const allConnectors = this.getAllConnectors();

    // Simple recommendation logic based on industry and existing connectors
    const recommendations = allConnectors.filter(connector => {
      // Avoid recommending already connected services
      if (userProfile.existingConnectors?.includes(connector.id)) {
        return false;
      }

      // Industry-specific recommendations
      if (userProfile.industry) {
        const industryRecommendations = this.getIndustryRecommendations(userProfile.industry);
        if (industryRecommendations.includes(connector.id)) {
          return true;
        }
      }

      // Company size recommendations
      if (userProfile.companySize) {
        const sizeRecommendations = this.getSizeRecommendations(userProfile.companySize);
        if (sizeRecommendations.includes(connector.id)) {
          return true;
        }
      }

      return false;
    });

    return recommendations.slice(0, 8); // Return top 8 recommendations
  }

  /**
   * Validate connector structure and required fields
   */
  private validateConnector(connector: DataConnector): boolean {
    const requiredFields = ['id', 'name', 'description', 'version', 'category', 'authentication', 'dataTypes'];

    for (const field of requiredFields) {
      if (!connector[field as keyof DataConnector]) {
        console.error(`Connector missing required field: ${field}`);
        return false;
      }
    }

    // Validate ID format
    if (!/^[a-z0-9_-]+$/.test(connector.id)) {
      console.error(`Invalid connector ID format: ${connector.id}`);
      return false;
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(connector.version)) {
      console.error(`Invalid version format: ${connector.version}`);
      return false;
    }

    return true;
  }

  /**
   * Calculate popularity score for a connector
   */
  private calculatePopularityScore(connector: DataConnector): number {
    let score = 0;

    // Base score from featured status
    if (connector.metadata.capabilities.realTimeSync) score += 10;
    if (connector.metadata.capabilities.webhookSupport) score += 8;
    if (connector.metadata.pricing?.model === 'free') score += 15;

    // Feature diversity bonus
    score += connector.supportedFeatures.length * 2;

    // Data type diversity bonus
    score += connector.dataTypes.length * 3;

    // Authentication method flexibility
    score += connector.authentication.length * 5;

    return score;
  }

  /**
   * Get industry-specific connector recommendations
   */
  private getIndustryRecommendations(industry: string): string[] {
    const recommendations: Record<string, string[]> = {
      'technology': ['github', 'jira', 'slack', 'notion'],
      'healthcare': ['salesforce', 'hubspot', 'mailchimp'],
      'finance': ['stripe', 'quickbooks', 'xero'],
      'retail': ['shopify', 'mailchimp', 'google-analytics'],
      'education': ['google-calendar', 'slack', 'notion'],
      'consulting': ['salesforce', 'hubspot', 'quickbooks'],
      'manufacturing': ['quickbooks', 'salesforce', 'slack'],
      'real-estate': ['salesforce', 'mailchimp', 'google-calendar']
    };

    return recommendations[industry.toLowerCase()] || [];
  }

  /**
   * Get company size-based connector recommendations
   */
  private getSizeRecommendations(companySize: string): string[] {
    const recommendations: Record<string, string[]> = {
      'startup': ['github', 'slack', 'notion', 'stripe'],
      'small': ['quickbooks', 'mailchimp', 'slack', 'google-calendar'],
      'medium': ['salesforce', 'hubspot', 'slack', 'notion'],
      'large': ['salesforce', 'service-now', 'workday', 'tableau'],
      'enterprise': ['sap', 'oracle', 'microsoft-365', 'salesforce']
    };

    return recommendations[companySize.toLowerCase()] || [];
  }

  /**
   * Get connector statistics
   */
  public getStatistics(): {
    total: number;
    byCategory: Record<ConnectorCategory, number>;
    byAuthentication: Record<AuthenticationMethod, number>;
    byFeature: Record<ConnectorFeature, number>;
  } {
    const connectors = this.getAllConnectors();

    const byCategory = Object.values(ConnectorCategory).reduce((acc, category) => {
      acc[category] = connectors.filter(c => c.category === category).length;
      return acc;
    }, {} as Record<ConnectorCategory, number>);

    const byAuthentication = Object.values(AuthenticationMethod).reduce((acc, method) => {
      acc[method] = connectors.filter(c => c.authentication.includes(method)).length;
      return acc;
    }, {} as Record<AuthenticationMethod, number>);

    const byFeature = Object.values(ConnectorFeature).reduce((acc, feature) => {
      acc[feature] = connectors.filter(c => c.supportedFeatures.includes(feature)).length;
      return acc;
    }, {} as Record<ConnectorFeature, number>);

    return {
      total: connectors.length,
      byCategory,
      byAuthentication,
      byFeature
    };
  }

  /**
   * Export connector definitions for backup/migration
   */
  public exportConnectors(): any[] {
    return this.getAllConnectors().map(connector => ({
      id: connector.id,
      name: connector.name,
      description: connector.description,
      version: connector.version,
      category: connector.category,
      configuration: connector.configuration
    }));
  }

  /**
   * Import connector definitions
   */
  public importConnectors(definitions: any[]): void {
    // This would be used to restore connectors from backup
    // Implementation would need to validate and recreate connectors
    console.log(`Importing ${definitions.length} connector definitions`);
  }
}

// Factory function for creating connector instances
export const createConnector = (connectorId: string, config: Record<string, any> = {}): any => {
  const registry = ConnectorRegistry.getInstance();
  const connectorClass = registry.connectorClasses.get(connectorId);

  if (!connectorClass) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  return new connectorClass(config);
};

// Initialize with built-in connectors
export const initializeConnectors = async (): Promise<void> => {
  const registry = ConnectorRegistry.getInstance();

  // Import and register built-in connectors
  try {
    // Dynamic imports to avoid circular dependencies
    const { SalesforceConnector } = await import('../connectors/SalesforceConnector');
    const { HubSpotConnector } = await import('../connectors/HubSpotConnector');
    const { SlackConnector } = await import('../connectors/SlackConnector');
    const { GitHubConnector } = await import('../connectors/GitHubConnector');
    const { NotionConnector } = await import('../connectors/NotionConnector');

    // Register popular business service connectors
    registry.register(SalesforceConnector);
    registry.register(HubSpotConnector);
    registry.register(SlackConnector);
    registry.register(GitHubConnector);
    registry.register(NotionConnector);

    console.log('Registered built-in connectors: Salesforce, HubSpot, Slack, GitHub, Notion');
  } catch (error) {
    console.error('Failed to initialize built-in connectors:', error);
  }

  console.log('Connector registry initialized');
};