import type { LoadTestDefinition } from './types';

export const chatFanoutConfig: LoadTestDefinition = {
  config: {
    name: 'chat-fanout',
    description: 'Load test for chat message fanout to group members with ramping VUs',
    scenarios: {
      'chat-fanout': {
        name: 'chat-fanout',
        executor: 'ramping-vus',
        stages: [
          { duration: '30s', target: 50 },
          { duration: '2m', target: 50 },
          { duration: '10s', target: 0 },
        ],
      },
    },
    thresholds: {
      http_req_duration: ['p(95) < 500'],
      http_req_failed: ['rate < 0.01'],
    },
    tags: { testType: 'load', feature: 'chat-fanout' },
  },
  endpoints: [
    {
      method: 'POST',
      path: '/api/chat/messages',
      body: { content: 'Hello, group!', groupId: ':groupId' },
      expectedStatus: 201,
    },
    {
      method: 'GET',
      path: '/api/chat/conversations/:id/messages',
      expectedStatus: 200,
    },
    {
      method: 'POST',
      path: '/api/chat/groups/:id/broadcast',
      body: { message: 'Broadcast message', priority: 'normal' },
      expectedStatus: 200,
    },
  ],
};
