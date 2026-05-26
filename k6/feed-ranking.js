import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    'feed-ranking': {
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
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3006';

export default function () {
  // Fetch personalized feed
  const personalizedRes = http.get(`${BASE_URL}/api/feed/personalized`);

  check(personalizedRes, {
    'personalized feed status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Fetch trending feed
  const trendingRes = http.get(`${BASE_URL}/api/feed/trending`);

  check(trendingRes, {
    'trending feed status is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // Interact with a post (like/share)
  const postId = `post-${Math.floor(Math.random() * 1000)}`;
  const interactionRes = http.post(
    `${BASE_URL}/api/feed/interactions`,
    JSON.stringify({ type: 'like', postId: postId }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(interactionRes, {
    'interaction status is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // Paginate through feed
  const page = Math.floor(Math.random() * 10) + 1;
  const pageRes = http.get(`${BASE_URL}/api/feed/page/${page}`);

  check(pageRes, {
    'feed page status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
