// @quant/sync-engine - Offline-First CRDT Sync Engine

export { CRDTDocument, CRDTDocumentConfigSchema } from './crdt-document.js';
export type { CRDTDocumentConfig, UpdateCallback } from './crdt-document.js';

export { CRDTList } from './crdt-list.js';
export type { ListObserveCallback } from './crdt-list.js';

export { CRDTState } from './crdt-state.js';
export type { StateSubscribeCallback } from './crdt-state.js';

export {
  SyncProtocol,
  SyncProtocolConfigSchema,
  SyncMessageSchema,
  SyncMessageTypeSchema,
  ReconnectConfigSchema,
} from './sync-protocol.js';
export type {
  SyncProtocolConfig,
  SyncMessage,
  SyncMessageType,
  ReconnectConfig,
  ConnectionState,
  IWebSocket,
  WebSocketFactory,
  MessageHandler,
  ErrorHandler,
  ConnectionStateChangeCallback,
} from './sync-protocol.js';

export { ConflictResolver } from './conflict-resolution.js';
export type { ConflictStrategy, TimestampedValue, CustomResolver } from './conflict-resolution.js';

export { LocalStore, InMemoryStorageBackend } from './local-store.js';
export type { IStorageBackend, OfflineAction } from './local-store.js';

export { ServiceWorkerManager } from './service-worker.js';
export type { QueuedRequest, ReplayResult, IServiceWorkerAPI } from './service-worker.js';

export { SyncStatusManager } from './sync-status.js';
export type { SyncStatus } from './sync-status.js';

export { OptimisticUpdateManager } from './optimistic-updates.js';
export type { PendingMutation } from './optimistic-updates.js';

export { OfflineOperationQueue } from './offline-queue.js';
export type {
  OfflineOperation,
  OfflineQueueConfig,
  ReplayResult as OfflineReplayResult,
} from './offline-queue.js';

export { RetryWithBackoff } from './retry-backoff.js';
export type { RetryConfig } from './retry-backoff.js';

export { ConflictStore } from './conflict-store.js';
export type { ConflictRecord } from './conflict-store.js';

export { SyncStatusIndicator } from './sync-status-indicator.js';
export type { SyncStatusIndicatorData } from './sync-status-indicator.js';
