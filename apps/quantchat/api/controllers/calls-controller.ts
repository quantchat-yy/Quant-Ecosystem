// ============================================================================
// QuantChat API - Calls Controller
// Voice/video calls, group calls, screen share, call recording
// ============================================================================

import type { Request, Response } from '../middleware';
import { callService } from '../services/call-service';
import type { InitiateCallRequest } from '../../src/types';

export class CallsController {
  async initiateCall(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as InitiateCallRequest;

    if (!body.participantIds || body.participantIds.length === 0 || !body.type) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Participant IDs and call type are required', statusCode: 400 } });
      return;
    }

    try {
      const call = await callService.initiateCall(userId, body.participantIds, body.type, body.isGroupCall, body.groupId);
      res.status(201).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initiate call';
      res.status(400).json({ success: false, error: { code: 'CALL_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async answerCall(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const call = await callService.answerCall(callId, userId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to answer call';
      res.status(400).json({ success: false, error: { code: 'ANSWER_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async declineCall(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const call = await callService.declineCall(callId, userId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to decline call';
      res.status(400).json({ success: false, error: { code: 'DECLINE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async endCall(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const call = await callService.endCall(callId, userId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to end call';
      res.status(400).json({ success: false, error: { code: 'END_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getCall(req: Request, res: Response): Promise<void> {
    const callId = req.params['callId'];
    const call = await callService.getCall(callId);

    if (!call) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Call not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: call });
  }

  async getCallHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const calls = await callService.getCallHistory(userId, limit);
    res.status(200).json({ success: true, data: calls });
  }

  async toggleMute(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const participant = await callService.toggleMute(callId, userId);
      res.status(200).json({ success: true, data: participant });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to toggle mute';
      res.status(400).json({ success: false, error: { code: 'MUTE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async toggleVideo(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const participant = await callService.toggleVideo(callId, userId);
      res.status(200).json({ success: true, data: participant });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to toggle video';
      res.status(400).json({ success: false, error: { code: 'VIDEO_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async startScreenShare(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const call = await callService.startScreenShare(callId, userId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start screen share';
      res.status(400).json({ success: false, error: { code: 'SCREEN_SHARE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async stopScreenShare(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];

    try {
      const call = await callService.stopScreenShare(callId, userId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to stop screen share';
      res.status(400).json({ success: false, error: { code: 'SCREEN_SHARE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async startRecording(req: Request, res: Response): Promise<void> {
    const callId = req.params['callId'];

    try {
      const call = await callService.startRecording(callId);
      res.status(200).json({ success: true, data: call });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start recording';
      res.status(400).json({ success: false, error: { code: 'RECORDING_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async stopRecording(req: Request, res: Response): Promise<void> {
    const callId = req.params['callId'];

    try {
      const recording = await callService.stopRecording(callId);
      res.status(200).json({ success: true, data: recording });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to stop recording';
      res.status(400).json({ success: false, error: { code: 'RECORDING_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async sendICECandidate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const callId = req.params['callId'];
    const body = req.body as { to: string; candidate: unknown };

    if (!body.to || !body.candidate) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Target user and candidate are required', statusCode: 400 } });
      return;
    }

    callService.sendICECandidate(userId, body.to, callId, body.candidate);
    res.status(200).json({ success: true, data: { message: 'ICE candidate sent' } });
  }

  async getSignals(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const signals = callService.getSignals(userId);
    res.status(200).json({ success: true, data: signals });
  }

  async getICEServers(req: Request, res: Response): Promise<void> {
    const servers = callService.getICEServers();
    res.status(200).json({ success: true, data: servers });
  }
}

export const callsController = new CallsController();
