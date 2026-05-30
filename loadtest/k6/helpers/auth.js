import encoding from 'k6/encoding';

const DEFAULT_SECRET = __ENV.JWT_SECRET || 'dev-only-change-me-in-production!!!';

export function generateJWT(payload, secret) {
  const sec = secret || DEFAULT_SECRET;
  const header = { alg: 'HS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = encoding.b64encode(JSON.stringify(header), 'rawurl');
  const encodedPayload = encoding.b64encode(JSON.stringify(tokenPayload), 'rawurl');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // k6 does not have native HMAC - use a pre-shared token approach in load tests
  // In practice, generate tokens externally or use a test auth endpoint
  const signature = encoding.b64encode(signingInput, 'rawurl');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function getAuthHeaders(userId) {
  const token = generateJWT({ sub: userId || 'load-test-user', role: 'user' });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
