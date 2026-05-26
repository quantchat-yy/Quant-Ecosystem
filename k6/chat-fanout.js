import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    'chat-fanout': {
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
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const groupId = `group-${Math.floor(Math.random() * 100)}`;
  const conversationId = `conv-${Math.floor(Math.random() * 100)}`;

  // Send a message to a group chat
  const sendRes = http.post(
    `${BASE_URL}/api/chat/messages`,
    JSON.stringify({
      content: `Load test message ${Date.now()}`,
      groupId: groupId,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(sendRes, {
    'send message status is 201': (r) => r.status === 201,
    'send message has body': (r) => r.body.length > 0,
  });

  sleep(0.5);

  // Check message delivery
  const deliveryRes = http.get(`${BASE_URL}/api/chat/conversations/${conversationId}/messages`);

  check(deliveryRes, {
    'get messages status is 200': (r) => r.status === 200,
  });

  sleep(0.3);

  // Broadcast to group
  const broadcastRes = http.post(
    `${BASE_URL}/api/chat/groups/${groupId}/broadcast`,
    JSON.stringify({
      message: 'Broadcast message',
      priority: 'normal',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(broadcastRes, {
    'broadcast status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
