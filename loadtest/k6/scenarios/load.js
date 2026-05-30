import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE } from '../helpers/config.js';
import { getAuthHeaders } from '../helpers/auth.js';

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95) < 200', 'p(99) < 500'],
    http_req_failed: ['rate < 0.001'],
    http_reqs: ['rate > 100'],
  },
  tags: { testType: 'load' },
};

export default function () {
  const headers = getAuthHeaders(`user-${__VU}`);

  // Email listing
  const emailsRes = http.get(`${API_BASE}/emails`, { headers });
  check(emailsRes, {
    'emails endpoint status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  sleep(0.5);

  // Messages
  const messagesRes = http.get(`${API_BASE}/messages`, { headers });
  check(messagesRes, {
    'messages endpoint status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  sleep(0.3);

  // Search
  const queries = ['hello', 'meeting', 'project', 'update', 'review'];
  const q = queries[Math.floor(Math.random() * queries.length)];
  const searchRes = http.get(`${API_BASE}/search?q=${q}`, { headers });
  check(searchRes, {
    'search status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  sleep(0.2);
}
