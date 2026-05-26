import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectManagementService } from '../services/project.service';

describe('ProjectManagementService', () => {
  let service: ProjectManagementService;

  beforeEach(() => {
    service = new ProjectManagementService();
  });

  describe('createProject', () => {
    it('creates a project with generated id', () => {
      const project = service.createProject('My Project', 'user-1', 'A description');
      expect(project.id).toBeDefined();
      expect(project.name).toBe('My Project');
      expect(project.ownerId).toBe('user-1');
      expect(project.description).toBe('A description');
      expect(project.sprints).toEqual([]);
      expect(project.tasks).toEqual([]);
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it('lists projects by owner', () => {
      service.createProject('P1', 'user-1');
      service.createProject('P2', 'user-2');
      service.createProject('P3', 'user-1');

      const owned = service.listProjects('user-1');
      expect(owned).toHaveLength(2);
    });
  });

  describe('sprint management', () => {
    it('creates a sprint for a project', () => {
      const project = service.createProject('Sprint Project', 'user-1');
      const sprint = service.createSprint(project.id, 'Sprint 1', '2024-01-01', '2024-01-14');

      expect(sprint.id).toBeDefined();
      expect(sprint.projectId).toBe(project.id);
      expect(sprint.name).toBe('Sprint 1');
      expect(sprint.startDate).toBe('2024-01-01');
      expect(sprint.endDate).toBe('2024-01-14');
      expect(sprint.status).toBe('planning');
    });

    it('throws when creating sprint for non-existent project', () => {
      expect(() => service.createSprint('bad-id', 'Sprint', '2024-01-01', '2024-01-14')).toThrow(
        'Project not found',
      );
    });
  });

  describe('task workflow', () => {
    it('adds a task to a project', () => {
      const project = service.createProject('Task Project', 'user-1');
      const task = service.addTask(project.id, 'Build feature', 'Description', 'user-2', 'high');

      expect(task.id).toBeDefined();
      expect(task.projectId).toBe(project.id);
      expect(task.title).toBe('Build feature');
      expect(task.assigneeId).toBe('user-2');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('todo');
    });

    it('assigns a task to a user', () => {
      const project = service.createProject('P', 'user-1');
      const task = service.addTask(project.id, 'Task 1', 'Desc');
      const assigned = service.assignTask(task.id, 'user-3');

      expect(assigned.assigneeId).toBe('user-3');
    });

    it('updates task status through workflow', () => {
      const project = service.createProject('P', 'user-1');
      const task = service.addTask(project.id, 'Task 1', 'Desc');

      expect(task.status).toBe('todo');

      const inProgress = service.updateTaskStatus(task.id, 'in_progress');
      expect(inProgress.status).toBe('in_progress');

      const inReview = service.updateTaskStatus(task.id, 'review');
      expect(inReview.status).toBe('review');

      const done = service.updateTaskStatus(task.id, 'done');
      expect(done.status).toBe('done');
    });

    it('throws when updating non-existent task', () => {
      expect(() => service.updateTaskStatus('bad-id', 'done')).toThrow('Task not found');
    });
  });

  describe('kanban board', () => {
    it('returns tasks grouped by status', () => {
      const project = service.createProject('Kanban Project', 'user-1');
      const task1 = service.addTask(project.id, 'Task 1', '');
      const task2 = service.addTask(project.id, 'Task 2', '');
      const task3 = service.addTask(project.id, 'Task 3', '');

      service.updateTaskStatus(task1.id, 'in_progress');
      service.updateTaskStatus(task2.id, 'done');

      const board = service.getKanbanBoard(project.id);
      expect(board.columns.todo).toHaveLength(1);
      expect(board.columns.todo[0]!.id).toBe(task3.id);
      expect(board.columns.in_progress).toHaveLength(1);
      expect(board.columns.in_progress[0]!.id).toBe(task1.id);
      expect(board.columns.done).toHaveLength(1);
      expect(board.columns.done[0]!.id).toBe(task2.id);
      expect(board.columns.review).toHaveLength(0);
    });
  });

  describe('time tracking', () => {
    it('logs time against a task', () => {
      const project = service.createProject('Time Project', 'user-1');
      const task = service.addTask(project.id, 'Track me', '');

      const entry = service.trackTime(task.id, 'user-1', 60);
      expect(entry.id).toBeDefined();
      expect(entry.taskId).toBe(task.id);
      expect(entry.userId).toBe('user-1');
      expect(entry.minutes).toBe(60);
      expect(entry.loggedAt).toBeInstanceOf(Date);
    });

    it('accumulates time entries', () => {
      const project = service.createProject('Time Project', 'user-1');
      const task = service.addTask(project.id, 'Track me', '');

      service.trackTime(task.id, 'user-1', 30);
      service.trackTime(task.id, 'user-2', 45);

      const metrics = service.getProjectMetrics(project.id);
      expect(metrics.totalTimeMinutes).toBe(75);
    });

    it('throws when tracking time for non-existent task', () => {
      expect(() => service.trackTime('bad-id', 'user-1', 30)).toThrow('Task not found');
    });
  });

  describe('project metrics', () => {
    it('returns correct task counts and breakdowns', () => {
      const project = service.createProject('Metrics Project', 'user-1');
      service.addTask(project.id, 'T1', '', undefined, 'high');
      service.addTask(project.id, 'T2', '', undefined, 'low');
      const t3 = service.addTask(project.id, 'T3', '', undefined, 'high');
      service.updateTaskStatus(t3.id, 'done');

      const metrics = service.getProjectMetrics(project.id);
      expect(metrics.totalTasks).toBe(3);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.tasksByPriority['high']).toBe(2);
      expect(metrics.tasksByPriority['low']).toBe(1);
      expect(metrics.tasksByStatus['todo']).toBe(2);
      expect(metrics.tasksByStatus['done']).toBe(1);
    });
  });

  describe('gantt chart', () => {
    it('returns sprints with their tasks', () => {
      const project = service.createProject('Gantt Project', 'user-1');
      service.createSprint(project.id, 'Sprint 1', '2024-01-01', '2024-01-14');

      const gantt = service.getGanttChart(project.id);
      expect(gantt.projectId).toBe(project.id);
      expect(gantt.sprints).toHaveLength(1);
      expect(gantt.sprints[0]!.name).toBe('Sprint 1');
    });
  });
});
