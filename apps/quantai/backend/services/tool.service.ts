import { createAppError } from '@quant/server-core';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<string>;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class ToolService {
  private registry: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools(): void {
    this.registerTool({
      name: 'calculator',
      description: 'Evaluate basic math expressions',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' },
        },
        required: ['expression'],
      },
      handler: async (args) => {
        const expression = args['expression'] as string;
        // Only allow basic math characters for safety
        if (!/^[\d\s+\-*/().]+$/.test(expression)) {
          throw new Error('Invalid math expression');
        }
        const result = Function(`"use strict"; return (${expression})`)();
        return String(result);
      },
    });

    this.registerTool({
      name: 'current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Timezone (default: UTC)' },
        },
      },
      handler: async (args) => {
        const timezone = (args['timezone'] as string) || 'UTC';
        return new Date().toLocaleString('en-US', { timeZone: timezone });
      },
    });

    this.registerTool({
      name: 'echo',
      description: 'Echo back the provided text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to echo' },
        },
        required: ['text'],
      },
      handler: async (args) => {
        return args['text'] as string;
      },
    });
  }

  registerTool(toolDef: ToolDefinition): void {
    this.registry.set(toolDef.name, toolDef);
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    _userId: string,
  ): Promise<string> {
    const tool = this.registry.get(toolName);

    if (!tool) {
      throw createAppError(`Tool '${toolName}' not found`, 404, 'TOOL_NOT_FOUND');
    }

    return tool.handler(args);
  }

  listTools(_userId: string): ToolInfo[] {
    const tools: ToolInfo[] = [];
    for (const [, tool] of this.registry) {
      tools.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      });
    }
    return tools;
  }
}
