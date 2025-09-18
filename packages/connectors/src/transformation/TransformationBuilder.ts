import {
  TransformationStep,
  TransformationPipeline,
  DataTransformation
} from './DataTransformationService';

export class TransformationBuilder {
  private pipeline: Partial<TransformationPipeline> = {
    steps: [],
    isActive: true
  };

  constructor(name: string) {
    this.pipeline.name = name;
    this.pipeline.description = `Transformation pipeline: ${name}`;
  }

  static create(name: string): TransformationBuilder {
    return new TransformationBuilder(name);
  }

  description(description: string): TransformationBuilder {
    this.pipeline.description = description;
    return this;
  }

  inputSchema(schema: Record<string, any>): TransformationBuilder {
    this.pipeline.inputSchema = schema;
    return this;
  }

  outputSchema(schema: Record<string, any>): TransformationBuilder {
    this.pipeline.outputSchema = schema;
    return this;
  }

  metadata(metadata: Record<string, any>): TransformationBuilder {
    this.pipeline.metadata = metadata;
    return this;
  }

  // Field mapping transformations
  addFieldMapping(
    mappings: Array<{
      sourceField: string;
      targetField?: string;
      defaultValue?: any;
    }>,
    options?: {
      copyUnmapped?: boolean;
      description?: string;
    }
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `field_mapping_${this.pipeline.steps!.length + 1}`,
      name: options?.description || 'Field Mapping',
      type: 'field_mapping',
      config: {
        mappings,
        copyUnmapped: options?.copyUnmapped || false
      },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description: options?.description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Data type conversions
  addDataTypeConversion(
    conversions: Array<{
      field: string;
      targetType: string;
      strict?: boolean;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `data_type_conversion_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Type Conversion',
      type: 'data_type_conversion',
      config: { conversions },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Value transformations
  addValueTransformation(
    transformations: Array<{
      field: string;
      operation: string;
      parameters?: Record<string, any>;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `value_transformation_${this.pipeline.steps!.length + 1}`,
      name: description || 'Value Transformation',
      type: 'value_transformation',
      config: { transformations },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Validation rules
  addValidation(
    rules: Array<{
      name: string;
      field: string;
      type: string;
      severity?: 'error' | 'warning';
      [key: string]: any;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `validation_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Validation',
      type: 'validation',
      config: { rules },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Data enrichment
  addEnrichment(
    enrichments: Array<{
      field: string;
      type: string;
      targetField?: string;
      [key: string]: any;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `enrichment_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Enrichment',
      type: 'enrichment',
      config: { enrichments },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Filtering
  addFiltering(
    filters: Array<{
      field: string;
      condition: string;
      action: 'remove' | 'mask';
      maskType?: string;
      value?: any;
      pattern?: string;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `filtering_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Filtering',
      type: 'filtering',
      config: { filters },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Aggregation
  addAggregation(
    aggregations: Array<{
      targetField: string;
      sourceFields: string[];
      operation: string;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `aggregation_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Aggregation',
      type: 'aggregation',
      config: { aggregations },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Normalization
  addNormalization(
    normalizations: Array<{
      field: string;
      type: string;
      parameters?: Record<string, any>;
    }>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `normalization_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Normalization',
      type: 'normalization',
      config: { normalizations },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Deduplication
  addDeduplication(
    fields: string[],
    strategy?: 'first' | 'last' | 'merge',
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `deduplication_${this.pipeline.steps!.length + 1}`,
      name: description || 'Data Deduplication',
      type: 'deduplication',
      config: {
        dedupFields: fields,
        strategy: strategy || 'first'
      },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Format conversion
  addFormatConversion(
    field: string,
    sourceFormat: string,
    targetFormat: string,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `format_conversion_${this.pipeline.steps!.length + 1}`,
      name: description || 'Format Conversion',
      type: 'format_conversion',
      config: {
        field,
        sourceFormat,
        targetFormat
      },
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Custom step
  addCustomStep(
    type: string,
    config: Record<string, any>,
    description?: string
  ): TransformationBuilder {
    const step: TransformationStep = {
      id: `custom_${this.pipeline.steps!.length + 1}`,
      name: description || 'Custom Transformation',
      type: type as any,
      config,
      order: this.pipeline.steps!.length + 1,
      isActive: true,
      description
    };

    this.pipeline.steps!.push(step);
    return this;
  }

  // Reorder steps
  reorderSteps(orderMap: Record<string, number>): TransformationBuilder {
    if (this.pipeline.steps) {
      this.pipeline.steps.forEach(step => {
        if (orderMap[step.id] !== undefined) {
          step.order = orderMap[step.id];
        }
      });

      // Sort steps by order
      this.pipeline.steps.sort((a, b) => a.order - b.order);
    }
    return this;
  }

  // Remove step by ID
  removeStep(stepId: string): TransformationBuilder {
    if (this.pipeline.steps) {
      this.pipeline.steps = this.pipeline.steps.filter(step => step.id !== stepId);
    }
    return this;
  }

  // Enable/disable step
  toggleStep(stepId: string, isActive: boolean): TransformationBuilder {
    if (this.pipeline.steps) {
      const step = this.pipeline.steps.find(s => s.id === stepId);
      if (step) {
        step.isActive = isActive;
      }
    }
    return this;
  }

  // Set pipeline active state
  setActive(isActive: boolean): TransformationBuilder {
    this.pipeline.isActive = isActive;
    return this;
  }

  // Build the pipeline
  build(): TransformationPipeline {
    if (!this.pipeline.name) {
      throw new Error('Pipeline name is required');
    }

    if (!this.pipeline.steps || this.pipeline.steps.length === 0) {
      throw new Error('Pipeline must have at least one step');
    }

    return {
      id: '',
      name: this.pipeline.name,
      description: this.pipeline.description || '',
      steps: this.pipeline.steps,
      inputSchema: this.pipeline.inputSchema,
      outputSchema: this.pipeline.outputSchema,
      metadata: this.pipeline.metadata,
      isActive: this.pipeline.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Clone builder for creating variations
  clone(newName?: string): TransformationBuilder {
    const newBuilder = new TransformationBuilder(newName || this.pipeline.name + '_copy');
    newBuilder.pipeline = JSON.parse(JSON.stringify(this.pipeline));
    if (newName) {
      newBuilder.pipeline.name = newName;
    }
    return newBuilder;
  }

  // Validate pipeline configuration
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.pipeline.name) {
      errors.push('Pipeline name is required');
    }

    if (!this.pipeline.steps || this.pipeline.steps.length === 0) {
      errors.push('Pipeline must have at least one step');
    }

    // Validate steps
    if (this.pipeline.steps) {
      const stepIds = new Set<string>();

      this.pipeline.steps.forEach((step, index) => {
        if (!step.id) {
          errors.push(`Step ${index + 1} must have an ID`);
        } else if (stepIds.has(step.id)) {
          errors.push(`Duplicate step ID: ${step.id}`);
        } else {
          stepIds.add(step.id);
        }

        if (!step.name) {
          errors.push(`Step ${step.id} must have a name`);
        }

        if (!step.type) {
          errors.push(`Step ${step.id} must have a type`);
        }

        if (!step.config) {
          errors.push(`Step ${step.id} must have configuration`);
        }
      });

      // Check for duplicate order numbers
      const orders = this.pipeline.steps.map(s => s.order).sort((a, b) => a - b);
      for (let i = 1; i < orders.length; i++) {
        if (orders[i] === orders[i - 1]) {
          errors.push(`Duplicate order number: ${orders[i]}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get pipeline preview (without building)
  preview(): Partial<TransformationPipeline> {
    return {
      ...this.pipeline,
      steps: this.pipeline.steps?.map(step => ({
        id: step.id,
        name: step.name,
        type: step.type,
        order: step.order,
        isActive: step.isActive,
        description: step.description
      }))
    };
  }
}