// ============================================================================
// Quant Ecosystem - Testing Framework: Coverage Reporter
// Line/branch/function coverage, thresholds, report generation
// ============================================================================

import type {
  CoverageData,
  FileCoverage,
  LinesCoverage,
  BranchCoverage,
  BranchInfo,
  FunctionCoverage,
  CoverageSummary,
  CoverageThresholds,
} from '../types';

interface InstrumentedFile {
  path: string;
  totalLines: number;
  executableLines: number[];
  executedLines: Set<number>;
  branches: BranchInstrumentation[];
  functions: FunctionInstrumentation[];
}

interface BranchInstrumentation {
  line: number;
  type: 'if' | 'else' | 'ternary' | 'switch-case';
  taken: boolean;
}

interface FunctionInstrumentation {
  name: string;
  startLine: number;
  endLine: number;
  called: boolean;
  callCount: number;
}

/**
 * CoverageReporter - Tracks and reports code coverage
 */
export class CoverageReporter {
  private files: Map<string, InstrumentedFile> = new Map();
  private thresholds: CoverageThresholds;

  constructor(thresholds: Partial<CoverageThresholds> = {}) {
    this.thresholds = {
      lines: thresholds.lines ?? 80,
      branches: thresholds.branches ?? 80,
      functions: thresholds.functions ?? 80,
      statements: thresholds.statements ?? 80,
    };
  }

  /**
   * Instruments a file for coverage tracking
   */
  instrumentFile(
    path: string,
    config: {
      totalLines: number;
      executableLines: number[];
      branches: { line: number; type: 'if' | 'else' | 'ternary' | 'switch-case' }[];
      functions: { name: string; startLine: number; endLine: number }[];
    },
  ): void {
    this.files.set(path, {
      path,
      totalLines: config.totalLines,
      executableLines: config.executableLines,
      executedLines: new Set(),
      branches: config.branches.map((b) => ({ ...b, taken: false })),
      functions: config.functions.map((f) => ({ ...f, called: false, callCount: 0 })),
    });
  }

  /**
   * Records a line execution
   */
  recordLine(path: string, line: number): void {
    const file = this.files.get(path);
    if (file) {
      file.executedLines.add(line);
    }
  }

  /**
   * Records multiple line executions
   */
  recordLines(path: string, lines: number[]): void {
    const file = this.files.get(path);
    if (file) {
      for (const line of lines) {
        file.executedLines.add(line);
      }
    }
  }

  /**
   * Records a branch being taken
   */
  recordBranch(path: string, line: number, type: string): void {
    const file = this.files.get(path);
    if (file) {
      const branch = file.branches.find((b) => b.line === line && b.type === type);
      if (branch) {
        branch.taken = true;
      }
    }
  }

  /**
   * Records a function call
   */
  recordFunction(path: string, name: string): void {
    const file = this.files.get(path);
    if (file) {
      const fn = file.functions.find((f) => f.name === name);
      if (fn) {
        fn.called = true;
        fn.callCount++;
      }
    }
  }

  /**
   * Starts coverage collection
   */
  start(): void {
    for (const file of this.files.values()) {
      file.executedLines.clear();
      for (const branch of file.branches) branch.taken = false;
      for (const fn of file.functions) {
        fn.called = false;
        fn.callCount = 0;
      }
    }
  }

  /**
   * Generates coverage data for all files
   */
  getCoverage(): CoverageData {
    const filesCoverage = new Map<string, FileCoverage>();

    for (const [path, file] of this.files) {
      filesCoverage.set(path, this.calculateFileCoverage(file));
    }

    return {
      files: filesCoverage,
      summary: this.calculateSummary(filesCoverage),
      timestamp: Date.now(),
    };
  }

  /**
   * Calculates coverage for a single file
   */
  private calculateFileCoverage(file: InstrumentedFile): FileCoverage {
    const lines = this.calculateLinesCoverage(file);
    const branches = this.calculateBranchCoverage(file);
    const functions = this.calculateFunctionCoverage(file);

    return {
      path: file.path,
      lines,
      branches,
      functions,
    };
  }

  /**
   * Calculates line coverage for a file
   */
  private calculateLinesCoverage(file: InstrumentedFile): LinesCoverage {
    const total = file.executableLines.length;
    const covered = file.executableLines.filter((l) => file.executedLines.has(l)).length;
    const uncovered = file.executableLines.filter((l) => !file.executedLines.has(l));

    return {
      total,
      covered,
      uncovered,
      percentage: total > 0 ? (covered / total) * 100 : 100,
    };
  }

  /**
   * Calculates branch coverage for a file
   */
  private calculateBranchCoverage(file: InstrumentedFile): BranchCoverage {
    const total = file.branches.length;
    const covered = file.branches.filter((b) => b.taken).length;
    const uncoveredBranches: BranchInfo[] = file.branches
      .filter((b) => !b.taken)
      .map((b) => ({ line: b.line, type: b.type, taken: false }));

    return {
      total,
      covered,
      uncoveredBranches,
      percentage: total > 0 ? (covered / total) * 100 : 100,
    };
  }

