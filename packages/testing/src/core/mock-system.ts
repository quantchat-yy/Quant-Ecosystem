// ============================================================================
// Quant Ecosystem - Testing Framework: Mock System
// Complete mocking with fn(), spyOn(), call tracking, implementation replacement
// ============================================================================

import type { MockFn, MockResult, SpyInstance } from '../types';

/**
 * MockSystem - Central mock management with automatic tracking and cleanup
 */
export class MockSystem {
  private mocks: MockFnImpl<any[], any>[] = [];
  private spies: SpyInstanceImpl[] = [];

  /**
   * Creates a mock function with full call tracking
   */
  fn<TArgs extends unknown[] = unknown[], TReturn = unknown>(
    implementation?: (...args: TArgs) => TReturn,
  ): MockFn<TArgs, TReturn> {
    const mock = new MockFnImpl<TArgs, TReturn>(implementation);
    this.mocks.push(mock as any);
    return mock.toMockFn();
  }

  /**
   * Wraps an existing method with a spy, preserving the original
   */
  spyOn(object: Record<string, any>, method: string): MockFn {
    if (typeof object[method] !== 'function') {
      throw new Error(`Cannot spy on "${method}": it is not a function`);
    }

    const original = object[method];
    const mock = new MockFnImpl(original.bind(object));
    const mockFn = mock.toMockFn();

    object[method] = mockFn;

    const spy: SpyInstanceImpl = {
      object,
      method,
      original,
      mock: mockFn,
      restore: () => {
        object[method] = original;
      },
    };

    this.spies.push(spy);
    return mockFn;
  }

  /**
   * Resets all mock functions (clears calls and config)
   */
  resetAll(): void {
    for (const mock of this.mocks) {
      mock.reset();
    }
  }

  /**
   * Clears call data from all mocks
   */
  clearAll(): void {
    for (const mock of this.mocks) {
      mock.clear();
    }
  }

  /**
   * Restores all spies to original implementations
   */
  restoreAll(): void {
    for (const spy of this.spies) {
      spy.restore();
    }
    this.spies = [];
  }

  /**
   * Gets all registered mock functions
   */
  getMocks(): MockFn[] {
    return this.mocks.map((m) => m.toMockFn());
  }

  /**
   * Gets all registered spies
   */
  getSpies(): SpyInstance[] {
    return this.spies.map((s) => ({
      object: s.object,
      method: s.method,
      original: s.original,
      mock: s.mock,
      restore: s.restore,
    }));
  }
}

/**
 * Internal mock function implementation with full tracking
 */
class MockFnImpl<TArgs extends unknown[], TReturn> {
  private _calls: TArgs[] = [];
  private _results: MockResult<TReturn>[] = [];
  private _implementation: ((...args: TArgs) => TReturn) | null;
  private _defaultImplementation: ((...args: TArgs) => TReturn) | null;
  private _returnValue: TReturn | undefined;
  private _returnValueSet: boolean = false;
  private _returnValuesOnce: TReturn[] = [];
  private _implementationsOnce: ((...args: TArgs) => TReturn)[] = [];
  private _mockName: string = 'mock';
  private _fnRef: MockFn<TArgs, TReturn> | null = null;

  constructor(implementation?: (...args: TArgs) => TReturn) {
    this._implementation = implementation ?? null;
    this._defaultImplementation = implementation ?? null;
  }

