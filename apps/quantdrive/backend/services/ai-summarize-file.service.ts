import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export interface SummarizeInput {
  fileId: string;
  content: string;
  mimeType: string;
  fileName: string;
}

export interface SummarizeResult {
  summary: string;
  keyPoints: string[];
  fileType: string;
  wordCount: number;
}

const SummarizeResponseSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  fileType: z.string(),
  wordCount: z.number(),
});

export class AISummarizeFileService {
  constructor(private readonly ai: AIEngine) {}

  async summarizeFile(input: SummarizeInput, userId: string): Promise<SummarizeResult> {
    const fileType = this.detectFileType(input.mimeType, input.fileName);
    const wordCount = input.content.split(/\s+/).filter((w) => w.length > 0).length;

    const response = await this.ai.infer({
      prompt: `Summarize the following ${fileType} file content. Provide a brief summary and key points.

File Name: ${input.fileName}
MIME Type: ${input.mimeType}
Word Count: ${wordCount}

Content:
${input.content.slice(0, 3000)}

Respond ONLY with valid JSON:
{
  "summary": "a concise summary of the file content",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "fileType": "${fileType}",
  "wordCount": ${wordCount}
}`,
      systemPrompt:
        'You are a file summarization assistant. Analyze file content and produce concise, accurate summaries with key points. Always respond with valid JSON only.',
      userId,
      app: 'quantdrive',
      feature: 'ai-summarize',
      temperature: 0.4,
      maxTokens: 1024,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI summarize response', 500, 'AI_PARSE_ERROR');
    }

    const result = SummarizeResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid summarize result', 500, 'AI_VALIDATION_ERROR');
    }

    return result.data;
  }

  private detectFileType(mimeType: string, fileName: string): string {
    if (mimeType === 'text/plain') return 'text document';
    if (mimeType === 'application/pdf') return 'PDF document';
    if (mimeType === 'text/csv') return 'CSV spreadsheet';
    if (mimeType.startsWith('text/')) return 'text file';
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      return 'spreadsheet';
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return 'word document';
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      return 'presentation';
    }

    // Check extension for code files
    const ext = fileName.lastIndexOf('.') !== -1 ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const codeExtensions = [
      '.ts',
      '.js',
      '.py',
      '.java',
      '.c',
      '.cpp',
      '.go',
      '.rs',
      '.rb',
      '.php',
      '.swift',
      '.kt',
      '.cs',
      '.html',
      '.css',
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.sh',
    ];
    if (codeExtensions.includes(ext.toLowerCase())) {
      return 'source code';
    }

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    return 'file';
  }
}
