// In-App Browser Service - Embedded browser functionality

export interface BrowserOptions {
  toolbarColor?: string;
  showTitle?: boolean;
  enableBarCollapsing?: boolean;
  closeButtonCaption?: string;
  presentationStyle?: 'fullScreen' | 'popover' | 'pageSheet';
}

export type BrowserEventType = 'loaded' | 'finished' | 'error' | 'closed';

export interface BrowserEvent {
  type: BrowserEventType;
  url?: string;
  error?: string;
}

export interface ToolbarButtonConfig {
  id: string;
  icon: string;
  align: 'left' | 'right';
  onClick?: () => void;
}

export type BrowserEventHandler = (event: BrowserEvent) => void;

export class InAppBrowserService {
  private isOpen = false;
  private currentUrl: string | null = null;
  private eventHandlers: BrowserEventHandler[] = [];
  private toolbarButtons: ToolbarButtonConfig[] = [];

  async open(url: string, _options?: BrowserOptions): Promise<void> {
    if (!url || !url.startsWith('http')) {
      throw new Error('Invalid URL: must start with http or https');
    }
    this.isOpen = true;
    this.currentUrl = url;
    this.emitEvent({ type: 'loaded', url });
  }

  async close(): Promise<void> {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.emitEvent({ type: 'closed', url: this.currentUrl ?? undefined });
    this.currentUrl = null;
  }

  onEvent(handler: BrowserEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  addToolbarButton(config: ToolbarButtonConfig): void {
    this.toolbarButtons.push(config);
  }

  getToolbarButtons(): ToolbarButtonConfig[] {
    return [...this.toolbarButtons];
  }

  isActive(): boolean {
    return this.isOpen;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  private emitEvent(event: BrowserEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}
