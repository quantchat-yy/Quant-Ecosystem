// ============================================================================
// QuantChat API - Groups Routes
// Create/manage groups, group settings, roles, invites
// ============================================================================

import { groupsController } from '../controllers/groups-controller';
import type { RouteDefinition } from './auth';

export const groupRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/groups',
    handler: (req, res) => groupsController.createGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/groups',
    handler: (req, res) => groupsController.getUserGroups(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/groups/:groupId',
    handler: (req, res) => groupsController.getGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/groups/:groupId',
    handler: (req, res) => groupsController.updateGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/groups/:groupId',
    handler: (req, res) => groupsController.deleteGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/groups/:groupId/settings',
    handler: (req, res) => groupsController.updateSettings(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/groups/:groupId/members',
    handler: (req, res) => groupsController.addMember(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/groups/:groupId/members/:memberId',
    handler: (req, res) => groupsController.removeMember(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/groups/:groupId/members/:memberId/role',
    handler: (req, res) => groupsController.setRole(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/groups/:groupId/leave',
    handler: (req, res) => groupsController.leaveGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/groups/:groupId/invite',
    handler: (req, res) => groupsController.createInvite(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/groups/join',
    handler: (req, res) => groupsController.joinViaInvite(req, res),
    requiresAuth: true,
  },
];
