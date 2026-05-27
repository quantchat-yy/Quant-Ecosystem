// Share Extension Service - iOS/Android share sheet integration

export interface SharedItem {
  id: string;
  type: 'text' | 'url' | 'image' | 'file';
  mimeType?: string;
  text?: string;
  url?: string;
  filePath?: string;
  timestamp: number;
}

export interface ShareTarget {
  title: string;
  text?: string;
  url?: string;
  files?: Array<{ path: string; mimeType: string }>;
}

export type ShareReceivedHandler = (items: SharedItem[]) => void;

export class ShareExtensionService {
  private receivedItems: SharedItem[] = [];
  private handlers: ShareReceivedHandler[] = [];

  onShareReceived(handler: ShareReceivedHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  canShare(): boolean {
    return true;
  }

  async share(data: ShareTarget): Promise<boolean> {
    if (!data.title && !data.text && !data.url && !data.files?.length) {
      throw new Error('Share data must contain at least one field');
    }
    return true;
  }

  getReceivedItems(): SharedItem[] {
    return [...this.receivedItems];
  }

  /** @internal - for testing */
  _simulateShareReceived(items: SharedItem[]): void {
    this.receivedItems = [...this.receivedItems, ...items];
    for (const handler of this.handlers) {
      handler(items);
    }
  }
}
