import type { LoadTestDefinition } from './types';

export const feedRankingConfig: LoadTestDefinition = {
  config: {
    name: 'feed-ranking',
    description: 'Load test for personalized feed ranking with constant VU pressure',
    scenarios: {
      'feed-ranking': {
        name: 'feed-ranking',
        executor: 'constant-vus',
        vus: 100,
        duration: '3m',
      },
    },
    thresholds: {
      http_req_duration: ['p(95) < 1000', 'p(99) < 2000'],
      http_req_failed: ['rate < 0.005'],
    },
    tags: { testType: 'load', feature: 'feed-ranking' },
  },
  endpoints: [
    {
      method: 'GET',
      path: '/api/feed/personalized',
      expectedStatus: 200,
    },
    {
      method: 'GET',
      path: '/api/feed/trending',
      expectedStatus: 200,
    },
    {
      method: 'POST',
      path: '/api/feed/interactions',
      body: { type: 'like', postId: ':postId' },
      expectedStatus: 200,
    },
    {
      method: 'GET',
      path: '/api/feed/page/:page',
      expectedStatus: 200,
    },
  ],
};
