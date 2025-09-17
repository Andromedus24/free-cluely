import Database from 'better-sqlite3';
import { DatabaseService } from './DatabaseService';
import { randomUUID } from 'crypto';

export interface PerformanceTestResult {
  testName: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  iterations: number;
  success: boolean;
  error?: string;
}

export interface PerformanceTestSuite {
  jobQueries: PerformanceTestResult;
  artifactQueries: PerformanceTestResult;
  eventQueries: PerformanceTestResult;
  searchQueries: PerformanceTestResult;
  statsQueries: PerformanceTestResult;
  timelineQueries: PerformanceTestResult;
  insertOperations: PerformanceTestResult;
  updateOperations: PerformanceTestResult;
  cleanupOperations: PerformanceTestResult;
}

export class PerformanceTester {
  private dbService: DatabaseService;
  private testData: { jobs: number[]; artifacts: number[]; sessions: number[] } = { jobs: [], artifacts: [], sessions: [] };

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async generateTestData(jobCount: number = 50000): Promise<void> {
    try {
      console.log(`Generating ${jobCount} test jobs...`);

      // Create test session
      const session = await this.dbService.createSession({
        name: 'Performance Test Session',
        description: 'Session for performance testing'
      });
      this.testData.sessions.push(session.id);

      const batchSize = 1000;
      let totalJobs = 0;

      for (let batch = 0; batch < Math.ceil(jobCount / batchSize); batch++) {
        const batchJobs = [];
        const currentBatchSize = Math.min(batchSize, jobCount - totalJobs);

        for (let i = 0; i < currentBatchSize; i++) {
          const job = {
            title: `Performance Test Job ${totalJobs + i + 1}`,
            description: `Test job for performance evaluation`,
            type: 'chat' as const,
            status: 'completed' as const,
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            request: JSON.stringify({
              messages: [{ role: 'user', content: `Test message ${totalJobs + i + 1}` }],
              temperature: 0.7
            }),
            metadata: { test: true, batch: batch, index: i },
            tags: ['test', 'performance', `batch-${batch}`],
            sessionId: session.uuid,
            priority: Math.floor(Math.random() * 11)
          };

          batchJobs.push(job);
        }

        // Insert batch
        const startTime = Date.now();
        for (const jobData of batchJobs) {
          const job = await this.dbService.createJob(jobData);

          // Simulate job completion
          await this.dbService.completeJob(
            job.id,
            JSON.stringify({ choices: [{ message: { content: 'Test response' } }] }),
            Math.floor(Math.random() * 1000) + 100,
            Math.random() * 0.1 + 0.001
          );

          this.testData.jobs.push(job.id);
        }

        totalJobs += currentBatchSize;
        const batchTime = Date.now() - startTime;
        console.log(`Batch ${batch + 1}: ${currentBatchSize} jobs in ${batchTime}ms (${(currentBatchSize / batchTime * 1000).toFixed(2)} jobs/sec)`);

        // Create some artifacts for every 10th job
        if (totalJobs % 10 === 0) {
          const artifactData = {
            jobId: this.testData.jobs[this.testData.jobs.length - 1],
            type: 'screenshot' as const,
            name: `test-screenshot-${totalJobs}.png`,
            description: 'Test screenshot for performance testing',
            mimeType: 'image/png',
            metadata: { test: true, size: '1024x768' },
            fileData: Buffer.alloc(1024 * 50) // 50KB test image
          };

          const artifact = await this.dbService.createArtifact(artifactData);
          this.testData.artifacts.push(artifact.id);
        }
      }

      console.log(`Generated ${totalJobs} test jobs and ${this.testData.artifacts.length} artifacts`);
    } catch (error) {
      throw new Error(`Failed to generate test data: ${error}`);
    }
  }

