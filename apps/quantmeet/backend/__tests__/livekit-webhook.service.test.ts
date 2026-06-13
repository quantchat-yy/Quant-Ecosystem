import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveKitWebhookService } from '../services/livekit-webhook.service';

vi.mock('livekit-server-sdk', () => {
  const mockReceive = vi.fn();

  const WebhookReceiver = vi.fn().mockImplementation(function () {
    return {
      receive: mockReceive,
    };
  });

  return {
    WebhookReceiver,
    RoomServiceClient: vi.fn(),
    EgressClient: vi.fn(),
    AccessToken: vi.fn(),
  };
});

describe('LiveKitWebhookService', () => {
  let service: LiveKitWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveKitWebhookService('devkey', 'devsecret');
  });

  async function getMockReceive() {
    const { WebhookReceiver } = await import('livekit-server-sdk');
    const instance = (WebhookReceiver as unknown as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value;
    return instance.receive as ReturnType<typeof vi.fn>;
  }

  describe('handleWebhook', () => {
    it('throws WEBHOOK_AUTH_MISSING if no authorization header', async () => {
      await expect(service.handleWebhook('{}', undefined)).rejects.toThrow(
        'Missing authorization header',
      );
    });

    it('throws WEBHOOK_SIGNATURE_INVALID on verification failure', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockRejectedValueOnce(new Error('invalid signature'));

      await expect(service.handleWebhook('{}', 'bad-token')).rejects.toThrow(
        'Webhook signature validation failed',
      );
    });

    it('processes participant_joined event', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'participant_joined',
        room: { sid: 'RM_123', name: 'room-1', numParticipants: 2 },
        participant: { sid: 'PA_abc', identity: 'user-1', name: 'Alice' },
        createdAt: BigInt(1700000000),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).not.toBeNull();
      expect(event!.type).toBe('participant_joined');
      expect(event!.roomName).toBe('room-1');
      expect(event!.payload['participant']).toEqual({
        sid: 'PA_abc',
        identity: 'user-1',
        name: 'Alice',
      });
    });

    it('processes participant_left event', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'participant_left',
        room: { sid: 'RM_123', name: 'room-1', numParticipants: 1 },
        participant: { sid: 'PA_abc', identity: 'user-1', name: 'Alice' },
        createdAt: BigInt(1700000100),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).not.toBeNull();
      expect(event!.type).toBe('participant_left');
    });

    it('processes room_started event', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'room_started',
        room: { sid: 'RM_456', name: 'new-room', numParticipants: 0 },
        createdAt: BigInt(1700000200),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).not.toBeNull();
      expect(event!.type).toBe('room_started');
      expect(event!.roomName).toBe('new-room');
    });

    it('processes room_finished event', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'room_finished',
        room: { sid: 'RM_456', name: 'ended-room', numParticipants: 0 },
        createdAt: BigInt(1700000300),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).not.toBeNull();
      expect(event!.type).toBe('room_finished');
    });

    it('processes egress_ended event', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'egress_ended',
        room: { sid: 'RM_789', name: 'recorded-room', numParticipants: 3 },
        egressInfo: { egressId: 'EG_abc', roomName: 'recorded-room', status: 5 },
        createdAt: BigInt(1700000400),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).not.toBeNull();
      expect(event!.type).toBe('egress_ended');
      expect(event!.payload['egress']).toEqual({
        egressId: 'EG_abc',
        roomName: 'recorded-room',
        status: 5,
      });
    });

    it('returns null for unsupported event types', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'track_published',
        room: { sid: 'RM_123', name: 'room-1', numParticipants: 1 },
        createdAt: BigInt(1700000000),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).toBeNull();
    });

    it('returns null when event field is missing', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        room: { sid: 'RM_123', name: 'room-1', numParticipants: 1 },
        createdAt: BigInt(1700000000),
      });

      const event = await service.handleWebhook('{}', 'valid-token');

      expect(event).toBeNull();
    });

    it('emits domain events via EventEmitter', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'room_started',
        room: { sid: 'RM_789', name: 'event-room', numParticipants: 0 },
        createdAt: BigInt(1700000500),
      });

      const eventHandler = vi.fn();
      service.on('event', eventHandler);

      await service.handleWebhook('{}', 'valid-token');

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'room_started',
          roomName: 'event-room',
        }),
      );
    });

    it('emits typed events (e.g., participant_joined)', async () => {
      const mockReceive = await getMockReceive();
      mockReceive.mockResolvedValueOnce({
        event: 'participant_joined',
        room: { sid: 'RM_123', name: 'room-1', numParticipants: 1 },
        participant: { sid: 'PA_def', identity: 'user-2', name: 'Bob' },
        createdAt: BigInt(1700000600),
      });

      const joinHandler = vi.fn();
      service.on('participant_joined', joinHandler);

      await service.handleWebhook('{}', 'valid-token');

      expect(joinHandler).toHaveBeenCalledTimes(1);
      expect(joinHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'participant_joined',
        }),
      );
    });
  });
});
