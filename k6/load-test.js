import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Spike to 1000
    { duration: '3m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test OAuth token endpoint
  const tokenRes = http.post(
    `${BASE_URL}/oauth/token`,
    JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: 'test-refresh-token',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  check(tokenRes, {
    'token status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  sleep(1);

  // Test QuantAI chat
  const chatRes = http.post(
    `${BASE_URL}/chat/1/messages`,
    JSON.stringify({
      content: 'Hello, this is a load test message',
      model: 'gpt-4o-mini',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  check(chatRes, {
    'chat status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
