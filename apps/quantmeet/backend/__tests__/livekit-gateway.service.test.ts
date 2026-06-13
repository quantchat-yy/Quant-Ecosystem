import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveKitGateway } from '../services/livekit-gateway.service';
import type { LiveKitConfig } from '../services/livekit-gateway.service';

vi.mock('livekit-server-sdk', () => {
  const mockCreateRoom = vi.fn().mockResolvedValue({
    name: 'test-room',
    sid: 'RM_test123',
    numParticipants: 0,
    maxParticipants: 50,
    creationTime: BigInt(1700000000),
  });

  const mockDeleteRoom = vi.fn().mockResolvedValue(undefined);

  const mockListParticipants = vi.fn().mockResolvedValue([
    {
      sid: 'PA_abc',
      identity: 'user-1',
      name: 'Alice',
      joinedAt: BigInt(1700000100),
    },
  ]);

  const mockStartRoomCompositeEgress = vi.fn().mockResolvedValue({
    egressId: 'EG_test456',
    roomName: 'test-room',
    status: 0,
  });

  const mockStopEgress = vi.fn().mockResolvedValue({
    egressId: 'EG_test456',
    roomName: 'test-room',
    status: 5,
  });

  const RoomServiceClient = vi.fn().mockImplementation(function () {
    return {
      createRoom: mockCreateRoom,
      deleteRoom: mockDeleteRoom,
      listParticipants: mockListParticipants,
    };
  });

  const EgressClient = vi.fn().mockImplementation(function () {
    return {
      startRoomCompositeEgress: mockStartRoomCompositeEgress,
      stopEgress: mockStopEgress,
    };
  });

  const mockToJwt = vi
    .fn()
    .mockResolvedValue(
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJkZXZrZXkiLCJzdWIiOiJ1c2VyLTEiLCJuYW1lIjoiQWxpY2UiLCJ2aWRlbyI6eyJyb29tIjoicm9vbS0xIiwicm9vbUpvaW4iOnRydWUsImNhblB1Ymxpc2giOnRydWUsImNhblN1YnNjcmliZSI6dHJ1ZX19.sig',
    );
  const mockAddGrant = vi.fn();

  const AccessToken = vi.fn().mockImplementation(function () {
    return {
      addGrant: mockAddGrant,
      toJwt: mockToJwt,
    };
  });

  const WebhookReceiver = vi.fn().mockImplementation(function () {
    return {
      receive: vi.fn(),
    };
  });

  // Mock protobuf classes used in egress
  class S3Upload {
    constructor(public data?: Record<string, unknown>) {}
  }

  class EncodedFileOutput {
    constructor(public data?: Record<string, unknown>) {}
  }

  const EncodedFileType = { MP4: 1, OGG: 2 };

  return {
    RoomServiceClient,
    EgressClient,
    AccessToken,
    WebhookReceiver,
    S3Upload,
    EncodedFileOutput,
    EncodedFileType,
  };
});

