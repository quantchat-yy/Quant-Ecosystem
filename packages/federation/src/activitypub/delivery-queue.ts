import { z } from 'zod';

export const DeliveryJobSchema = z.object({
  activityId: z.string(),
  recipientInbox: z.string(),
  payload: z.string(),
  attempt: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
});

export type DeliveryJob = z.infer<typeof DeliveryJobSchema>;

export class DeliveryQueue {
  private queue: DeliveryJob[] = [];
  private failed: DeliveryJob[] = [];
  private baseDelay = 1000;

  enqueue(job: DeliveryJob): void {
    const validated = DeliveryJobSchema.parse(job);
    this.queue.push(validated);
  }

  processNext(deliverFn?: (job: DeliveryJob) => boolean): DeliveryJob | undefined {
    const job = this.queue.shift();
    if (!job) return undefined;

    const success = deliverFn ? deliverFn(job) : true;

    if (!success) {
      const nextAttempt = job.attempt + 1;
      if (nextAttempt < job.maxAttempts) {
        this.queue.push({
          ...job,
          attempt: nextAttempt,
        });
      } else {
        this.failed.push(job);
      }
    }

    return job;
  }

  calculateBackoff(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt);
  }

  getPendingJobs(): DeliveryJob[] {
    return [...this.queue];
  }

  getFailedJobs(): DeliveryJob[] {
    return [...this.failed];
  }

  size(): number {
    return this.queue.length;
  }
}
