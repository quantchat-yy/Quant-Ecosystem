// ============================================================================
// @quant/federation - Federation Package (ActivityPub + Matrix + CalDAV + Mail + Developer Platform)
// ============================================================================

// ActivityPub
export { Actor, ActorSchema } from './activitypub/actor.js';
export { signRequest, verifySignature } from './activitypub/http-signatures.js';
export { WebFingerHandler, WebFingerResponseSchema } from './activitypub/webfinger.js';
export { NodeInfoHandler, NodeInfoSchema } from './activitypub/nodeinfo.js';
export { InboxProcessor, ActivitySchema } from './activitypub/inbox.js';
export type { InboxSignatureVerifier } from './activitypub/inbox.js';
export { OutboxPublisher } from './activitypub/outbox.js';
export { DeliveryQueue, DeliveryJobSchema } from './activitypub/delivery-queue.js';
export { FederationServer } from './activitypub/server.js';
export type { RequestMetadata, RouteResponse } from './activitypub/server.js';

// Matrix
export { MatrixBridgeBot } from './matrix/bridge-bot.js';
export type { BridgeResult } from './matrix/bridge-bot.js';
export { RoomMapper, MappingSchema } from './matrix/room-mapper.js';

// Moderation
export { FederationModeration, BlocklistSchema, AllowlistSchema } from './moderation.js';

// CalDAV / CardDAV
export { CalDAVServer, CalendarCollectionSchema } from './caldav/caldav-server.js';
export type { CalDAVRequest, CalDAVResponse, CalendarCollection } from './caldav/caldav-server.js';
export { CardDAVServer, AddressBookSchema } from './caldav/carddav-server.js';
export type { CardDAVRequest, CardDAVResponse, AddressBook } from './caldav/carddav-server.js';
export { VCalSerializer, CalendarEventSchema } from './caldav/vcal-serializer.js';
export type { CalendarEvent } from './caldav/vcal-serializer.js';
export { VCardSerializer, VCardSchema } from './caldav/vcard-serializer.js';
export type { VCard } from './caldav/vcard-serializer.js';

// Mail Protocols
export { IMAPAdapter, MailboxSchema, MessageSchema } from './mail-protocols/imap-adapter.js';
export type {
  Mailbox,
  Message,
  IMAPResponse,
  SearchCriteria,
  AuthenticationDelegate,
} from './mail-protocols/imap-adapter.js';
export { POP3Adapter, POP3MessageSchema } from './mail-protocols/pop3-adapter.js';
export type { POP3Message, POP3Response } from './mail-protocols/pop3-adapter.js';
export { SMTPRelay, SMTPMessageSchema, DKIMConfigSchema } from './mail-protocols/smtp-relay.js';
export type { SMTPMessage, DKIMConfig, RelayResult } from './mail-protocols/smtp-relay.js';

// Developer Platform
export {
  OAuth2Provider,
  OAuth2ClientSchema,
  TokenResponseSchema,
  IntrospectionResponseSchema,
} from './developer-platform/oauth2-provider.js';
export type {
  OAuth2Client,
  TokenResponse,
  IntrospectionResponse,
  AuthorizeRequest,
  TokenRequest,
  OAuth2Error,
} from './developer-platform/oauth2-provider.js';
export { APIKeyManager, APIKeySchema } from './developer-platform/api-key-manager.js';
export type {
  APIKey,
  CreateKeyOptions,
  ValidateResult,
} from './developer-platform/api-key-manager.js';
export {
  WebhookManager,
  WebhookEndpointSchema,
  WebhookDeliverySchema,
} from './developer-platform/webhook-manager.js';
export type {
  WebhookEndpoint,
  WebhookDelivery,
  RegisterOptions,
  DeliverOptions,
} from './developer-platform/webhook-manager.js';
export {
  RateLimitConfig,
  RateLimitRuleSchema,
  RateLimitConfigSchema,
} from './developer-platform/rate-limit-config.js';
export type {
  RateLimitRule,
  RateLimitConfigType,
  RateLimitResult,
} from './developer-platform/rate-limit-config.js';
export {
  AppRegistrationSchema,
  APIEndpointSchema,
  APIDocSchema,
  DeveloperProfileSchema,
} from './developer-platform/developer-portal-types.js';
export type {
  AppRegistration,
  APIEndpoint,
  APIDoc,
  DeveloperProfile,
} from './developer-platform/developer-portal-types.js';