describe('LiveKitGateway', () => {
  let gateway: LiveKitGateway;
  const config: LiveKitConfig = {
    apiKey: 'devkey',
    apiSecret: 'devsecret',
    wsUrl: 'ws://localhost:7880',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new LiveKitGateway(config);
  });

  describe('createRoom', () => {
    it('creates a room with name and max participants', async () => {
      const room = await gateway.createRoom('test-room', 50);

      expect(room.name).toBe('test-room');
      expect(room.sid).toBe('RM_test123');
      expect(room.numParticipants).toBe(0);
      expect(room.maxParticipants).toBe(50);
      expect(room.creationTime).toBe(1700000000);
    });

    it('uses default maxParticipants of 50', async () => {
      const room = await gateway.createRoom('my-room');

      expect(room.name).toBe('test-room');
      expect(room.maxParticipants).toBe(50);
    });

    it('calls RoomServiceClient.createRoom with correct params', async () => {
      await gateway.createRoom('my-room', 100);

      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      expect(mockInstance.createRoom).toHaveBeenCalledWith({
        name: 'my-room',
        maxParticipants: 100,
        emptyTimeout: 300,
      });
    });

    it('throws LIVEKIT_CREATE_ROOM_FAILED on SDK error', async () => {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      mockInstance.createRoom.mockRejectedValueOnce(new Error('connection refused'));

      await expect(gateway.createRoom('fail-room')).rejects.toThrow(
        'Failed to create LiveKit room',
      );
    });
  });

  describe('deleteRoom', () => {
    it('deletes a room by name', async () => {
      await expect(gateway.deleteRoom('test-room')).resolves.toBeUndefined();
    });

    it('calls RoomServiceClient.deleteRoom with room name', async () => {
      await gateway.deleteRoom('room-to-delete');

      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      expect(mockInstance.deleteRoom).toHaveBeenCalledWith('room-to-delete');
    });

    it('throws LIVEKIT_DELETE_ROOM_FAILED on SDK error', async () => {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      mockInstance.deleteRoom.mockRejectedValueOnce(new Error('not found'));

      await expect(gateway.deleteRoom('nonexistent')).rejects.toThrow(
        'Failed to delete LiveKit room',
      );
    });
  });

  describe('generateToken', () => {
    it('returns a JWT string', async () => {
      const token = await gateway.generateToken('room-1', 'user-1', 'Alice');

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('creates AccessToken with correct identity and name', async () => {
      await gateway.generateToken('room-1', 'user-1', 'Alice', {
        canPublish: true,
        canSubscribe: true,
        isAdmin: false,
      });

      const { AccessToken } = await import('livekit-server-sdk');
      expect(AccessToken).toHaveBeenCalledWith('devkey', 'devsecret', {
        identity: 'user-1',
        name: 'Alice',
        ttl: '6h',
      });
    });

    it('adds video grant with room permissions', async () => {
      await gateway.generateToken('room-1', 'user-1', 'Alice', {
        canPublish: true,
        canSubscribe: true,
        isAdmin: true,
      });

      const { AccessToken } = await import('livekit-server-sdk');
      const mockInstance = (AccessToken as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockInstance.addGrant).toHaveBeenCalledWith({
        room: 'room-1',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        roomAdmin: true,
      });
    });

    it('defaults to canPublish=true, canSubscribe=true, isAdmin=false', async () => {
      await gateway.generateToken('room-1', 'user-1', 'Alice');

      const { AccessToken } = await import('livekit-server-sdk');
      const mockInstance = (AccessToken as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockInstance.addGrant).toHaveBeenCalledWith({
        room: 'room-1',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        roomAdmin: false,
      });
    });
  });

  describe('startRecordingEgress', () => {
    const s3Config = {
      bucket: 'recordings',
      region: 'us-east-1',
      accessKey: 'minioadmin',
      secret: 'minioadmin',
      endpoint: 'http://localhost:9000',
    };

    it('starts room composite egress and returns egress info', async () => {
      const egress = await gateway.startRecordingEgress('test-room', s3Config);

      expect(egress.egressId).toBe('EG_test456');
      expect(egress.roomName).toBe('test-room');
      expect(egress.status).toBeDefined();
    });

    it('calls EgressClient.startRoomCompositeEgress', async () => {
      await gateway.startRecordingEgress('test-room', s3Config);

      const { EgressClient } = await import('livekit-server-sdk');
      const mockInstance = (EgressClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockInstance.startRoomCompositeEgress).toHaveBeenCalledWith(
        'test-room',
        expect.objectContaining({ file: expect.any(Object) }),
      );
    });

    it('throws LIVEKIT_EGRESS_START_FAILED on SDK error', async () => {
      const { EgressClient } = await import('livekit-server-sdk');
      const mockInstance = (EgressClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      mockInstance.startRoomCompositeEgress.mockRejectedValueOnce(new Error('egress error'));

      await expect(gateway.startRecordingEgress('fail-room', s3Config)).rejects.toThrow(
        'Failed to start recording egress',
      );
    });
  });

  describe('stopEgress', () => {
    it('stops egress and returns updated info', async () => {
      const egress = await gateway.stopEgress('EG_test456');

      expect(egress.egressId).toBe('EG_test456');
      expect(egress.roomName).toBe('test-room');
    });

    it('calls EgressClient.stopEgress with egressId', async () => {
      await gateway.stopEgress('EG_abc');

      const { EgressClient } = await import('livekit-server-sdk');
      const mockInstance = (EgressClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockInstance.stopEgress).toHaveBeenCalledWith('EG_abc');
    });

    it('throws LIVEKIT_EGRESS_STOP_FAILED on SDK error', async () => {
      const { EgressClient } = await import('livekit-server-sdk');
      const mockInstance = (EgressClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      mockInstance.stopEgress.mockRejectedValueOnce(new Error('not found'));

      await expect(gateway.stopEgress('EG_invalid')).rejects.toThrow('Failed to stop egress');
    });
  });

  describe('listParticipants', () => {
    it('returns participants for a room', async () => {
      const participants = await gateway.listParticipants('test-room');

      expect(participants).toHaveLength(1);
      expect(participants[0]!.sid).toBe('PA_abc');
      expect(participants[0]!.identity).toBe('user-1');
      expect(participants[0]!.name).toBe('Alice');
      expect(participants[0]!.joinedAt).toBe(1700000100);
    });

    it('calls RoomServiceClient.listParticipants with room name', async () => {
      await gateway.listParticipants('my-room');

      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      expect(mockInstance.listParticipants).toHaveBeenCalledWith('my-room');
    });

    it('throws LIVEKIT_LIST_PARTICIPANTS_FAILED on SDK error', async () => {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const mockInstance = (RoomServiceClient as unknown as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;
      mockInstance.listParticipants.mockRejectedValueOnce(new Error('timeout'));

      await expect(gateway.listParticipants('bad-room')).rejects.toThrow(
        'Failed to list participants',
      );
    });
  });
});