  async runJobQueryPerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running job query performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Test various query patterns
        const queries = [
          () => this.dbService.queryJobs({ limit: 50 }),
          () => this.dbService.queryJobs({ filter: { status: 'completed' }, limit: 50 }),
          () => this.dbService.queryJobs({ filter: { provider: 'openai' }, limit: 50 }),
          () => this.dbService.queryJobs({ filter: { type: 'chat' }, limit: 50 }),
          () => this.dbService.queryJobs({ filter: { createdAfter: Date.now() / 1000 - 86400 }, limit: 50 }),
          () => this.dbService.queryJobs({ filter: { search: 'Performance Test' }, limit: 50 }),
          () => this.dbService.queryJobs({ filter: { tags: ['test'] }, limit: 50 }),
          () => this.dbService.queryJobs({ sort: 'cost_usd', direction: 'desc', limit: 50 }),
          () => this.dbService.queryJobs({ sort: 'duration_ms', direction: 'desc', limit: 50 }),
          () => this.dbService.queryJobs({ filter: { minCost: 0.01, maxCost: 0.1 }, limit: 50 })
        ];

        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        await randomQuery();

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Job Queries', times);
    } catch (error) {
      return {
        testName: 'Job Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runArtifactQueryPerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running artifact query performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Test artifact queries
        const jobId = this.testData.jobs[Math.floor(Math.random() * this.testData.jobs.length)];
        await this.dbService.getJobArtifacts(jobId);

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Artifact Queries', times);
    } catch (error) {
      return {
        testName: 'Artifact Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runTimelineQueryPerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running timeline query performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Test timeline queries with different job counts
        const jobId = this.testData.jobs[Math.floor(Math.random() * this.testData.jobs.length)];

        // Get job events (timeline)
        await this.dbService.getJobEvents(jobId, {
          limit: 50,
          level: 'info'
        });

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Timeline Queries', times);
    } catch (error) {
      return {
        testName: 'Timeline Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runSearchPerformanceTest(iterations: number = 50): Promise<PerformanceTestResult> {
    try {
      console.log(`Running search performance test (${iterations} iterations)...`);

      const times: number[] = [];
      const searchTerms = ['Performance Test', 'Test Job', 'OpenAI', 'GPT', 'batch-0', 'batch-1'];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        await this.dbService.searchJobs(searchTerm, {
          limit: 50,
          includeContent: false
        });

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Search Queries', times);
    } catch (error) {
      return {
        testName: 'Search Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runStatsQueryPerformanceTest(iterations: number = 50): Promise<PerformanceTestResult> {
    try {
      console.log(`Running stats query performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Test various stats queries
        const statsQueries = [
          () => this.dbService.getJobStats(),
          () => this.dbService.getJobStats({ status: 'completed' }),
          () => this.dbService.getJobStats({ provider: 'openai' }),
          () => this.dbService.getJobStats({ type: 'chat' }),
          () => this.dbService.getUsageStats({
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }),
          () => this.dbService.getArtifactStorageStats()
        ];

        const randomQuery = statsQueries[Math.floor(Math.random() * statsQueries.length)];
        await randomQuery();

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Stats Queries', times);
    } catch (error) {
      return {
        testName: 'Stats Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runEventQueryPerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running event query performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const jobId = this.testData.jobs[Math.floor(Math.random() * this.testData.jobs.length)];

        // Query events with different filters
        const filters = [
          { limit: 100 },
          { level: 'info', limit: 50 },
          { eventType: 'completed', limit: 50 },
          { after: Date.now() / 1000 - 86400, limit: 50 }
        ];

        const filter = filters[Math.floor(Math.random() * filters.length)];
        await this.dbService.getJobEvents(jobId, filter);

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Event Queries', times);
    } catch (error) {
      return {
        testName: 'Event Queries',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runInsertPerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running insert performance test (${iterations} iterations)...`);

      const times: number[] = [];
      const session = this.testData.sessions[0];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const job = await this.dbService.createJob({
          title: `Insert Test Job ${i}`,
          description: 'Test job for insert performance',
          type: 'chat',
          status: 'pending',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          request: JSON.stringify({ messages: [{ role: 'user', content: 'Test' }]}),
          sessionId: session
        });

        // Clean up the created job
        await this.dbService.deleteJob(job.id);

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Insert Operations', times);
    } catch (error) {
      return {
        testName: 'Insert Operations',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runUpdatePerformanceTest(iterations: number = 100): Promise<PerformanceTestResult> {
    try {
      console.log(`Running update performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const jobId = this.testData.jobs[Math.floor(Math.random() * this.testData.jobs.length)];
        const startTime = Date.now();

        await this.dbService.updateJob(jobId, {
          title: `Updated Job ${i}`,
          metadata: { updated: true, timestamp: Date.now() }
        });

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Update Operations', times);
    } catch (error) {
      return {
        testName: 'Update Operations',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runCleanupPerformanceTest(iterations: number = 10): Promise<PerformanceTestResult> {
    try {
      console.log(`Running cleanup performance test (${iterations} iterations)...`);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await this.dbService.cleanup();

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      return this.calculateStats('Cleanup Operations', times);
    } catch (error) {
      return {
        testName: 'Cleanup Operations',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        p99Time: 0,
        iterations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateStats(testName: string, times: number[]): PerformanceTestResult {
    times.sort((a, b) => a - b);

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const p95Time = times[Math.floor(times.length * 0.95)];
    const p99Time = times[Math.floor(times.length * 0.99)];

    return {
      testName,
      averageTime,
      minTime,
      maxTime,
      p95Time,
      p99Time,
      iterations: times.length,
      success: true
    };
  }

  async runFullPerformanceTestSuite(jobCount: number = 50000): Promise<PerformanceTestSuite> {
    try {
      console.log('=== Starting Full Performance Test Suite ===');
      console.log(`Generating ${jobCount} test jobs...`);

      // Generate test data
      await this.generateTestData(jobCount);

      console.log('Running performance tests...');

      // Run all tests
      const results = await Promise.all([
        this.runJobQueryPerformanceTest(),
        this.runArtifactQueryPerformanceTest(),
        this.runTimelineQueryPerformanceTest(),
        this.runSearchPerformanceTest(),
        this.runStatsQueryPerformanceTest(),
        this.runEventQueryPerformanceTest(),
        this.runInsertPerformanceTest(),
        this.runUpdatePerformanceTest(),
        this.runCleanupPerformanceTest()
      ]);

      const [
        jobQueries,
        artifactQueries,
        eventQueries,
        searchQueries,
        statsQueries,
        timelineQueries,
        insertOperations,
        updateOperations,
        cleanupOperations
      ] = results;

      const testSuite: PerformanceTestSuite = {
        jobQueries,
        artifactQueries,
        eventQueries,
        searchQueries,
        statsQueries,
        timelineQueries,
        insertOperations,
        updateOperations,
        cleanupOperations
      };

      // Print results
      this.printResults(testSuite);

      // Check if timeline queries meet the 300ms p95 requirement
      if (timelineQueries.p95Time > 300) {
        console.warn(`⚠️  Timeline queries p95 time (${timelineQueries.p95Time}ms) exceeds 300ms target`);
      } else {
        console.log(`✅ Timeline queries p95 time (${timelineQueries.p95Time}ms) meets 300ms target`);
      }

      return testSuite;
    } catch (error) {
      throw new Error(`Performance test suite failed: ${error}`);
    }
  }

  private printResults(results: PerformanceTestSuite): void {
    console.log('\n=== Performance Test Results ===');

    const tests = [
      'jobQueries',
      'artifactQueries',
      'eventQueries',
      'searchQueries',
      'statsQueries',
      'timelineQueries',
      'insertOperations',
      'updateOperations',
      'cleanupOperations'
    ] as const;

    tests.forEach(testName => {
      const result = results[testName];
      const status = result.success ? '✅' : '❌';
      const target = testName === 'timelineQueries' ? ' (target: <300ms p95)' : '';

      console.log(`${status} ${result.testName}${target}`);
      if (result.success) {
        console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
        console.log(`   P95:    ${result.p95Time.toFixed(2)}ms`);
        console.log(`   P99:    ${result.p99Time.toFixed(2)}ms`);
        console.log(`   Min:    ${result.minTime.toFixed(2)}ms`);
        console.log(`   Max:    ${result.maxTime.toFixed(2)}ms`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
    });
  }

  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up test data...');

      // Delete test jobs
      for (const jobId of this.testData.jobs) {
        try {
          await this.dbService.deleteJob(jobId);
        } catch (error) {
          console.warn(`Failed to delete job ${jobId}:`, error);
        }
      }

      // Delete test sessions
      for (const sessionId of this.testData.sessions) {
        try {
          await this.dbService.deleteSession(sessionId);
        } catch (error) {
          console.warn(`Failed to delete session ${sessionId}:`, error);
        }
      }

      // Vacuum database
      await this.dbService.vacuum();

      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }
}