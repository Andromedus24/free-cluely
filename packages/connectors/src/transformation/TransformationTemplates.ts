import { TransformationBuilder } from './TransformationBuilder';

export interface TransformationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  buildPipeline: () => TransformationBuilder;
  estimatedComplexity: 'low' | 'medium' | 'high';
  supportedDataTypes: string[];
  useCase: string;
}

export class TransformationTemplates {
  private static templates: Map<string, TransformationTemplate> = new Map();

  static {
    this.initializeTemplates();
  }

  static getTemplate(id: string): TransformationTemplate | null {
    return this.templates.get(id) || null;
  }

  static getAllTemplates(): TransformationTemplate[] {
    return Array.from(this.templates.values());
  }

  static getTemplatesByCategory(category: string): TransformationTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  static getTemplatesByTag(tag: string): TransformationTemplate[] {
    return this.getAllTemplates().filter(t => t.tags.includes(tag));
  }

  static searchTemplates(query: string): TransformationTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  static createPipelineFromTemplate(id: string, customName?: string): TransformationBuilder {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    const pipeline = template.buildPipeline();
    if (customName) {
      pipeline.pipeline.name = customName;
    }

    return pipeline;
  }

  static getTemplateCategories(): string[] {
    return Array.from(new Set(this.getAllTemplates().map(t => t.category)));
  }

