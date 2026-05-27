// ============================================================================
// Quant Ecosystem - Testing Framework: Test Runner
// Full-featured test runner with describe/it/hooks/parallel execution
// ============================================================================

import type {
  TestSuite,
  TestCase,
  TestResult,
  TestHook,
  TestRunSummary,
  TestRunnerConfig,
  TestError,
} from '../types';

/**
 * TestRunner - Complete test execution engine
 * Supports nested suites, hooks, timeouts, skip/only/todo, parallel execution
 */
export class TestRunner {
  private rootSuite: TestSuite;
  private currentSuite: TestSuite;
  private results: TestResult[] = [];
  private config: TestRunnerConfig;
  private hasOnly: boolean = false;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = {
      timeout: config.timeout ?? 5000,
      parallel: config.parallel ?? false,
      maxConcurrency: config.maxConcurrency ?? 4,
      bail: config.bail ?? false,
      reporter: config.reporter ?? null,
      retries: config.retries ?? 0,
    };

    this.rootSuite = this.createSuite('root', null);
    this.currentSuite = this.rootSuite;
  }

  private createSuite(name: string, parent: TestSuite | null): TestSuite {
    return {
      name,
      tests: [],
      suites: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: [],
      only: false,
      skip: false,
      timeout: this.config.timeout,
      parent,
    };
  }

  /**
   * Creates a nested test suite (describe block)
   */
  describe(name: string, fn: () => void): void {
    const suite = this.createSuite(name, this.currentSuite);
    this.currentSuite.suites.push(suite);
    const previousSuite = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = previousSuite;
  }

  /**
   * Creates a focused test suite (only this suite runs)
   */
  describeOnly(name: string, fn: () => void): void {
    const suite = this.createSuite(name, this.currentSuite);
    suite.only = true;
    this.hasOnly = true;
    this.currentSuite.suites.push(suite);
    const previousSuite = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = previousSuite;
  }

  /**
   * Creates a skipped test suite
   */
  describeSkip(name: string, fn: () => void): void {
    const suite = this.createSuite(name, this.currentSuite);
    suite.skip = true;
    this.currentSuite.suites.push(suite);
    const previousSuite = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = previousSuite;
  }

  /**
   * Defines a test case
   */
  it(name: string, fn: () => void | Promise<void>, timeout?: number): void {
    const testCase: TestCase = {
      name,
      fn,
      timeout: timeout ?? this.currentSuite.timeout,
      skip: false,
      only: false,
      todo: false,
      suite: this.currentSuite,
      retries: this.config.retries,
    };
    this.currentSuite.tests.push(testCase);
  }

  /**
   * Defines a focused test case (only this test runs)
   */
  itOnly(name: string, fn: () => void | Promise<void>, timeout?: number): void {
    const testCase: TestCase = {
      name,
      fn,
      timeout: timeout ?? this.currentSuite.timeout,
      skip: false,
      only: true,
      todo: false,
      suite: this.currentSuite,
      retries: this.config.retries,
    };
    this.hasOnly = true;
    this.currentSuite.tests.push(testCase);
  }

  /**
   * Defines a skipped test case
   */
  itSkip(name: string, fn: () => void | Promise<void>): void {
    const testCase: TestCase = {
      name,
      fn,
      timeout: this.currentSuite.timeout,
      skip: true,
      only: false,
      todo: false,
      suite: this.currentSuite,
      retries: 0,
    };
    this.currentSuite.tests.push(testCase);
  }

  /**
   * Defines a todo test case (placeholder)
   */
  itTodo(name: string): void {
    const testCase: TestCase = {
      name,
      fn: () => {},
      timeout: this.currentSuite.timeout,
      skip: false,
      only: false,
      todo: true,
      suite: this.currentSuite,
      retries: 0,
    };
    this.currentSuite.tests.push(testCase);
  }

  /**
   * Registers a beforeAll hook
   */
  beforeAll(fn: () => void | Promise<void>, timeout?: number): void {
    this.currentSuite.beforeAll.push({ fn, timeout: timeout ?? this.config.timeout });
  }

  /**
   * Registers an afterAll hook
   */
  afterAll(fn: () => void | Promise<void>, timeout?: number): void {
    this.currentSuite.afterAll.push({ fn, timeout: timeout ?? this.config.timeout });
  }

  /**
   * Registers a beforeEach hook
   */
  beforeEach(fn: () => void | Promise<void>, timeout?: number): void {
    this.currentSuite.beforeEach.push({ fn, timeout: timeout ?? this.config.timeout });
  }

  /**
   * Registers an afterEach hook
   */
  afterEach(fn: () => void | Promise<void>, timeout?: number): void {
    this.currentSuite.afterEach.push({ fn, timeout: timeout ?? this.config.timeout });
  }

  /**
   * Runs all registered tests and returns summary
   */
  async run(): Promise<TestRunSummary> {
    this.results = [];
    const startTime = Date.now();

    await this.runSuite(this.rootSuite);

    const summary: TestRunSummary = {
      total: this.results.length,
      passed: this.results.filter((r) => r.status === 'passed').length,
      failed: this.results.filter((r) => r.status === 'failed').length,
      skipped: this.results.filter((r) => r.status === 'skipped').length,
      todo: this.results.filter((r) => r.status === 'todo').length,
      duration: Date.now() - startTime,
      suites: this.countSuites(this.rootSuite),
      results: [...this.results],
    };

    if (this.config.reporter) {
      this.config.reporter.onComplete(summary);
    }

    return summary;
  }

  private async runSuite(suite: TestSuite): Promise<void> {
    if (suite.skip) {
      this.skipEntireSuite(suite);
      return;
    }

    if (this.config.reporter && suite !== this.rootSuite) {
      this.config.reporter.onSuiteStart(suite);
    }

    // Run beforeAll hooks
    for (const hook of suite.beforeAll) {
      await this.runWithTimeout(hook.fn, hook.timeout);
    }

    // Run tests (parallel or sequential)
    if (this.config.parallel) {
      await this.runTestsParallel(suite.tests, suite);
    } else {
      await this.runTestsSequential(suite.tests, suite);
    }

    // Run child suites
    for (const childSuite of suite.suites) {
      if (this.config.bail && this.results.some((r) => r.status === 'failed')) {
        break;
      }
      await this.runSuite(childSuite);
    }

    // Run afterAll hooks
    for (const hook of suite.afterAll) {
      await this.runWithTimeout(hook.fn, hook.timeout);
    }

    if (this.config.reporter && suite !== this.rootSuite) {
      const suiteResults = this.results.filter((r) => r.suiteName === suite.name);
      this.config.reporter.onSuiteEnd(suite, suiteResults);
    }
  }

  private async runTestsSequential(tests: TestCase[], suite: TestSuite): Promise<void> {
    for (const test of tests) {
      if (this.config.bail && this.results.some((r) => r.status === 'failed')) {
        break;
      }
      await this.runTest(test, suite);
    }
  }

  private async runTestsParallel(tests: TestCase[], suite: TestSuite): Promise<void> {
    const chunks = this.chunkArray(tests, this.config.maxConcurrency);
    for (const chunk of chunks) {
      await Promise.all(chunk.map((test) => this.runTest(test, suite)));
    }
  }

  private async runTest(test: TestCase, suite: TestSuite): Promise<void> {
    // Handle skip/todo/only filtering
    if (test.todo) {
      const result: TestResult = {
        testName: test.name,
        suiteName: suite.name,
        status: 'todo',
        duration: 0,
        error: null,
        retries: 0,
        timestamp: Date.now(),
      };
      this.results.push(result);
      return;
    }

    if (test.skip || (this.hasOnly && !test.only && !this.suiteHasOnly(suite))) {
      const result: TestResult = {
        testName: test.name,
        suiteName: suite.name,
        status: 'skipped',
        duration: 0,
        error: null,
        retries: 0,
        timestamp: Date.now(),
      };
      this.results.push(result);
      if (this.config.reporter) {
        this.config.reporter.onTestSkip(result);
      }
      return;
    }

    let lastError: TestError | null = null;
    const maxAttempts = test.retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const startTime = Date.now();
      try {
        // Run beforeEach hooks (including parent suite hooks)
        const hooks = this.collectBeforeEachHooks(suite);
        for (const hook of hooks) {
          await this.runWithTimeout(hook.fn, hook.timeout);
        }

        // Run the test itself with timeout
        await this.runWithTimeout(test.fn, test.timeout);

        // Run afterEach hooks
        const afterHooks = this.collectAfterEachHooks(suite);
        for (const hook of afterHooks) {
          await this.runWithTimeout(hook.fn, hook.timeout);
        }

        const result: TestResult = {
          testName: test.name,
          suiteName: suite.name,
          status: 'passed',
          duration: Date.now() - startTime,
          error: null,
          retries: attempt,
          timestamp: Date.now(),
        };
        this.results.push(result);
        if (this.config.reporter) {
          this.config.reporter.onTestPass(result);
        }
        return;
      } catch (err) {
        lastError = this.formatError(err);
        // Run afterEach hooks even on failure
        const afterHooks = this.collectAfterEachHooks(suite);
        for (const hook of afterHooks) {
          try {
            await this.runWithTimeout(hook.fn, hook.timeout);
          } catch (_) {
            // afterEach errors are suppressed
          }
        }
      }
    }

    // All attempts failed
    const result: TestResult = {
      testName: test.name,
      suiteName: suite.name,
      status: 'failed',
      duration: 0,
      error: lastError,
      retries: maxAttempts - 1,
      timestamp: Date.now(),
    };
    this.results.push(result);
    if (this.config.reporter) {
      this.config.reporter.onTestFail(result);
    }
  }

  private collectBeforeEachHooks(suite: TestSuite): TestHook[] {
    const hooks: TestHook[] = [];
    let current: TestSuite | null = suite;
    const ancestors: TestSuite[] = [];
    while (current) {
      ancestors.unshift(current);
      current = current.parent;
    }
    for (const ancestor of ancestors) {
      hooks.push(...ancestor.beforeEach);
    }
    return hooks;
  }

  private collectAfterEachHooks(suite: TestSuite): TestHook[] {
    const hooks: TestHook[] = [];
    let current: TestSuite | null = suite;
    while (current) {
      hooks.push(...current.afterEach);
      current = current.parent;
    }
    return hooks;
  }

  private async runWithTimeout(fn: () => void | Promise<void>, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: operation exceeded ${timeout}ms`));
      }, timeout);

      try {
        const result = fn();
        if (result && typeof result === 'object' && 'then' in result) {
          (result as Promise<void>)
            .then(() => {
              clearTimeout(timer);
              resolve();
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        } else {
          clearTimeout(timer);
          resolve();
        }
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  private skipEntireSuite(suite: TestSuite): void {
    for (const test of suite.tests) {
      this.results.push({
        testName: test.name,
        suiteName: suite.name,
        status: 'skipped',
        duration: 0,
        error: null,
        retries: 0,
        timestamp: Date.now(),
      });
    }
    for (const child of suite.suites) {
      this.skipEntireSuite(child);
    }
  }

  private suiteHasOnly(suite: TestSuite): boolean {
    if (suite.only) return true;
    if (suite.tests.some((t) => t.only)) return true;
    return suite.suites.some((s) => this.suiteHasOnly(s));
  }

  private countSuites(suite: TestSuite): number {
    let count = suite === this.rootSuite ? 0 : 1;
    for (const child of suite.suites) {
      count += this.countSuites(child);
    }
    return count;
  }

  private formatError(err: unknown): TestError {
    if (err instanceof Error) {
      return {
        message: err.message,
        stack: err.stack ?? '',
        expected: (err as any).expected,
        actual: (err as any).actual,
        operator: (err as any).operator,
      };
    }
    return {
      message: String(err),
      stack: '',
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Resets the runner state for a fresh run
   */
  reset(): void {
    this.rootSuite = this.createSuite('root', null);
    this.currentSuite = this.rootSuite;
    this.results = [];
    this.hasOnly = false;
  }

  /**
   * Gets accumulated results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }
}
