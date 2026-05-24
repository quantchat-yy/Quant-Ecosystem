// ============================================================================
// QuantChat API - Calls Routes
// Voice/video calls, group calls, call history, screen share
// ============================================================================

import { callsController } from '../controllers/calls-controller';
import type { RouteDefinition } from './auth';

export const callRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/calls',
    handler: (req, res) => callsController.initiateCall(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/calls/history',
    handler: (req, res) => callsController.getCallHistory(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/calls/signals',
    handler: (req, res) => callsController.getSignals(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/calls/ice-servers',
    handler: (req, res) => callsController.getICEServers(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/calls/:callId',
    handler: (req, res) => callsController.getCall(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/answer',
    handler: (req, res) => callsController.answerCall(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/decline',
    handler: (req, res) => callsController.declineCall(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/end',
    handler: (req, res) => callsController.endCall(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/mute',
    handler: (req, res) => callsController.toggleMute(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/video',
    handler: (req, res) => callsController.toggleVideo(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/screen-share/start',
    handler: (req, res) => callsController.startScreenShare(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/screen-share/stop',
    handler: (req, res) => callsController.stopScreenShare(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/recording/start',
    handler: (req, res) => callsController.startRecording(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/recording/stop',
    handler: (req, res) => callsController.stopRecording(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calls/:callId/ice-candidate',
    handler: (req, res) => callsController.sendICECandidate(req, res),
    requiresAuth: true,
  },
];
