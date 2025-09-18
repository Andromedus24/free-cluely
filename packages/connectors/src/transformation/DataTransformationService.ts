import {
  DataRecord,
  DataTransformation,
  TransformationType,
  ValidationRule,
  EnrichmentRule
} from '../types/ConnectorTypes';

export interface TransformationStep {
  id: string;
  name: string;
  type: TransformationType;
  config: Record<string, any>;
  order: number;
  isActive: boolean;
  description?: string;
}

export interface TransformationPipeline {
  id: string;
  name: string;
  description: string;
  steps: TransformationStep[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransformationResult {
  success: boolean;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
  processingTime: number;
  stepResults: StepResult[];
}

export interface StepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  output: Record<string, any>;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

export interface ValidationContext {
  record: DataRecord;
  rules: ValidationRule[];
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export interface EnrichmentContext {
  data: Record<string, any>;
  rules: EnrichmentRule[];
  enrichedData: Record<string, any>;
  enrichmentCount: number;
  errors: string[];
}

export class DataTransformationService {
  private pipelines: Map<string, TransformationPipeline> = new Map();
  private transformationHistory: TransformationResult[] = [];

  constructor() {
    this.initializeDefaultPipelines();
  }

  // Pipeline management
  createPipeline(pipeline: Omit<TransformationPipeline, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generatePipelineId();
    const newPipeline: TransformationPipeline = {
      ...pipeline,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pipelines.set(id, newPipeline);
    return id;
  }

  updatePipeline(id: string, updates: Partial<TransformationPipeline>): boolean {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return false;

    this.pipelines.set(id, {
      ...pipeline,
      ...updates,
      updatedAt: new Date()
    });
    return true;
  }

  deletePipeline(id: string): boolean {
    return this.pipelines.delete(id);
  }

  getPipeline(id: string): TransformationPipeline | null {
    return this.pipelines.get(id) || null;
  }

  getAllPipelines(): TransformationPipeline[] {
    return Array.from(this.pipelines.values());
  }

  getActivePipelines(): TransformationPipeline[] {
    return this.getAllPipelines().filter(p => p.isActive);
  }

  // Core transformation execution
  async executePipeline(
    pipelineId: string,
    data: Record<string, any>,
    context?: Record<string, any>
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    const pipeline = this.pipelines.get(pipelineId);

    if (!pipeline) {
      return {
        success: false,
        data,
        errors: [`Pipeline not found: ${pipelineId}`],
        warnings: [],
        metadata: {},
        processingTime: 0,
        stepResults: []
      };
    }

    if (!pipeline.isActive) {
      return {
        success: false,
        data,
        errors: [`Pipeline is inactive: ${pipelineId}`],
        warnings: [],
        metadata: {},
        processingTime: 0,
        stepResults: []
      };
    }

    const result: TransformationResult = {
      success: true,
      data: { ...data },
      errors: [],
      warnings: [],
      metadata: { ...context, pipelineId, pipelineName: pipeline.name },
      processingTime: 0,
      stepResults: []
    };

    // Sort steps by order
    const sortedSteps = pipeline.steps
      .filter(step => step.isActive)
      .sort((a, b) => a.order - b.order);

    // Execute each step
    for (const step of sortedSteps) {
      const stepStartTime = Date.now();
      const stepResult: StepResult = {
        stepId: step.id,
        stepName: step.name,
        success: false,
        output: {},
        errors: [],
        warnings: [],
        processingTime: 0
      };

      try {
        stepResult.output = await this.executeStep(step, result.data, context);
        stepResult.success = true;
        result.data = stepResult.output;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stepResult.errors.push(errorMessage);
        result.errors.push(`Step "${step.name}" failed: ${errorMessage}`);

        // Decide whether to continue or fail the entire pipeline
        if (step.type === 'validation' || this.isCriticalStep(step)) {
          result.success = false;
          break;
        }
      }

      stepResult.processingTime = Date.now() - stepStartTime;
      result.stepResults.push(stepResult);
    }

    result.processingTime = Date.now() - startTime;
    this.transformationHistory.push(result);

    return result;
  }

  // Individual step execution
  private async executeStep(
    step: TransformationStep,
    data: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (step.type) {
      case 'field_mapping':
        return this.applyFieldMapping(data, step.config);
      case 'data_type_conversion':
        return this.applyDataTypeConversion(data, step.config);
      case 'value_transformation':
        return this.applyValueTransformation(data, step.config);
      case 'validation':
        return this.applyValidation(data, step.config);
      case 'enrichment':
        return this.applyEnrichment(data, step.config, context);
      case 'filtering':
        return this.applyFiltering(data, step.config);
      case 'aggregation':
        return this.applyAggregation(data, step.config);
      case 'normalization':
        return this.applyNormalization(data, step.config);
      case 'deduplication':
        return this.applyDeduplication(data, step.config);
      case 'format_conversion':
        return this.applyFormatConversion(data, step.config);
      default:
        throw new Error(`Unknown transformation type: ${step.type}`);
    }
  }

  // Field mapping transformations
  private applyFieldMapping(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};
    const mappings = config.mappings || [];

    for (const mapping of mappings) {
      const sourceField = mapping.sourceField;
      const targetField = mapping.targetField || sourceField;
      const defaultValue = mapping.defaultValue;

      if (sourceField in data) {
        result[targetField] = data[sourceField];
      } else if (defaultValue !== undefined) {
        result[targetField] = defaultValue;
        // Add warning about default value usage
        console.warn(`Using default value for field "${targetField}"`);
      }
    }

    // Copy unmapped fields if configured
    if (config.copyUnmapped) {
      const mappedFields = mappings.map(m => m.sourceField);
      for (const [key, value] of Object.entries(data)) {
        if (!mappedFields.includes(key)) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  // Data type conversion
  private applyDataTypeConversion(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = { ...data };
    const conversions = config.conversions || [];

    for (const conversion of conversions) {
      const field = conversion.field;
      const targetType = conversion.targetType;
      const sourceValue = result[field];

      if (sourceValue !== undefined && sourceValue !== null) {
        try {
          result[field] = this.convertType(sourceValue, targetType);
        } catch (error) {
          if (conversion.strict) {
            throw new Error(`Failed to convert field "${field}" to ${targetType}: ${error}`);
          } else {
            console.warn(`Failed to convert field "${field}" to ${targetType}, keeping original value`);
          }
        }
      }
    }

    return result;
  }

  private convertType(value: any, targetType: string): any {
    switch (targetType.toLowerCase()) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return value.split(',').map(v => v.trim());
        return [value];
      case 'object':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return { value };
          }
        }
        return value;
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
  }

  // Value transformation
  private applyValueTransformation(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = { ...data };
    const transformations = config.transformations || [];

    for (const transformation of transformations) {
      const field = transformation.field;
      const operation = transformation.operation;
      const parameters = transformation.parameters || {};

      if (field in result) {
        try {
          result[field] = this.transformValue(result[field], operation, parameters);
        } catch (error) {
          console.warn(`Failed to transform field "${field}" with operation "${operation}": ${error}`);
        }
      }
    }

    return result;
  }

  private transformValue(value: any, operation: string, parameters: Record<string, any>): any {
    switch (operation.toLowerCase()) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'replace':
        return String(value).replace(parameters.pattern || '', parameters.replacement || '');
      case 'split':
        return String(value).split(parameters.separator || ',').map(v => v.trim());
      case 'join':
        return Array.isArray(value) ? value.join(parameters.separator || ',') : value;
      case 'format':
        return this.formatValue(value, parameters.format || '', parameters.locale);
      case 'extract':
        return this.extractValue(value, parameters.pattern || '');
      case 'calculate':
        return this.calculateValue(value, parameters.expression || '');
      default:
        throw new Error(`Unknown transformation operation: ${operation}`);
    }
  }

  private formatValue(value: any, format: string, locale?: string): string {
    if (value instanceof Date) {
      return new Intl.DateTimeFormat(locale || 'en-US', {
        dateStyle: format.includes('date') ? 'medium' : undefined,
        timeStyle: format.includes('time') ? 'medium' : undefined
      }).format(value);
    }

    if (typeof value === 'number') {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: format.includes('currency') ? 'currency' : 'decimal',
        currency: format.includes('currency') ? 'USD' : undefined
      }).format(value);
    }

    return String(value);
  }

  private extractValue(value: any, pattern: string): string {
    const regex = new RegExp(pattern);
    const match = String(value).match(regex);
    return match ? match[1] || match[0] : '';
  }

  private calculateValue(value: any, expression: string): number {
    // Simple calculation support - in production, use a proper expression evaluator
    try {
      // WARNING: eval is dangerous - use a proper expression evaluator in production
      const num = Number(value);
      return eval(expression.replace(/\{value\}/g, num.toString()));
    } catch {
      return value;
    }
  }

  // Validation
  private applyValidation(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const rules = config.rules || [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      try {
        const validationResult = this.validateField(data, rule);
        if (!validationResult.isValid) {
          if (rule.severity === 'error') {
            errors.push(...validationResult.errors);
          } else {
            warnings.push(...validationResult.errors);
          }
        }
      } catch (error) {
        errors.push(`Validation rule "${rule.name}" failed: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return data;
  }

  private validateField(data: Record<string, any>, rule: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const field = rule.field;
    const value = data[field];

    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          errors.push(`Field "${field}" is required`);
        }
        break;
      case 'type':
        if (value !== null && typeof value !== rule.expectedType) {
          errors.push(`Field "${field}" must be of type ${rule.expectedType}`);
        }
        break;
      case 'pattern':
        if (value && !new RegExp(rule.pattern).test(String(value))) {
          errors.push(`Field "${field}" does not match required pattern`);
        }
        break;
      case 'min_length':
        if (value && String(value).length < rule.minLength) {
          errors.push(`Field "${field}" must be at least ${rule.minLength} characters`);
        }
        break;
      case 'max_length':
        if (value && String(value).length > rule.maxLength) {
          errors.push(`Field "${field}" must not exceed ${rule.maxLength} characters`);
        }
        break;
      case 'min_value':
        if (value !== null && Number(value) < rule.minValue) {
          errors.push(`Field "${field}" must be at least ${rule.minValue}`);
        }
        break;
      case 'max_value':
        if (value !== null && Number(value) > rule.maxValue) {
          errors.push(`Field "${field}" must not exceed ${rule.maxValue}`);
        }
        break;
      case 'enum':
        if (value && !rule.allowedValues.includes(value)) {
          errors.push(`Field "${field}" must be one of: ${rule.allowedValues.join(', ')}`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Data enrichment
  private async applyEnrichment(
    data: Record<string, any>,
    config: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = { ...data };
    const enrichments = config.enrichments || [];

    for (const enrichment of enrichments) {
      try {
        const enrichedValue = await this.enrichField(
          data,
          enrichment,
          context
        );
        if (enrichedValue !== undefined) {
          result[enrichment.targetField || enrichment.field] = enrichedValue;
        }
      } catch (error) {
        console.warn(`Enrichment failed for field "${enrichment.field}": ${error}`);
      }
    }

    return result;
  }

  private async enrichField(
    data: Record<string, any>,
    enrichment: any,
    context?: Record<string, any>
  ): Promise<any> {
    const field = enrichment.field;
    const value = data[field];
    const type = enrichment.type;

    switch (type) {
      case 'geocoding':
        return this.geocodeValue(value);
      case 'email_validation':
        return this.validateEmail(value);
      case 'phone_validation':
        return this.validatePhone(value);
      case 'url_validation':
        return this.validateUrl(value);
      case 'ip_lookup':
        return this.lookupIp(value);
      case 'currency_conversion':
        return this.convertCurrency(value, enrichment.fromCurrency, enrichment.toCurrency);
      case 'timezone_conversion':
        return this.convertTimezone(value, enrichment.fromTimezone, enrichment.toTimezone);
      case 'external_api':
        return this.callExternalApi(enrichment.apiUrl, enrichment.apiKey, data);
      case 'lookup':
        return this.performLookup(value, enrichment.lookupTable);
      case 'calculation':
        return this.performCalculation(data, enrichment.expression);
      default:
        throw new Error(`Unknown enrichment type: ${type}`);
    }
  }

  // Placeholder enrichment methods - in production, these would call real services
  private async geocodeValue(value: string): Promise<any> {
    // Placeholder: would call geocoding service
    return { latitude: 0, longitude: 0, address: value };
  }

  private async validateEmail(value: string): Promise<any> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(value),
      value,
      normalized: value.toLowerCase().trim()
    };
  }

  private async validatePhone(value: string): Promise<any> {
    // Placeholder: would call phone validation service
    return {
      isValid: true,
      value,
      formatted: value
    };
  }

  private async validateUrl(value: string): Promise<any> {
    try {
      new URL(value);
      return { isValid: true, value };
    } catch {
      return { isValid: false, value };
    }
  }

  private async lookupIp(value: string): Promise<any> {
    // Placeholder: would call IP lookup service
    return {
      ip: value,
      country: 'Unknown',
      city: 'Unknown',
      isp: 'Unknown'
    };
  }

  private async convertCurrency(value: number, from: string, to: string): Promise<number> {
    // Placeholder: would call currency conversion service
    return value * 1.0; // Simple 1:1 conversion for demo
  }

  private async convertTimezone(value: string, from: string, to: string): Promise<string> {
    // Placeholder: would convert timezone
    return value;
  }

  private async callExternalApi(apiUrl: string, apiKey: string, data: Record<string, any>): Promise<any> {
    // Placeholder: would make HTTP request
    return { success: true, data };
  }

  private async performLookup(value: string, lookupTable: Record<string, any>): Promise<any> {
    return lookupTable[value] || null;
  }

  private async performCalculation(data: Record<string, any>, expression: string): Promise<any> {
    // Placeholder: would evaluate expression
    return 0;
  }

  // Filtering
  private applyFiltering(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const filters = config.filters || [];
    let result = { ...data };

    for (const filter of filters) {
      if (this.shouldFilter(result, filter)) {
        if (filter.action === 'remove') {
          delete result[filter.field];
        } else if (filter.action === 'mask') {
          result[filter.field] = this.maskValue(result[filter.field], filter.maskType);
        }
      }
    }

    return result;
  }

  private shouldFilter(data: Record<string, any>, filter: any): boolean {
    const field = filter.field;
    const value = data[field];

    switch (filter.condition) {
      case 'exists':
        return value !== undefined && value !== null;
      case 'empty':
        return value === undefined || value === null || value === '';
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).includes(filter.value);
      case 'matches':
        return new RegExp(filter.pattern).test(String(value));
      default:
        return false;
    }
  }

  private maskValue(value: any, maskType: string): any {
    switch (maskType) {
      case 'partial':
        const str = String(value);
        return str.length > 4 ? str.slice(0, 2) + '***' + str.slice(-2) : '****';
      case 'full':
        return '*****';
      case 'email':
        const email = String(value);
        const [local, domain] = email.split('@');
        return local.slice(0, 2) + '***@' + domain;
      default:
        return value;
    }
  }

  // Aggregation
  private applyAggregation(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const aggregations = config.aggregations || [];
    const result: Record<string, any> = { ...data };

    for (const aggregation of aggregations) {
      const targetField = aggregation.targetField;
      const sourceFields = aggregation.sourceFields || [];
      const operation = aggregation.operation;

      try {
        result[targetField] = this.aggregateValues(sourceFields.map(f => data[f]), operation);
      } catch (error) {
        console.warn(`Aggregation failed for "${targetField}": ${error}`);
      }
    }

    return result;
  }

  private aggregateValues(values: any[], operation: string): any {
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));

    switch (operation.toLowerCase()) {
      case 'sum':
        return numericValues.reduce((sum, val) => sum + val, 0);
      case 'average':
        return numericValues.length > 0 ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length : 0;
      case 'count':
        return values.filter(v => v !== undefined && v !== null).length;
      case 'min':
        return Math.min(...numericValues);
      case 'max':
        return Math.max(...numericValues);
      case 'concat':
        return values.filter(v => v !== undefined && v !== null).join(' ');
      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }
  }

  // Normalization
  private applyNormalization(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = { ...data };
    const normalizations = config.normalizations || [];

    for (const normalization of normalizations) {
      const field = normalization.field;
      const type = normalization.type;

      if (field in result) {
        try {
          result[field] = this.normalizeValue(result[field], type, normalization.parameters);
        } catch (error) {
          console.warn(`Normalization failed for field "${field}": ${error}`);
        }
      }
    }

    return result;
  }

  private normalizeValue(value: any, type: string, parameters: Record<string, any>): any {
    switch (type.toLowerCase()) {
      case 'whitespace':
        return String(value).replace(/\s+/g, ' ').trim();
      case 'unicode':
        return String(value).normalize('NFC');
      case 'case':
        if (parameters.style === 'upper') return String(value).toUpperCase();
        if (parameters.style === 'lower') return String(value).toLowerCase();
        if (parameters.style === 'title') return String(value).replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        return value;
      case 'encoding':
        return Buffer.from(String(value), parameters.sourceEncoding || 'utf8').toString(parameters.targetEncoding || 'utf8');
      default:
        return value;
    }
  }

  // Deduplication
  private applyDeduplication(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = { ...data };
    const fields = config.dedupFields || [];
    const strategy = config.strategy || 'first';

    if (fields.length === 0) return result;

    // Create hash based on specified fields
    const hashData = fields.map(field => data[field]).join('|');
    const hash = this.generateHash(hashData);

    // Add hash to result for tracking
    result._dedupHash = hash;

    return result;
  }

  private generateHash(data: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // Format conversion
  private applyFormatConversion(
    data: Record<string, any>,
    config: Record<string, any>
  ): Record<string, any> {
    const sourceFormat = config.sourceFormat || 'json';
    const targetFormat = config.targetFormat || 'json';
    const field = config.field;

    if (!field || !(field in data)) {
      return data;
    }

    const value = data[field];

    try {
      switch (`${sourceFormat}_to_${targetFormat}`.toLowerCase()) {
        case 'json_to_xml':
          data[field] = this.jsonToXml(value);
          break;
        case 'xml_to_json':
          data[field] = this.xmlToJson(value);
          break;
        case 'csv_to_json':
          data[field] = this.csvToJson(value);
          break;
        case 'json_to_csv':
          data[field] = this.jsonToCsv(value);
          break;
        case 'base64_encode':
          data[field] = Buffer.from(String(value)).toString('base64');
          break;
        case 'base64_decode':
          data[field] = Buffer.from(String(value), 'base64').toString();
          break;
        default:
          console.warn(`Unsupported format conversion: ${sourceFormat} to ${targetFormat}`);
      }
    } catch (error) {
      console.warn(`Format conversion failed: ${error}`);
    }

    return data;
  }

  private jsonToXml(json: any): string {
    // Simple JSON to XML conversion
    const convert = (obj: any, name: string = 'root'): string => {
      if (typeof obj === 'string') return `<${name}>${obj}</${name}>`;
      if (typeof obj === 'number') return `<${name}>${obj}</${name}>`;
      if (typeof obj === 'boolean') return `<${name}>${obj}</${name}>`;
      if (Array.isArray(obj)) {
        return obj.map(item => convert(item, name.replace(/s$/, ''))).join('');
      }
      if (typeof obj === 'object') {
        return `<${name}>${Object.entries(obj).map(([k, v]) => convert(v, k)).join('')}</${name}>`;
      }
      return '';
    };
    return convert(json);
  }

  private xmlToJson(xml: string): any {
    // Simple XML to JSON conversion - in production, use proper XML parser
    return { message: 'XML parsing not implemented in demo', original: xml };
  }

  private csvToJson(csv: string): any {
    // Simple CSV to JSON conversion
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {} as Record<string, string>);
    });
  }

  private jsonToCsv(json: any): string {
    // Simple JSON to CSV conversion
    if (Array.isArray(json) && json.length > 0) {
      const headers = Object.keys(json[0]);
      const rows = json.map(obj => headers.map(header => obj[header] || '').join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    return '';
  }

  // Utility methods
  private isCriticalStep(step: TransformationStep): boolean {
    return step.type === 'validation' || step.config.critical === true;
  }

  private generatePipelineId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize default pipelines
  private initializeDefaultPipelines(): void {
    // Standard data cleaning pipeline
    const cleaningPipeline = this.createPipeline({
      name: 'Standard Data Cleaning',
      description: 'Basic data cleaning and normalization pipeline',
      steps: [
        {
          id: 'trim_whitespace',
          name: 'Trim Whitespace',
          type: 'value_transformation',
          config: {
            transformations: [
              { field: '*', operation: 'trim', parameters: {} }
            ]
          },
          order: 1,
          isActive: true
        },
        {
          id: 'normalize_case',
          name: 'Normalize Case',
          type: 'normalization',
          config: {
            normalizations: [
              { field: 'email', type: 'case', parameters: { style: 'lower' } },
              { field: 'name', type: 'case', parameters: { style: 'title' } }
            ]
          },
          order: 2,
          isActive: true
        },
        {
          id: 'remove_empty',
          name: 'Remove Empty Fields',
          type: 'filtering',
          config: {
            filters: [
              { field: '*', condition: 'empty', action: 'remove' }
            ]
          },
          order: 3,
          isActive: true
        }
      ],
      isActive: true
    });

    // Contact data enrichment pipeline
    const enrichmentPipeline = this.createPipeline({
      name: 'Contact Data Enrichment',
      description: 'Enrich contact data with validation and additional information',
      steps: [
        {
          id: 'validate_email',
          name: 'Validate Email',
          type: 'enrichment',
          config: {
            enrichments: [
              { field: 'email', type: 'email_validation', targetField: 'email_validation' }
            ]
          },
          order: 1,
          isActive: true
        },
        {
          id: 'validate_phone',
          name: 'Validate Phone',
          type: 'enrichment',
          config: {
            enrichments: [
              { field: 'phone', type: 'phone_validation', targetField: 'phone_validation' }
            ]
          },
          order: 2,
          isActive: true
        },
        {
          id: 'geocode_address',
          name: 'Geocode Address',
          type: 'enrichment',
          config: {
            enrichments: [
              { field: 'address', type: 'geocoding', targetField: 'location' }
            ]
          },
          order: 3,
          isActive: true
        }
      ],
      isActive: true
    });

    console.log('Initialized default transformation pipelines');
  }

  // Analytics and reporting
  getTransformationStatistics(): {
    totalTransformations: number;
    successRate: number;
    averageProcessingTime: number;
    mostUsedPipeline: string;
    errorsByType: Record<string, number>;
  } {
    const totalTransformations = this.transformationHistory.length;
    const successfulTransformations = this.transformationHistory.filter(r => r.success).length;
    const successRate = totalTransformations > 0 ? (successfulTransformations / totalTransformations) * 100 : 0;

    const processingTimes = this.transformationHistory.map(r => r.processingTime);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const pipelineUsage = this.transformationHistory.reduce((acc, r) => {
      const pipelineId = r.metadata.pipelineId || 'unknown';
      acc[pipelineId] = (acc[pipelineId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedPipeline = Object.entries(pipelineUsage)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    const errorsByType = this.transformationHistory
      .flatMap(r => r.errors)
      .reduce((acc, error) => {
        const errorType = error.split(':')[0];
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalTransformations,
      successRate,
      averageProcessingTime,
      mostUsedPipeline,
      errorsByType
    };
  }

  clearHistory(): void {
    this.transformationHistory = [];
  }

  exportPipeline(pipelineId: string): any {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    return {
      ...pipeline,
      exportedAt: new Date(),
      version: '1.0'
    };
  }

  importPipeline(pipelineData: any): string {
    const { id, createdAt, updatedAt, exportedAt, version, ...pipelineInfo } = pipelineData;
    return this.createPipeline(pipelineInfo);
  }
}