import { createAppError } from '@quant/server-core';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptInput {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface UpdatePromptInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ListPromptOptions {
  search?: string;
  category?: string;
  favoritesOnly?: boolean;
}

interface PromptTemplateRow {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags: unknown;
  isFavorite: boolean;
  usageCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Structural slice of the Prisma client this service relies on. Declaring it
 * structurally keeps the service unit-testable with a lightweight fake while
 * the real `@quant/database` client satisfies the same shape at runtime.
 */
export interface PromptTemplatePrismaClient {
  aiPromptTemplate: {
    findMany: (args: Record<string, unknown>) => Promise<PromptTemplateRow[]>;
    findUnique: (args: { where: { id: string } }) => Promise<PromptTemplateRow | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<PromptTemplateRow>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<PromptTemplateRow>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
}

const MAX_TITLE = 200;
const MAX_CONTENT = 100000;
const MAX_TAGS = 20;

export class PromptTemplateService {
  constructor(private readonly prisma: PromptTemplatePrismaClient) {}

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  }

  private rowToTemplate(row: PromptTemplateRow): PromptTemplate {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: this.toStringArray(row.tags),
      isFavorite: row.isFavorite,
      usageCount: row.usageCount,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) return [];
    const cleaned = tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, MAX_TAGS);
    // De-duplicate while preserving order.
    return [...new Set(cleaned)];
  }

  /** Load a template and assert the caller owns it. */
  private async getOwned(id: string, userId: string): Promise<PromptTemplateRow> {
    const row = await this.prisma.aiPromptTemplate.findUnique({ where: { id } });
    if (!row) {
      throw createAppError('Prompt not found', 404, 'PROMPT_NOT_FOUND');
    }
    if (row.userId !== userId) {
      throw createAppError('Access denied', 403, 'ACCESS_DENIED');
    }
    return row;
  }

  async list(userId: string, options: ListPromptOptions = {}): Promise<PromptTemplate[]> {
    const where: Record<string, unknown> = { userId };
    if (options.category) where['category'] = options.category;
    if (options.favoritesOnly) where['isFavorite'] = true;

    const rows = await this.prisma.aiPromptTemplate.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
    });

    let templates = rows.map((row) => this.rowToTemplate(row));

    // Free-text search across title, content, and tags. Done in-process so the
    // same matching semantics apply regardless of the database collation.
    const query = options.search?.trim().toLowerCase();
    if (query) {
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return templates;
  }

  async get(id: string, userId: string): Promise<PromptTemplate> {
    return this.rowToTemplate(await this.getOwned(id, userId));
  }

  async create(userId: string, input: CreatePromptInput): Promise<PromptTemplate> {
    const title = input.title?.trim();
    const content = input.content?.trim();
    if (!title || !content) {
      throw createAppError('Title and content are required', 400, 'INVALID_PROMPT');
    }
    if (title.length > MAX_TITLE) {
      throw createAppError('Title is too long', 400, 'INVALID_PROMPT');
    }
    if (content.length > MAX_CONTENT) {
      throw createAppError('Content is too long', 400, 'INVALID_PROMPT');
    }

    const row = await this.prisma.aiPromptTemplate.create({
      data: {
        userId,
        title,
        content,
        category: input.category?.trim() || 'general',
        tags: this.normalizeTags(input.tags),
      },
    });
    return this.rowToTemplate(row);
  }

  async update(id: string, userId: string, input: UpdatePromptInput): Promise<PromptTemplate> {
    await this.getOwned(id, userId);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title || title.length > MAX_TITLE) {
        throw createAppError('Invalid title', 400, 'INVALID_PROMPT');
      }
      data['title'] = title;
    }
    if (input.content !== undefined) {
      const content = input.content.trim();
      if (!content || content.length > MAX_CONTENT) {
        throw createAppError('Invalid content', 400, 'INVALID_PROMPT');
      }
      data['content'] = content;
    }
    if (input.category !== undefined) data['category'] = input.category.trim() || 'general';
    if (input.tags !== undefined) data['tags'] = this.normalizeTags(input.tags);
    if (input.isFavorite !== undefined) data['isFavorite'] = input.isFavorite;

    const row = await this.prisma.aiPromptTemplate.update({ where: { id }, data });
    return this.rowToTemplate(row);
  }

  async toggleFavorite(id: string, userId: string): Promise<PromptTemplate> {
    const current = await this.getOwned(id, userId);
    const row = await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { isFavorite: !current.isFavorite },
    });
    return this.rowToTemplate(row);
  }

  /** Record that a prompt was inserted into the composer. Increments usage. */
  async recordUsage(id: string, userId: string): Promise<PromptTemplate> {
    const current = await this.getOwned(id, userId);
    const row = await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { usageCount: current.usageCount + 1 },
    });
    return this.rowToTemplate(row);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOwned(id, userId);
    await this.prisma.aiPromptTemplate.delete({ where: { id } });
  }

  async getCategories(userId: string): Promise<string[]> {
    const rows = await this.prisma.aiPromptTemplate.findMany({ where: { userId } });
    return [...new Set(rows.map((r) => r.category))].sort();
  }
}
