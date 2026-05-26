import { z } from 'zod';

export const ApiDefinitionSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  description: z.string(),
  params: z.record(z.string(), z.string()).optional(),
});

export type ApiDefinition = z.infer<typeof ApiDefinitionSchema>;

export interface ApiCallResult {
  success: boolean;
  data: unknown;
  timestamp: number;
  endpoint: string;
  latencyMs: number;
}

export class Tier1ApiController {
  private readonly apis: Map<string, ApiDefinition> = new Map();

  constructor(apis?: ApiDefinition[]) {
    if (apis) {
      for (const api of apis) {
        this.apis.set(api.endpoint, api);
      }
    }
  }

  registerApi(definition: ApiDefinition): void {
    const parsed = ApiDefinitionSchema.parse(definition);
    this.apis.set(parsed.endpoint, parsed);
  }

  getAvailableApis(): ApiDefinition[] {
    return [...this.apis.values()];
  }

  async callApi(endpoint: string, params?: Record<string, unknown>): Promise<ApiCallResult> {
    const api = this.apis.get(endpoint);
    if (!api) {
      return {
        success: false,
        data: { error: `API endpoint not found: ${endpoint}` },
        timestamp: Date.now(),
        endpoint,
        latencyMs: 0,
      };
    }

    const start = Date.now();

    // Simulate internal API call with instant execution
    const result: ApiCallResult = {
      success: true,
      data: { endpoint, params, method: api.method },
      timestamp: Date.now(),
      endpoint,
      latencyMs: Date.now() - start,
    };

    return result;
  }

  hasApi(endpoint: string): boolean {
    return this.apis.has(endpoint);
  }

  removeApi(endpoint: string): boolean {
    return this.apis.delete(endpoint);
  }
}
