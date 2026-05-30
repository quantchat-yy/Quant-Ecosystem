export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_BASE = `${BASE_URL}/api`;

export const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const defaultThresholds = {
  http_req_duration: ['p(95) < 200', 'p(99) < 500'],
  http_req_failed: ['rate < 0.001'],
};
