import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { DocService } from '../services/doc.service';
import { CommentService } from '../services/comment.service';
import { SuggestionService } from '../services/suggestion.service';
import { ExportService } from '../services/export.service';
import { TemplateService } from '../services/template.service';

const createDocSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const updateDocSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const restoreVersionSchema = z.object({
  versionId: z.string().min(1),
});

const searchSchema = z.object({
  q: z.string().max(200).optional(),
  query: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const shareSchema = z.object({
  isPublic: z.boolean().optional(),
  targetUserId: z.string().optional(),
  role: z.enum(['viewer', 'commenter', 'editor', 'owner']).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  selection: z
    .object({
      startOffset: z.number().int().min(0),
      endOffset: z.number().int().min(0),
      selectedText: z.string(),
    })
    .optional(),
});

const replyCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const createSuggestionSchema = z.object({
  originalText: z.string().max(10000),
  suggestedText: z.string().max(10000),
  selection: z.object({
    startOffset: z.number().int().min(0),
    endOffset: z.number().int().min(0),
    selectedText: z.string(),
  }),
});

const listSuggestionsSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const exportSchema = z.object({
  format: z.enum(['pdf', 'docx', 'markdown', 'html', 'latex']),
});

const createFromTemplateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\s.-]/g, '_').slice(0, 100);
}

