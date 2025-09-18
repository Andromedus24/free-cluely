import { DataTransformationService } from '../DataTransformationService';
import { TransformationBuilder } from '../TransformationBuilder';

describe('DataTransformationService', () => {
  let service: DataTransformationService;

  beforeEach(() => {
    service = new DataTransformationService();
  });

  describe('Pipeline Management', () => {
    it('should create a new pipeline', () => {
      const pipelineId = service.createPipeline({
        name: 'Test Pipeline',
        description: 'Test pipeline',
        steps: [],
        isActive: true
      });

      expect(pipelineId).toBeDefined();
      const pipeline = service.getPipeline(pipelineId);
      expect(pipeline).toBeTruthy();
      expect(pipeline!.name).toBe('Test Pipeline');
    });

    it('should update a pipeline', () => {
      const pipelineId = service.createPipeline({
        name: 'Original Name',
        description: 'Original description',
        steps: [],
        isActive: true
      });

      const success = service.updatePipeline(pipelineId, {
        name: 'Updated Name',
        description: 'Updated description'
      });

      expect(success).toBe(true);
      const pipeline = service.getPipeline(pipelineId);
      expect(pipeline!.name).toBe('Updated Name');
      expect(pipeline!.description).toBe('Updated description');
    });

    it('should delete a pipeline', () => {
      const pipelineId = service.createPipeline({
        name: 'To Delete',
        description: 'Will be deleted',
        steps: [],
        isActive: true
      });

      const success = service.deletePipeline(pipelineId);
      expect(success).toBe(true);

      const pipeline = service.getPipeline(pipelineId);
      expect(pipeline).toBeNull();
    });

    it('should get all pipelines', () => {
      service.createPipeline({
        name: 'Pipeline 1',
        description: 'First pipeline',
        steps: [],
        isActive: true
      });

      service.createPipeline({
        name: 'Pipeline 2',
        description: 'Second pipeline',
        steps: [],
        isActive: true
      });

      const pipelines = service.getAllPipelines();
      expect(pipelines).toHaveLength(2);
    });

    it('should get only active pipelines', () => {
      service.createPipeline({
        name: 'Active Pipeline',
        description: 'This is active',
        steps: [],
        isActive: true
      });

      service.createPipeline({
        name: 'Inactive Pipeline',
        description: 'This is inactive',
        steps: [],
        isActive: false
      });

      const activePipelines = service.getActivePipelines();
      expect(activePipelines).toHaveLength(1);
      expect(activePipelines[0].name).toBe('Active Pipeline');
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute a simple field mapping pipeline', async () => {
      const pipelineId = service.createPipeline({
        name: 'Field Mapping Test',
        description: 'Test field mapping',
        steps: [
          {
            id: 'map_fields',
            name: 'Map Fields',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'first_name', targetField: 'firstName' },
                { sourceField: 'last_name', targetField: 'lastName' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        first_name: 'John',
        last_name: 'Doe',
        age: 30
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('John');
      expect(result.data.lastName).toBe('Doe');
      expect(result.data.age).toBe(30);
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0].success).toBe(true);
    });

    it('should handle pipeline not found', async () => {
      const result = await service.executePipeline('nonexistent', {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Pipeline not found: nonexistent');
    });

    it('should handle inactive pipeline', async () => {
      const pipelineId = service.createPipeline({
        name: 'Inactive Pipeline',
        description: 'This pipeline is inactive',
        steps: [],
        isActive: false
      });

      const result = await service.executePipeline(pipelineId, {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Pipeline is inactive: Inactive Pipeline');
    });

    it('should handle step failure', async () => {
      const pipelineId = service.createPipeline({
        name: 'Failing Pipeline',
        description: 'Pipeline with failing step',
        steps: [
          {
            id: 'failing_step',
            name: 'Failing Step',
            type: 'validation',
            config: {
              rules: [
                {
                  name: 'required_field',
                  field: 'required_field',
                  type: 'required',
                  severity: 'error'
                }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {}; // Missing required field
      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stepResults[0].success).toBe(false);
    });
  });

  describe('Transformation Types', () => {
    it('should apply field mapping with default values', async () => {
      const pipelineId = service.createPipeline({
        name: 'Field Mapping with Defaults',
        description: 'Test field mapping with defaults',
        steps: [
          {
            id: 'map_with_defaults',
            name: 'Map with Defaults',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'name', targetField: 'fullName' },
                { sourceField: 'age', targetField: 'age', defaultValue: 25 }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = { name: 'John' }; // Missing age
      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe('John');
      expect(result.data.age).toBe(25);
    });

    it('should apply data type conversions', async () => {
      const pipelineId = service.createPipeline({
        name: 'Type Conversion',
        description: 'Test data type conversion',
        steps: [
          {
            id: 'convert_types',
            name: 'Convert Types',
            type: 'data_type_conversion',
            config: {
              conversions: [
                { field: 'age_str', targetType: 'number' },
                { field: 'is_active_str', targetType: 'boolean' },
                { field: 'tags_str', targetType: 'array' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        age_str: '30',
        is_active_str: 'true',
        tags_str: 'tag1, tag2, tag3'
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(typeof result.data.age_str).toBe('number');
      expect(result.data.age_str).toBe(30);
      expect(typeof result.data.is_active_str).toBe('boolean');
      expect(result.data.is_active_str).toBe(true);
      expect(Array.isArray(result.data.tags_str)).toBe(true);
      expect(result.data.tags_str).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should apply value transformations', async () => {
      const pipelineId = service.createPipeline({
        name: 'Value Transformation',
        description: 'Test value transformation',
        steps: [
          {
            id: 'transform_values',
            name: 'Transform Values',
            type: 'value_transformation',
            config: {
              transformations: [
                { field: 'name', operation: 'uppercase' },
                { field: 'email', operation: 'lowercase' },
                { field: 'text', operation: 'trim' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        name: 'john',
        email: 'JOHN@EXAMPLE.COM',
        text: '  some text  '
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('JOHN');
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.text).toBe('some text');
    });

    it('should apply validation rules', async () => {
      const pipelineId = service.createPipeline({
        name: 'Validation',
        description: 'Test validation',
        steps: [
          {
            id: 'validate_data',
            name: 'Validate Data',
            type: 'validation',
            config: {
              rules: [
                {
                  name: 'email_required',
                  field: 'email',
                  type: 'required',
                  severity: 'error'
                },
                {
                  name: 'age_min',
                  field: 'age',
                  type: 'min_value',
                  minValue: 18,
                  severity: 'error'
                }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const validData = { email: 'test@example.com', age: 25 };
      const validResult = await service.executePipeline(pipelineId, validData);
      expect(validResult.success).toBe(true);

      const invalidData = { email: 'test@example.com', age: 16 };
      const invalidResult = await service.executePipeline(pipelineId, invalidData);
      expect(invalidResult.success).toBe(false);
    });

    it('should apply filtering', async () => {
      const pipelineId = service.createPipeline({
        name: 'Filtering',
        description: 'Test filtering',
        steps: [
          {
            id: 'filter_data',
            name: 'Filter Data',
            type: 'filtering',
            config: {
              filters: [
                { field: 'empty_field', condition: 'empty', action: 'remove' },
                { field: 'sensitive_data', condition: 'exists', action: 'mask', maskType: 'full' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        empty_field: '',
        sensitive_data: 'secret',
        normal_data: 'public'
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.empty_field).toBeUndefined();
      expect(result.data.sensitive_data).toBe('*****');
      expect(result.data.normal_data).toBe('public');
    });

    it('should apply aggregation', async () => {
      const pipelineId = service.createPipeline({
        name: 'Aggregation',
        description: 'Test aggregation',
        steps: [
          {
            id: 'aggregate_data',
            name: 'Aggregate Data',
            type: 'aggregation',
            config: {
              aggregations: [
                { targetField: 'total', sourceFields: ['price1', 'price2'], operation: 'sum' },
                { targetField: 'average', sourceFields: ['value1', 'value2'], operation: 'average' },
                { targetField: 'count', sourceFields: ['item1', 'item2', 'item3'], operation: 'count' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        price1: 10,
        price2: 20,
        value1: 5,
        value2: 15,
        item1: 'a',
        item2: 'b',
        item3: 'c'
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(30);
      expect(result.data.average).toBe(10);
      expect(result.data.count).toBe(3);
    });

    it('should apply normalization', async () => {
      const pipelineId = service.createPipeline({
        name: 'Normalization',
        description: 'Test normalization',
        steps: [
          {
            id: 'normalize_data',
            name: 'Normalize Data',
            type: 'normalization',
            config: {
              normalizations: [
                { field: 'text', type: 'whitespace' },
                { field: 'name', type: 'case', parameters: { style: 'title' } },
                { field: 'email', type: 'case', parameters: { style: 'lower' } }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        text: '  extra   spaces  ',
        name: 'john doe',
        email: 'JOHN@EXAMPLE.COM'
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.text).toBe('extra spaces');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
    });

    it('should apply deduplication', async () => {
      const pipelineId = service.createPipeline({
        name: 'Deduplication',
        description: 'Test deduplication',
        steps: [
          {
            id: 'deduplicate_data',
            name: 'Deduplicate Data',
            type: 'deduplication',
            config: {
              dedupFields: ['email', 'name'],
              strategy: 'first'
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        email: 'john@example.com',
        name: 'John Doe'
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data._dedupHash).toBeDefined();
      expect(typeof result.data._dedupHash).toBe('string');
    });

    it('should apply format conversion', async () => {
      const pipelineId = service.createPipeline({
        name: 'Format Conversion',
        description: 'Test format conversion',
        steps: [
          {
            id: 'convert_format',
            name: 'Convert Format',
            type: 'format_conversion',
            config: {
              field: 'data_field',
              sourceFormat: 'json',
              targetFormat: 'xml'
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = {
        data_field: { name: 'John', age: 30 }
      };

      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.data_field).toContain('<name>John</name>');
      expect(result.data.data_field).toContain('<age>30</age>');
    });
  });

  describe('Complex Pipeline Execution', () => {
    it('should execute multi-step pipeline in correct order', async () => {
      const pipelineId = service.createPipeline({
        name: 'Multi-step Pipeline',
        description: 'Pipeline with multiple steps',
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'first_name', targetField: 'firstName' }
              ]
            },
            order: 1,
            isActive: true
          },
          {
            id: 'step2',
            name: 'Second Step',
            type: 'value_transformation',
            config: {
              transformations: [
                { field: 'firstName', operation: 'uppercase' }
              ]
            },
            order: 2,
            isActive: true
          },
          {
            id: 'step3',
            name: 'Third Step',
            type: 'validation',
            config: {
              rules: [
                {
                  name: 'name_required',
                  field: 'firstName',
                  type: 'required',
                  severity: 'error'
                }
              ]
            },
            order: 3,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = { first_name: 'john' };
      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('JOHN');
      expect(result.stepResults).toHaveLength(3);
      expect(result.stepResults[0].success).toBe(true);
      expect(result.stepResults[1].success).toBe(true);
      expect(result.stepResults[2].success).toBe(true);
    });

    it('should handle step failures gracefully', async () => {
      const pipelineId = service.createPipeline({
        name: 'Pipeline with Non-critical Failure',
        description: 'Pipeline with non-critical failure',
        steps: [
          {
            id: 'step1',
            name: 'First Step (Success)',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'name', targetField: 'fullName' }
              ]
            },
            order: 1,
            isActive: true
          },
          {
            id: 'step2',
            name: 'Second Step (Non-critical Failure)',
            type: 'value_transformation',
            config: {
              transformations: [
                { field: 'nonexistent_field', operation: 'uppercase' }
              ]
            },
            order: 2,
            isActive: true
          },
          {
            id: 'step3',
            name: 'Third Step (Success)',
            type: 'normalization',
            config: {
              normalizations: [
                { field: 'fullName', type: 'case', parameters: { style: 'title' } }
              ]
            },
            order: 3,
            isActive: true
          }
        ],
        isActive: true
      });

      const inputData = { name: 'john' };
      const result = await service.executePipeline(pipelineId, inputData);

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe('John');
      expect(result.stepResults).toHaveLength(3);
      expect(result.stepResults[0].success).toBe(true);
      expect(result.stepResults[1].success).toBe(false);
      expect(result.stepResults[2].success).toBe(true);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should track transformation statistics', async () => {
      const pipelineId = service.createPipeline({
        name: 'Stats Test Pipeline',
        description: 'Pipeline for testing statistics',
        steps: [
          {
            id: 'simple_step',
            name: 'Simple Step',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'name', targetField: 'fullName' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      // Execute pipeline multiple times
      await service.executePipeline(pipelineId, { name: 'John' });
      await service.executePipeline(pipelineId, { name: 'Jane' });
      await service.executePipeline(pipelineId, { name: 'Bob' });

      const stats = service.getTransformationStatistics();

      expect(stats.totalTransformations).toBe(3);
      expect(stats.successRate).toBe(100);
      expect(stats.mostUsedPipeline).toBe(pipelineId);
    });
  });

  describe('Import/Export', () => {
    it('should export and import pipeline', () => {
      const originalPipelineId = service.createPipeline({
        name: 'Export Test Pipeline',
        description: 'Pipeline for testing export/import',
        steps: [
          {
            id: 'export_step',
            name: 'Export Step',
            type: 'field_mapping',
            config: {
              mappings: [
                { sourceField: 'name', targetField: 'fullName' }
              ]
            },
            order: 1,
            isActive: true
          }
        ],
        isActive: true
      });

      const exportedPipeline = service.exportPipeline(originalPipelineId);
      expect(exportedPipeline.name).toBe('Export Test Pipeline');
      expect(exportedPipeline.steps).toHaveLength(1);

      const importedPipelineId = service.importPipeline(exportedPipeline);
      const importedPipeline = service.getPipeline(importedPipelineId);

      expect(importedPipeline).toBeTruthy();
      expect(importedPipeline!.name).toBe('Export Test Pipeline');
      expect(importedPipeline!.steps).toHaveLength(1);
      expect(importedPipelineId).not.toBe(originalPipelineId);
    });
  });
});

describe('TransformationBuilder', () => {
  it('should create a basic pipeline', () => {
    const pipeline = TransformationBuilder.create('Test Pipeline')
      .description('Test description')
      .addFieldMapping([
        { sourceField: 'first_name', targetField: 'firstName' }
      ])
      .build();

    expect(pipeline.name).toBe('Test Pipeline');
    expect(pipeline.description).toBe('Test description');
    expect(pipeline.steps).toHaveLength(1);
    expect(pipeline.steps[0].type).toBe('field_mapping');
  });

  it('should validate pipeline configuration', () => {
    const validBuilder = TransformationBuilder.create('Valid Pipeline')
      .addFieldMapping([
        { sourceField: 'name', targetField: 'fullName' }
      ]);

    const validation = validBuilder.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const invalidBuilder = TransformationBuilder.create('');
    const invalidValidation = invalidBuilder.validate();
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.errors.length).toBeGreaterThan(0);
  });

  it('should clone builder', () => {
    const original = TransformationBuilder.create('Original')
      .description('Original description')
      .addFieldMapping([
        { sourceField: 'name', targetField: 'fullName' }
      ]);

    const clone = original.clone('Clone');
    const pipeline = clone.build();

    expect(pipeline.name).toBe('Clone');
    expect(pipeline.description).toBe('Original description');
    expect(pipeline.steps).toHaveLength(1);
  });

  it('should provide pipeline preview', () => {
    const builder = TransformationBuilder.create('Preview Test')
      .addFieldMapping([
        { sourceField: 'name', targetField: 'fullName' }
      ])
      .addDataTypeConversion([
        { field: 'age', targetType: 'number' }
      ]);

    const preview = builder.preview();

    expect(preview.name).toBe('Preview Test');
    expect(preview.steps).toHaveLength(2);
    expect(preview.steps[0].type).toBe('field_mapping');
    expect(preview.steps[1].type).toBe('data_type_conversion');
  });
});