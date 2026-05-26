import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export interface PrismaClient {
  file: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

export interface CategorizeResult {
  suggestedFolder: string;
  category: string;
  confidence: number;
}

export interface AutoOrganizeResult {
  fileId: string;
  movedTo: string;
  category: string;
}

interface FileRecord {
  id: string;
  name: string;
  mimeType: string;
  userId: string;
  encryptedContent: string;
}

const CategorizeResponseSchema = z.object({
  suggestedFolder: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

const CATEGORIES = [
  'Documents',
  'Images',
  'Videos',
  'Music',
  'Archives',
  'Receipts',
  'Code',
  'Spreadsheets',
  'Presentations',
  'Other',
] as const;

const MIME_CATEGORY_MAP: Record<string, string> = {
  'image/': 'Images',
  'video/': 'Videos',
  'audio/': 'Music',
  'application/zip': 'Archives',
  'application/x-rar': 'Archives',
  'application/x-tar': 'Archives',
  'application/gzip': 'Archives',
  'application/x-7z-compressed': 'Archives',
  'application/pdf': 'Documents',
  'text/csv': 'Spreadsheets',
  'application/vnd.ms-excel': 'Spreadsheets',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Spreadsheets',
  'application/vnd.ms-powerpoint': 'Presentations',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Presentations',
  'text/plain': 'Documents',
  'text/markdown': 'Documents',
  'application/msword': 'Documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documents',
};

const EXTENSION_CATEGORY_MAP: Record<string, string> = {
  '.ts': 'Code',
  '.js': 'Code',
  '.py': 'Code',
  '.java': 'Code',
  '.c': 'Code',
  '.cpp': 'Code',
  '.h': 'Code',
  '.go': 'Code',
  '.rs': 'Code',
  '.rb': 'Code',
  '.php': 'Code',
  '.swift': 'Code',
  '.kt': 'Code',
  '.cs': 'Code',
  '.html': 'Code',
  '.css': 'Code',
  '.json': 'Code',
  '.xml': 'Code',
  '.yaml': 'Code',
  '.yml': 'Code',
  '.sh': 'Code',
  '.png': 'Images',
  '.jpg': 'Images',
  '.jpeg': 'Images',
  '.gif': 'Images',
  '.svg': 'Images',
  '.webp': 'Images',
  '.mp4': 'Videos',
  '.avi': 'Videos',
  '.mov': 'Videos',
  '.mkv': 'Videos',
  '.mp3': 'Music',
  '.wav': 'Music',
  '.flac': 'Music',
  '.ogg': 'Music',
  '.zip': 'Archives',
  '.rar': 'Archives',
  '.tar': 'Archives',
  '.gz': 'Archives',
  '.7z': 'Archives',
  '.pdf': 'Documents',
  '.doc': 'Documents',
  '.docx': 'Documents',
  '.txt': 'Documents',
  '.md': 'Documents',
  '.xls': 'Spreadsheets',
  '.xlsx': 'Spreadsheets',
  '.csv': 'Spreadsheets',
  '.ppt': 'Presentations',
  '.pptx': 'Presentations',
};

export class AIOrganizeService {
  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {}

  async categorizeFile(
    filename: string,
    mimeType: string,
    contentPreview: string,
    userId: string,
  ): Promise<CategorizeResult> {
    // Try heuristic categorization first
    const heuristicCategory = this.categorizeByHeuristics(filename, mimeType);

    // Check if filename suggests a receipt
    const lowerName = filename.toLowerCase();
    if (
      lowerName.includes('receipt') ||
      lowerName.includes('invoice') ||
      lowerName.includes('bill')
    ) {
      return {
        suggestedFolder: '/Receipts',
        category: 'Receipts',
        confidence: 0.85,
      };
    }

    // Use AI for better classification
    try {
      const response = await this.ai.infer({
        prompt: `Classify the following file into one of these categories: ${CATEGORIES.join(', ')}.

Filename: ${filename}
MIME Type: ${mimeType}
Content Preview: ${contentPreview.slice(0, 500)}

Respond ONLY with valid JSON:
{
  "suggestedFolder": "/CategoryName",
  "category": "CategoryName",
  "confidence": 0.0 to 1.0
}`,
        systemPrompt:
          'You are a file organization assistant. Classify files into the correct category based on their name, type, and content. Always respond with valid JSON only.',
        userId,
        app: 'quantdrive',
        feature: 'ai-organize',
        temperature: 0.3,
        maxTokens: 256,
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.content);
      } catch {
        // Fall back to heuristic result
        return {
          suggestedFolder: `/${heuristicCategory}`,
          category: heuristicCategory,
          confidence: 0.7,
        };
      }

      const result = CategorizeResponseSchema.safeParse(parsed);
      if (!result.success) {
        return {
          suggestedFolder: `/${heuristicCategory}`,
          category: heuristicCategory,
          confidence: 0.7,
        };
      }

      return result.data;
    } catch {
      // Fallback to heuristic
      return {
        suggestedFolder: `/${heuristicCategory}`,
        category: heuristicCategory,
        confidence: 0.7,
      };
    }
  }

  async autoOrganize(fileId: string, userId: string): Promise<AutoOrganizeResult> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      throw createAppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    const record = file as unknown as FileRecord;

    if (record.userId !== userId) {
      throw createAppError('Not authorized to access this file', 403, 'UNAUTHORIZED');
    }

    const result = await this.categorizeFile(record.name, record.mimeType, '', userId);

    return {
      fileId,
      movedTo: result.suggestedFolder,
      category: result.category,
    };
  }

  private categorizeByHeuristics(filename: string, mimeType: string): string {
    // Check MIME type first
    for (const [prefix, category] of Object.entries(MIME_CATEGORY_MAP)) {
      if (mimeType === prefix || mimeType.startsWith(prefix)) {
        return category;
      }
    }

    // Check file extension
    const lastDot = filename.lastIndexOf('.');
    if (lastDot !== -1) {
      const ext = filename.slice(lastDot).toLowerCase();
      const category = EXTENSION_CATEGORY_MAP[ext];
      if (category) {
        return category;
      }
    }

    return 'Other';
  }
}
