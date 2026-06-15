import { randomUUID } from 'node:crypto';
import { createAppError } from '@quant/server-core';

export interface DtlsParameters {
  fingerprints: Array<{ algorithm: string; value: string }>;
  role: 'auto' | 'client' | 'server';
}

export interface RtpParameters {
  codecs: Array<{
    mimeType: string;
    payloadType: number;
    clockRate: number;
    channels?: number;
    parameters?: Record<string, unknown>;
  }>;
  headerExtensions: Array<{
    uri: string;
    id: number;
    encrypt?: boolean;
  }>;
  encodings: Array<{
    ssrc?: number;
    rid?: string;
    scalabilityMode?: string;
    maxBitrate?: number;
  }>;
}

export interface RtpCapabilities {
  codecs: Array<{
    mimeType: string;
    kind: 'audio' | 'video';
    clockRate: number;
    channels?: number;
    preferredPayloadType?: number;
  }>;
  headerExtensions: Array<{
    uri: string;
    kind: 'audio' | 'video';
    preferredId: number;
  }>;
}

export interface TransportInfo {
  id: string;
  iceParameters: {
    usernameFragment: string;
    password: string;
  };
  iceCandidates: Array<{
    foundation: string;
    priority: number;
    ip: string;
    port: number;
    type: 'host' | 'srflx' | 'relay';
    protocol: 'udp' | 'tcp';
  }>;
  dtlsParameters: DtlsParameters;
}

export interface ProducerInfo {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

export interface ConsumerInfo {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

interface TransportRecord {
  id: string;
  roomId: string;
  participantId: string;
  direction: 'send' | 'recv';
  connected: boolean;
  dtlsParameters: DtlsParameters | null;
}

interface ProducerRecord {
  id: string;
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

interface ConsumerRecord {
  id: string;
  transportId: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

export class SFUService {
  private readonly transports = new Map<string, TransportRecord>();
  private readonly producers = new Map<string, ProducerRecord>();
  private readonly consumers = new Map<string, ConsumerRecord>();
  private readonly transportsByRoom = new Map<string, Set<string>>();
  private readonly transportsByParticipant = new Map<string, Set<string>>();

  createTransport(
    roomId: string,
    participantId: string,
    direction: 'send' | 'recv',
  ): TransportInfo {
    const id = randomUUID();

    const transport: TransportRecord = {
      id,
      roomId,
      participantId,
      direction,
      connected: false,
      dtlsParameters: null,
    };

    this.transports.set(id, transport);

    if (!this.transportsByRoom.has(roomId)) {
      this.transportsByRoom.set(roomId, new Set());
    }
    this.transportsByRoom.get(roomId)!.add(id);

    if (!this.transportsByParticipant.has(participantId)) {
      this.transportsByParticipant.set(participantId, new Set());
    }
    this.transportsByParticipant.get(participantId)!.add(id);

    return {
      id,
      iceParameters: {
        usernameFragment: randomUUID().replace(/-/g, '').slice(0, 16),
        password: randomUUID().replace(/-/g, ''),
      },
      iceCandidates: [
        {
          foundation: 'udpcandidate',
          priority: 1078862079,
          ip: '127.0.0.1',
          port: 40000 + Math.floor(Math.random() * 10000),
          type: 'host',
          protocol: 'udp',
        },
      ],
      dtlsParameters: {
        fingerprints: [
          {
            algorithm: 'sha-256',
            value: Array.from({ length: 32 }, () =>
              Math.floor(Math.random() * 256)
                .toString(16)
                .padStart(2, '0'),
            ).join(':'),
          },
        ],
        role: 'auto',
      },
    };
  }

  connectTransport(transportId: string, dtlsParameters: DtlsParameters): void {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw createAppError('Transport not found', 404, 'TRANSPORT_NOT_FOUND');
    }

    if (transport.connected) {
      throw createAppError('Transport already connected', 400, 'TRANSPORT_ALREADY_CONNECTED');
    }

    if (!dtlsParameters.fingerprints.length) {
      throw createAppError('Invalid DTLS parameters', 400, 'INVALID_DTLS_PARAMETERS');
    }

