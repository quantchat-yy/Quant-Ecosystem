// ============================================================================
// QuantChat - Memories Routes
// ============================================================================
import { Router } from '@quant/server';
import { MemoriesController } from '../controllers/memories-controller';

export function registerMemoriesRoutes(router: Router): void {
  router.register('GET', '/api/memories', MemoriesController.listMemories);
  router.register('POST', '/api/memories', MemoriesController.saveMemory);
  router.register('PUT', '/api/memories/:id/star', MemoriesController.starMemory);
  router.register('POST', '/api/memories/batch/delete', MemoriesController.deleteMemories);
  router.register('POST', '/api/memories/auto-story', MemoriesController.generateAutoStory);
  router.register('POST', '/api/memories/export', MemoriesController.exportMemories);
  router.register('GET', '/api/memories/stats', MemoriesController.getStats);
  router.register('GET', '/api/memories/search/location', MemoriesController.searchByLocation);
}

export default registerMemoriesRoutes;
