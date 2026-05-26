import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export interface ProductivityMetrics {
  teamId: string;
  period: string;
  tasksCompleted: number;
  averageCompletionTime: number;
  throughput: number;
  efficiency: number;
}

export interface ResourceAllocation {
  teamId: string;
  members: Array<{
    userId: string;
    allocatedHours: number;
    utilization: number;
    activeProjects: number;
  }>;
  totalCapacity: number;
  usedCapacity: number;
}

export interface AnalyticsReport {
  id: string;
  teamId: string;
  type: string;
  period: string;
  data: Record<string, unknown>;
  generatedAt: Date;
}

export interface VelocityData {
  teamId: string;
  sprints: Array<{
    sprintId: string;
    plannedPoints: number;
    completedPoints: number;
    velocity: number;
  }>;
  averageVelocity: number;
}

export interface BurndownData {
  sprintId: string;
  totalPoints: number;
  days: Array<{
    date: string;
    remainingPoints: number;
    idealPoints: number;
  }>;
}

export interface CustomReport {
  id: string;
  teamId: string;
  config: ReportConfig;
  data: Record<string, unknown>;
  generatedAt: Date;
}

export interface ReportConfig {
  metrics: string[];
  groupBy?: string;
  period?: string;
  filters?: Record<string, string>;
}

export const GenerateReportSchema = z.object({
  teamId: z.string().min(1),
  type: z.string().min(1),
  period: z.string().min(1),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;

export const CustomReportSchema = z.object({
  teamId: z.string().min(1),
  config: z.object({
    metrics: z.array(z.string().min(1)).min(1),
    groupBy: z.string().optional(),
    period: z.string().optional(),
    filters: z.record(z.string(), z.string()).optional(),
  }),
});

export type CustomReportInput = z.infer<typeof CustomReportSchema>;

export class TeamAnalyticsService {
  private readonly reports = new Map<string, AnalyticsReport>();
  private readonly velocityData = new Map<string, VelocityData>();
  private readonly burndownData = new Map<string, BurndownData>();

  getProductivity(teamId: string, period: string): ProductivityMetrics {
    return {
      teamId,
      period,
      tasksCompleted: 0,
      averageCompletionTime: 0,
      throughput: 0,
      efficiency: 0,
    };
  }

  getResourceAllocation(teamId: string): ResourceAllocation {
    return {
      teamId,
      members: [],
      totalCapacity: 0,
      usedCapacity: 0,
    };
  }

  generateReport(teamId: string, type: string, period: string): AnalyticsReport {
    const parsed = GenerateReportSchema.parse({ teamId, type, period });

    const report: AnalyticsReport = {
      id: randomUUID(),
      teamId: parsed.teamId,
      type: parsed.type,
      period: parsed.period,
      data: {
        summary: `${parsed.type} report for period ${parsed.period}`,
        metrics: {},
      },
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  getTeamVelocity(teamId: string, sprintCount: number): VelocityData {
    const existing = this.velocityData.get(teamId);
    if (existing) {
      const sprints = existing.sprints.slice(-sprintCount);
      const avg =
        sprints.length > 0 ? sprints.reduce((sum, s) => sum + s.velocity, 0) / sprints.length : 0;
      return { teamId, sprints, averageVelocity: avg };
    }

    return {
      teamId,
      sprints: [],
      averageVelocity: 0,
    };
  }

  getBurndownChart(sprintId: string): BurndownData {
    const existing = this.burndownData.get(sprintId);
    if (existing) {
      return existing;
    }

    return {
      sprintId,
      totalPoints: 0,
      days: [],
    };
  }

  getCustomReport(teamId: string, config: ReportConfig): CustomReport {
    const parsed = CustomReportSchema.parse({ teamId, config });

    const report: CustomReport = {
      id: randomUUID(),
      teamId: parsed.teamId,
      config: parsed.config,
      data: {
        metrics: parsed.config.metrics.reduce<Record<string, number>>((acc, metric) => {
          acc[metric] = 0;
          return acc;
        }, {}),
        groupBy: parsed.config.groupBy ?? null,
        period: parsed.config.period ?? null,
      },
      generatedAt: new Date(),
    };

    return report;
  }
}
