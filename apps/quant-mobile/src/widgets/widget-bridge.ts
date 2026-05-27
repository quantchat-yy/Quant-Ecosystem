// Widget Bridge - iOS WidgetKit + Android Glance integration

export type WidgetPlatform = 'ios' | 'android';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  platform: WidgetPlatform;
  refreshInterval?: number;
  supportedSizes?: Array<'small' | 'medium' | 'large'>;
}

export interface WidgetEntry {
  date: number;
  data: Record<string, unknown>;
  relevance?: number;
}

export interface WidgetTimeline {
  entries: WidgetEntry[];
  policy: 'atEnd' | 'after' | 'never';
  refreshAfter?: number;
}

export interface NativeWidget {
  id: string;
  config: WidgetConfig;
  timeline: WidgetTimeline | null;
  lastUpdated: number | null;
}

export class WidgetBridge {
  private widgets: Map<string, NativeWidget> = new Map();
  private refreshIntervals: Map<string, number> = new Map();

  registerWidget(config: WidgetConfig): NativeWidget {
    if (!config.id) {
      throw new Error('Widget ID is required');
    }
    const widget: NativeWidget = {
      id: config.id,
      config,
      timeline: null,
      lastUpdated: null,
    };
    this.widgets.set(config.id, widget);
    return widget;
  }

  updateWidget(widgetId: string, entries: WidgetEntry[]): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }
    widget.timeline = {
      entries,
      policy: 'atEnd',
    };
    widget.lastUpdated = Date.now();
  }

  scheduleRefresh(widgetId: string, intervalMinutes: number): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }
    if (intervalMinutes <= 0) {
      throw new Error('Refresh interval must be positive');
    }
    this.refreshIntervals.set(widgetId, intervalMinutes);
  }

  getRegisteredWidgets(): NativeWidget[] {
    return [...this.widgets.values()];
  }

  getWidget(widgetId: string): NativeWidget | null {
    return this.widgets.get(widgetId) ?? null;
  }

  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.refreshIntervals.delete(widgetId);
  }

  getRefreshInterval(widgetId: string): number | null {
    return this.refreshIntervals.get(widgetId) ?? null;
  }
}
