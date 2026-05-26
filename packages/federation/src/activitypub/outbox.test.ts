import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { OutboxPublisher } from './outbox.js';
import { DeliveryQueue } from './delivery-queue.js';

function generateEd25519Keys() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

describe('OutboxPublisher', () => {
  it('publish signs activity', () => {
    const { privateKey } = generateEd25519Keys();
    const queue = new DeliveryQueue();
    const publisher = new OutboxPublisher(
      privateKey,
      'https://local.example/users/alice#main-key',
      queue,
    );

    publisher.publish(
      {
        type: 'Create',
        actor: 'https://local.example/users/alice',
        object: 'https://local.example/notes/1',
        id: 'act-1',
      },
      ['https://remote.example/users/bob/inbox'],
    );

    const jobs = queue.getPendingJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toContain('Create');
  });

  it('publish enqueues delivery jobs for each recipient', () => {
    const { privateKey } = generateEd25519Keys();
    const queue = new DeliveryQueue();
    const publisher = new OutboxPublisher(
      privateKey,
      'https://local.example/users/alice#main-key',
      queue,
    );

    publisher.publish(
      {
        type: 'Create',
        actor: 'https://local.example/users/alice',
        object: 'https://local.example/notes/2',
        id: 'act-2',
      },
      [
        'https://remote1.example/inbox',
        'https://remote2.example/inbox',
        'https://remote3.example/inbox',
      ],
    );

    const jobs = queue.getPendingJobs();
    expect(jobs).toHaveLength(3);
    expect(jobs[0]!.recipientInbox).toBe('https://remote1.example/inbox');
    expect(jobs[1]!.recipientInbox).toBe('https://remote2.example/inbox');
    expect(jobs[2]!.recipientInbox).toBe('https://remote3.example/inbox');
  });

  it('getActivities returns ordered collection', () => {
    const { privateKey } = generateEd25519Keys();
    const publisher = new OutboxPublisher(privateKey, 'https://local.example/users/alice#main-key');

    publisher.publish(
      {
        type: 'Create',
        actor: 'https://local.example/users/alice',
        object: 'https://local.example/notes/1',
        id: 'act-first',
      },
      ['https://remote.example/inbox'],
    );
    publisher.publish(
      {
        type: 'Create',
        actor: 'https://local.example/users/alice',
        object: 'https://local.example/notes/2',
        id: 'act-second',
      },
      ['https://remote.example/inbox'],
    );

    const activities = publisher.getActivities();
    expect(activities).toHaveLength(2);
    expect(activities[0]!.id).toBe('act-second');
    expect(activities[1]!.id).toBe('act-first');
  });
});
