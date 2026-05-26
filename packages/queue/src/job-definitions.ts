import { z } from 'zod';

export const SendEmailJobSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  templateId: z.string().optional(),
});

export type SendEmailJob = z.infer<typeof SendEmailJobSchema>;

export const ProcessMediaJobSchema = z.object({
  fileKey: z.string(),
  userId: z.string(),
  type: z.enum(['video', 'image', 'audio']),
  options: z.record(z.string(), z.unknown()).optional(),
});

export type ProcessMediaJob = z.infer<typeof ProcessMediaJobSchema>;

export const SyncDataJobSchema = z.object({
  sourceApp: z.string(),
  targetApp: z.string(),
  entityType: z.string(),
  entityId: z.string(),
});

export type SyncDataJob = z.infer<typeof SyncDataJobSchema>;

export const GenerateReportJobSchema = z.object({
  reportType: z.string(),
  userId: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  format: z.enum(['pdf', 'csv', 'json']),
});

export type GenerateReportJob = z.infer<typeof GenerateReportJobSchema>;

export const ModerationJobSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['text', 'image', 'video', 'audio']),
  content: z.string(),
  userId: z.string(),
  appId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ModerationJob = z.infer<typeof ModerationJobSchema>;

export const TranscodeJobSchema = z.object({
  inputPath: z.string(),
  outputDir: z.string(),
  userId: z.string(),
  videoId: z.string(),
  profiles: z
    .array(
      z.object({
        name: z.string(),
        width: z.number(),
        height: z.number(),
        videoBitrate: z.string(),
        audioBitrate: z.string(),
      }),
    )
    .optional(),
});

export type TranscodeJob = z.infer<typeof TranscodeJobSchema>;
