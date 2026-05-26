import { describe, it, expect, beforeEach } from 'vitest';
import { HRService } from '../services/hr.service';

describe('HRService', () => {
  let service: HRService;

  beforeEach(() => {
    service = new HRService();
  });

  describe('leave management', () => {
    it('requests leave', () => {
      const leave = service.requestLeave('user-1', 'vacation', '2024-07-01', '2024-07-05');

      expect(leave.id).toBeDefined();
      expect(leave.userId).toBe('user-1');
      expect(leave.type).toBe('vacation');
      expect(leave.startDate).toBe('2024-07-01');
      expect(leave.endDate).toBe('2024-07-05');
      expect(leave.status).toBe('pending');
    });

    it('approves a leave request', () => {
      const leave = service.requestLeave('user-1', 'sick', '2024-07-01', '2024-07-02');
      const approved = service.approveLeave(leave.id, 'manager-1');

      expect(approved.status).toBe('approved');
      expect(approved.approverId).toBe('manager-1');
    });

    it('rejects a leave request with reason', () => {
      const leave = service.requestLeave('user-1', 'vacation', '2024-12-25', '2024-12-31');
      const rejected = service.rejectLeave(leave.id, 'manager-1', 'Holiday freeze period');

      expect(rejected.status).toBe('rejected');
      expect(rejected.approverId).toBe('manager-1');
      expect(rejected.rejectionReason).toBe('Holiday freeze period');
    });

    it('throws when approving already approved request', () => {
      const leave = service.requestLeave('user-1', 'vacation', '2024-07-01', '2024-07-05');
      service.approveLeave(leave.id, 'manager-1');

      expect(() => service.approveLeave(leave.id, 'manager-2')).toThrow(
        'Leave request is not pending',
      );
    });

    it('throws when rejecting non-existent request', () => {
      expect(() => service.rejectLeave('bad-id', 'manager-1', 'reason')).toThrow(
        'Leave request not found',
      );
    });
  });

  describe('performance reviews', () => {
    it('creates a review cycle', () => {
      const review = service.createReview('emp-1', 'reviewer-1', 'Q1-2024');

      expect(review.id).toBeDefined();
      expect(review.employeeId).toBe('emp-1');
      expect(review.reviewerId).toBe('reviewer-1');
      expect(review.cycle).toBe('Q1-2024');
      expect(review.status).toBe('draft');
    });

    it('submits a review with ratings and feedback', () => {
      const review = service.createReview('emp-1', 'reviewer-1', 'Q1-2024');
      const submitted = service.submitReview(
        review.id,
        { communication: 4, technical: 5 },
        'Excellent work on the project',
      );

      expect(submitted.status).toBe('submitted');
      expect(submitted.ratings).toEqual({ communication: 4, technical: 5 });
      expect(submitted.feedback).toBe('Excellent work on the project');
      expect(submitted.submittedAt).toBeInstanceOf(Date);
    });

    it('throws when submitting already submitted review', () => {
      const review = service.createReview('emp-1', 'reviewer-1', 'Q1-2024');
      service.submitReview(review.id, { overall: 4 }, 'Good');

      expect(() => service.submitReview(review.id, { overall: 5 }, 'Updated')).toThrow(
        'Review already submitted',
      );
    });

    it('throws when submitting non-existent review', () => {
      expect(() => service.submitReview('bad-id', { overall: 3 }, 'feedback')).toThrow(
        'Review not found',
      );
    });
  });

  describe('hiring pipeline', () => {
    it('creates a job posting', () => {
      const posting = service.createJobPosting('Senior Engineer', 'Engineering', [
        '5+ years experience',
        'TypeScript',
      ]);

      expect(posting.id).toBeDefined();
      expect(posting.title).toBe('Senior Engineer');
      expect(posting.department).toBe('Engineering');
      expect(posting.requirements).toEqual(['5+ years experience', 'TypeScript']);
      expect(posting.status).toBe('open');
      expect(posting.candidates).toEqual([]);
    });

    it('tracks a candidate for a posting', () => {
      const posting = service.createJobPosting('Engineer', 'Engineering', ['TypeScript']);
      const candidate = service.trackCandidate(
        posting.id,
        'Alice Smith',
        'alice@example.com',
        'applied',
      );

      expect(candidate.id).toBeDefined();
      expect(candidate.postingId).toBe(posting.id);
      expect(candidate.name).toBe('Alice Smith');
      expect(candidate.email).toBe('alice@example.com');
      expect(candidate.stage).toBe('applied');
    });

    it('schedules an interview for a candidate', () => {
      const posting = service.createJobPosting('Engineer', 'Engineering', ['TypeScript']);
      const candidate = service.trackCandidate(posting.id, 'Bob Jones', 'bob@example.com');
      const interview = service.scheduleInterview(
        candidate.id,
        ['interviewer-1', 'interviewer-2'],
        '2024-07-15T10:00:00Z',
      );

      expect(interview.id).toBeDefined();
      expect(interview.candidateId).toBe(candidate.id);
      expect(interview.interviewers).toEqual(['interviewer-1', 'interviewer-2']);
      expect(interview.dateTime).toBe('2024-07-15T10:00:00Z');
      expect(interview.status).toBe('scheduled');
    });

    it('throws when tracking candidate for non-existent posting', () => {
      expect(() => service.trackCandidate('bad-id', 'Alice', 'alice@example.com')).toThrow(
        'Job posting not found',
      );
    });

    it('throws when scheduling interview for non-existent candidate', () => {
      expect(() => service.scheduleInterview('bad-id', ['int-1'], '2024-07-15T10:00:00Z')).toThrow(
        'Candidate not found',
      );
    });
  });

  describe('employee onboarding', () => {
    it('onboards a new employee', () => {
      const employee = service.onboardEmployee(
        'Alice Smith',
        'alice@example.com',
        'Engineering',
        'Senior Engineer',
        'manager-1',
      );

      expect(employee.id).toBeDefined();
      expect(employee.name).toBe('Alice Smith');
      expect(employee.email).toBe('alice@example.com');
      expect(employee.department).toBe('Engineering');
      expect(employee.role).toBe('Senior Engineer');
      expect(employee.managerId).toBe('manager-1');
      expect(employee.status).toBe('onboarding');
      expect(employee.startDate).toBeInstanceOf(Date);
    });

    it('onboards without a manager', () => {
      const employee = service.onboardEmployee('CEO Name', 'ceo@example.com', 'Executive', 'CEO');
      expect(employee.managerId).toBeUndefined();
    });
  });

  describe('org chart', () => {
    it('returns empty org chart when no employees', () => {
      const chart = service.getOrgChart('org-1');
      expect(chart).toEqual([]);
    });

    it('builds org chart from onboarded employees', () => {
      const manager = service.onboardEmployee(
        'Manager',
        'manager@example.com',
        'Engineering',
        'Manager',
      );
      service.onboardEmployee('Dev 1', 'dev1@example.com', 'Engineering', 'Developer', manager.id);
      service.onboardEmployee('Dev 2', 'dev2@example.com', 'Engineering', 'Developer', manager.id);

      const chart = service.getOrgChart('Engineering');
      expect(chart.length).toBeGreaterThanOrEqual(1);
    });
  });
});