  static getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.getAllTemplates().forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }

  static getRecommendedTemplates(
    dataType: string,
    useCase: string,
    complexity?: 'low' | 'medium' | 'high'
  ): TransformationTemplate[] {
    return this.getAllTemplates().filter(t => {
      const dataTypeMatch = t.supportedDataTypes.length === 0 ||
        t.supportedDataTypes.includes(dataType);
      const useCaseMatch = !useCase || t.useCase.toLowerCase().includes(useCase.toLowerCase());
      const complexityMatch = !complexity || t.estimatedComplexity === complexity;

      return dataTypeMatch && useCaseMatch && complexityMatch;
    });
  }

  private static initializeTemplates(): void {
    // Data Cleaning Templates
    this.addTemplate({
      id: 'basic_cleaning',
      name: 'Basic Data Cleaning',
      description: 'Clean and normalize raw data with basic transformations',
      category: 'Data Cleaning',
      tags: ['cleaning', 'normalization', 'basic'],
      estimatedComplexity: 'low',
      supportedDataTypes: ['string', 'number', 'date'],
      useCase: 'General data cleaning for imported data',
      buildPipeline: () => TransformationBuilder.create('Basic Data Cleaning')
        .description('Clean and normalize raw data with basic transformations')
        .addNormalization([
          { field: '*', type: 'whitespace' }
        ], 'Trim whitespace from all fields')
        .addValueTransformation([
          { field: '*', operation: 'trim' }
        ], 'Trim string values')
        .addFiltering([
          { field: '*', condition: 'empty', action: 'remove' }
        ], 'Remove empty fields')
    });

    this.addTemplate({
      id: 'contact_cleaning',
      name: 'Contact Data Cleaning',
      description: 'Specialized cleaning for contact and user data',
      category: 'Data Cleaning',
      tags: ['contact', 'user', 'cleaning'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['string', 'email', 'phone'],
      useCase: 'Clean and standardize contact information',
      buildPipeline: () => TransformationBuilder.create('Contact Data Cleaning')
        .description('Specialized cleaning for contact and user data')
        .addFieldMapping([
          { sourceField: 'email_address', targetField: 'email' },
          { sourceField: 'phone_number', targetField: 'phone' },
          { sourceField: 'full_name', targetField: 'name' }
        ], 'Map common field variations')
        .addNormalization([
          { field: 'email', type: 'case', parameters: { style: 'lower' } },
          { field: 'name', type: 'case', parameters: { style: 'title' } }
        ], 'Normalize email and name formatting')
        .addValueTransformation([
          { field: 'phone', operation: 'replace', parameters: { pattern: '[^0-9+]', replacement: '' } }
        ], 'Clean phone numbers')
        .addValidation([
          { name: 'email_format', field: 'email', type: 'pattern', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', severity: 'error' }
        ], 'Validate email format')
    });

    // Data Enrichment Templates
    this.addTemplate({
      id: 'contact_enrichment',
      name: 'Contact Data Enrichment',
      description: 'Enrich contact data with validation and additional information',
      category: 'Data Enrichment',
      tags: ['contact', 'enrichment', 'validation'],
      estimatedComplexity: 'high',
      supportedDataTypes: ['string', 'email', 'phone', 'address'],
      useCase: 'Enhance contact records with validation and lookups',
      buildPipeline: () => TransformationBuilder.create('Contact Data Enrichment')
        .description('Enrich contact data with validation and additional information')
        .addEnrichment([
          { field: 'email', type: 'email_validation', targetField: 'email_validation' },
          { field: 'phone', type: 'phone_validation', targetField: 'phone_validation' }
        ], 'Validate contact information')
        .addEnrichment([
          { field: 'address', type: 'geocoding', targetField: 'location' }
        ], 'Geocode addresses')
        .addEnrichment([
          { field: 'company', type: 'lookup', targetField: 'company_info', lookupTable: {} }
        ], 'Look up company information')
        .addAggregation([
          { targetField: 'contact_quality_score', sourceFields: ['email_validation.isValid', 'phone_validation.isValid'], operation: 'sum' }
        ], 'Calculate contact quality score')
    });

    this.addTemplate({
      id: 'ecommerce_enrichment',
      name: 'E-commerce Data Enrichment',
      description: 'Enrich e-commerce data with additional product and customer insights',
      category: 'Data Enrichment',
      tags: ['ecommerce', 'product', 'customer'],
      estimatedComplexity: 'high',
      supportedDataTypes: ['number', 'string', 'date'],
      useCase: 'Enhance e-commerce order and product data',
      buildPipeline: () => TransformationBuilder.create('E-commerce Data Enrichment')
        .description('Enrich e-commerce data with additional product and customer insights')
        .addEnrichment([
          { field: 'product_id', type: 'lookup', targetField: 'product_details', lookupTable: {} }
        ], 'Look up product details')
        .addAggregation([
          { targetField: 'order_total', sourceFields: ['subtotal', 'tax', 'shipping'], operation: 'sum' }
        ], 'Calculate order totals')
        .addValueTransformation([
          { field: 'order_date', operation: 'format', parameters: { format: 'date' } }
        ], 'Format order dates')
        .addAggregation([
          { targetField: 'customer_lifetime_value', sourceFields: ['order_total'], operation: 'sum' }
        ], 'Calculate customer lifetime value')
    });

    // Data Migration Templates
    this.addTemplate({
      id: 'salesforce_migration',
      name: 'Salesforce Migration',
      description: 'Prepare data for Salesforce import with proper field mapping and validation',
      category: 'Data Migration',
      tags: ['salesforce', 'crm', 'migration'],
      estimatedComplexity: 'high',
      supportedDataTypes: ['string', 'number', 'date', 'boolean'],
      useCase: 'Migrate data to Salesforce CRM',
      buildPipeline: () => TransformationBuilder.create('Salesforce Migration')
        .description('Prepare data for Salesforce import with proper field mapping and validation')
        .addFieldMapping([
          { sourceField: 'company_name', targetField: 'Account.Name' },
          { sourceField: 'contact_name', targetField: 'Contact.Name' },
          { sourceField: 'email', targetField: 'Contact.Email' },
          { sourceField: 'phone', targetField: 'Contact.Phone' }
        ], 'Map to Salesforce field structure')
        .addDataTypeConversion([
          { field: 'Account.AnnualRevenue', targetType: 'number' },
          { field: 'Account.NumberOfEmployees', targetType: 'number' },
          { field: 'CreatedDate', targetType: 'date' }
        ], 'Convert data types for Salesforce')
        .addValidation([
          { name: 'required_email', field: 'Contact.Email', type: 'required', severity: 'error' },
          { name: 'account_name', field: 'Account.Name', type: 'required', severity: 'error' }
        ], 'Salesforce required field validation')
    });

    this.addTemplate({
      id: 'hubspot_migration',
      name: 'HubSpot Migration',
      description: 'Prepare data for HubSpot import with proper field mapping and validation',
      category: 'Data Migration',
      tags: ['hubspot', 'marketing', 'migration'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['string', 'number', 'date'],
      useCase: 'Migrate data to HubSpot marketing platform',
      buildPipeline: () => TransformationBuilder.create('HubSpot Migration')
        .description('Prepare data for HubSpot import with proper field mapping and validation')
        .addFieldMapping([
          { sourceField: 'first_name', targetField: 'firstname' },
          { sourceField: 'last_name', targetField: 'lastname' },
          { sourceField: 'company', targetField: 'company' },
          { sourceField: 'website', targetField: 'website' }
        ], 'Map to HubSpot field structure')
        .addNormalization([
          { field: 'email', type: 'case', parameters: { style: 'lower' } }
        ], 'Normalize email format')
        .addValidation([
          { name: 'email_required', field: 'email', type: 'required', severity: 'error' }
        ], 'HubSpot required field validation')
    });

    // Data Integration Templates
    this.addTemplate({
      id: 'api_integration',
      name: 'API Data Integration',
      description: 'Transform data for API integration with field mapping and type conversion',
      category: 'Data Integration',
      tags: ['api', 'integration', 'webhook'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['string', 'number', 'boolean', 'array', 'object'],
      useCase: 'Prepare data for external API calls',
      buildPipeline: () => TransformationBuilder.create('API Data Integration')
        .description('Transform data for API integration with field mapping and type conversion')
        .addFieldMapping([
          { sourceField: 'id', targetField: 'external_id' },
          { sourceField: 'created_at', targetField: 'timestamp' },
          { sourceField: 'user_id', targetField: 'user_reference' }
        ], 'Map to API field conventions')
        .addDataTypeConversion([
          { field: 'timestamp', targetType: 'string' },
          { field: 'price', targetType: 'number' },
          { field: 'is_active', targetType: 'boolean' }
        ], 'Convert to API expected types')
        .addFormatConversion('data', 'json', 'xml', 'Convert to XML format')
    });

    this.addTemplate({
      id: 'webhook_processing',
      name: 'Webhook Data Processing',
      description: 'Process and validate incoming webhook data',
      category: 'Data Integration',
      tags: ['webhook', 'processing', 'validation'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['object', 'array', 'string', 'number'],
      useCase: 'Process data from webhook events',
      buildPipeline: () => TransformationBuilder.create('Webhook Data Processing')
        .description('Process and validate incoming webhook data')
        .addValidation([
          { name: 'event_type', field: 'event', type: 'required', severity: 'error' },
          { name: 'timestamp', field: 'timestamp', type: 'required', severity: 'error' }
        ], 'Validate webhook structure')
        .addDataTypeConversion([
          { field: 'timestamp', targetType: 'date' }
        ], 'Convert timestamp to date')
        .addEnrichment([
          { field: 'event', type: 'lookup', targetField: 'event_category', lookupTable: {} }
        ], 'Categorize webhook events')
        .addFiltering([
          { field: 'test_event', condition: 'equals', action: 'remove', value: true }
        ], 'Filter out test events')
    });

    // Data Analysis Templates
    this.addTemplate({
      id: 'analytics_preparation',
      name: 'Analytics Data Preparation',
      description: 'Prepare data for analytics and reporting with aggregation and normalization',
      category: 'Data Analysis',
      tags: ['analytics', 'reporting', 'aggregation'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['number', 'date', 'string'],
      useCase: 'Prepare data for business analytics',
      buildPipeline: () => TransformationBuilder.create('Analytics Data Preparation')
        .description('Prepare data for analytics and reporting with aggregation and normalization')
        .addAggregation([
          { targetField: 'total_revenue', sourceFields: ['sales_amount', 'tax_amount'], operation: 'sum' },
          { targetField: 'average_order_value', sourceFields: ['sales_amount'], operation: 'average' }
        ], 'Calculate business metrics')
        .addNormalization([
          { field: 'date', type: 'case', parameters: { style: 'lower' } }
        ], 'Normalize date formats')
        .addValueTransformation([
          { field: 'category', operation: 'replace', parameters: { pattern: '\\s+', replacement: '_' } }
        ], 'Normalize category names')
        .addDeduplication(['transaction_id', 'date'], 'first', 'Remove duplicate transactions')
    });

    this.addTemplate({
      id: 'time_series_analysis',
      name: 'Time Series Analysis Preparation',
      description: 'Prepare time series data for analysis with proper date handling and aggregation',
      category: 'Data Analysis',
      tags: ['time-series', 'temporal', 'analysis'],
      estimatedComplexity: 'high',
      supportedDataTypes: ['date', 'number', 'string'],
      useCase: 'Prepare data for time series analysis',
      buildPipeline: () => TransformationBuilder.create('Time Series Analysis Preparation')
        .description('Prepare time series data for analysis with proper date handling and aggregation')
        .addDataTypeConversion([
          { field: 'timestamp', targetType: 'date' }
        ], 'Convert timestamps to dates')
        .addAggregation([
          { targetField: 'daily_total', sourceFields: ['value'], operation: 'sum' }
        ], 'Aggregate by day')
        .addValueTransformation([
          { field: 'date', operation: 'format', parameters: { format: 'date' } }
        ], 'Format dates consistently')
        .addEnrichment([
          { field: 'date', type: 'calculation', targetField: 'day_of_week', expression: 'new Date({value}).getDay()' }
        ], 'Extract day of week')
        .addEnrichment([
          { field: 'date', type: 'calculation', targetField: 'month', expression: 'new Date({value}).getMonth()' }
        ], 'Extract month')
    });

    // Format Conversion Templates
    this.addTemplate({
      id: 'csv_to_json',
      name: 'CSV to JSON Conversion',
      description: 'Convert CSV data to JSON format with proper type inference',
      category: 'Format Conversion',
      tags: ['csv', 'json', 'conversion'],
      estimatedComplexity: 'low',
      supportedDataTypes: ['string', 'number', 'boolean'],
      useCase: 'Convert CSV files to JSON format',
      buildPipeline: () => TransformationBuilder.create('CSV to JSON Conversion')
        .description('Convert CSV data to JSON format with proper type inference')
        .addFormatConversion('data', 'csv', 'json', 'Convert CSV to JSON')
        .addDataTypeConversion([
          { field: 'numeric_field', targetType: 'number' },
          { field: 'boolean_field', targetType: 'boolean' }
        ], 'Infer and convert data types')
    });

    this.addTemplate({
      id: 'xml_to_json',
      name: 'XML to JSON Conversion',
      description: 'Convert XML data to JSON format with proper structure mapping',
      category: 'Format Conversion',
      tags: ['xml', 'json', 'conversion'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['object', 'array', 'string'],
      useCase: 'Convert XML data to JSON format',
      buildPipeline: () => TransformationBuilder.create('XML to JSON Conversion')
        .description('Convert XML data to JSON format with proper structure mapping')
        .addFormatConversion('data', 'xml', 'json', 'Convert XML to JSON')
        .addFieldMapping([
          { sourceField: 'root.item', targetField: 'items' },
          { sourceField: 'root.metadata', targetField: 'metadata' }
        ], 'Map XML structure to JSON')
    });

    // Security and Privacy Templates
    this.addTemplate({
      id: 'data_anonymization',
      name: 'Data Anonymization',
      description: 'Anonymize sensitive data while maintaining data structure',
      category: 'Security & Privacy',
      tags: ['anonymization', 'privacy', 'gdpr'],
      estimatedComplexity: 'medium',
      supportedDataTypes: ['string', 'email', 'phone'],
      useCase: 'Anonymize personal data for privacy compliance',
      buildPipeline: () => TransformationBuilder.create('Data Anonymization')
        .description('Anonymize sensitive data while maintaining data structure')
        .addFiltering([
          { field: 'email', condition: 'exists', action: 'mask', maskType: 'email' },
          { field: 'phone', condition: 'exists', action: 'mask', maskType: 'partial' },
          { field: 'ssn', condition: 'exists', action: 'mask', maskType: 'full' },
          { field: 'credit_card', condition: 'exists', action: 'mask', maskType: 'full' }
        ], 'Mask sensitive fields')
        .addValueTransformation([
          { field: 'name', operation: 'replace', parameters: { pattern: '.', replacement: '*' } }
        ], 'Anonymize names')
        .addDeduplication(['user_id'], 'first', 'Remove user identifiers')
    });

    this.addTemplate({
      id: 'gdpr_compliance',
      name: 'GDPR Compliance Preparation',
      description: 'Prepare data for GDPR compliance with proper handling of personal information',
      category: 'Security & Privacy',
      tags: ['gdpr', 'compliance', 'privacy'],
      estimatedComplexity: 'high',
      supportedDataTypes: ['string', 'date', 'email', 'phone'],
      useCase: 'Ensure data meets GDPR requirements',
      buildPipeline: () => TransformationBuilder.create('GDPR Compliance Preparation')
        .description('Prepare data for GDPR compliance with proper handling of personal information')
        .addFieldMapping([
          { sourceField: 'consent_given', targetField: 'gdpr_consent' },
          { sourceField: 'data_retention_date', targetField: 'retention_until' }
        ], 'Map GDPR-specific fields')
        .addValidation([
          { name: 'consent_required', field: 'gdpr_consent', type: 'required', severity: 'error' }
        ], 'Validate consent data')
        .addEnrichment([
          { field: 'email', type: 'calculation', targetField: 'data_subject_category', expression: '\'personal\'' }
        ], 'Categorize personal data')
        .addFiltering([
          { field: 'sensitive_data', condition: 'exists', action: 'mask', maskType: 'full' }
        ], 'Protect sensitive information')
    });

    console.log(`Initialized ${this.templates.size} transformation templates`);
  }

  private static addTemplate(template: TransformationTemplate): void {
    this.templates.set(template.id, template);
  }
}