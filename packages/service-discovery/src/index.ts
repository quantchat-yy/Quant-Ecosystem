/**
 * Service Discovery Registry
 *
 * Provides a typed mapping of service names to their default ports,
 * with environment variable overrides for flexible deployments.
 */

export const SERVICE_REGISTRY = {
  quantmail: { defaultPort: 3001, envVar: 'QUANTMAIL_PORT' },
  quantchat: { defaultPort: 3002, envVar: 'QUANTCHAT_PORT' },
  quantai: { defaultPort: 3003, envVar: 'QUANTAI_PORT' },
  quantsync: { defaultPort: 3004, envVar: 'QUANTSYNC_PORT' },
  quantube: { defaultPort: 3005, envVar: 'QUANTUBE_PORT' },
  quantads: { defaultPort: 3006, envVar: 'QUANTADS_PORT' },
  quantmax: { defaultPort: 3007, envVar: 'QUANTMAX_PORT' },
  quantneon: { defaultPort: 3008, envVar: 'QUANTNEON_PORT' },
  quantedits: { defaultPort: 3009, envVar: 'QUANTEDITS_PORT' },
  quantmeet: { defaultPort: 3010, envVar: 'QUANTMEET_PORT' },
  quantdocs: { defaultPort: 3011, envVar: 'QUANTDOCS_PORT' },
  quantdrive: { defaultPort: 3012, envVar: 'QUANTDRIVE_PORT' },
  quantcalendar: { defaultPort: 3013, envVar: 'QUANTCALENDAR_PORT' },
  'git-server': { defaultPort: 3020, envVar: 'GIT_SERVER_PORT' },
  'ci-runner': { defaultPort: 3021, envVar: 'CI_RUNNER_PORT' },
  'search-indexer': { defaultPort: 3022, envVar: 'SEARCH_INDEXER_PORT' },
  'moderation-worker': { defaultPort: 3023, envVar: 'MODERATION_WORKER_PORT' },
  'cdc-relay': { defaultPort: 3024, envVar: 'CDC_RELAY_PORT' },
  'smtp-inbound': { defaultPort: 3025, envVar: 'SMTP_INBOUND_PORT' },
} as const;

export type ServiceName = keyof typeof SERVICE_REGISTRY;

/**
 * Get the URL for a service, reading from environment or falling back to localhost:defaultPort.
 *
 * Environment override format: `<SERVICE_NAME>_URL` (e.g., QUANTCHAT_URL=http://chat:3002)
 * Port override format: uses the envVar from the registry (e.g., QUANTCHAT_PORT=3002)
 */
export function getServiceUrl(service: ServiceName): string {
  const entry = SERVICE_REGISTRY[service];

  // Check for full URL override first
  const urlEnvKey = `${service.toUpperCase().replace(/-/g, '_')}_URL`;
  const urlOverride = process.env[urlEnvKey];
  if (urlOverride) {
    return urlOverride;
  }

  // Check for port override
  const portOverride = process.env[entry.envVar];
  const port = portOverride ? Number(portOverride) : entry.defaultPort;
  const host = process.env['SERVICE_HOST'] ?? 'localhost';

  return `http://${host}:${port}`;
}

/**
 * Get all registered service URLs as a map.
 */
export function getAllServiceUrls(): Record<ServiceName, string> {
  const urls = {} as Record<ServiceName, string>;
  for (const name of Object.keys(SERVICE_REGISTRY) as ServiceName[]) {
    urls[name] = getServiceUrl(name);
  }
  return urls;
}
