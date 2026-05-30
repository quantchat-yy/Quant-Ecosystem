import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE } from '../helpers/config.js';
import { getAuthHeaders } from '../helpers/auth.js';

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95) < 500', 'p(99) < 1000'],
    http_req_failed: ['rate < 0.01'],
  },
  tags: { testType: 'stress' },
};

export default function () {
  const headers = getAuthHeaders(`stress-user-${__VU}`);

  // High-frequency endpoint mix
  const endpoints = [
    `${API_BASE}/health`,
    `${API_BASE}/emails`,
    `${API_BASE}/messages`,
    `${API_BASE}/search?q=stress-test`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(endpoint, { headers });

  check(res, {
    'stress: response received': (r) => r.status > 0,
    'stress: not server error': (r) => r.status < 500,
  });

  sleep(0.1 + Math.random() * 0.2);
}
