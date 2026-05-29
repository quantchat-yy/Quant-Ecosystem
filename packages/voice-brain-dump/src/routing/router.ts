import type { CategorizedItem, ContentCategory, RouteTarget, RoutingRule } from '../types.js';
import { createRouteTarget } from './targets.js';

export class ContentRouter {
  private rules: RoutingRule[] = [];

  configure(rules: RoutingRule[]): void {
    this.rules = [...rules];
  }

  route(item: CategorizedItem): RouteTarget {
    const rule = this.rules.find((r) => r.category === item.category);

    if (!rule) {
      return createRouteTarget('quantdocs', 'create-note', { content: item.content });
    }

    return createRouteTarget(rule.targetApp, rule.actionTemplate, {
      content: item.content,
      entities: item.extractedEntities,
    });
  }

  routeAll(items: CategorizedItem[]): RouteTarget[] {
    return items.map((item) => this.route(item));
  }

  getDefaultRules(): RoutingRule[] {
    return [
      { category: 'email', targetApp: 'quantmail', actionTemplate: 'draft' },
      { category: 'task', targetApp: 'quanttasks', actionTemplate: 'create' },
      { category: 'idea', targetApp: 'quantdocs', actionTemplate: 'create-idea' },
      { category: 'note', targetApp: 'quantdocs', actionTemplate: 'create-note' },
      { category: 'reminder', targetApp: 'quantcalendar', actionTemplate: 'set-reminder' },
      { category: 'question', targetApp: 'quantdocs', actionTemplate: 'create-note' },
    ];
  }

  getRulesForCategory(category: ContentCategory): RoutingRule | undefined {
    return this.rules.find((r) => r.category === category);
  }
}
