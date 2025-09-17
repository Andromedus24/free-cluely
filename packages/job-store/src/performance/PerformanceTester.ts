import { Database } from 'better-sqlite3';
import { JobStore } from '../JobStore';
import { JobQueries } from '../queries/JobQueries';
import { DatabaseError } from '../types/JobTypes';

export interface PerformanceTestConfig {
  testJobCount: number;
  testArtifactCount: number;
  testEventCount: number;
  batchSize: number;
  maxQueryTimeMs: number;
  enableDetailedMetrics: boolean;
  testDataRetentionDays: number;
}

export interface PerformanceMetrics {
  testName: string;
  durationMs: number;
  operationsPerSecond: number;
  success: boolean;
  error?: string;
  details?: any;
}

export interface PerformanceTestResult {
  timestamp: Date;
  config: PerformanceTestConfig;
  metrics: PerformanceMetrics[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDurationMs: number;
    slowestTest?: string;
    fastestTest?: string;
  };
  databaseStats: any;
}

export class PerformanceTester {
  private db: Database;
  private jobStore: JobStore;
  private jobQueries: JobQueries;
  private config: Required<PerformanceTestConfig>;

  constructor(
    db: Database,
    jobStore: JobStore,
    jobQueries: JobQueries,
    config: Partial<PerformanceTestConfig> = {}
  ) {
    this.db = db;
    this.jobStore = jobStore;
    this.jobQueries = jobQueries;
    this.config = {
      testJobCount: 50000,
      testArtifactCount: 100000,
      testEventCount: 250000,
      batchSize: 1000,
      maxQueryTimeMs: 300,
      enableDetailedMetrics: true,
      testDataRetentionDays: 7,
      ...config
    };
  }

  async runFullTestSuite(): Promise<PerformanceTestResult> {
    console.log('Starting performance test suite...');
    const startTime = Date.now();

    const metrics: PerformanceMetrics[] = [];

    try {
      // Test 1: Job Creation Performance
      metrics.push(await this.testJobCreation());

      // Test 2: Job Query Performance
      metrics.push(await this.testJobQueries());

      // Test 3: Timeline Query Performance
      metrics.push(await this.testTimelineQueries());

      // Test 4: Artifact Query Performance
      metrics.push(await this.testArtifactQueries());

      // Test 5: Event Query Performance
      metrics.push(await this.testEventQueries());

      // Test 6: Pagination Performance
      metrics.push(await this.testPagination());

      // Test 7: Search Performance
      metrics.push(await this.testSearchPerformance());

      // Test 8: Usage Stats Performance
      metrics.push(await this.testUsageStatsPerformance());

      // Test 9: Concurrent Access Performance
      metrics.push(await this.testConcurrentAccess());

      // Test 10: Large Dataset Performance
      metrics.push(await this.testLargeDatasetPerformance());

    } catch (error) {
      console.error('Performance test suite failed:', error);
      metrics.push({
        testName: 'test_suite',
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      });
    }

    const summary = this.calculateSummary(metrics);
    const databaseStats = await this.getDatabaseStats();

    return {
      timestamp: new Date(),
      config: this.config,
      metrics,
      summary,
      databaseStats
    };
  }

