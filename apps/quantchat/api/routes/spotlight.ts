// ============================================================================
// QuantChat - Spotlight Routes
// ============================================================================
import { Router } from '@quant/server';
import { SpotlightController } from '../controllers/spotlight-controller';

export function registerSpotlightRoutes(router: Router): void {
  router.register('GET', '/api/spotlight/feed', SpotlightController.getFeed);
  router.register('GET', '/api/spotlight/trending', SpotlightController.getTrending);
  router.register('POST', '/api/spotlight/submit', SpotlightController.submitVideo);
  router.register('POST', '/api/spotlight/:id/like', SpotlightController.toggleLike);
  router.register('POST', '/api/spotlight/:id/bookmark', SpotlightController.toggleBookmark);
  router.register('POST', '/api/spotlight/:id/view', SpotlightController.recordView);
  router.register('POST', '/api/spotlight/:id/share', SpotlightController.recordShare);
  router.register('GET', '/api/spotlight/:id/comments', SpotlightController.getComments);
  router.register('POST', '/api/spotlight/:id/comments', SpotlightController.addComment);
  router.register('GET', '/api/spotlight/stats', SpotlightController.getCreatorStats);
}

export default registerSpotlightRoutes;
