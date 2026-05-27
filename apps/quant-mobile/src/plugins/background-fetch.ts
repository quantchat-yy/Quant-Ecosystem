// Background Fetch Service - Background task scheduling

export interface BackgroundTask {
  taskId: string;
  config: FetchConfig;
  status: 'registered' | 'running' | 'completed' | 'failed';
  lastRun?: number;
}

export interface FetchConfig {
  minimumInterval: number;
  delay?: number;
  periodic?: boolean;
  requiresNetworkConnectivity?: boolean;
  requiresCharging?: boolean;
}

export type TaskResult = 'newData' | 'noData' | 'failed';

export class BackgroundFetchService {
  private tasks: Map<string, BackgroundTask> = new Map();

  register(taskId: string, config: FetchConfig): BackgroundTask {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    const task: BackgroundTask = {
      taskId,
      config,
      status: 'registered',
    };
    this.tasks.set(taskId, task);
    return task;
  }

  finish(taskId: string): TaskResult {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    task.status = 'completed';
    task.lastRun = Date.now();
    return 'newData';
  }

  getStatus(): BackgroundTask[] {
    return [...this.tasks.values()];
  }

  getTask(taskId: string): BackgroundTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  setMinimumInterval(seconds: number): void {
    if (seconds < 0) {
      throw new Error('Interval must be non-negative');
    }
    for (const task of this.tasks.values()) {
      task.config.minimumInterval = seconds;
    }
  }

  unregister(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }
}
