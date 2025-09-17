import { Database } from 'better-sqlite3';
import { CostRate } from '../types/JobTypes';
import { DatabaseError, ValidationError } from '../types/JobTypes';

export interface CostRateCreateRequest {
  provider: string;
  model: string;
  inputTokenRate: number;
  outputTokenRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface CostRateUpdateRequest {
  inputTokenRate?: number;
  outputTokenRate?: number;
  currency?: string;
  effectiveTo?: string;
}

export class CostRateManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async createCostRate(request: CostRateCreateRequest): Promise<CostRate> {
    // Validate request
    this.validateCostRateRequest(request);

    // Check for overlapping rates
    await this.checkForOverlappingRates(request.provider, request.model, request.effectiveFrom, request.effectiveTo);

    const id = `${request.provider}_${request.model}_${request.effectiveFrom.replace(/-/g, '')}`;
    const now = new Date().toISOString();

    const insert = this.db.prepare(`
      INSERT INTO cost_rates (
        id, provider, model, input_token_rate, output_token_rate,
        currency, effective_from, effective_to, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      insert.run(
        id,
        request.provider,
        request.model,
        request.inputTokenRate,
        request.outputTokenRate,
        request.currency,
        request.effectiveFrom,
        request.effectiveTo || null,
        now,
        now
      );

      return await this.getCostRate(id);
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create cost rate: ${error.message}`,
        'CREATE_COST_RATE_FAILED',
        { request, originalError: error }
      );
    }
  }

  async getCostRate(id: string): Promise<CostRate> {
    const row = this.db.prepare('SELECT * FROM cost_rates WHERE id = ?').get(id) as any | undefined;

    if (!row) {
      throw new DatabaseError(`Cost rate not found: ${id}`, 'COST_RATE_NOT_FOUND');
    }

    return this.mapRowToCostRate(row);
  }

  async getCurrentCostRate(provider: string, model: string, date?: string): Promise<CostRate | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const row = this.db.prepare(`
      SELECT * FROM cost_rates
      WHERE provider = ? AND model = ? AND effective_from <= ?
      AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY effective_from DESC
      LIMIT 1
    `).get(provider, model, targetDate, targetDate) as any | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToCostRate(row);
  }

  async getCostRates(filter?: {
    provider?: string;
    model?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
  }): Promise<CostRate[]> {
    let sql = 'SELECT * FROM cost_rates WHERE 1=1';
    const params: any[] = [];

    if (filter?.provider) {
      sql += ' AND provider = ?';
      params.push(filter.provider);
    }

    if (filter?.model) {
      sql += ' AND model = ?';
      params.push(filter.model);
    }

    if (filter?.effectiveFrom) {
      sql += ' AND effective_from >= ?';
      params.push(filter.effectiveFrom);
    }

    if (filter?.effectiveTo) {
      sql += ' AND effective_to <= ?';
      params.push(filter.effectiveTo);
    }

    sql += ' ORDER BY provider, model, effective_from DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.mapRowToCostRate(row));
  }

  async updateCostRate(id: string, updates: CostRateUpdateRequest): Promise<CostRate> {
    const existing = await this.getCostRate(id);

    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.inputTokenRate !== undefined) {
      setClause.push('input_token_rate = ?');
      params.push(updates.inputTokenRate);
    }

    if (updates.outputTokenRate !== undefined) {
      setClause.push('output_token_rate = ?');
      params.push(updates.outputTokenRate);
    }

    if (updates.currency !== undefined) {
      setClause.push('currency = ?');
      params.push(updates.currency);
    }

    if (updates.effectiveTo !== undefined) {
      setClause.push('effective_to = ?');
      params.push(updates.effectiveTo);
    }

    if (setClause.length === 0) {
      return existing;
    }

    setClause.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.db.prepare(`
      UPDATE cost_rates
      SET ${setClause.join(', ')}
      WHERE id = ?
    `).run(...params);

    return await this.getCostRate(id);
  }

  async deleteCostRate(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM cost_rates WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getCostHistory(provider: string, model: string): Promise<Array<{
    effectiveFrom: string;
    effectiveTo: string | null;
    inputTokenRate: number;
    outputTokenRate: number;
    currency: string;
  }>> {
    const rows = this.db.prepare(`
      SELECT effective_from, effective_to, input_token_rate, output_token_rate, currency
      FROM cost_rates
      WHERE provider = ? AND model = ?
      ORDER BY effective_from DESC
    `).all(provider, model) as any[];

    return rows.map(row => ({
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      inputTokenRate: row.input_token_rate,
      outputTokenRate: row.output_token_rate,
      currency: row.currency
    }));
  }

  async bulkImportCostRates(rates: CostRateCreateRequest[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ rate: CostRateCreateRequest; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ rate: CostRateCreateRequest; error: string }>
    };

    for (const rate of rates) {
      try {
        await this.createCostRate(rate);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          rate,
          error: error.message
        });
      }
    }

    return result;
  }

  async exportCostRates(filter?: {
    provider?: string;
    model?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
  }): Promise<string> {
    const rates = await this.getCostRates(filter);
    return JSON.stringify(rates, null, 2);
  }

  async validateCostRates(): Promise<{
    valid: number;
    invalid: number;
    issues: Array<{ rateId: string; issue: string }>;
  }> {
    const rates = await this.getCostRates();
    const result = {
      valid: 0,
      invalid: 0,
      issues: [] as Array<{ rateId: string; issue: string }>
    };

    for (const rate of rates) {
      let isValid = true;

      // Check for overlapping rates
      const overlapping = await this.findOverlappingRates(
        rate.provider,
        rate.model,
        rate.effective_from,
        rate.effective_to,
        rate.id
      );

      if (overlapping.length > 0) {
        result.issues.push({
          rateId: rate.id,
          issue: `Overlaps with ${overlapping.map(r => r.id).join(', ')}`
        });
        isValid = false;
      }

      // Check for future effective dates
      if (rate.effective_from > new Date().toISOString().split('T')[0]) {
        result.issues.push({
          rateId: rate.id,
          issue: 'Future effective date'
        });
        isValid = false;
      }

      // Check for negative rates
      if (rate.input_token_rate < 0 || rate.output_token_rate < 0) {
        result.issues.push({
          rateId: rate.id,
          issue: 'Negative token rate'
        });
        isValid = false;
      }

      if (isValid) {
        result.valid++;
      } else {
        result.invalid++;
      }
    }

    return result;
  }

  private validateCostRateRequest(request: CostRateCreateRequest): void {
    if (!request.provider?.trim()) {
      throw new ValidationError('Provider is required');
    }

    if (!request.model?.trim()) {
      throw new ValidationError('Model is required');
    }

    if (request.inputTokenRate < 0) {
      throw new ValidationError('Input token rate cannot be negative');
    }

    if (request.outputTokenRate < 0) {
      throw new ValidationError('Output token rate cannot be negative');
    }

    if (!request.currency?.trim()) {
      throw new ValidationError('Currency is required');
    }

    if (!request.effectiveFrom?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new ValidationError('Effective from must be in YYYY-MM-DD format');
    }

    if (request.effectiveTo && request.effectiveTo < request.effectiveFrom) {
      throw new ValidationError('Effective to must be after effective from');
    }
  }

  private async checkForOverlappingRates(
    provider: string,
    model: string,
    effectiveFrom: string,
    effectiveTo?: string
  ): Promise<void> {
    const overlapping = await this.findOverlappingRates(provider, model, effectiveFrom, effectiveTo);

    if (overlapping.length > 0) {
      throw new ValidationError(
        `Cost rate overlaps with existing rates: ${overlapping.map(r => r.id).join(', ')}`
      );
    }
  }

  private async findOverlappingRates(
    provider: string,
    model: string,
    effectiveFrom: string,
    effectiveTo?: string,
    excludeId?: string
  ): Promise<Array<{ id: string; effective_from: string; effective_to: string | null }>> {
    let sql = `
      SELECT id, effective_from, effective_to
      FROM cost_rates
      WHERE provider = ? AND model = ?
      AND (
        (effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?))
        OR (effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?))
      )
    `;
    const params: any[] = [provider, model];

    if (effectiveTo) {
      params.push(effectiveFrom, effectiveFrom, effectiveTo, effectiveTo);
    } else {
      params.push(effectiveFrom, effectiveFrom, effectiveFrom, effectiveFrom);
    }

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    return this.db.prepare(sql).all(...params) as Array<{ id: string; effective_from: string; effective_to: string | null }>;
  }

  private mapRowToCostRate(row: any): CostRate {
    return {
      id: row.id,
      provider: row.provider,
      model: row.model,
      input_token_rate: row.input_token_rate,
      output_token_rate: row.output_token_rate,
      currency: row.currency,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}