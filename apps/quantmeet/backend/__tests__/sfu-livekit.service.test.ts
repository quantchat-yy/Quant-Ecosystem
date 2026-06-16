import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SFUService } from '../services/sfu.service';
import type { DtlsParameters, RtpParameters, RtpCapabilities } from '../services/sfu.service';

// Mock the LiveKitGateway module
const mockCreateRoom = vi.fn().mockResolvedValue({
  name: 'test-room',
  sid: 'room-sid-123',
  numParticipants: 0,
  maxParticipants: 50,
  creationTime: Date.now(),
});
const mockDeleteRoom = vi.fn().mockResolvedValue(undefined);
const mockGenerateToken = vi.fn().mockResolvedValue('livekit-token-xyz');
const mockListParticipants = vi.fn().mockResolvedValue([]);

vi.mock('../services/livekit-gateway.service.js', () => {
  return {
    LiveKitGateway: vi.fn(function (this: Record<string, unknown>) {
      this.createRoom = mockCreateRoom;
      this.deleteRoom = mockDeleteRoom;
      this.generateToken = mockGenerateToken;
      this.listParticipants = mockListParticipants;
    }),
  };
});

describe('SFUService with LiveKit', () => {
  let originalEnv: NodeJS.ProcessEnv;

  const mockDtlsParameters: DtlsParameters = {
    fingerprints: [{ algorithm: 'sha-256', value: 'AA:BB:CC:DD' }],
    role: 'client',
  };

  const mockRtpParameters: RtpParameters = {
    codecs: [
      {
        mimeType: 'audio/opus',
        payloadType: 111,
        clockRate: 48000,
        channels: 2,
      },
    ],
    headerExtensions: [{ uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level', id: 1 }],
    encodings: [{ ssrc: 12345 }],
  };

  const mockRtpCapabilities: RtpCapabilities = {
    codecs: [
      {
        mimeType: 'audio/opus',
        kind: 'audio',
        clockRate: 48000,
        channels: 2,
      },
    ],
    headerExtensions: [
      {
        uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
        kind: 'audio',
        preferredId: 1,
      },
    ],
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env['LIVEKIT_API_KEY'] = 'test-api-key';
    process.env['LIVEKIT_API_SECRET'] = 'test-api-secret';
    process.env['LIVEKIT_WS_URL'] = 'wss://livekit.example.com';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('detects LiveKit configuration from environment', () => {
    const service = new SFUService();
    expect(service.isLiveKitEnabled()).toBe(true);
  });

  it('creates transport and triggers LiveKit room creation', async () => {
    const service = new SFUService();
    const transport = await service.createTransport('meeting-room-1', 'participant-1', 'send');

    expect(transport.id).toBeDefined();
    expect(transport.iceParameters).toBeDefined();
    expect(transport.iceCandidates).toHaveLength(1);

    expect(service.getLiveKitGateway()).not.toBeNull();
    expect(mockCreateRoom).toHaveBeenCalledWith('meeting-room-1');
  });

  it('generates LiveKit token on connectTransport', async () => {
    const service = new SFUService();
    const transport = await service.createTransport('meeting-room-2', 'participant-2', 'send');

    await service.connectTransport(transport.id, mockDtlsParameters);

    expect(mockGenerateToken).toHaveBeenCalledWith(
      'meeting-room-2',
      'participant-2',
      'participant-2',
      { canPublish: true, canSubscribe: false },
    );
  });

  it('generates token with subscribe permissions for recv transport', async () => {
    const service = new SFUService();
    const transport = await service.createTransport('meeting-room-3', 'participant-3', 'recv');

    await service.connectTransport(transport.id, mockDtlsParameters);

    expect(mockGenerateToken).toHaveBeenCalledWith(
      'meeting-room-3',
      'participant-3',
      'participant-3',
      { canPublish: false, canSubscribe: true },
    );
  });

  it('deletes LiveKit room when closing all room transports', async () => {
    const service = new SFUService();
    await service.createTransport('meeting-room-4', 'participant-4', 'send');

    service.closeRoomTransports('meeting-room-4');

    expect(mockDeleteRoom).toHaveBeenCalledWith('meeting-room-4');
  });

  it('does not create duplicate LiveKit rooms for same meeting', async () => {
    const service = new SFUService();
    await service.createTransport('meeting-room-5', 'participant-a', 'send');
    await service.createTransport('meeting-room-5', 'participant-b', 'recv');

    // Should only be called once for the same room
    expect(mockCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('full produce/consume flow works with LiveKit enabled', async () => {
    const service = new SFUService();

    const sendTransport = await service.createTransport('room-flow', 'sender', 'send');
    await service.connectTransport(sendTransport.id, mockDtlsParameters);
    const producer = service.produce(sendTransport.id, 'audio', mockRtpParameters);

    const recvTransport = await service.createTransport('room-flow', 'receiver', 'recv');
    await service.connectTransport(recvTransport.id, mockDtlsParameters);
    const consumer = service.consume(recvTransport.id, producer.id, mockRtpCapabilities);

    expect(consumer.producerId).toBe(producer.id);
    expect(consumer.kind).toBe('audio');
  });

  it('exposes LiveKit gateway via getLiveKitGateway', () => {
    const service = new SFUService();
    const gateway = service.getLiveKitGateway();
    expect(gateway).not.toBeNull();
  });

  it('makes LiveKit token available via getParticipantToken after connectTransport', async () => {
    const service = new SFUService();
    const transport = await service.createTransport('meeting-room-token', 'participant-t', 'send');

    await service.connectTransport(transport.id, mockDtlsParameters);

    const token = service.getParticipantToken(transport.id);
    expect(token).toBe('livekit-token-xyz');
  });

  it('propagates room creation errors', async () => {
    mockCreateRoom.mockRejectedValueOnce(new Error('LiveKit unavailable'));

    const service = new SFUService();
    await expect(
      service.createTransport('failing-room', 'participant-fail', 'send'),
    ).rejects.toThrow('Failed to create LiveKit room');
  });

  it('propagates token generation errors', async () => {
    mockGenerateToken.mockRejectedValueOnce(new Error('Auth failed'));

    const service = new SFUService();
    const transport = await service.createTransport('token-fail-room', 'participant-tf', 'send');

    await expect(service.connectTransport(transport.id, mockDtlsParameters)).rejects.toThrow(
      'Failed to generate LiveKit token',
    );
  });
});

describe('SFUService without LiveKit (simulation mode)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env['LIVEKIT_API_KEY'];
    delete process.env['LIVEKIT_API_SECRET'];
    delete process.env['LIVEKIT_WS_URL'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('runs in simulation mode without LiveKit env vars', () => {
    const service = new SFUService();
    expect(service.isLiveKitEnabled()).toBe(false);
    expect(service.getLiveKitGateway()).toBeNull();
  });

  it('accepts explicit null for livekit parameter', () => {
    const service = new SFUService(null);
    expect(service.isLiveKitEnabled()).toBe(false);
  });

  it('works normally in simulation mode', async () => {
    const service = new SFUService(null);
    const transport = await service.createTransport('sim-room', 'sim-participant', 'send');

    expect(transport.id).toBeDefined();
    expect(transport.iceParameters).toBeDefined();
    expect(transport.iceCandidates).toHaveLength(1);
    expect(transport.iceCandidates[0]!.ip).toBe('127.0.0.1');
  });
});
