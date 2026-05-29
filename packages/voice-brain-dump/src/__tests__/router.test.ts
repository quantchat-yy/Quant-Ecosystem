import { ContentRouter } from '../routing/router.js';
import type { CategorizedItem } from '../types.js';

function makeItem(category: CategorizedItem['category'], content: string): CategorizedItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    category,
    content,
    extractedEntities: { dates: [], people: [], actions: [], topics: [] },
    confidence: 0.85,
    routeTarget: null,
  };
}

describe('ContentRouter', () => {
  let router: ContentRouter;

  beforeEach(() => {
    router = new ContentRouter();
    router.configure(router.getDefaultRules());
  });

  describe('getDefaultRules', () => {
    it('returns rules for all categories', () => {
      const rules = router.getDefaultRules();
      expect(rules.length).toBeGreaterThanOrEqual(5);

      const categories = rules.map((r) => r.category);
      expect(categories).toContain('email');
      expect(categories).toContain('task');
      expect(categories).toContain('idea');
      expect(categories).toContain('reminder');
      expect(categories).toContain('note');
    });
  });

  describe('route', () => {
    it('routes email to QuantMail', () => {
      const item = makeItem('email', 'Send email to John');
      const target = router.route(item);
      expect(target.app).toBe('QuantMail');
      expect(target.action).toBe('draft');
    });

    it('routes task to QuantTasks', () => {
      const item = makeItem('task', 'Need to finish report');
      const target = router.route(item);
      expect(target.app).toBe('QuantTasks');
      expect(target.action).toBe('create');
    });

    it('routes idea to QuantDocs', () => {
      const item = makeItem('idea', 'What if we build this');
      const target = router.route(item);
      expect(target.app).toBe('QuantDocs');
      expect(target.action).toBe('create-idea');
    });

    it('routes reminder to QuantCalendar', () => {
      const item = makeItem('reminder', 'Remind me at 5pm');
      const target = router.route(item);
      expect(target.app).toBe('QuantCalendar');
      expect(target.action).toBe('set-reminder');
    });

    it('routes note to QuantDocs', () => {
      const item = makeItem('note', 'Note that the server was updated');
      const target = router.route(item);
      expect(target.app).toBe('QuantDocs');
      expect(target.action).toBe('create-note');
    });

    it('falls back to QuantDocs for unknown categories', () => {
      const unconfiguredRouter = new ContentRouter();
      unconfiguredRouter.configure([]);
      const item = makeItem('email', 'Send email');
      const target = unconfiguredRouter.route(item);
      expect(target.app).toBe('QuantDocs');
      expect(target.action).toBe('create-note');
    });
  });

  describe('routeAll', () => {
    it('routes mixed items to correct apps', () => {
      const items = [
        makeItem('email', 'Send email to boss'),
        makeItem('task', 'Need to ship feature'),
        makeItem('idea', 'What if we add dark mode'),
      ];
      const routes = router.routeAll(items);
      expect(routes).toHaveLength(3);
      expect(routes[0]!.app).toBe('QuantMail');
      expect(routes[1]!.app).toBe('QuantTasks');
      expect(routes[2]!.app).toBe('QuantDocs');
    });
  });
});
