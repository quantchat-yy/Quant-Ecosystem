import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  managerId?: string;
  startDate: Date;
  status: 'active' | 'onboarding' | 'offboarded';
}

export interface OrgNode {
  employee: Employee;
  directReports: OrgNode[];
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: 'vacation' | 'sick' | 'personal' | 'parental';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  rejectionReason?: string;
  createdAt: Date;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  cycle: string;
  ratings?: Record<string, number>;
  feedback?: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  createdAt: Date;
  submittedAt?: Date;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  requirements: string[];
  status: 'open' | 'closed';
  candidates: Candidate[];
  createdAt: Date;
}

export interface Candidate {
  id: string;
  postingId: string;
  name: string;
  email: string;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  interviews: Interview[];
  createdAt: Date;
}

export interface Interview {
  id: string;
  candidateId: string;
  interviewers: string[];
  dateTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export const RequestLeaveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['vacation', 'sick', 'personal', 'parental']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type RequestLeaveInput = z.infer<typeof RequestLeaveSchema>;

export const CreateReviewSchema = z.object({
  employeeId: z.string().min(1),
  reviewerId: z.string().min(1),
  cycle: z.string().min(1),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const SubmitReviewSchema = z.object({
  reviewId: z.string().min(1),
  ratings: z.record(z.string(), z.number().min(1).max(5)),
  feedback: z.string().min(1).max(5000),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;

export const CreateJobPostingSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().min(1),
  requirements: z.array(z.string().min(1)),
});

export type CreateJobPostingInput = z.infer<typeof CreateJobPostingSchema>;

export const TrackCandidateSchema = z.object({
  postingId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  stage: z
    .enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'])
    .optional()
    .default('applied'),
});

export type TrackCandidateInput = z.infer<typeof TrackCandidateSchema>;

export const ScheduleInterviewSchema = z.object({
  candidateId: z.string().min(1),
  interviewers: z.array(z.string().min(1)).min(1),
  dateTime: z.string().min(1),
});

export type ScheduleInterviewInput = z.infer<typeof ScheduleInterviewSchema>;

export const OnboardEmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  department: z.string().min(1),
  role: z.string().min(1),
  managerId: z.string().optional(),
});

export type OnboardEmployeeInput = z.infer<typeof OnboardEmployeeSchema>;

export class HRService {
  private readonly employees = new Map<string, Employee>();
  private readonly leaveRequests = new Map<string, LeaveRequest>();
  private readonly reviews = new Map<string, PerformanceReview>();
  private readonly jobPostings = new Map<string, JobPosting>();
  private readonly candidates = new Map<string, Candidate>();

  getOrgChart(orgId: string): OrgNode[] {
    const orgEmployees = Array.from(this.employees.values()).filter(
      (e) => e.department === orgId || e.status === 'active',
    );

    const roots = orgEmployees.filter((e) => !e.managerId);
    return roots.map((root) => this.buildOrgNode(root, orgEmployees));
  }

  requestLeave(
    userId: string,
    type: 'vacation' | 'sick' | 'personal' | 'parental',
    startDate: string,
    endDate: string,
  ): LeaveRequest {
    const parsed = RequestLeaveSchema.parse({ userId, type, startDate, endDate });

    const request: LeaveRequest = {
      id: randomUUID(),
      userId: parsed.userId,
      type: parsed.type,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      status: 'pending',
      createdAt: new Date(),
    };

    this.leaveRequests.set(request.id, request);
    return request;
  }

  approveLeave(requestId: string, approverId: string): LeaveRequest {
    const request = this.getLeaveRequest(requestId);

    if (request.status !== 'pending') {
      throw createAppError('Leave request is not pending', 400, 'INVALID_STATUS');
    }

    request.status = 'approved';
    request.approverId = approverId;
    return request;
  }

  rejectLeave(requestId: string, approverId: string, reason: string): LeaveRequest {
    const request = this.getLeaveRequest(requestId);

    if (request.status !== 'pending') {
      throw createAppError('Leave request is not pending', 400, 'INVALID_STATUS');
    }

    request.status = 'rejected';
    request.approverId = approverId;
    request.rejectionReason = reason;
    return request;
  }

