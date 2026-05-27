// Universal Link Handler - iOS Universal Links + Android App Links

export interface DeepLinkRoute {
  pattern: string;
  handler?: string;
  params?: string[];
}

export type RouteMap = Record<string, DeepLinkRoute>;

export interface LinkConfig {
  scheme: string;
  host: string;
  pathPrefix?: string;
}

export interface AppLinkConfig {
  packageName: string;
  sha256CertFingerprints: string[];
  host: string;
}

export interface UniversalLinkConfig {
  appId: string;
  paths: string[];
}

export class UniversalLinkHandler {
  private routes: RouteMap = {};
  private readonly baseConfig: LinkConfig;

  constructor(config?: Partial<LinkConfig>) {
    this.baseConfig = {
      scheme: config?.scheme ?? 'https',
      host: config?.host ?? 'quant.app',
      pathPrefix: config?.pathPrefix,
    };
  }

  registerRoutes(routes: RouteMap): void {
    this.routes = { ...this.routes, ...routes };
  }

  handleIncomingUrl(url: string): {
    matched: boolean;
    route?: string;
    params?: Record<string, string>;
  } {
    let path: string;
    try {
      const parsed = new URL(url);
      path = parsed.pathname;
    } catch {
      path = url.startsWith('/') ? url : `/${url}`;
    }

    for (const [routeName, route] of Object.entries(this.routes)) {
      const match = this.matchPattern(route.pattern, path);
      if (match) {
        return { matched: true, route: routeName, params: match };
      }
    }

    return { matched: false };
  }

  generateAppLink(route: string, params?: Record<string, string>): string {
    const routeDef = this.routes[route];
    if (!routeDef) {
      throw new Error(`Route not found: ${route}`);
    }

    let path = routeDef.pattern;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, value);
      }
    }

    const prefix = this.baseConfig.pathPrefix ?? '';
    return `${this.baseConfig.scheme}://${this.baseConfig.host}${prefix}${path}`;
  }

  getIOSAssociation(): object {
    const paths = Object.values(this.routes).map((r) => {
      return r.pattern.replace(/:([^/]+)/g, '*');
    });

    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: 'TEAMID.com.quant.app',
            paths,
          },
        ],
      },
    };
  }

  getAndroidAssetLinks(): object {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.quant.app',
          sha256_cert_fingerprints: ['SHA256_FINGERPRINT_PLACEHOLDER'],
        },
      },
    ];
  }

  getRegisteredRoutes(): RouteMap {
    return { ...this.routes };
  }

  private matchPattern(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]!;
      const pathPart = pathParts[i]!;

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }
}
