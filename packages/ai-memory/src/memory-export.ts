// ============================================================================
// Memory Exporter - Export/import memory in portable formats
// ============================================================================

import type { MemoryEntry, ExportFormat, MemoryExportData } from './types';
import { MemoryExportSchema } from './types';
import { AIMemoryStore } from './memory-store';

export class MemoryExporter {
  private store: AIMemoryStore;

  constructor(store: AIMemoryStore) {
    this.store = store;
  }

  export(userId: string, format: ExportFormat): string {
    const entries = this.store.getUserMemories(userId);
    const exportData: MemoryExportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      userId,
      entries: this.sanitizeForExport(entries),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'markdown':
        return this.toMarkdown(exportData);
      case 'csv':
        return this.toCsv(exportData.entries);
    }
  }

  importFromJson(json: string): MemoryEntry[] {
    const parsed: unknown = JSON.parse(json);
    const validated = MemoryExportSchema.parse(parsed);

    const imported: MemoryEntry[] = [];
    for (const entry of validated.entries) {
      const created = this.store.create({
        userId: entry.userId,
        category: entry.category,
        content: entry.content,
        source: entry.source,
        sourceApp: entry.sourceApp,
        explanation: entry.explanation,
        expiresAt: entry.expiresAt,
      });
      imported.push(created);
    }

    return imported;
  }

  private sanitizeForExport(entries: MemoryEntry[]): MemoryEntry[] {
    return entries.map((entry) => ({
      ...entry,
      accessLog: [],
    }));
  }

  private toMarkdown(data: MemoryExportData): string {
    const lines: string[] = [];
    lines.push(`# AI Memory Export`);
    lines.push(`**User:** ${data.userId}`);
    lines.push(`**Exported:** ${new Date(data.exportedAt).toISOString()}`);
    lines.push(`**Entries:** ${data.entries.length}`);
    lines.push('');

    for (const entry of data.entries) {
      lines.push(`## ${entry.category}: ${entry.content.slice(0, 50)}`);
      lines.push(`- **Source:** ${entry.sourceApp} (${entry.source})`);
      lines.push(`- **Created:** ${new Date(entry.createdAt).toISOString()}`);
      lines.push(`- **Explanation:** ${entry.explanation}`);
      lines.push(`- **Content:** ${entry.content}`);
      lines.push(`- **Access Count:** ${entry.accessLog.length}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private sanitizeCsvCell(value: string): string {
    let sanitized = value;
    // Prefix cells that start with formula-triggering characters
    if (/^[=+\-@]/.test(sanitized)) {
      sanitized = `\t${sanitized}`;
    }
    // Escape double quotes and wrap in quotes
    sanitized = sanitized.replace(/"/g, '""');
    // Escape newlines within quoted fields
    sanitized = sanitized.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n');
    return `"${sanitized}"`;
  }

  private toCsv(entries: MemoryEntry[]): string {
    const headers = [
      'id',
      'userId',
      'category',
      'content',
      'source',
      'sourceApp',
      'createdAt',
      'explanation',
      'accessCount',
    ];
    const lines: string[] = [headers.join(',')];

    for (const entry of entries) {
      const row = [
        this.sanitizeCsvCell(entry.id),
        this.sanitizeCsvCell(entry.userId),
        this.sanitizeCsvCell(entry.category),
        this.sanitizeCsvCell(entry.content),
        this.sanitizeCsvCell(entry.source),
        this.sanitizeCsvCell(entry.sourceApp),
        this.sanitizeCsvCell(String(entry.createdAt)),
        this.sanitizeCsvCell(entry.explanation),
        this.sanitizeCsvCell(String(entry.accessLog.length)),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }
}
