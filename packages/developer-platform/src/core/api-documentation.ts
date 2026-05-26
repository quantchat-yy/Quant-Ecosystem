// ============================================================================
// Quant Developer Platform - API Documentation Generator
// ============================================================================

import { z } from 'zod';
import type { DocEndpoint, DocSpec, DocCodeSample, InteractiveDoc } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

const endpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1),
  summary: z.string().min(1).max(256),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        in: z.enum(['path', 'query', 'header']),
        required: z.boolean(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  requestBody: z
    .object({
      contentType: z.string(),
      schema: z.record(z.string(), z.unknown()),
      required: z.boolean(),
    })
    .optional(),
  responses: z
    .record(
      z.string(),
      z.object({
        description: z.string(),
        schema: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  authentication: z.enum(['none', 'apiKey', 'bearer', 'oauth2']).optional(),
  rateLimit: z.string().optional(),
});

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// APIDocumentationGenerator Class
// ============================================================================

export class APIDocumentationGenerator {
  private endpoints: Map<string, DocEndpoint> = new Map();
  private specTitle: string;
  private specVersion: string;
  private baseUrl: string;
  private description: string;

  constructor(config: { title: string; version: string; baseUrl: string; description?: string }) {
    this.specTitle = config.title;
    this.specVersion = config.version;
    this.baseUrl = config.baseUrl;
    this.description = config.description ?? '';
  }

  /**
   * Add an endpoint to the documentation
   */
  public addEndpoint(endpoint: DocEndpoint): {
    success: boolean;
    endpointId: string;
    message: string;
  } {
    const parsed = endpointSchema.safeParse(endpoint);
    if (!parsed.success) {
      return {
        success: false,
        endpointId: '',
        message: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    const endpointId = generateId();
    const storedEndpoint: DocEndpoint = {
      ...parsed.data,
      id: endpointId,
    };

    this.endpoints.set(endpointId, storedEndpoint);

    return {
      success: true,
      endpointId,
      message: `Added ${endpoint.method} ${endpoint.path}`,
    };
  }

  /**
   * Generate a complete OpenAPI-style specification
   */
  public generateSpec(): DocSpec {
    const paths: DocSpec['paths'] = {};
    const tags = new Set<string>();

    for (const endpoint of this.endpoints.values()) {
      const pathKey = endpoint.path;
      if (!paths[pathKey]) {
        paths[pathKey] = {};
      }

      const method = endpoint.method.toLowerCase();
      paths[pathKey][method] = {
        summary: endpoint.summary,
        description: endpoint.description ?? '',
        tags: endpoint.tags ?? [],
        parameters: endpoint.parameters ?? [],
        requestBody: endpoint.requestBody ?? null,
        responses: endpoint.responses ?? {},
        security: endpoint.authentication ? [{ [endpoint.authentication]: [] }] : [],
      };

      for (const tag of endpoint.tags ?? []) {
        tags.add(tag);
      }
    }

    return {
      openapi: '3.0.3',
      info: {
        title: this.specTitle,
        version: this.specVersion,
        description: this.description,
      },
      servers: [{ url: this.baseUrl, description: 'API Server' }],
      paths,
      tags: Array.from(tags).map((name) => ({ name, description: '' })),
      components: {
        securitySchemes: {
          apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    };
  }

  /**
   * Generate code samples for a specific endpoint
   */
  public generateCodeSample(endpointId: string, language: string): DocCodeSample | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    let code: string;

    switch (language) {
      case 'curl':
        code = this.generateCurlSample(endpoint);
        break;
      case 'typescript':
        code = this.generateTypeScriptSample(endpoint);
        break;
      case 'python':
        code = this.generatePythonSample(endpoint);
        break;
      case 'javascript':
        code = this.generateJavaScriptSample(endpoint);
        break;
      default:
        code = this.generateCurlSample(endpoint);
        break;
    }

    return {
      language,
      code,
      endpointId,
      title: `${endpoint.method} ${endpoint.path}`,
    };
  }

  /**
   * Build interactive documentation structure
   */
  public buildInteractiveDoc(): InteractiveDoc {
    const endpoints = Array.from(this.endpoints.values());
    const groupedByTag: Record<string, DocEndpoint[]> = {};

    for (const endpoint of endpoints) {
      const primaryTag = endpoint.tags?.[0] ?? 'default';
      if (!groupedByTag[primaryTag]) {
        groupedByTag[primaryTag] = [];
      }
      groupedByTag[primaryTag].push(endpoint);
    }

    const sections = Object.entries(groupedByTag).map(([tag, tagEndpoints]) => ({
      name: tag,
      endpoints: tagEndpoints.map((ep) => ({
        id: ep.id ?? '',
        method: ep.method,
        path: ep.path,
        summary: ep.summary,
        tryItEnabled: true,
        codeSamples: ['curl', 'typescript', 'python', 'javascript'],
      })),
    }));

    return {
      title: this.specTitle,
      version: this.specVersion,
      baseUrl: this.baseUrl,
      sections,
      totalEndpoints: endpoints.length,
    };
  }

  /**
   * Export documentation as markdown
   */
  public exportMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# ${this.specTitle}`);
    lines.push('');
    lines.push(`Version: ${this.specVersion}`);
    lines.push('');
    if (this.description) {
      lines.push(this.description);
      lines.push('');
    }
    lines.push(`Base URL: \`${this.baseUrl}\``);
    lines.push('');
    lines.push('## Endpoints');
    lines.push('');

    const endpoints = Array.from(this.endpoints.values());
    const groupedByTag: Record<string, DocEndpoint[]> = {};

    for (const endpoint of endpoints) {
      const primaryTag = endpoint.tags?.[0] ?? 'General';
      if (!groupedByTag[primaryTag]) {
        groupedByTag[primaryTag] = [];
      }
      groupedByTag[primaryTag].push(endpoint);
    }

    for (const [tag, tagEndpoints] of Object.entries(groupedByTag)) {
      lines.push(`### ${tag}`);
      lines.push('');

      for (const endpoint of tagEndpoints) {
        lines.push(`#### \`${endpoint.method} ${endpoint.path}\``);
        lines.push('');
        lines.push(endpoint.summary);
        lines.push('');

        if (endpoint.description) {
          lines.push(endpoint.description);
          lines.push('');
        }

        if (endpoint.parameters && endpoint.parameters.length > 0) {
          lines.push('**Parameters:**');
          lines.push('');
          lines.push('| Name | In | Type | Required | Description |');
          lines.push('|------|-----|------|----------|-------------|');
          for (const param of endpoint.parameters) {
            lines.push(
              `| ${param.name} | ${param.in} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description ?? ''} |`,
            );
          }
          lines.push('');
        }

        if (endpoint.responses) {
          lines.push('**Responses:**');
          lines.push('');
          for (const [code, response] of Object.entries(endpoint.responses)) {
            lines.push(`- \`${code}\`: ${response.description}`);
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Validate the spec for completeness and consistency
   */
  public validateSpec(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.endpoints.size === 0) {
      errors.push('No endpoints defined');
    }

    for (const endpoint of this.endpoints.values()) {
      if (!endpoint.responses || Object.keys(endpoint.responses).length === 0) {
        warnings.push(`${endpoint.method} ${endpoint.path}: No responses defined`);
      }

      if (!endpoint.description) {
        warnings.push(`${endpoint.method} ${endpoint.path}: Missing description`);
      }

      // Check for path parameters without definitions
      const pathParams = endpoint.path.match(/\{([^}]+)\}/g) ?? [];
      for (const param of pathParams) {
        const paramName = param.replace(/[{}]/g, '');
        const defined = endpoint.parameters?.some((p) => p.name === paramName && p.in === 'path');
        if (!defined) {
          errors.push(
            `${endpoint.method} ${endpoint.path}: Path parameter "${paramName}" not defined`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get the number of endpoints
   */
  public getEndpointCount(): number {
    return this.endpoints.size;
  }

  // ============================================================================
  // Private Code Sample Generators
  // ============================================================================

  private generateCurlSample(endpoint: DocEndpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    let cmd = `curl -X ${endpoint.method} "${url}"`;

    if (endpoint.authentication === 'bearer') {
      cmd += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
    } else if (endpoint.authentication === 'apiKey') {
      cmd += ` \\\n  -H "X-API-Key: YOUR_API_KEY"`;
    }

    if (endpoint.requestBody) {
      cmd += ` \\\n  -H "Content-Type: ${endpoint.requestBody.contentType}"`;
      cmd += ` \\\n  -d '{}'`;
    }

    return cmd;
  }

  private generateTypeScriptSample(endpoint: DocEndpoint): string {
    const lines: string[] = [];
    lines.push(`const response = await fetch("${this.baseUrl}${endpoint.path}", {`);
    lines.push(`  method: "${endpoint.method}",`);
    lines.push(`  headers: {`);

    if (endpoint.authentication === 'bearer') {
      lines.push(`    "Authorization": "Bearer YOUR_TOKEN",`);
    } else if (endpoint.authentication === 'apiKey') {
      lines.push(`    "X-API-Key": "YOUR_API_KEY",`);
    }

    if (endpoint.requestBody) {
      lines.push(`    "Content-Type": "${endpoint.requestBody.contentType}",`);
    }

    lines.push(`  },`);

    if (endpoint.requestBody) {
      lines.push(`  body: JSON.stringify({}),`);
    }

    lines.push(`});`);
    lines.push('');
    lines.push(`const data = await response.json();`);

    return lines.join('\n');
  }

  private generatePythonSample(endpoint: DocEndpoint): string {
    const lines: string[] = [];
    lines.push(`import requests`);
    lines.push('');

    const headers: string[] = [];
    if (endpoint.authentication === 'bearer') {
      headers.push(`    "Authorization": "Bearer YOUR_TOKEN"`);
    } else if (endpoint.authentication === 'apiKey') {
      headers.push(`    "X-API-Key": "YOUR_API_KEY"`);
    }
    if (endpoint.requestBody) {
      headers.push(`    "Content-Type": "${endpoint.requestBody.contentType}"`);
    }

    if (headers.length > 0) {
      lines.push(`headers = {`);
      lines.push(headers.join(',\n'));
      lines.push(`}`);
      lines.push('');
    }

    const method = endpoint.method.toLowerCase();
    lines.push(`response = requests.${method}(`);
    lines.push(`    "${this.baseUrl}${endpoint.path}",`);
    if (headers.length > 0) {
      lines.push(`    headers=headers,`);
    }
    if (endpoint.requestBody) {
      lines.push(`    json={},`);
    }
    lines.push(`)`);
    lines.push('');
    lines.push(`data = response.json()`);

    return lines.join('\n');
  }

  private generateJavaScriptSample(endpoint: DocEndpoint): string {
    return this.generateTypeScriptSample(endpoint);
  }
}
