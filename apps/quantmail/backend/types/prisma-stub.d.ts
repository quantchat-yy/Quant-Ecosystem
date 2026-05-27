declare module '@prisma/client' {
  export interface Email {
    id: string;
    userId: string;
    folderId: string | null;
    fromAddress: string;
    fromName: string | null;
    toAddresses: string[];
    ccAddresses: string[];
    bccAddresses: string[];
    subject: string;
    bodyHtml: string;
    bodyPlain: string;
    snippet: string;
    threadId: string | null;
    inReplyTo: string | null;
    hasAttachments: boolean;
    attachments: unknown[];
    isRead: boolean;
    isStarred: boolean;
    isDraft: boolean;
    isSent: boolean;
    isTrash: boolean;
    receivedAt: Date;
    sentAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface EmailThread {
    id: string;
    userId: string;
    subject: string;
    participantAddresses: string[];
    lastEmailAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface EmailFolder {
    id: string;
    userId: string;
    name: string;
    type: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Repository {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Commit {
    id: string;
    repoId: string;
    sha: string;
    message: string;
    authorId: string;
    branch: string;
    createdAt: Date;
  }

  export interface PullRequest {
    id: string;
    repoId: string;
    number: number;
    title: string;
    body: string | null;
    authorId: string;
    status: string;
    sourceBranch: string;
    targetBranch: string;
    mergeStrategy: string | null;
    mergedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Issue {
    id: string;
    repoId: string;
    number: number;
    title: string;
    body: string | null;
    authorId: string;
    status: string;
    labels: string[];
    assignees: string[];
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
  }

  export interface Review {
    id: string;
    prId: string;
    reviewerId: string;
    status: string;
    body: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ReviewComment {
    id: string;
    reviewId: string;
    prId: string;
    authorId: string;
    body: string;
    filePath: string;
    line: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface BranchProtection {
    id: string;
    repoId: string;
    branchPattern: string;
    requiredApprovals: number;
    requireStatusChecks: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CiRun {
    id: string;
    repoId: string;
    branch: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CiJob {
    id: string;
    runId: string;
    name: string;
    status: string;
    logs: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Build {
    id: string;
    repoId: string;
    status: string;
    branch: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Branch {
    id: string;
    repoId: string;
    name: string;
    sha: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Contact {
    id: string;
    userId: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }

  interface WhereUniqueInput {
    id?: string;
    [key: string]: unknown;
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
    orderBy?: OrderByInput | OrderByInput[];
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

  interface DeleteArgs {
    where: WhereUniqueInput;
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
    delete(args: DeleteArgs): Promise<T>;
    count(args?: CountArgs): Promise<number>;
  }

  export interface PrismaClient {
    email: ModelDelegate<Email>;
    emailThread: ModelDelegate<EmailThread>;
    emailFolder: ModelDelegate<EmailFolder>;
    repository: ModelDelegate<Repository>;
    commit: ModelDelegate<Commit>;
    pullRequest: ModelDelegate<PullRequest>;
    issue: ModelDelegate<Issue>;
    review: ModelDelegate<Review>;
    reviewComment: ModelDelegate<ReviewComment>;
    branchProtection: ModelDelegate<BranchProtection>;
    ciRun: ModelDelegate<CiRun>;
    ciJob: ModelDelegate<CiJob>;
    build: ModelDelegate<Build>;
    branch: ModelDelegate<Branch>;
    contact: ModelDelegate<Contact>;
    $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
  }
}
