import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  description: string;
  sprints: Sprint[];
  tasks: Task[];
  createdAt: Date;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  createdAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  sprintId?: string;
  title: string;
  description: string;
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  timeEntries: TimeEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  loggedAt: Date;
}

export interface KanbanBoard {
  projectId: string;
  columns: {
    todo: Task[];
    in_progress: Task[];
    review: Task[];
    done: Task[];
  };
}

export interface ProjectMetrics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  totalTimeMinutes: number;
  averageCompletionDays: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
}

export interface GanttData {
  projectId: string;
  sprints: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
    }>;
  }>;
}

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  ownerId: z.string().min(1),
  description: z.string().max(2000).optional().default(''),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const CreateSprintSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;

export const AddTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().default(''),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
});

export type AddTaskInput = z.infer<typeof AddTaskSchema>;

export const TrackTimeSchema = z.object({
  taskId: z.string().min(1),
  userId: z.string().min(1),
  minutes: z.number().int().min(1).max(1440),
});

export type TrackTimeInput = z.infer<typeof TrackTimeSchema>;

export class ProjectManagementService {
  private readonly projects = new Map<string, Project>();
  private readonly tasks = new Map<string, Task>();
  private readonly sprints = new Map<string, Sprint>();

  createProject(name: string, ownerId: string, description?: string): Project {
    const parsed = CreateProjectSchema.parse({ name, ownerId, description });

    const project: Project = {
      id: randomUUID(),
      name: parsed.name,
      ownerId: parsed.ownerId,
      description: parsed.description,
      sprints: [],
      tasks: [],
      createdAt: new Date(),
    };

    this.projects.set(project.id, project);
    return project;
  }

  createSprint(projectId: string, name: string, startDate: string, endDate: string): Sprint {
    const parsed = CreateSprintSchema.parse({ projectId, name, startDate, endDate });
    const project = this.getProject(parsed.projectId);

    const sprint: Sprint = {
      id: randomUUID(),
      projectId: project.id,
      name: parsed.name,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      status: 'planning',
      createdAt: new Date(),
    };

    this.sprints.set(sprint.id, sprint);
    project.sprints.push(sprint);
    return sprint;
  }

  addTask(
    projectId: string,
    title: string,
    description?: string,
    assigneeId?: string,
    priority?: 'low' | 'medium' | 'high' | 'critical',
  ): Task {
    const parsed = AddTaskSchema.parse({ projectId, title, description, assigneeId, priority });
    const project = this.getProject(parsed.projectId);

    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      projectId: project.id,
      title: parsed.title,
      description: parsed.description,
      assigneeId: parsed.assigneeId,
      priority: parsed.priority,
      status: 'todo',
      timeEntries: [],
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    project.tasks.push(task);
    return task;
  }

  assignTask(taskId: string, assigneeId: string): Task {
    const task = this.getTask(taskId);
    task.assigneeId = assigneeId;
    task.updatedAt = new Date();
    return task;
  }

  updateTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'review' | 'done'): Task {
    const task = this.getTask(taskId);
    task.status = status;
    task.updatedAt = new Date();
    return task;
  }

  getKanbanBoard(projectId: string): KanbanBoard {
    const project = this.getProject(projectId);

    const columns: KanbanBoard['columns'] = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const task of project.tasks) {
      columns[task.status].push(task);
    }

    return { projectId: project.id, columns };
  }

  trackTime(taskId: string, userId: string, minutes: number): TimeEntry {
    const parsed = TrackTimeSchema.parse({ taskId, userId, minutes });
    const task = this.getTask(parsed.taskId);

    const entry: TimeEntry = {
      id: randomUUID(),
      taskId: task.id,
      userId: parsed.userId,
      minutes: parsed.minutes,
      loggedAt: new Date(),
    };

    task.timeEntries.push(entry);
    task.updatedAt = new Date();
    return entry;
  }

  getProjectMetrics(projectId: string): ProjectMetrics {
    const project = this.getProject(projectId);

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'done').length;
    const totalTimeMinutes = project.tasks.reduce(
      (sum, t) => sum + t.timeEntries.reduce((s, e) => s + e.minutes, 0),
      0,
    );

    const tasksByPriority: Record<string, number> = {};
    const tasksByStatus: Record<string, number> = {};

    for (const task of project.tasks) {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] ?? 0) + 1;
      tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
    }

    const completedWithTime = project.tasks.filter((t) => t.status === 'done');
    const averageCompletionDays =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, t) => {
            const diff = t.updatedAt.getTime() - t.createdAt.getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0) / completedWithTime.length
        : 0;

    return {
      projectId: project.id,
      totalTasks,
      completedTasks,
      totalTimeMinutes,
      averageCompletionDays,
      tasksByPriority,
      tasksByStatus,
    };
  }

  getGanttChart(projectId: string): GanttData {
    const project = this.getProject(projectId);

    const sprintData = project.sprints.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      tasks: project.tasks
        .filter((t) => t.sprintId === sprint.id)
        .map((t) => ({ id: t.id, title: t.title, status: t.status })),
    }));

    return { projectId: project.id, sprints: sprintData };
  }

  listProjects(ownerId?: string): Project[] {
    const all = Array.from(this.projects.values());
    if (ownerId) {
      return all.filter((p) => p.ownerId === ownerId);
    }
    return all;
  }

  private getProject(projectId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) {
      throw createAppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    return project;
  }

  private getTask(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw createAppError('Task not found', 404, 'TASK_NOT_FOUND');
    }
    return task;
  }
}
