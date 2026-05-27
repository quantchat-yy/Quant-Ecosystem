declare module '@prisma/client' {
  export interface Conversation {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    createdBy: string;
    lastMessageAt: Date;
    isArchived?: boolean;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ConversationMember {
    id: string;
    conversationId: string;
    userId: string;
    role: string;
    joinedAt: Date;
    leftAt: Date | null;
    nickname: string | null;
    isMuted: boolean;
    lastReadAt: Date | null;
    conversation?: Conversation;
  }

  export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl: string | null;
    replyToId: string | null;
    metadata: Record<string, unknown>;
    isEdited: boolean;
    isDeleted: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  interface WhereUniqueInput {
    id?: string;
  }

  interface WhereInput {
    [key: string]: unknown;
  }

  interface OrderByInput {
    [key: string]: 'asc' | 'desc' | OrderByInput;
  }

  interface FindManyArgs {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: OrderByInput | OrderByInput[];
    include?: Record<string, boolean | Record<string, unknown>>;
    select?: Record<string, boolean | Record<string, unknown>>;
    distinct?: string[];
  }

  interface FindFirstArgs {
    where?: WhereInput;
    include?: Record<string, boolean | Record<string, unknown>>;
  }

  interface CreateArgs {
    data: Record<string, unknown>;
  }

  interface CreateManyArgs {
    data: Record<string, unknown>[];
  }

  interface UpdateArgs {
    where: WhereUniqueInput;
    data: Record<string, unknown>;
  }

  interface UpdateManyArgs {
    where: WhereInput;
    data: Record<string, unknown>;
  }

  interface CountArgs {
    where?: WhereInput;
  }

  interface ModelDelegate<T> {
    findUnique(args: {
      where: WhereUniqueInput;
      include?: Record<string, unknown>;
    }): Promise<T | null>;
    findFirst(args?: FindFirstArgs): Promise<T | null>;
    findMany(args?: FindManyArgs): Promise<T[]>;
    create(args: CreateArgs): Promise<T>;
    createMany(args: CreateManyArgs): Promise<{ count: number }>;
    update(args: UpdateArgs): Promise<T>;
    updateMany(args: UpdateManyArgs): Promise<{ count: number }>;
    delete(args: { where: WhereUniqueInput }): Promise<T>;
    count(args?: CountArgs): Promise<number>;
  }

  export interface TransactionClient {
    conversation: ModelDelegate<Conversation>;
    conversationMember: ModelDelegate<ConversationMember>;
    message: ModelDelegate<Message>;
  }

  export interface PrismaClient extends TransactionClient {
    $transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
  }
}
