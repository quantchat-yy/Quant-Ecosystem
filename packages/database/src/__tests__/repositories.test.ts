import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../repositories/user.repository';
import { MessageRepository } from '../repositories/message.repository';
import { EmailRepository } from '../repositories/email.repository';
import { PostRepository } from '../repositories/post.repository';
import { MediaRepository } from '../repositories/media.repository';
import { AISessionRepository } from '../repositories/ai-session.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { withTx } from '../transaction';
import type { PaginatedResult } from '../repositories/base.repository';

// Mock PrismaClient
function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    conversationMember: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
    },
    email: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    photo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    story: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    aISession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    aIMessage: {
      create: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  } as unknown as ReturnType<typeof import('@prisma/client').PrismaClient>;
}

describe('UserRepository', () => {
  let repo: UserRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repo = new UserRepository(mockPrisma as any);
  });

  it('should have findById method', () => {
    expect(repo.findById).toBeDefined();
    expect(typeof repo.findById).toBe('function');
  });

  it('should have findByEmail method', () => {
    expect(repo.findByEmail).toBeDefined();
    expect(typeof repo.findByEmail).toBe('function');
  });

  it('should have findByUsername method', () => {
    expect(repo.findByUsername).toBeDefined();
    expect(typeof repo.findByUsername).toBe('function');
  });

  it('should have findByPhone method', () => {
    expect(repo.findByPhone).toBeDefined();
    expect(typeof repo.findByPhone).toBe('function');
  });

  it('should call prisma.user.findUnique for findById', async () => {
    (mockPrisma as any).user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
    const result = await repo.findById('1');
    expect(result).toEqual({ id: '1', email: 'test@test.com' });
    expect((mockPrisma as any).user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should return paginated results from findMany', async () => {
    const mockUsers = [{ id: '1' }, { id: '2' }];
    (mockPrisma as any).user.findMany.mockResolvedValue(mockUsers);
    (mockPrisma as any).user.count.mockResolvedValue(2);

    const result = await repo.findMany({ page: 1, pageSize: 10 });

    expect(result.data).toEqual(mockUsers);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it('should have softDelete method', () => {
    expect(repo.softDelete).toBeDefined();
    expect(typeof repo.softDelete).toBe('function');
  });

  it('should have updateLastLogin method', () => {
    expect(repo.updateLastLogin).toBeDefined();
    expect(typeof repo.updateLastLogin).toBe('function');
  });

  it('should have incrementFailedAttempts method', () => {
    expect(repo.incrementFailedAttempts).toBeDefined();
    expect(typeof repo.incrementFailedAttempts).toBe('function');
  });
});

describe('MessageRepository', () => {
  let repo: MessageRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repo = new MessageRepository(mockPrisma as any);
  });

  it('should have findByConversation method', () => {
    expect(repo.findByConversation).toBeDefined();
  });

  it('should have create method', () => {
    expect(repo.create).toBeDefined();
  });

  it('should have markAsRead method', () => {
    expect(repo.markAsRead).toBeDefined();
  });

  it('should have getConversationsForUser method', () => {
    expect(repo.getConversationsForUser).toBeDefined();
  });
});

describe('EmailRepository', () => {
  let repo: EmailRepository;

  beforeEach(() => {
    repo = new EmailRepository(createMockPrisma() as any);
  });

  it('should have findByFolder method', () => {
    expect(repo.findByFolder).toBeDefined();
  });

  it('should have findByThread method', () => {
    expect(repo.findByThread).toBeDefined();
  });

  it('should have markAsRead method', () => {
    expect(repo.markAsRead).toBeDefined();
  });

  it('should have moveToFolder method', () => {
    expect(repo.moveToFolder).toBeDefined();
  });
});

describe('PostRepository', () => {
  let repo: PostRepository;

  beforeEach(() => {
    repo = new PostRepository(createMockPrisma() as any);
  });

  it('should have findByUser method', () => {
    expect(repo.findByUser).toBeDefined();
  });

  it('should have findForFeed method', () => {
    expect(repo.findForFeed).toBeDefined();
  });

  it('should have incrementLikeCount method', () => {
    expect(repo.incrementLikeCount).toBeDefined();
  });
});

describe('MediaRepository', () => {
  let repo: MediaRepository;

  beforeEach(() => {
    repo = new MediaRepository(createMockPrisma() as any);
  });

  it('should have video CRUD methods', () => {
    expect(repo.findVideoById).toBeDefined();
    expect(repo.findVideosByUser).toBeDefined();
    expect(repo.createVideo).toBeDefined();
  });

  it('should have photo CRUD methods', () => {
    expect(repo.findPhotoById).toBeDefined();
    expect(repo.findPhotosByUser).toBeDefined();
    expect(repo.createPhoto).toBeDefined();
  });

  it('should have story methods with expiration check', () => {
    expect(repo.findActiveStories).toBeDefined();
    expect(repo.createStory).toBeDefined();
  });
});

describe('AISessionRepository', () => {
  let repo: AISessionRepository;

  beforeEach(() => {
    repo = new AISessionRepository(createMockPrisma() as any);
  });

  it('should have findByUser method', () => {
    expect(repo.findByUser).toBeDefined();
  });

  it('should have create method', () => {
    expect(repo.create).toBeDefined();
  });

  it('should have addMessage method', () => {
    expect(repo.addMessage).toBeDefined();
  });

  it('should have getSessionWithMessages method', () => {
    expect(repo.getSessionWithMessages).toBeDefined();
  });
});

describe('NotificationRepository', () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    repo = new NotificationRepository(createMockPrisma() as any);
  });

  it('should have findByUser method', () => {
    expect(repo.findByUser).toBeDefined();
  });

  it('should have create method', () => {
    expect(repo.create).toBeDefined();
  });

  it('should have markAsRead method', () => {
    expect(repo.markAsRead).toBeDefined();
  });

  it('should have markAllAsRead method', () => {
    expect(repo.markAllAsRead).toBeDefined();
  });
});

describe('PaginatedResult structure', () => {
  it('should have correct structure type', () => {
    const result: PaginatedResult<{ id: string }> = {
      data: [{ id: '1' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });
});

describe('Transaction helper', () => {
  it('should call $transaction on the client', async () => {
    const mockClient = {
      $transaction: vi.fn().mockImplementation((fn, opts) => fn({})),
    };

    await withTx(mockClient as any, async (tx) => {
      return 'result';
    });

    expect(mockClient.$transaction).toHaveBeenCalled();
  });

  it('should pass options to $transaction', async () => {
    const mockClient = {
      $transaction: vi.fn().mockImplementation((fn, opts) => fn({})),
    };

    await withTx(mockClient as any, async (tx) => 'result', { timeout: 5000 });

    expect(mockClient.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 5000 });
  });
});
