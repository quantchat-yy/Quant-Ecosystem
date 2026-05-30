import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, API_BASE } from '../helpers/config.js';

export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95) < 1000'],
    http_req_failed: ['rate < 0.05'],
  },
  tags: { testType: 'smoke' },
};

export default function () {
  // Health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health endpoint responds': (r) => r.status === 200,
  });

  // API readiness
  const readyRes = http.get(`${API_BASE}/health`);
  check(readyRes, {
    'api health responds': (r) => r.status === 200 || r.status === 404,
  });

  // Search endpoint
  const searchRes = http.get(`${API_BASE}/search?q=test`);
  check(searchRes, {
    'search responds': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);
}
