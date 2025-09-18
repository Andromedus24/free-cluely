import { TransformationTemplates } from '../TransformationTemplates';
import { TransformationBuilder } from '../TransformationBuilder';

describe('TransformationTemplates', () => {
  beforeEach(() => {
    // Clear any existing templates for clean testing
    // @ts-ignore - accessing private property for testing
    TransformationTemplates.templates.clear();
    // Reinitialize templates
    // @ts-ignore
    TransformationTemplates.initializeTemplates();
  });

  describe('Template Management', () => {
    it('should get all templates', () => {
      const templates = TransformationTemplates.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.id && t.name && t.description)).toBe(true);
    });

    it('should get template by ID', () => {
      const template = TransformationTemplates.getTemplate('basic_cleaning');
      expect(template).toBeTruthy();
      expect(template!.name).toBe('Basic Data Cleaning');
      expect(template!.category).toBe('Data Cleaning');
    });

    it('should return null for non-existent template', () => {
      const template = TransformationTemplates.getTemplate('nonexistent');
      expect(template).toBeNull();
    });

    it('should get templates by category', () => {
      const cleaningTemplates = TransformationTemplates.getTemplatesByCategory('Data Cleaning');
      expect(cleaningTemplates.length).toBeGreaterThan(0);
      expect(cleaningTemplates.every(t => t.category === 'Data Cleaning')).toBe(true);
    });

    it('should get templates by tag', () => {
      const taggedTemplates = TransformationTemplates.getTemplatesByTag('cleaning');
      expect(taggedTemplates.length).toBeGreaterThan(0);
      expect(taggedTemplates.every(t => t.tags.includes('cleaning'))).toBe(true);
    });

    it('should search templates', () => {
      const searchResults = TransformationTemplates.searchTemplates('cleaning');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.every(t =>
        t.name.toLowerCase().includes('cleaning') ||
        t.description.toLowerCase().includes('cleaning') ||
        t.tags.some(tag => tag.toLowerCase().includes('cleaning'))
      )).toBe(true);
    });

    it('should get template categories', () => {
      const categories = TransformationTemplates.getTemplateCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('Data Cleaning');
      expect(categories).toContain('Data Enrichment');
    });

    it('should get all tags', () => {
      const tags = TransformationTemplates.getAllTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags).toContain('cleaning');
      expect(tags).toContain('validation');
    });

    it('should get recommended templates', () => {
      const recommended = TransformationTemplates.getRecommendedTemplates('string', 'contact');
      expect(recommended.length).toBeGreaterThan(0);

      // Should include contact-related templates
      const contactTemplates = recommended.filter(t =>
        t.name.toLowerCase().includes('contact') ||
        t.useCase.toLowerCase().includes('contact')
      );
      expect(contactTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Types', () => {
    it('should have data cleaning templates', () => {
      const cleaningTemplates = TransformationTemplates.getTemplatesByCategory('Data Cleaning');
      expect(cleaningTemplates.length).toBeGreaterThan(0);

      const basicCleaning = TransformationTemplates.getTemplate('basic_cleaning');
      expect(basicCleaning).toBeTruthy();
      expect(basicCleaning!.estimatedComplexity).toBe('low');
      expect(basicCleaning!.supportedDataTypes).toContain('string');
    });

    it('should have data enrichment templates', () => {
      const enrichmentTemplates = TransformationTemplates.getTemplatesByCategory('Data Enrichment');
      expect(enrichmentTemplates.length).toBeGreaterThan(0);

      const contactEnrichment = TransformationTemplates.getTemplate('contact_enrichment');
      expect(contactEnrichment).toBeTruthy();
      expect(contactEnrichment!.estimatedComplexity).toBe('high');
      expect(contactEnrichment!.tags).toContain('enrichment');
    });

    it('should have data migration templates', () => {
      const migrationTemplates = TransformationTemplates.getTemplatesByCategory('Data Migration');
      expect(migrationTemplates.length).toBeGreaterThan(0);

      const salesforceMigration = TransformationTemplates.getTemplate('salesforce_migration');
      expect(salesforceMigration).toBeTruthy();
      expect(salesforceMigration!.tags).toContain('salesforce');
      expect(salesforceMigration!.tags).toContain('migration');
    });

    it('should have data integration templates', () => {
      const integrationTemplates = TransformationTemplates.getTemplatesByCategory('Data Integration');
      expect(integrationTemplates.length).toBeGreaterThan(0);

      const apiIntegration = TransformationTemplates.getTemplate('api_integration');
      expect(apiIntegration).toBeTruthy();
      expect(apiIntegration!.tags).toContain('api');
      expect(apiIntegration!.tags).toContain('integration');
    });

    it('should have data analysis templates', () => {
      const analysisTemplates = TransformationTemplates.getTemplatesByCategory('Data Analysis');
      expect(analysisTemplates.length).toBeGreaterThan(0);

      const analyticsPrep = TransformationTemplates.getTemplate('analytics_preparation');
      expect(analyticsPrep).toBeTruthy();
      expect(analyticsPrep!.tags).toContain('analytics');
      expect(analyticsPrep!.tags).toContain('aggregation');
    });

    it('should have format conversion templates', () => {
      const conversionTemplates = TransformationTemplates.getTemplatesByCategory('Format Conversion');
      expect(conversionTemplates.length).toBeGreaterThan(0);

      const csvToJson = TransformationTemplates.getTemplate('csv_to_json');
      expect(csvToJson).toBeTruthy();
      expect(csvToJson!.tags).toContain('csv');
      expect(csvToJson!.tags).toContain('json');
    });

    it('should have security and privacy templates', () => {
      const securityTemplates = TransformationTemplates.getTemplatesByCategory('Security & Privacy');
      expect(securityTemplates.length).toBeGreaterThan(0);

      const gdprCompliance = TransformationTemplates.getTemplate('gdpr_compliance');
      expect(gdprCompliance).toBeTruthy();
      expect(gdprCompliance!.tags).toContain('gdpr');
      expect(gdprCompliance!.tags).toContain('privacy');
    });
  });

  describe('Template Pipeline Creation', () => {
    it('should create pipeline from template', () => {
      const builder = TransformationTemplates.createPipelineFromTemplate('basic_cleaning');
      expect(builder).toBeInstanceOf(TransformationBuilder);

      const pipeline = builder.build();
      expect(pipeline.name).toBe('Basic Data Cleaning');
      expect(pipeline.steps.length).toBeGreaterThan(0);
    });

    it('should create pipeline from template with custom name', () => {
      const builder = TransformationTemplates.createPipelineFromTemplate('basic_cleaning', 'My Custom Pipeline');
      expect(builder).toBeInstanceOf(TransformationBuilder);

      const pipeline = builder.build();
      expect(pipeline.name).toBe('My Custom Pipeline');
      expect(pipeline.steps.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        TransformationTemplates.createPipelineFromTemplate('nonexistent');
      }).toThrow('Template not found: nonexistent');
    });

    it('should create valid pipelines from templates', () => {
      const templateIds = [
        'basic_cleaning',
        'contact_cleaning',
        'contact_enrichment',
        'salesforce_migration',
        'api_integration'
      ];

      templateIds.forEach(templateId => {
        const builder = TransformationTemplates.createPipelineFromTemplate(templateId);
        const pipeline = builder.build();

        expect(pipeline.name).toBeTruthy();
        expect(pipeline.steps.length).toBeGreaterThan(0);
        expect(pipeline.steps.every(s => s.id && s.name && s.type)).toBe(true);
      });
    });
  });

  describe('Template Pipeline Validation', () => {
    it('should create pipelines with proper structure', () => {
      const contactBuilder = TransformationTemplates.createPipelineFromTemplate('contact_cleaning');
      const pipeline = contactBuilder.build();

      // Check that contact cleaning template has expected steps
      expect(pipeline.steps.some(s => s.type === 'field_mapping')).toBe(true);
      expect(pipeline.steps.some(s => s.type === 'normalization')).toBe(true);
      expect(pipeline.steps.some(s => s.type === 'value_transformation')).toBe(true);
      expect(pipeline.steps.some(s => s.type === 'validation')).toBe(true);
    });

    it('should create pipelines with proper ordering', () => {
      const builder = TransformationTemplates.createPipelineFromTemplate('basic_cleaning');
      const pipeline = builder.build();

      // Check that steps are properly ordered
      const orders = pipeline.steps.map(s => s.order);
      expect(orders).toEqual(orders.slice().sort((a, b) => a - b));
    });

    it('should create pipelines with appropriate configurations', () => {
      const builder = TransformationTemplates.createPipelineFromTemplate('contact_enrichment');
      const pipeline = builder.build();

      // Check that enrichment pipeline has enrichment steps
      const enrichmentSteps = pipeline.steps.filter(s => s.type === 'enrichment');
      expect(enrichmentSteps.length).toBeGreaterThan(0);

      // Check that enrichment steps have proper configuration
      enrichmentSteps.forEach(step => {
        expect(step.config.enrichments).toBeDefined();
        expect(Array.isArray(step.config.enrichments)).toBe(true);
      });
    });
  });

  describe('Template Search and Filtering', () => {
    it('should find templates by multiple criteria', () => {
      const contactResults = TransformationTemplates.searchTemplates('contact');
      const enrichmentResults = TransformationTemplates.getTemplatesByTag('enrichment');
      const mediumComplexityResults = TransformationTemplates.getAllTemplates().filter(
        t => t.estimatedComplexity === 'medium'
      );

      expect(contactResults.length).toBeGreaterThan(0);
      expect(enrichmentResults.length).toBeGreaterThan(0);
      expect(mediumComplexityResults.length).toBeGreaterThan(0);
    });

    it('should handle empty search results', () => {
      const results = TransformationTemplates.searchTemplates('nonexistent_template_xyz');
      expect(results).toHaveLength(0);
    });

    it('should be case insensitive in search', () => {
      const upperCaseResults = TransformationTemplates.searchTemplates('CLEANING');
      const lowerCaseResults = TransformationTemplates.searchTemplates('cleaning');
      const mixedCaseResults = TransformationTemplates.searchTemplates('Cleaning');

      expect(upperCaseResults).toEqual(lowerCaseResults);
      expect(upperCaseResults).toEqual(mixedCaseResults);
    });
  });

  describe('Template Metadata', () => {
    it('should have proper metadata for all templates', () => {
      const templates = TransformationTemplates.getAllTemplates();

      templates.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.tags).toBeDefined();
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.estimatedComplexity).toMatch(/^(low|medium|high)$/);
        expect(template.supportedDataTypes).toBeDefined();
        expect(Array.isArray(template.supportedDataTypes)).toBe(true);
        expect(template.useCase).toBeTruthy();
        expect(typeof template.buildPipeline).toBe('function');
      });
    });

    it('should have diverse supported data types', () => {
      const templates = TransformationTemplates.getAllTemplates();
      const allDataTypes = new Set<string>();

      templates.forEach(template => {
        template.supportedDataTypes.forEach(type => {
          allDataTypes.add(type);
        });
      });

      expect(allDataTypes.size).toBeGreaterThan(0);
      expect(allDataTypes.has('string')).toBe(true);
      expect(allDataTypes.has('number')).toBe(true);
    });

    it('should have appropriate complexity levels', () => {
      const templates = TransformationTemplates.getAllTemplates();
      const complexities = templates.map(t => t.estimatedComplexity);

      expect(complexities.every(c => ['low', 'medium', 'high'].includes(c))).toBe(true);

      const lowCount = complexities.filter(c => c === 'low').length;
      const mediumCount = complexities.filter(c => c === 'medium').length;
      const highCount = complexities.filter(c => c === 'high').length;

      expect(lowCount + mediumCount + highCount).toBe(templates.length);
    });
  });
});