    transport.dtlsParameters = dtlsParameters;
    transport.connected = true;
  }

  produce(
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
  ): ProducerInfo {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw createAppError('Transport not found', 404, 'TRANSPORT_NOT_FOUND');
    }

    if (!transport.connected) {
      throw createAppError('Transport not connected', 400, 'TRANSPORT_NOT_CONNECTED');
    }

    if (transport.direction !== 'send') {
      throw createAppError('Cannot produce on recv transport', 400, 'INVALID_TRANSPORT_DIRECTION');
    }

    if (!rtpParameters.codecs.length) {
      throw createAppError(
        'RTP parameters must include at least one codec',
        400,
        'INVALID_RTP_PARAMETERS',
      );
    }

    const id = randomUUID();
    const producer: ProducerRecord = {
      id,
      transportId,
      kind,
      rtpParameters,
    };

    this.producers.set(id, producer);

    return { id, kind, rtpParameters };
  }

  consume(
    transportId: string,
    producerId: string,
    _rtpCapabilities: RtpCapabilities,
  ): ConsumerInfo {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw createAppError('Transport not found', 404, 'TRANSPORT_NOT_FOUND');
    }

    if (!transport.connected) {
      throw createAppError('Transport not connected', 400, 'TRANSPORT_NOT_CONNECTED');
    }

    if (transport.direction !== 'recv') {
      throw createAppError('Cannot consume on send transport', 400, 'INVALID_TRANSPORT_DIRECTION');
    }

    const producer = this.producers.get(producerId);
    if (!producer) {
      throw createAppError('Producer not found', 404, 'PRODUCER_NOT_FOUND');
    }

    const producerTransport = this.transports.get(producer.transportId);
    if (producerTransport && producerTransport.roomId !== transport.roomId) {
      throw createAppError(
        'Cannot consume producer from different room',
        400,
        'CROSS_ROOM_CONSUME',
      );
    }

    const id = randomUUID();
    const consumer: ConsumerRecord = {
      id,
      transportId,
      producerId,
      kind: producer.kind,
      rtpParameters: producer.rtpParameters,
    };

    this.consumers.set(id, consumer);

    return {
      id,
      producerId,
      kind: producer.kind,
      rtpParameters: producer.rtpParameters,
    };
  }

  closeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (!producer) {
      throw createAppError('Producer not found', 404, 'PRODUCER_NOT_FOUND');
    }

    for (const [consumerId, consumer] of this.consumers) {
      if (consumer.producerId === producerId) {
        this.consumers.delete(consumerId);
      }
    }

    this.producers.delete(producerId);
  }

  closeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw createAppError('Consumer not found', 404, 'CONSUMER_NOT_FOUND');
    }

    this.consumers.delete(consumerId);
  }

  closeTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw createAppError('Transport not found', 404, 'TRANSPORT_NOT_FOUND');
    }

    for (const [producerId, producer] of this.producers) {
      if (producer.transportId === transportId) {
        for (const [consumerId, consumer] of this.consumers) {
          if (consumer.producerId === producerId) {
            this.consumers.delete(consumerId);
          }
        }
        this.producers.delete(producerId);
      }
    }

    for (const [consumerId, consumer] of this.consumers) {
      if (consumer.transportId === transportId) {
        this.consumers.delete(consumerId);
      }
    }

    this.transports.delete(transportId);

    const roomTransports = this.transportsByRoom.get(transport.roomId);
    if (roomTransports) {
      roomTransports.delete(transportId);
      if (roomTransports.size === 0) {
        this.transportsByRoom.delete(transport.roomId);
      }
    }

    const participantTransports = this.transportsByParticipant.get(transport.participantId);
    if (participantTransports) {
      participantTransports.delete(transportId);
      if (participantTransports.size === 0) {
        this.transportsByParticipant.delete(transport.participantId);
      }
    }
  }

  closeRoomTransports(roomId: string): void {
    const transportIds = this.transportsByRoom.get(roomId);
    if (!transportIds) return;

    for (const transportId of [...transportIds]) {
      this.closeTransport(transportId);
    }
  }
}
