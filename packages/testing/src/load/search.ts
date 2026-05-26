import type { LoadTestDefinition } from './types';

export const searchConfig: LoadTestDefinition = {
  config: {
    name: 'search',
    description: 'Load test for search with ramping arrival rate to simulate growing traffic',
    scenarios: {
      search: {
        name: 'search',
        executor: 'ramping-arrival-rate',
        stages: [
          { duration: '1m', target: 200 },
          { duration: '2m', target: 200 },
          { duration: '30s', target: 0 },
        ],
        preAllocatedVUs: 50,
        maxVUs: 300,
      },
    },
    thresholds: {
      http_req_duration: ['p(95) < 300', 'p(99) < 800'],
      http_req_failed: ['rate < 0.001'],
    },
    tags: { testType: 'load', feature: 'search' },
  },
  endpoints: [
    {
      method: 'GET',
      path: '/api/search?q=:query',
      expectedStatus: 200,
    },
    {
      method: 'GET',
      path: '/api/search/suggestions?q=:prefix',
      expectedStatus: 200,
    },
    {
      method: 'POST',
      path: '/api/search/filters',
      body: { category: 'posts', dateRange: 'last_week', sort: 'relevance' },
      expectedStatus: 200,
    },
    {
      method: 'GET',
      path: '/api/search/results?page=:page',
      expectedStatus: 200,
    },
  ],
};
