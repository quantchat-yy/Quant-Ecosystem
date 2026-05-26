import type { ZAPConfig } from './types';

export const zapConfig: ZAPConfig = {
  target: 'http://localhost:3000',
  contextName: 'quant-ecosystem',
  scanPolicies: [
    {
      name: 'SQL Injection',
      enabled: true,
      strength: 'high',
      threshold: 'high',
    },
    {
      name: 'XSS',
      enabled: true,
      strength: 'high',
      threshold: 'high',
    },
    {
      name: 'CSRF',
      enabled: true,
      strength: 'medium',
      threshold: 'medium',
    },
    {
      name: 'Auth Bypass',
      enabled: true,
      strength: 'high',
      threshold: 'high',
    },
    {
      name: 'Info Disclosure',
      enabled: true,
      strength: 'medium',
      threshold: 'low',
    },
  ],
  spiderConfig: {
    maxDepth: 5,
    maxChildren: 10,
    recurse: true,
    handleODataParametersVisited: false,
  },
  alertThresholds: {
    maxHigh: 0,
    maxMedium: 5,
    maxLow: 20,
    failOnHigh: true,
  },
  authentication: {
    method: 'form',
    loginUrl: '/api/auth/login',
    credentials: {
      username: process.env.ZAP_TEST_USER ?? 'test@quant.app',
      password: process.env.ZAP_TEST_PASS ?? 'test-password',
    },
    tokenExtraction: 'Set-Cookie: session=(.+)',
  },
  apps: [
    {
      name: 'quantchat',
      baseUrl: 'http://localhost:3001',
      includePaths: ['/api/chat/**', '/api/messages/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantmail',
      baseUrl: 'http://localhost:3002',
      includePaths: ['/api/mail/**', '/api/folders/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantai',
      baseUrl: 'http://localhost:3003',
      includePaths: ['/api/ai/**', '/api/models/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantads',
      baseUrl: 'http://localhost:3004',
      includePaths: ['/api/ads/**', '/api/campaigns/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantube',
      baseUrl: 'http://localhost:3005',
      includePaths: ['/api/videos/**', '/api/channels/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantneon',
      baseUrl: 'http://localhost:3006',
      includePaths: ['/api/posts/**', '/api/feed/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantsync',
      baseUrl: 'http://localhost:3007',
      includePaths: ['/api/sync/**', '/api/files/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantdocs',
      baseUrl: 'http://localhost:3008',
      includePaths: ['/api/docs/**', '/api/collaboration/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantdrive',
      baseUrl: 'http://localhost:3009',
      includePaths: ['/api/drive/**', '/api/storage/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantmeet',
      baseUrl: 'http://localhost:3010',
      includePaths: ['/api/meetings/**', '/api/rooms/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantcalendar',
      baseUrl: 'http://localhost:3011',
      includePaths: ['/api/events/**', '/api/calendars/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantedits',
      baseUrl: 'http://localhost:3012',
      includePaths: ['/api/projects/**', '/api/edits/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
    {
      name: 'quantmax',
      baseUrl: 'http://localhost:3013',
      includePaths: ['/api/**'],
      excludePaths: ['/api/health', '/api/metrics'],
    },
  ],
};

export function createZapConfig(overrides: Partial<ZAPConfig>): ZAPConfig {
  return {
    ...zapConfig,
    ...overrides,
    scanPolicies: overrides.scanPolicies ?? zapConfig.scanPolicies,
    spiderConfig: overrides.spiderConfig ?? zapConfig.spiderConfig,
    alertThresholds: overrides.alertThresholds ?? zapConfig.alertThresholds,
    apps: overrides.apps ?? zapConfig.apps,
  };
}