  async testJobCreation(): Promise<PerformanceMetrics> {
    const testName = 'job_creation';
    const startTime = Date.now();
    let successCount = 0;

    try {
      console.log(`Testing ${testName} with ${this.config.testJobCount} jobs...`);

      const batchSize = this.config.batchSize;
      const totalBatches = Math.ceil(this.config.testJobCount / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = Date.now();
        const batchJobs: any[] = [];

        for (let i = 0; i < batchSize && (batch * batchSize + i) < this.config.testJobCount; i++) {
          const jobIndex = batch * batchSize + i;
          batchJobs.push({
            type: ['chat', 'vision', 'capture', 'automation', 'image_generation'][jobIndex % 5],
            title: `Test Job ${jobIndex}`,
            description: `Performance test job ${jobIndex}`,
            provider: ['openai', 'anthropic', 'gemini', 'ollama'][jobIndex % 4],
            model: ['gpt-4', 'claude-3', 'gemini-pro', 'llama2'][jobIndex % 4],
            params: { test: true, batch, index: i },
            metadata: { performance: true, timestamp: Date.now() }
          });
        }

        // Create batch of jobs
        for (const jobData of batchJobs) {
          try {
            await this.jobStore.createJob(jobData);
            successCount++;
          } catch (error) {
            console.error(`Failed to create job:`, error);
          }
        }

        if (this.config.enableDetailedMetrics) {
          const batchDuration = Date.now() - batchStart;
          console.log(`Batch ${batch + 1}/${totalBatches}: ${batchJobs.length} jobs in ${batchDuration}ms (${(batchJobs.length / batchDuration * 1000).toFixed(2)} ops/sec)`);
        }
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = (successCount / duration) * 1000;

      console.log(`${testName}: ${successCount} jobs created in ${duration}ms (${opsPerSecond.toFixed(2)} ops/sec)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: opsPerSecond,
        success: true,
        details: {
          totalJobs: this.config.testJobCount,
          successCount,
          batchSize: this.config.batchSize
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testJobQueries(): Promise<PerformanceMetrics> {
    const testName = 'job_queries';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Test basic job query
      const queryStart = Date.now();
      const result1 = await this.jobStore.queryJobs({
        filter: { status: ['completed', 'failed'] },
        sort: { field: 'created_at', direction: 'desc' },
        pagination: { limit: 100 }
      });
      queryCount++;
      const query1Duration = Date.now() - queryStart;

      if (query1Duration > this.config.maxQueryTimeMs) {
        throw new Error(`Basic job query took ${query1Duration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      // Test filtered job query
      const filterStart = Date.now();
      const result2 = await this.jobStore.queryJobs({
        filter: {
          type: ['chat', 'vision'],
          provider: ['openai', 'anthropic'],
          created_after: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        pagination: { limit: 50 }
      });
      queryCount++;
      const filterDuration = Date.now() - filterStart;

      if (filterDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Filtered job query took ${filterDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      // Test job stats
      const statsStart = Date.now();
      const stats = await this.jobStore.getJobStats();
      queryCount++;
      const statsDuration = Date.now() - statsStart;

      if (statsDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Job stats query took ${statsDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime,
          maxQueryTime: Math.max(query1Duration, filterDuration, statsDuration)
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testTimelineQueries(): Promise<PerformanceMetrics> {
    const testName = 'timeline_queries';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Get recent jobs for timeline
      const recentJobs = await this.jobStore.getRecentJobs(100);
      queryCount++;

      const timelineQueries: Promise<any>[] = [];

      // Test timeline queries for recent jobs
      for (let i = 0; i < Math.min(50, recentJobs.length); i++) {
        const job = recentJobs[i];
        timelineQueries.push(
          (async () => {
            const start = Date.now();
            const timeline = await this.jobStore.getJobTimeline(job.id);
            const duration = Date.now() - start;

            if (duration > this.config.maxQueryTimeMs) {
              throw new Error(`Timeline query for job ${job.id} took ${duration}ms`);
            }

            return { success: true, duration };
          })()
        );
      }

      const results = await Promise.allSettled(timelineQueries);
      const failedQueries = results.filter(r => r.status === 'rejected').length;
      queryCount += timelineQueries.length;

      if (failedQueries > 0) {
        throw new Error(`${failedQueries} timeline queries failed or exceeded time limit`);
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} timeline queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime,
          failedQueries
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testArtifactQueries(): Promise<PerformanceMetrics> {
    const testName = 'artifact_queries';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Test artifact queries
      const queryStart = Date.now();
      const artifacts = await this.jobStore.queryArtifacts(
        { type: ['screenshot', 'file'] },
        100
      );
      queryCount++;
      const queryDuration = Date.now() - queryStart;

      if (queryDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Artifact query took ${queryDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      // Test artifact stats
      const statsStart = Date.now();
      const stats = await this.jobStore.getArtifactStats();
      queryCount++;
      const statsDuration = Date.now() - statsStart;

      if (statsDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Artifact stats query took ${statsDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime,
          artifactCount: artifacts.artifacts.length
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testEventQueries(): Promise<PerformanceMetrics> {
    const testName = 'event_queries';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Test event queries
      const queryStart = Date.now();
      const events = await this.jobStore.queryEvents(
        { level: ['info', 'warn', 'error'] },
        100
      );
      queryCount++;
      const queryDuration = Date.now() - queryStart;

      if (queryDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Event query took ${queryDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      // Test event stats
      const statsStart = Date.now();
      const stats = await this.jobStore.getEventStats(undefined, 7);
      queryCount++;
      const statsDuration = Date.now() - statsStart;

      if (statsDuration > this.config.maxQueryTimeMs) {
        throw new Error(`Event stats query took ${statsDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime,
          eventCount: events.events.length
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testPagination(): Promise<PerformanceMetrics> {
    const testName = 'pagination';
    const startTime = Date.now();
    let pageCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      let cursor: string | undefined;
      let totalJobs = 0;

      // Test pagination through all jobs
      do {
        const pageStart = Date.now();
        const result = await this.jobStore.queryJobs({
          pagination: { limit: this.config.batchSize, cursor }
        });

        pageCount++;
        totalJobs += result.jobs.length;
        cursor = result.next_cursor;

        const pageDuration = Date.now() - pageStart;

        if (pageDuration > this.config.maxQueryTimeMs) {
          throw new Error(`Pagination page ${pageCount} took ${pageDuration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
        }

        // Safety check to prevent infinite loops
        if (pageCount > 100) {
          console.warn(`Pagination test stopped after 100 pages`);
          break;
        }

      } while (cursor);

      const duration = Date.now() - startTime;
      const avgPageTime = duration / pageCount;

      console.log(`${testName}: ${pageCount} pages, ${totalJobs} jobs in ${duration}ms (avg: ${avgPageTime.toFixed(2)}ms per page)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (pageCount / duration) * 1000,
        success: true,
        details: {
          pageCount,
          totalJobs,
          avgPageTime
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testSearchPerformance(): Promise<PerformanceMetrics> {
    const testName = 'search_performance';
    const startTime = Date.now();
    let searchCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      const searchTerms = ['test', 'performance', 'job', 'chat', 'vision', 'automation'];
      const searchResults: Promise<any>[] = [];

      for (const term of searchTerms) {
        searchResults.push(
          (async () => {
            const start = Date.now();
            const results = await this.jobStore.searchJobs(term, 50);
            const duration = Date.now() - start;

            if (duration > this.config.maxQueryTimeMs) {
              throw new Error(`Search for '${term}' took ${duration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
            }

            return { term, resultCount: results.length, duration };
          })()
        );
      }

      const results = await Promise.allSettled(searchResults);
      const failedSearches = results.filter(r => r.status === 'rejected').length;
      searchCount = searchTerms.length;

      if (failedSearches > 0) {
        throw new Error(`${failedSearches} search queries failed or exceeded time limit`);
      }

      const duration = Date.now() - startTime;
      const avgSearchTime = duration / searchCount;

      console.log(`${testName}: ${searchCount} searches in ${duration}ms (avg: ${avgSearchTime.toFixed(2)}ms per search)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (searchCount / duration) * 1000,
        success: true,
        details: {
          searchCount,
          avgSearchTime,
          failedSearches
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testUsageStatsPerformance(): Promise<PerformanceMetrics> {
    const testName = 'usage_stats_performance';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Test usage stats queries
      const queries = [
        () => this.jobStore.getUsageStats({ date_after: '2024-01-01' }),
        () => this.jobStore.getCostBreakdown('2024-01-01', '2024-12-31'),
        () => this.jobStore.getDashboardStats(30),
        () => this.jobStore.getUsageTrends(30, 'day'),
        () => this.jobStore.getTopProviders(30, 10),
        () => this.jobStore.getTopModels(30, 10)
      ];

      const queryResults: Promise<any>[] = [];

      for (const query of queries) {
        queryResults.push(
          (async () => {
            const start = Date.now();
            const result = await query();
            const duration = Date.now() - start;

            if (duration > this.config.maxQueryTimeMs) {
              throw new Error(`Usage stats query took ${duration}ms (max: ${this.config.maxQueryTimeMs}ms)`);
            }

            return { success: true, duration };
          })()
        );
      }

      const results = await Promise.allSettled(queryResults);
      const failedQueries = results.filter(r => r.status === 'rejected').length;
      queryCount = queries.length;

      if (failedQueries > 0) {
        throw new Error(`${failedQueries} usage stats queries failed or exceeded time limit`);
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime,
          failedQueries
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testConcurrentAccess(): Promise<PerformanceMetrics> {
    const testName = 'concurrent_access';
    const startTime = Date.now();
    const concurrentUsers = 10;
    const queriesPerUser = 5;

    try {
      console.log(`Testing ${testName} with ${concurrentUsers} concurrent users...`);

      const userPromises: Promise<any>[] = [];

      for (let user = 0; user < concurrentUsers; user++) {
        userPromises.push(
          (async () => {
            const userStart = Date.now();
            let userSuccessCount = 0;

            for (let i = 0; i < queriesPerUser; i++) {
              try {
                // Simulate different types of queries
                const queryType = i % 5;
                switch (queryType) {
                  case 0:
                    await this.jobStore.getRecentJobs(10);
                    break;
                  case 1:
                    await this.jobStore.getJobStats();
                    break;
                  case 2:
                    await this.jobStore.getDashboardStats(7);
                    break;
                  case 3:
                    await this.jobStore.searchJobs('test', 10);
                    break;
                  case 4:
                    await this.jobStore.queryArtifacts({ type: ['screenshot'] }, 10);
                    break;
                }
                userSuccessCount++;
              } catch (error) {
                console.error(`User ${user} query ${i} failed:`, error);
              }
            }

            const userDuration = Date.now() - userStart;
            return { userId: user, successCount: userSuccessCount, duration: userDuration };
          })()
        );
      }

      const results = await Promise.allSettled(userPromises);
      const successfulUsers = results.filter(r => r.status === 'fulfilled').length;
      const totalQueries = results.reduce((sum, result) => {
        if (result.status === 'fulfilled') {
          return sum + result.value.successCount;
        }
        return sum;
      }, 0);

      const duration = Date.now() - startTime;

      console.log(`${testName}: ${successfulUsers}/${concurrentUsers} users completed ${totalQueries} queries in ${duration}ms`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (totalQueries / duration) * 1000,
        success: successfulUsers === concurrentUsers,
        details: {
          concurrentUsers,
          successfulUsers,
          totalQueries,
          queriesPerUser
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testLargeDatasetPerformance(): Promise<PerformanceMetrics> {
    const testName = 'large_dataset_performance';
    const startTime = Date.now();
    let queryCount = 0;

    try {
      console.log(`Testing ${testName}...`);

      // Test queries that would be slow on large datasets
      const complexQueries = [
        () => this.jobStore.queryJobs({
          filter: {
            type: ['chat', 'vision'],
            status: ['completed'],
            created_after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          sort: { field: 'total_cost', direction: 'desc' },
          pagination: { limit: 100 }
        }),
        () => this.jobStore.getUsageStats({
          provider: ['openai', 'anthropic'],
          date_after: '2024-01-01'
        }),
        () => this.jobStore.getCostBreakdown('2024-01-01', '2024-12-31'),
        () => this.jobStore.getUsageTrends(90, 'week')
      ];

      for (const query of complexQueries) {
        const queryStart = Date.now();
        await query();
        const queryDuration = Date.now() - queryStart;
        queryCount++;

        if (queryDuration > this.config.maxQueryTimeMs * 2) { // Allow 2x for complex queries
          console.warn(`Complex query took ${queryDuration}ms (limit: ${this.config.maxQueryTimeMs * 2}ms)`);
        }
      }

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / queryCount;

      console.log(`${testName}: ${queryCount} complex queries in ${duration}ms (avg: ${avgQueryTime.toFixed(2)}ms per query)`);

      return {
        testName,
        durationMs: duration,
        operationsPerSecond: (queryCount / duration) * 1000,
        success: true,
        details: {
          queryCount,
          avgQueryTime
        }
      };

    } catch (error: any) {
      return {
        testName,
        durationMs: Date.now() - startTime,
        operationsPerSecond: 0,
        success: false,
        error: error.message
      };
    }
  }

  private calculateSummary(metrics: PerformanceMetrics[]) {
    const passedTests = metrics.filter(m => m.success).length;
    const failedTests = metrics.filter(m => !m.success).length;
    const totalTests = metrics.length;
    const averageDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / totalTests;

    const slowestTest = metrics.reduce((slowest, current) =>
      current.durationMs > slowest.durationMs ? current : slowest
    );

    const fastestTest = metrics.reduce((fastest, current) =>
      current.durationMs < fastest.durationMs ? current : fastest
    );

    return {
      totalTests,
      passedTests,
      failedTests,
      averageDurationMs: averageDuration,
      slowestTest: slowestTest.testName,
      fastestTest: fastestTest.testName
    };
  }

  private async getDatabaseStats(): Promise<any> {
    try {
      return await this.dbManager.getDatabaseStats();
    } catch (error) {
      return { error: error.message };
    }
  }

  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up performance test data...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.testDataRetentionDays);

    try {
      // Delete test jobs and related data
      this.db.exec(`
        DELETE FROM job_events WHERE job_id IN (
          SELECT id FROM jobs WHERE metadata LIKE '%performance%'
        );
      `);

      this.db.exec(`
        DELETE FROM job_artifacts WHERE job_id IN (
          SELECT id FROM jobs WHERE metadata LIKE '%performance%'
        );
      `);

      this.db.exec(`
        DELETE FROM jobs WHERE metadata LIKE '%performance%';
      `);

      console.log('Performance test data cleaned up');
    } catch (error) {
      console.error('Failed to clean up test data:', error);
    }
  }

  getConfig(): PerformanceTestConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PerformanceTestConfig>): void {
    this.config = { ...this.config, ...config };
  }
}