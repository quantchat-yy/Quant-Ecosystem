import React from 'react';

export interface RoutePattern {
  pattern: string;
  appId: string;
  screen: string;
}

export interface DeepLinkRouterProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  routes?: RoutePattern[];
  children?: React.ReactNode;
}

const DEFAULT_ROUTES: RoutePattern[] = [
  { pattern: '/mail/:id', appId: 'mail', screen: 'message' },
  { pattern: '/mail/compose', appId: 'mail', screen: 'compose' },
  { pattern: '/chat/:channelId', appId: 'chat', screen: 'channel' },
  { pattern: '/chat/:channelId/:messageId', appId: 'chat', screen: 'thread' },
  { pattern: '/drive/:folderId', appId: 'drive', screen: 'folder' },
  { pattern: '/docs/:docId', appId: 'docs', screen: 'document' },
  { pattern: '/calendar/:eventId', appId: 'calendar', screen: 'event' },
  { pattern: '/meet/:meetingId', appId: 'meet', screen: 'meeting' },
  { pattern: '/ai', appId: 'ai', screen: 'assistant' },
  { pattern: '/settings', appId: 'system', screen: 'settings' },
  { pattern: '/profile', appId: 'system', screen: 'profile' },
  { pattern: '/notifications', appId: 'system', screen: 'notifications' },
];

function matchRoute(
  path: string,
  patterns: RoutePattern[],
): { route: RoutePattern; params: Record<string, string> } | null {
  for (const route of patterns) {
    const patternParts = route.pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart?.startsWith(':')) {
        if (pathPart) {
          params[patternPart.slice(1)] = pathPart;
        }
      } else if (patternPart !== pathPart) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }
  return null;
}

export function DeepLinkRouter({
  currentRoute,
  onNavigate,
  routes = DEFAULT_ROUTES,
  children,
}: DeepLinkRouterProps): React.ReactElement {
  const match = matchRoute(currentRoute, routes);
  const routeParts = currentRoute.split('/').filter(Boolean);
  const canGoBack = routeParts.length > 1;

  const handleBack = (): void => {
    const parentRoute = '/' + routeParts.slice(0, -1).join('/');
    onNavigate(parentRoute);
  };

  return (
    <div className="deep-link-router">
      <div className="deep-link-router__header">
        {canGoBack && (
          <button className="deep-link-router__back" onClick={handleBack} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {match && (
          <span className="deep-link-router__breadcrumb">
            {match.route.appId} / {match.route.screen}
          </span>
        )}
      </div>

      <div className="deep-link-router__content" key={currentRoute}>
        <div className="deep-link-router__transition">
          {match ? (
            <div
              className="deep-link-router__screen"
              data-app={match.route.appId}
              data-screen={match.route.screen}
            >
              {children}
            </div>
          ) : (
            <div className="deep-link-router__not-found">
              <p>Route not found: {currentRoute}</p>
              <button onClick={() => onNavigate('/')}>Go Home</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
