import { signRequest } from './http-signatures.js';
import { DeliveryQueue } from './delivery-queue.js';
import type { Activity } from './inbox.js';

export class OutboxPublisher {
  private privateKey: string;
  private keyId: string;
  private activities: Activity[] = [];
  private deliveryQueue: DeliveryQueue;

  constructor(privateKey: string, keyId: string, deliveryQueue?: DeliveryQueue) {
    this.privateKey = privateKey;
    this.keyId = keyId;
    this.deliveryQueue = deliveryQueue ?? new DeliveryQueue();
  }

  publish(activity: Activity, recipients: string[]): void {
    const payload = JSON.stringify(activity);

    const headers: Record<string, string> = {
      host: 'localhost',
      date: new Date().toUTCString(),
      'content-type': 'application/activity+json',
    };

    signRequest(
      this.privateKey,
      this.keyId,
      'POST',
      recipients[0] ?? 'https://localhost/inbox',
      headers,
      payload,
    );

    this.activities.push(activity);

    for (const recipient of recipients) {
      this.deliveryQueue.enqueue({
        activityId: activity.id ?? crypto.randomUUID(),
        recipientInbox: recipient,
        payload,
        attempt: 0,
        maxAttempts: 5,
      });
    }
  }

  getActivities(): Activity[] {
    return [...this.activities].reverse();
  }

  getDeliveryQueue(): DeliveryQueue {
    return this.deliveryQueue;
  }
}