  /**
   * Creates the callable mock function interface
   */
  toMockFn(): MockFn<TArgs, TReturn> {
    if (this._fnRef) return this._fnRef;

    const self = this;
    const fn = function (...args: TArgs): TReturn {
      return self.execute(args);
    } as unknown as MockFn<TArgs, TReturn>;

    // Define properties for call tracking
    Object.defineProperty(fn, 'calls', {
      get: () => self._calls,
      enumerable: true,
    });
    Object.defineProperty(fn, 'lastCall', {
      get: () => self._calls[self._calls.length - 1],
      enumerable: true,
    });
    Object.defineProperty(fn, 'callCount', {
      get: () => self._calls.length,
      enumerable: true,
    });
    Object.defineProperty(fn, 'results', {
      get: () => self._results,
      enumerable: true,
    });

    // Methods
    fn.mockReturnValue = (value: TReturn) => {
      self._returnValue = value;
      self._returnValueSet = true;
      return fn;
    };

    fn.mockReturnValueOnce = (value: TReturn) => {
      self._returnValuesOnce.push(value);
      return fn;
    };

    fn.mockImplementation = (impl: (...args: TArgs) => TReturn) => {
      self._implementation = impl;
      return fn;
    };

    fn.mockImplementationOnce = (impl: (...args: TArgs) => TReturn) => {
      self._implementationsOnce.push(impl);
      return fn;
    };

    fn.mockReset = () => {
      self.reset();
    };

    fn.mockClear = () => {
      self.clear();
    };

    fn.mockRestore = () => {
      self._implementation = self._defaultImplementation;
      self._calls = [];
      self._results = [];
      self._returnValue = undefined;
      self._returnValueSet = false;
      self._returnValuesOnce = [];
      self._implementationsOnce = [];
    };

    fn.mockName = (name: string) => {
      self._mockName = name;
      return fn;
    };

    fn.getMockName = () => {
      return self._mockName;
    };

    this._fnRef = fn;
    return fn;
  }

  /**
   * Executes the mock function, tracking calls and results
   */
  private execute(args: TArgs): TReturn {
    this._calls.push([...args] as unknown as TArgs);

    try {
      let result: TReturn;

      // Priority: once implementations > once return values > implementation > return value
      if (this._implementationsOnce.length > 0) {
        const impl = this._implementationsOnce.shift()!;
        result = impl(...args);
      } else if (this._returnValuesOnce.length > 0) {
        result = this._returnValuesOnce.shift()!;
      } else if (this._implementation) {
        result = this._implementation(...args);
      } else if (this._returnValueSet) {
        result = this._returnValue!;
      } else {
        result = undefined as unknown as TReturn;
      }

      this._results.push({ type: 'return', value: result });
      return result;
    } catch (err) {
      this._results.push({ type: 'throw', value: err as TReturn });
      throw err;
    }
  }

  /**
   * Resets all call data and configuration
   */
  reset(): void {
    this._calls = [];
    this._results = [];
    this._implementation = null;
    this._returnValue = undefined;
    this._returnValueSet = false;
    this._returnValuesOnce = [];
    this._implementationsOnce = [];
  }

  /**
   * Clears call data only (preserves configuration)
   */
  clear(): void {
    this._calls = [];
    this._results = [];
  }
}

/**
 * Internal spy implementation
 */
interface SpyInstanceImpl {
  object: Record<string, any>;
  method: string;
  original: Function;
  mock: MockFn;
  restore: () => void;
}

/**
 * Convenience: standalone mock function creator
 */
export function createMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  implementation?: (...args: TArgs) => TReturn,
): MockFn<TArgs, TReturn> {
  const system = new MockSystem();
  return system.fn(implementation);
}

/**
 * Creates a mock object where all methods are mocked
 */
export function mockObject<T extends Record<string, any>>(template: T): T {
  const system = new MockSystem();
  const mocked: Record<string, any> = {};

  for (const key of Object.keys(template)) {
    if (typeof template[key] === 'function') {
      mocked[key] = system.fn();
    } else {
      mocked[key] = template[key];
    }
  }

  return mocked as T;
}

/**
 * Creates a mock that records and returns values in sequence
 */
export function createSequenceMock<T>(values: T[]): MockFn<[], T> {
  const system = new MockSystem();
  let index = 0;
  return system.fn<[], T>(() => {
    const value = values[index % values.length]!;
    index++;
    return value;
  });
}
