// ============================================================================
// Quant Ecosystem - Testing Framework: E2E Runner
// Step sequencing, page navigation, element interaction, retry logic
// ============================================================================

import type { E2EConfig, E2EStep, E2EScenario, E2EResult, E2EStepResult } from '../types';

interface PageState {
  url: string;
  title: string;
  elements: Map<string, VirtualElement>;
  cookies: Map<string, string>;
  localStorage: Map<string, string>;
}

interface VirtualElement {
  selector: string;
  tag: string;
  text: string;
  value: string;
  visible: boolean;
  enabled: boolean;
  attributes: Record<string, string>;
}

/**
 * E2ERunner - End-to-end test execution with step sequencing and retry logic
 */
export class E2ERunner {
  private config: E2EConfig;
  private scenarios: E2EScenario[] = [];
  private results: E2EResult[] = [];
  private page: PageState;
  private screenshots: string[] = [];
  private actionHandlers: Map<string, (step: E2EStep, page: PageState) => Promise<void>> =
    new Map();

  constructor(config: Partial<E2EConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'http://localhost:3000',
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 2,
      parallel: config.parallel ?? false,
      screenshots: config.screenshots ?? true,
      headless: config.headless ?? true,
    };

    this.page = this.createFreshPage();
    this.registerDefaultActions();
  }

  /**
   * Creates a fresh page state
   */
  private createFreshPage(): PageState {
    return {
      url: this.config.baseUrl,
      title: 'Test Page',
      elements: new Map(),
      cookies: new Map(),
      localStorage: new Map(),
    };
  }

  /**
   * Registers default action handlers
   */
  private registerDefaultActions(): void {
    this.actionHandlers.set('navigate', async (step, page) => {
      page.url = step.value ?? page.url;
      page.title = `Page: ${page.url}`;
    });

    this.actionHandlers.set('click', async (step, page) => {
      const el = this.findElement(step.selector!, page);
      if (!el) throw new Error(`Element not found: ${step.selector}`);
      if (!el.visible) throw new Error(`Element not visible: ${step.selector}`);
      if (!el.enabled) throw new Error(`Element not enabled: ${step.selector}`);
    });

    this.actionHandlers.set('type', async (step, page) => {
      const el = this.findElement(step.selector!, page);
      if (!el) throw new Error(`Element not found: ${step.selector}`);
      el.value = step.value ?? '';
    });

    this.actionHandlers.set('select', async (step, page) => {
      const el = this.findElement(step.selector!, page);
      if (!el) throw new Error(`Element not found: ${step.selector}`);
      el.value = step.value ?? '';
    });

    this.actionHandlers.set('assert_visible', async (step, page) => {
      const el = this.findElement(step.selector!, page);
      if (!el || !el.visible) throw new Error(`Expected ${step.selector} to be visible`);
    });

    this.actionHandlers.set('assert_text', async (step, page) => {
      const el = this.findElement(step.selector!, page);
      if (!el) throw new Error(`Element not found: ${step.selector}`);
      if (!el.text.includes(step.value ?? '')) {
        throw new Error(
          `Expected text "${step.value}" in element ${step.selector}, found "${el.text}"`,
        );
      }
    });

    this.actionHandlers.set('assert_url', async (step, page) => {
      if (!page.url.includes(step.value ?? '')) {
        throw new Error(`Expected URL to contain "${step.value}", got "${page.url}"`);
      }
    });

    this.actionHandlers.set('wait', async (step) => {
      const ms = parseInt(step.value ?? '1000', 10);
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 100)));
    });

    this.actionHandlers.set('screenshot', async (step, _page) => {
      const name = step.value ?? `screenshot_${this.screenshots.length + 1}`;
      this.screenshots.push(`${name}_${Date.now()}.png`);
    });

    this.actionHandlers.set('set_cookie', async (step, page) => {
      const [name, value] = (step.value ?? '').split('=');
      page.cookies.set(name ?? '', value ?? '');
    });

    this.actionHandlers.set('set_storage', async (step, page) => {
      const [key, value] = (step.value ?? '').split('=');
      page.localStorage.set(key ?? '', value ?? '');
    });
  }

  /**
   * Registers a custom action handler
   */
  registerAction(name: string, handler: (step: E2EStep, page: PageState) => Promise<void>): void {
    this.actionHandlers.set(name, handler);
  }

  /**
   * Adds a test scenario
   */
  scenario(
    name: string,
    steps: E2EStep[],
    options: { tags?: string[]; retries?: number } = {},
  ): void {
    this.scenarios.push({
      name,
      steps,
      tags: options.tags ?? [],
      retries: options.retries ?? this.config.retries,
    });
  }

  /**
   * Convenience: defines a scenario using given/when/then
   */
  feature(name: string, definition: { given: E2EStep[]; when: E2EStep[]; then: E2EStep[] }): void {
    const steps: E2EStep[] = [
      ...definition.given.map((s) => ({ ...s, type: 'given' as const })),
      ...definition.when.map((s) => ({ ...s, type: 'when' as const })),
      ...definition.then.map((s) => ({ ...s, type: 'then' as const })),
    ];
    this.scenario(name, steps);
  }

  /**
   * Adds an element to the virtual page for testing
   */
  addElement(selector: string, element: Partial<VirtualElement>): void {
    this.page.elements.set(selector, {
      selector,
      tag: element.tag ?? 'div',
      text: element.text ?? '',
      value: element.value ?? '',
      visible: element.visible ?? true,
      enabled: element.enabled ?? true,
      attributes: element.attributes ?? {},
    });
  }

  /**
   * Runs all registered scenarios
   */
  async run(filter?: { tags?: string[] }): Promise<E2EResult[]> {
    this.results = [];

    let scenariosToRun = this.scenarios;
    if (filter?.tags && filter.tags.length > 0) {
      scenariosToRun = this.scenarios.filter((s) =>
        filter.tags!.some((tag) => s.tags.includes(tag)),
      );
    }

    if (this.config.parallel) {
      await Promise.all(scenariosToRun.map((s) => this.runScenario(s)));
    } else {
      for (const scenario of scenariosToRun) {
        await this.runScenario(scenario);
      }
    }

    return this.results;
  }

  /**
   * Runs a single scenario with retry logic
   */
  private async runScenario(scenario: E2EScenario): Promise<void> {
    let lastError: string | undefined;
    let stepResults: E2EStepResult[] = [];

    for (let attempt = 0; attempt <= scenario.retries; attempt++) {
      this.page = this.createFreshPage();
      this.screenshots = [];
      stepResults = [];
      lastError = undefined;
      let failed = false;

      const startTime = Date.now();

      for (const step of scenario.steps) {
        if (failed) {
          stepResults.push({ step, status: 'skipped', duration: 0 });
          continue;
        }

        const stepStart = Date.now();
        try {
          await this.executeStep(step);
          stepResults.push({ step, status: 'passed', duration: Date.now() - stepStart });
        } catch (err) {
          lastError = (err as Error).message;
          stepResults.push({
            step,
            status: 'failed',
            duration: Date.now() - stepStart,
            error: lastError,
          });
          failed = true;

          // Capture screenshot on failure
          if (this.config.screenshots) {
            this.screenshots.push(`failure_${scenario.name}_${Date.now()}.png`);
          }
        }
      }

      if (!failed) {
        this.results.push({
          scenario: scenario.name,
          status: 'passed',
          steps: stepResults,
          duration: Date.now() - startTime,
          screenshots: [...this.screenshots],
        });
        return;
      }

      // If last attempt, record as failed
      if (attempt === scenario.retries) {
        this.results.push({
          scenario: scenario.name,
          status: 'failed',
          steps: stepResults,
          duration: Date.now() - startTime,
          screenshots: [...this.screenshots],
          error: lastError,
        });
      }
    }
  }

  /**
   * Executes a single E2E step
   */
  private async executeStep(step: E2EStep): Promise<void> {
    const timeout = step.timeout ?? this.config.timeout;
    const handler = this.actionHandlers.get(step.action);

    if (!handler) {
      throw new Error(`Unknown action: ${step.action}`);
    }

    // Execute with timeout
    await Promise.race([
      handler(step, this.page),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Step timed out after ${timeout}ms: ${step.action}`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Finds an element in the virtual page
   */
  private findElement(selector: string, page: PageState): VirtualElement | null {
    // Direct match
    if (page.elements.has(selector)) {
      return page.elements.get(selector)!;
    }

    // Search by partial match
    for (const [key, el] of page.elements) {
      if (key.includes(selector) || el.text.includes(selector)) {
        return el;
      }
    }

    return null;
  }

  /**
   * Gets all test results
   */
  getResults(): E2EResult[] {
    return [...this.results];
  }

  /**
   * Gets summary statistics
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  } {
    return {
      total: this.results.length,
      passed: this.results.filter((r) => r.status === 'passed').length,
      failed: this.results.filter((r) => r.status === 'failed').length,
      skipped: this.results.filter((r) => r.status === 'skipped').length,
      duration: this.results.reduce((sum, r) => sum + r.duration, 0),
    };
  }

  /**
   * Resets the runner
   */
  reset(): void {
    this.scenarios = [];
    this.results = [];
    this.page = this.createFreshPage();
    this.screenshots = [];
  }
}
