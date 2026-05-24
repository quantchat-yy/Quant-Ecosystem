// ============================================================================
// QuantMail - Admin Routes
// User management, organization settings, audit logs
// ============================================================================

import { Router } from '@quant/server';
import { AdminController } from '../controllers/admin-controller';

export function registerAdminRoutes(router: Router): void {
  // User management
  router.register('GET', '/api/admin/users', AdminController.listUsers);
  router.register('GET', '/api/admin/users/:id', AdminController.getUser);
  router.register('POST', '/api/admin/users', AdminController.createUser);
  router.register('POST', '/api/admin/users/invite', AdminController.inviteUser);
  router.register('PUT', '/api/admin/users/:id/role', AdminController.updateRole);
  router.register('POST', '/api/admin/users/:id/suspend', AdminController.suspendUser);
  router.register('POST', '/api/admin/users/:id/activate', AdminController.activateUser);
  router.register('DELETE', '/api/admin/users/:id', AdminController.deleteUser);

  // Organization settings
  router.register('GET', '/api/admin/settings', AdminController.getSettings);
  router.register('PUT', '/api/admin/settings', AdminController.updateSettings);

  // Audit logs
  router.register('GET', '/api/admin/audit-logs', AdminController.getAuditLogs);
}

export default registerAdminRoutes;
