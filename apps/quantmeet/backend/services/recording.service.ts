import { randomUUID } from 'node:crypto';
import { createAppError } from '@quant/server-core';
import type { StorageClient } from '@quant/storage';
import type { LiveKitGateway, S3EgressConfig } from './livekit-gateway.service';

export interface Recording {
  id: string;
  roomId: string;
  userId: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  stoppedAt: Date | null;
  storageKey: string;
  duration: number | null;
  fileSize: number | null;
  egressId: string | null;
}

export class RecordingService {
  private readonly recordings = new Map<string, Recording>();
  private readonly activeByRoom = new Map<string, Set<string>>();

  constructor(
    private readonly storage: StorageClient,
    private readonly livekitGateway?: LiveKitGateway,
    private readonly s3Config?: S3EgressConfig,
  ) {}

  async startRecording(roomId: string, userId: string): Promise<Recording> {
    const active = this.activeByRoom.get(roomId);
    if (active && active.size > 0) {
      throw createAppError('Room already has an active recording', 409, 'RECORDING_ALREADY_ACTIVE');
    }

    const id = randomUUID();
    const storageKey = `recordings/${roomId}/${id}.webm`;
    let egressId: string | null = null;

    if (this.livekitGateway && this.s3Config) {
      try {
        const egress = await this.livekitGateway.startRecordingEgress(roomId, this.s3Config);
        egressId = egress.egressId;
      } catch {
        throw createAppError(
          'Failed to start egress for recording',
          502,
          'RECORDING_EGRESS_FAILED',
        );
      }
    }

    const recording: Recording = {
      id,
      roomId,
      userId,
      status: 'recording',
      startedAt: new Date(),
      stoppedAt: null,
      storageKey,
      duration: null,
      fileSize: null,
      egressId,
    };

    this.recordings.set(id, recording);
    if (!this.activeByRoom.has(roomId)) {
      this.activeByRoom.set(roomId, new Set());
    }
    this.activeByRoom.get(roomId)!.add(id);
    return recording;
  }

  async stopRecording(recordingId: string): Promise<Recording> {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw createAppError('Recording not found', 404, 'RECORDING_NOT_FOUND');
    }

    if (recording.status !== 'recording') {
      throw createAppError('Recording is not active', 400, 'RECORDING_NOT_ACTIVE');
    }

    recording.status = 'processing';

    if (this.livekitGateway && recording.egressId) {
      try {
        await this.livekitGateway.stopEgress(recording.egressId);
      } catch {
        recording.status = 'failed';
        this.removeFromActive(recording.roomId, recordingId);
        throw createAppError('Failed to stop egress', 502, 'RECORDING_EGRESS_STOP_FAILED');
      }
    }

    recording.status = 'completed';
    recording.stoppedAt = new Date();
    recording.duration = Math.floor(
      (recording.stoppedAt.getTime() - recording.startedAt.getTime()) / 1000,
    );

    this.removeFromActive(recording.roomId, recordingId);
    return recording;
  }

  getRecording(recordingId: string): Recording {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw createAppError('Recording not found', 404, 'RECORDING_NOT_FOUND');
    }
    return recording;
  }

  getRecordingUrl(recordingId: string): string {
    const recording = this.getRecording(recordingId);
    if (recording.status !== 'completed') {
      throw createAppError('Recording not yet available', 400, 'RECORDING_NOT_READY');
    }
    return recording.storageKey;
  }

  listRecordings(roomId: string): Recording[] {
    const results: Recording[] = [];
    for (const recording of this.recordings.values()) {
      if (recording.roomId === roomId) {
        results.push(recording);
      }
    }
    return results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  getStorage(): StorageClient {
    return this.storage;
  }

  private removeFromActive(roomId: string, recordingId: string): void {
    const active = this.activeByRoom.get(roomId);
    if (active) {
      active.delete(recordingId);
      if (active.size === 0) {
        this.activeByRoom.delete(roomId);
      }
    }
  }
}
