// App Launcher - Mega-shell in-app launcher for all 13 Quant apps

export interface QuantApp {
  id: string;
  name: string;
  icon: string;
  route: string;
  color: string;
  description: string;
}

export type AppStatus = 'ready' | 'loading' | 'error' | 'updating';

export const QUANT_APPS: QuantApp[] = [
  {
    id: 'quantmail',
    name: 'QuantMail',
    icon: 'mail',
    route: '/mail',
    color: '#4285F4',
    description: 'Privacy-first email',
  },
  {
    id: 'quantchat',
    name: 'QuantChat',
    icon: 'chat',
    route: '/chat',
    color: '#34A853',
    description: 'Encrypted messaging',
  },
  {
    id: 'quantai',
    name: 'QuantAI',
    icon: 'brain',
    route: '/ai',
    color: '#9B59B6',
    description: 'AI assistant',
  },
  {
    id: 'quantads',
    name: 'QuantAds',
    icon: 'megaphone',
    route: '/ads',
    color: '#F39C12',
    description: 'Privacy-first advertising',
  },
  {
    id: 'quantneon',
    name: 'QuantNeon',
    icon: 'palette',
    route: '/neon',
    color: '#E91E63',
    description: 'Creative studio',
  },
  {
    id: 'quantsync',
    name: 'QuantSync',
    icon: 'sync',
    route: '/sync',
    color: '#00BCD4',
    description: 'Cross-device sync',
  },
  {
    id: 'quantube',
    name: 'QuanTube',
    icon: 'play',
    route: '/tube',
    color: '#FF0000',
    description: 'Video platform',
  },
  {
    id: 'quantmax',
    name: 'QuantMax',
    icon: 'rocket',
    route: '/max',
    color: '#FF5722',
    description: 'Performance tools',
  },
  {
    id: 'quantedits',
    name: 'QuantEdits',
    icon: 'edit',
    route: '/edits',
    color: '#795548',
    description: 'Document editor',
  },
  {
    id: 'quantdocs',
    name: 'QuantDocs',
    icon: 'file',
    route: '/docs',
    color: '#2196F3',
    description: 'Document storage',
  },
  {
    id: 'quantdrive',
    name: 'QuantDrive',
    icon: 'cloud',
    route: '/drive',
    color: '#4CAF50',
    description: 'Cloud storage',
  },
  {
    id: 'quantcalendar',
    name: 'QuantCalendar',
    icon: 'calendar',
    route: '/calendar',
    color: '#009688',
    description: 'Calendar & scheduling',
  },
  {
    id: 'quantmeet',
    name: 'QuantMeet',
    icon: 'video',
    route: '/meet',
    color: '#673AB7',
    description: 'Video conferencing',
  },
];

export class AppLauncher {
  private recentApps: string[] = [];
  private appStatuses: Map<string, AppStatus> = new Map();

  constructor() {
    for (const app of QUANT_APPS) {
      this.appStatuses.set(app.id, 'ready');
    }
  }

  getApps(): QuantApp[] {
    return [...QUANT_APPS];
  }

  launchApp(appId: string): { success: boolean; route: string } {
    const app = QUANT_APPS.find((a) => a.id === appId);
    if (!app) {
      return { success: false, route: '' };
    }
    this.addToRecent(appId);
    return { success: true, route: app.route };
  }

  getAppStatus(appId: string): AppStatus {
    return this.appStatuses.get(appId) ?? 'error';
  }

  searchApps(query: string): QuantApp[] {
    const lower = query.toLowerCase();
    return QUANT_APPS.filter(
      (app) =>
        app.name.toLowerCase().includes(lower) ||
        app.description.toLowerCase().includes(lower) ||
        app.id.toLowerCase().includes(lower),
    );
  }

  getRecentApps(): QuantApp[] {
    return this.recentApps
      .slice(0, 5)
      .map((id) => QUANT_APPS.find((a) => a.id === id))
      .filter((a): a is QuantApp => a !== undefined);
  }

  /** @internal - for testing */
  _setAppStatus(appId: string, status: AppStatus): void {
    this.appStatuses.set(appId, status);
  }

  private addToRecent(appId: string): void {
    this.recentApps = [appId, ...this.recentApps.filter((id) => id !== appId)];
    if (this.recentApps.length > 5) {
      this.recentApps = this.recentApps.slice(0, 5);
    }
  }
}