export default async function docsRoutes(fastify: FastifyInstance) {
  const templateService = new TemplateService();
  const exportService = new ExportService();

  // POST /docs - Create document
  fastify.post('/', async (request, reply) => {
    const parseResult = createDocSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const doc = await service.createDoc({
      title: parseResult.data.title,
      content: parseResult.data.content,
      userId,
      metadata: parseResult.data.metadata,
    });

    return reply.status(201).send({ success: true, data: doc });
  });

  // GET /docs - List documents
  fastify.get('/', async (request, reply) => {
    const queryResult = paginationSchema.safeParse(request.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const result = await service.listDocs(userId, queryResult.data);

    return reply.send({ success: true, data: result });
  });

  // GET /docs/:id - Get document
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const doc = await service.getDoc(request.params.id, userId);

    return reply.send({ success: true, data: doc });
  });

  // PUT /docs/:id - Update document
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parseResult = updateDocSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const doc = await service.updateDoc(
      request.params.id,
      userId,
      parseResult.data.content,
      parseResult.data.title,
    );

    return reply.send({ success: true, data: doc });
  });

  // DELETE /docs/:id - Delete document
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const doc = await service.deleteDoc(request.params.id, userId);

    return reply.send({ success: true, data: doc });
  });

  // GET /docs/:id/versions - Get version history
  fastify.get<{ Params: { id: string } }>('/:id/versions', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const versions = await service.getVersionHistory(request.params.id, userId);

    return reply.send({ success: true, data: versions });
  });

  // POST /docs/:id/restore - Restore a version
  fastify.post<{ Params: { id: string } }>('/:id/restore', async (request, reply) => {
    const parseResult = restoreVersionSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const doc = await service.restoreVersion(request.params.id, userId, parseResult.data.versionId);

    return reply.send({ success: true, data: doc });
  });

  // GET /docs/search - Search documents (declared before /:id; Fastify prioritizes static)
  fastify.get('/search', async (request, reply) => {
    const parsed = searchSchema.safeParse(request.query);
    if (!parsed.success) {
      throw parsed.error;
    }
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const result = await service.searchDocs(userId, parsed.data.q ?? parsed.data.query ?? '', {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return reply.send({ success: true, data: result });
  });

  // GET /docs/:id/comments - List comments
  fastify.get<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new CommentService(prisma as never);
    const comments = await service.getComments(request.params.id);

    return reply.send({ success: true, data: comments });
  });

  // POST /docs/:id/comments - Create comment
  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const parseResult = createCommentSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new CommentService(prisma as never);
    const comment = await service.createComment({
      docId: request.params.id,
      userId,
      content: parseResult.data.content,
      selection: parseResult.data.selection,
    });

    return reply.status(201).send({ success: true, data: comment });
  });

  // POST /comments/:id/reply - Reply to comment
  fastify.post<{ Params: { id: string } }>('/comments/:id/reply', async (request, reply) => {
    const parseResult = replyCommentSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new CommentService(prisma as never);
    const comment = await service.replyToComment(
      request.params.id,
      userId,
      parseResult.data.content,
    );

    return reply.status(201).send({ success: true, data: comment });
  });

  // POST /comments/:id/resolve - Resolve comment
  fastify.post<{ Params: { id: string } }>('/comments/:id/resolve', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new CommentService(prisma as never);
    const comment = await service.resolveComment(request.params.id, userId);

    return reply.send({ success: true, data: comment });
  });

  // GET /docs/:id/suggestions - List suggestions for a document (owner-only)
  fastify.get<{ Params: { id: string } }>('/:id/suggestions', async (request, reply) => {
    const queryResult = listSuggestionsSchema.safeParse(request.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new SuggestionService(prisma as never);
    const suggestions = await service.listSuggestions(request.params.id, userId, {
      status: queryResult.data.status,
      order: queryResult.data.order,
    });

    return reply.send({ success: true, data: suggestions });
  });

  // POST /docs/:id/suggestions - Create a suggestion
  fastify.post<{ Params: { id: string } }>('/:id/suggestions', async (request, reply) => {
    const parseResult = createSuggestionSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new CommentService(prisma as never);
    const suggestion = await service.createSuggestion({
      docId: request.params.id,
      userId,
      originalText: parseResult.data.originalText,
      suggestedText: parseResult.data.suggestedText,
      selection: parseResult.data.selection,
    });

    return reply.status(201).send({ success: true, data: suggestion });
  });

  // POST /docs/suggestions/:id/accept - Accept a suggestion (owner-only)
  fastify.post<{ Params: { id: string } }>('/suggestions/:id/accept', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new SuggestionService(prisma as never);
    const suggestion = await service.acceptSuggestion(request.params.id, userId);

    return reply.send({ success: true, data: suggestion });
  });

  // POST /docs/suggestions/:id/reject - Reject a suggestion (owner-only)
  fastify.post<{ Params: { id: string } }>('/suggestions/:id/reject', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new SuggestionService(prisma as never);
    const suggestion = await service.rejectSuggestion(request.params.id, userId);

    return reply.send({ success: true, data: suggestion });
  });

  // POST /docs/:id/export - Export document
  fastify.post<{ Params: { id: string } }>('/:id/export', async (request, reply) => {
    const parseResult = exportSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const docService = new DocService(prisma as never);
    const doc = await docService.getDoc(request.params.id, userId);

    const docContent = {
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
    };

    const { format } = parseResult.data;

    const safeFilename = sanitizeFilename(doc.title);

    switch (format) {
      case 'markdown': {
        const markdown = exportService.exportToMarkdown(docContent);
        return reply
          .header('content-type', 'text/markdown')
          .header('content-disposition', `attachment; filename="${safeFilename}.md"`)
          .send(markdown);
      }
      case 'html': {
        const html = exportService.exportToHtml(docContent);
        return reply
          .header('content-type', 'text/html')
          .header('content-disposition', `attachment; filename="${safeFilename}.html"`)
          .send(html);
      }
      case 'pdf': {
        const pdf = exportService.exportToPdf(docContent);
        return reply
          .header('content-type', 'application/pdf')
          .header('content-disposition', `attachment; filename="${safeFilename}.pdf"`)
          .send(pdf);
      }
      case 'docx': {
        const docx = exportService.exportToDocx(docContent);
        return reply
          .header(
            'content-type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          )
          .header('content-disposition', `attachment; filename="${safeFilename}.docx"`)
          .send(docx);
      }
      case 'latex': {
        const latex = exportService.exportToLatex(docContent);
        return reply
          .header('content-type', 'application/x-latex')
          .header('content-disposition', `attachment; filename="${safeFilename}.tex"`)
          .send(latex);
      }
    }
  });

  // POST /docs/:id/share - Share document (public flag and/or grant collaborator)
  fastify.post<{ Params: { id: string } }>('/:id/share', async (request, reply) => {
    const parseResult = shareSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const result = await service.shareDoc(request.params.id, userId, parseResult.data);
    return reply.send({ success: true, data: result });
  });

  // GET /docs/:id/collaborators - List collaborators
  fastify.get<{ Params: { id: string } }>('/:id/collaborators', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new DocService(prisma as never);
    const collaborators = await service.listCollaborators(request.params.id, userId);
    return reply.send({ success: true, data: collaborators });
  });

  // POST /docs/:id/versions/:versionId/restore - Restore a version (path-param variant)
  fastify.post<{ Params: { id: string; versionId: string } }>(
    '/:id/versions/:versionId/restore',
    async (request, reply) => {
      const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
      if (!userId) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const prisma = (fastify as unknown as { prisma: unknown }).prisma;
      const service = new DocService(prisma as never);
      const doc = await service.restoreVersion(request.params.id, userId, request.params.versionId);
      return reply.send({ success: true, data: doc });
    },
  );

  // GET /templates - List templates
  fastify.get('/templates', async (_request, reply) => {
    const templates = templateService.getTemplates();
    return reply.send({ success: true, data: templates });
  });

  // POST /templates/:id/create - Create document from template
  fastify.post<{ Params: { id: string } }>('/templates/:id/create', async (request, reply) => {
    const parseResult = createFromTemplateSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const result = templateService.createFromTemplate(request.params.id, userId, parseResult.data);

    return reply.status(201).send({ success: true, data: result });
  });
}
