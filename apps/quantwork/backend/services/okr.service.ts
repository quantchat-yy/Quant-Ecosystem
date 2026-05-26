import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Objective {
  id: string;
  teamId: string;
  title: string;
  quarter: string;
  ownerId: string;
  keyResults: KeyResult[];
  status: 'active' | 'closed';
  createdAt: Date;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  score: number;
  updatedAt: Date;
}

export interface AlignmentTree {
  objective: Objective;
  children: AlignmentTree[];
}

export interface OKRTree {
  teamId: string;
  quarter: string;
  objectives: Objective[];
}

export interface CycleReport {
  teamId: string;
  quarter: string;
  totalObjectives: number;
  averageScore: number;
  completedKeyResults: number;
  totalKeyResults: number;
  closedAt: Date;
}

export const CreateObjectiveSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1).max(500),
  quarter: z.string().min(1),
  ownerId: z.string().min(1),
});

export type CreateObjectiveInput = z.infer<typeof CreateObjectiveSchema>;

export const AddKeyResultSchema = z.object({
  objectiveId: z.string().min(1),
  title: z.string().min(1).max(500),
  targetValue: z.number().min(0),
  unit: z.string().min(1),
});

export type AddKeyResultInput = z.infer<typeof AddKeyResultSchema>;

export const UpdateProgressSchema = z.object({
  keyResultId: z.string().min(1),
  currentValue: z.number().min(0),
});

export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;

export class OKRService {
  private readonly objectives = new Map<string, Objective>();
  private readonly keyResults = new Map<string, KeyResult>();

  createObjective(teamId: string, title: string, quarter: string, ownerId: string): Objective {
    const parsed = CreateObjectiveSchema.parse({ teamId, title, quarter, ownerId });

    const objective: Objective = {
      id: randomUUID(),
      teamId: parsed.teamId,
      title: parsed.title,
      quarter: parsed.quarter,
      ownerId: parsed.ownerId,
      keyResults: [],
      status: 'active',
      createdAt: new Date(),
    };

    this.objectives.set(objective.id, objective);
    return objective;
  }

  addKeyResult(objectiveId: string, title: string, targetValue: number, unit: string): KeyResult {
    const parsed = AddKeyResultSchema.parse({ objectiveId, title, targetValue, unit });
    const objective = this.getObjective(parsed.objectiveId);

    const keyResult: KeyResult = {
      id: randomUUID(),
      objectiveId: objective.id,
      title: parsed.title,
      targetValue: parsed.targetValue,
      currentValue: 0,
      unit: parsed.unit,
      score: 0,
      updatedAt: new Date(),
    };

    this.keyResults.set(keyResult.id, keyResult);
    objective.keyResults.push(keyResult);
    return keyResult;
  }

  updateProgress(keyResultId: string, currentValue: number): KeyResult {
    const parsed = UpdateProgressSchema.parse({ keyResultId, currentValue });
    const keyResult = this.getKeyResult(parsed.keyResultId);

    keyResult.currentValue = parsed.currentValue;
    keyResult.score = this.calculateScore(keyResult);
    keyResult.updatedAt = new Date();
    return keyResult;
  }

  getAlignment(objectiveId: string): AlignmentTree {
    const objective = this.getObjective(objectiveId);

    const children = Array.from(this.objectives.values())
      .filter(
        (o) =>
          o.teamId === objective.teamId && o.id !== objective.id && o.quarter === objective.quarter,
      )
      .map((child) => ({ objective: child, children: [] }));

    return { objective, children };
  }

  getOKRTree(teamId: string, quarter: string): OKRTree {
    const objectives = Array.from(this.objectives.values()).filter(
      (o) => o.teamId === teamId && o.quarter === quarter,
    );

    return { teamId, quarter, objectives };
  }

  scoreKeyResult(keyResultId: string): number {
    const keyResult = this.getKeyResult(keyResultId);
    return this.calculateScore(keyResult);
  }

  closeOKRCycle(teamId: string, quarter: string): CycleReport {
    const objectives = Array.from(this.objectives.values()).filter(
      (o) => o.teamId === teamId && o.quarter === quarter,
    );

    if (objectives.length === 0) {
      throw createAppError('No objectives found for this cycle', 404, 'CYCLE_NOT_FOUND');
    }

    let totalScore = 0;
    let completedKRs = 0;
    let totalKRs = 0;

    for (const objective of objectives) {
      objective.status = 'closed';
      for (const kr of objective.keyResults) {
        totalScore += kr.score;
        totalKRs++;
        if (kr.currentValue >= kr.targetValue) {
          completedKRs++;
        }
      }
    }

    const averageScore = totalKRs > 0 ? totalScore / totalKRs : 0;

    return {
      teamId,
      quarter,
      totalObjectives: objectives.length,
      averageScore,
      completedKeyResults: completedKRs,
      totalKeyResults: totalKRs,
      closedAt: new Date(),
    };
  }

  listObjectives(teamId: string, quarter?: string): Objective[] {
    return Array.from(this.objectives.values()).filter((o) => {
      if (o.teamId !== teamId) return false;
      if (quarter && o.quarter !== quarter) return false;
      return true;
    });
  }

  private getObjective(objectiveId: string): Objective {
    const objective = this.objectives.get(objectiveId);
    if (!objective) {
      throw createAppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }
    return objective;
  }

  private getKeyResult(keyResultId: string): KeyResult {
    const keyResult = this.keyResults.get(keyResultId);
    if (!keyResult) {
      throw createAppError('Key result not found', 404, 'KEY_RESULT_NOT_FOUND');
    }
    return keyResult;
  }

  private calculateScore(keyResult: KeyResult): number {
    if (keyResult.targetValue === 0) return 1;
    const score = keyResult.currentValue / keyResult.targetValue;
    return Math.min(score, 1);
  }
}