  /**
   * Calculates function coverage for a file
   */
  private calculateFunctionCoverage(file: InstrumentedFile): FunctionCoverage {
    const total = file.functions.length;
    const covered = file.functions.filter((f) => f.called).length;
    const uncoveredFunctions = file.functions.filter((f) => !f.called).map((f) => f.name);

    return {
      total,
      covered,
      uncoveredFunctions,
      percentage: total > 0 ? (covered / total) * 100 : 100,
    };
  }

  /**
   * Calculates project-level summary
   */
  private calculateSummary(files: Map<string, FileCoverage>): CoverageSummary {
    let totalLines = 0,
      coveredLines = 0;
    let totalBranches = 0,
      coveredBranches = 0;
    let totalFunctions = 0,
      coveredFunctions = 0;

    for (const file of files.values()) {
      totalLines += file.lines.total;
      coveredLines += file.lines.covered;
      totalBranches += file.branches.total;
      coveredBranches += file.branches.covered;
      totalFunctions += file.functions.total;
      coveredFunctions += file.functions.covered;
    }

    return {
      lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 100,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100,
      statements: totalLines > 0 ? (coveredLines / totalLines) * 100 : 100,
    };
  }

  /**
   * Checks if coverage meets thresholds
   */
  checkThresholds(): { pass: boolean; failures: string[] } {
    const coverage = this.getCoverage();
    const failures: string[] = [];

    if (coverage.summary.lines < this.thresholds.lines) {
      failures.push(`Lines: ${coverage.summary.lines.toFixed(1)}% < ${this.thresholds.lines}%`);
    }
    if (coverage.summary.branches < this.thresholds.branches) {
      failures.push(
        `Branches: ${coverage.summary.branches.toFixed(1)}% < ${this.thresholds.branches}%`,
      );
    }
    if (coverage.summary.functions < this.thresholds.functions) {
      failures.push(
        `Functions: ${coverage.summary.functions.toFixed(1)}% < ${this.thresholds.functions}%`,
      );
    }
    if (coverage.summary.statements < this.thresholds.statements) {
      failures.push(
        `Statements: ${coverage.summary.statements.toFixed(1)}% < ${this.thresholds.statements}%`,
      );
    }

    return { pass: failures.length === 0, failures };
  }

  /**
   * Generates a text summary report
   */
  generateSummaryReport(): string {
    const coverage = this.getCoverage();
    const lines: string[] = [];

    lines.push('='.repeat(70));
    lines.push('  COVERAGE REPORT');
    lines.push('='.repeat(70));
    lines.push('');
    lines.push(`  Lines:      ${coverage.summary.lines.toFixed(1)}%`);
    lines.push(`  Branches:   ${coverage.summary.branches.toFixed(1)}%`);
    lines.push(`  Functions:  ${coverage.summary.functions.toFixed(1)}%`);
    lines.push(`  Statements: ${coverage.summary.statements.toFixed(1)}%`);
    lines.push('');
    lines.push('-'.repeat(70));
    lines.push(
      `  ${'File'.padEnd(40)} ${'Lines'.padEnd(10)} ${'Branch'.padEnd(10)} ${'Funcs'.padEnd(10)}`,
    );
    lines.push('-'.repeat(70));

    for (const [path, file] of coverage.files) {
      const shortPath = path.length > 38 ? '...' + path.slice(-35) : path;
      lines.push(
        `  ${shortPath.padEnd(40)} ${file.lines.percentage.toFixed(0).padEnd(10)}% ${file.branches.percentage.toFixed(0).padEnd(10)}% ${file.functions.percentage.toFixed(0).padEnd(10)}%`,
      );
    }

    lines.push('-'.repeat(70));
    return lines.join('\n');
  }

  /**
   * Generates a detailed report with uncovered lines
   */
  generateDetailedReport(): string {
    const coverage = this.getCoverage();
    const lines: string[] = [];

    lines.push(this.generateSummaryReport());
    lines.push('');
    lines.push('  UNCOVERED CODE:');
    lines.push('');

    for (const [path, file] of coverage.files) {
      if (file.lines.uncovered.length > 0 || file.functions.uncoveredFunctions.length > 0) {
        lines.push(`  ${path}:`);
        if (file.lines.uncovered.length > 0) {
          lines.push(`    Uncovered lines: ${this.formatLineRanges(file.lines.uncovered)}`);
        }
        if (file.branches.uncoveredBranches.length > 0) {
          const branchLines = file.branches.uncoveredBranches.map((b) => `L${b.line}(${b.type})`);
          lines.push(`    Uncovered branches: ${branchLines.join(', ')}`);
        }
        if (file.functions.uncoveredFunctions.length > 0) {
          lines.push(`    Uncovered functions: ${file.functions.uncoveredFunctions.join(', ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Formats line numbers into ranges (e.g., "5-8, 12, 15-20")
   */
  private formatLineRanges(lines: number[]): string {
    if (lines.length === 0) return 'none';

    const sorted = [...lines].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0]!;
    let end = sorted[0]!;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i]!;
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i]!;
        end = sorted[i]!;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    return ranges.join(', ');
  }

  /**
   * Resets all coverage data
   */
  reset(): void {
    this.files.clear();
  }

  /**
   * Updates thresholds
   */
  setThresholds(thresholds: Partial<CoverageThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}
