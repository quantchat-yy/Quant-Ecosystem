import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    search: {
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
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const SEARCH_QUERIES = [
  'typescript',
  'react hooks',
  'kubernetes deployment',
  'machine learning',
  'api design',
  'microservices',
  'graphql schema',
  'docker compose',
];

const SEARCH_PREFIXES = ['typ', 'rea', 'kub', 'mac', 'api', 'mic', 'gra', 'doc'];

export default function () {
  const queryIndex = Math.floor(Math.random() * SEARCH_QUERIES.length);
  const query = SEARCH_QUERIES[queryIndex];
  const prefix = SEARCH_PREFIXES[queryIndex];

  // Full-text search
  const searchRes = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);

  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });

  sleep(0.2);

  // Search suggestions (autocomplete)
  const suggestRes = http.get(`${BASE_URL}/api/search/suggestions?q=${encodeURIComponent(prefix)}`);

  check(suggestRes, {
    'suggestions status is 200': (r) => r.status === 200,
  });

  sleep(0.1);

  // Filtered search
  const filterRes = http.post(
    `${BASE_URL}/api/search/filters`,
    JSON.stringify({
      category: 'posts',
      dateRange: 'last_week',
      sort: 'relevance',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(filterRes, {
    'filtered search status is 200': (r) => r.status === 200,
  });

  sleep(0.2);

  // Paginate results
  const page = Math.floor(Math.random() * 5) + 1;
  const pageRes = http.get(`${BASE_URL}/api/search/results?page=${page}`);

  check(pageRes, {
    'search results page status is 200': (r) => r.status === 200,
  });

  sleep(0.3);
}