  createReview(employeeId: string, reviewerId: string, cycle: string): PerformanceReview {
    const parsed = CreateReviewSchema.parse({ employeeId, reviewerId, cycle });

    const review: PerformanceReview = {
      id: randomUUID(),
      employeeId: parsed.employeeId,
      reviewerId: parsed.reviewerId,
      cycle: parsed.cycle,
      status: 'draft',
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);
    return review;
  }

  submitReview(
    reviewId: string,
    ratings: Record<string, number>,
    feedback: string,
  ): PerformanceReview {
    const parsed = SubmitReviewSchema.parse({ reviewId, ratings, feedback });
    const review = this.getReview(parsed.reviewId);

    if (review.status !== 'draft') {
      throw createAppError('Review already submitted', 400, 'ALREADY_SUBMITTED');
    }

    review.ratings = parsed.ratings;
    review.feedback = parsed.feedback;
    review.status = 'submitted';
    review.submittedAt = new Date();
    return review;
  }

  createJobPosting(title: string, department: string, requirements: string[]): JobPosting {
    const parsed = CreateJobPostingSchema.parse({ title, department, requirements });

    const posting: JobPosting = {
      id: randomUUID(),
      title: parsed.title,
      department: parsed.department,
      requirements: parsed.requirements,
      status: 'open',
      candidates: [],
      createdAt: new Date(),
    };

    this.jobPostings.set(posting.id, posting);
    return posting;
  }

  trackCandidate(
    postingId: string,
    name: string,
    email: string,
    stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected',
  ): Candidate {
    const parsed = TrackCandidateSchema.parse({ postingId, name, email, stage });
    const posting = this.getJobPosting(parsed.postingId);

    const candidate: Candidate = {
      id: randomUUID(),
      postingId: posting.id,
      name: parsed.name,
      email: parsed.email,
      stage: parsed.stage,
      interviews: [],
      createdAt: new Date(),
    };

    this.candidates.set(candidate.id, candidate);
    posting.candidates.push(candidate);
    return candidate;
  }

  scheduleInterview(candidateId: string, interviewers: string[], dateTime: string): Interview {
    const parsed = ScheduleInterviewSchema.parse({ candidateId, interviewers, dateTime });
    const candidate = this.getCandidate(parsed.candidateId);

    const interview: Interview = {
      id: randomUUID(),
      candidateId: candidate.id,
      interviewers: parsed.interviewers,
      dateTime: parsed.dateTime,
      status: 'scheduled',
    };

    candidate.interviews.push(interview);
    return interview;
  }

  onboardEmployee(
    name: string,
    email: string,
    department: string,
    role: string,
    managerId?: string,
  ): Employee {
    const parsed = OnboardEmployeeSchema.parse({ name, email, department, role, managerId });

    const employee: Employee = {
      id: randomUUID(),
      name: parsed.name,
      email: parsed.email,
      department: parsed.department,
      role: parsed.role,
      managerId: parsed.managerId,
      startDate: new Date(),
      status: 'onboarding',
    };

    this.employees.set(employee.id, employee);
    return employee;
  }

  private getLeaveRequest(requestId: string): LeaveRequest {
    const request = this.leaveRequests.get(requestId);
    if (!request) {
      throw createAppError('Leave request not found', 404, 'LEAVE_REQUEST_NOT_FOUND');
    }
    return request;
  }

  private getReview(reviewId: string): PerformanceReview {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw createAppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    return review;
  }

  private getJobPosting(postingId: string): JobPosting {
    const posting = this.jobPostings.get(postingId);
    if (!posting) {
      throw createAppError('Job posting not found', 404, 'JOB_POSTING_NOT_FOUND');
    }
    return posting;
  }

  private getCandidate(candidateId: string): Candidate {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw createAppError('Candidate not found', 404, 'CANDIDATE_NOT_FOUND');
    }
    return candidate;
  }

  private buildOrgNode(employee: Employee, allEmployees: Employee[]): OrgNode {
    const directReports = allEmployees
      .filter((e) => e.managerId === employee.id)
      .map((report) => this.buildOrgNode(report, allEmployees));

    return { employee, directReports };
  }
}
