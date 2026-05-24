// ============================================================================
// QuantChat API Server
// Snapchat-like messaging platform with WebSocket support for real-time messaging
// ============================================================================

import type { Request, Response, NextFunction, Middleware } from './middleware';
import {
  RateLimiter,
  corsMiddleware,
  requestIdMiddleware,
  securityHeaders,
  loggingMiddleware,
  authMiddleware,
  errorHandler,
  AppError,
} from './middleware';

import { authRoutes } from './routes/auth';
import { messageRoutes } from './routes/messages';
import { storyRoutes } from './routes/stories';
import { snapRoutes } from './routes/snaps';
import { callRoutes } from './routes/calls';
import { groupRoutes } from './routes/groups';
import { discoverRoutes } from './routes/discover';
import { arFilterRoutes } from './routes/ar-filters';
import { aiRoutes } from './routes/ai';
import { bitmojiRoutes } from './routes/bitmoji';
import { mapRoutes } from './routes/map';

import { messagingService } from './services/messaging-service';
import { notificationService } from './services/notification-service';

import type { RouteDefinition } from './routes/auth';
import type { WSEvent, WSAuthPayload, WSEventType } from '../src/types';

// ============================================================================
// Server Configuration
// ============================================================================

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: { windowMs: number; maxRequests: number };
  jwtSecret: string;
  env: 'development' | 'production' | 'test';
}

const defaultConfig: ServerConfig = {
  port: 3002,
  host: '0.0.0.0',
  corsOrigins: [
    'https://chat.quant.app',
    'https://mail.quant.app',
    'https://sync.quant.app',
    'http://localhost:3000',
    'http://localhost:3002',
  ],
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 2000 },
  jwtSecret: process.env['JWT_SECRET'] || 'quantchat-development-secret-key',
  env: (process.env['NODE_ENV'] as 'development' | 'production' | 'test') || 'development',
};

// ============================================================================
// WebSocket Connection Manager
// ============================================================================

interface WebSocketConnection {
  userId: string;
  deviceId: string;
  connectedAt: Date;
  lastPingAt: Date;
  send: (event: WSEvent) => void;
}

class WebSocketManager {
  private connections: Map<string, WebSocketConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  start(): void {
    // Heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [userId, conns] of this.connections) {
        const alive = conns.filter(c => now - c.lastPingAt.getTime() < 30000);
        if (alive.length === 0) {
          this.connections.delete(userId);
          messagingService.setUserOffline(userId);
        } else {
          this.connections.set(userId, alive);
        }
      }
    }, 15000);
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  addConnection(userId: string, deviceId: string, send: (event: WSEvent) => void): void {
    const conn: WebSocketConnection = {
      userId,
      deviceId,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      send,
    };

    const existing = this.connections.get(userId) || [];
    existing.push(conn);
    this.connections.set(userId, existing);
    messagingService.setUserOnline(userId);
  }

  removeConnection(userId: string, deviceId: string): void {
    const conns = this.connections.get(userId) || [];
    const remaining = conns.filter(c => c.deviceId !== deviceId);

    if (remaining.length === 0) {
      this.connections.delete(userId);
      messagingService.setUserOffline(userId);
    } else {
      this.connections.set(userId, remaining);
    }
  }

  sendToUser(userId: string, event: WSEvent): void {
    const conns = this.connections.get(userId) || [];
    for (const conn of conns) {
      try {
        conn.send(event);
      } catch {
        // Connection might be dead
      }
    }
  }

  broadcast(userIds: string[], event: WSEvent): void {
    for (const userId of userIds) {
      this.sendToUser(userId, event);
    }
  }

  ping(userId: string, deviceId: string): void {
    const conns = this.connections.get(userId) || [];
    const conn = conns.find(c => c.deviceId === deviceId);
    if (conn) {
      conn.lastPingAt = new Date();
    }
  }

  getOnlineCount(): number {
    return this.connections.size;
  }

  isOnline(userId: string): boolean {
    return this.connections.has(userId) && (this.connections.get(userId)?.length || 0) > 0;
  }
}

// ============================================================================
// Router
// ============================================================================

interface RegisteredRoute {
  method: string;
  pathPattern: RegExp;
  paramNames: string[];
  handler: (req: Request, res: Response) => Promise<void>;
  middleware: Middleware[];
  requiresAuth: boolean;
}

class Router {
  private routes: RegisteredRoute[] = [];

  register(routes: RouteDefinition[]): void {
    for (const route of routes) {
      const { pattern, paramNames } = this.pathToRegex(route.path);
      this.routes.push({
        method: route.method,
        pathPattern: pattern,
        paramNames,
        handler: route.handler,
        middleware: route.middleware || [],
        requiresAuth: route.requiresAuth ?? true,
      });
    }
  }

  match(method: string, path: string): { route: RegisteredRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pathPattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        return { route, params };
      }
    }
    return null;
  }

  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const regexStr = path
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\[([a-zA-Z0-9_]+)\]/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    return { pattern: new RegExp(`^${regexStr}$`), paramNames };
  }
}

// ============================================================================
// Application Server
// ============================================================================

export class QuantChatServer {
  private config: ServerConfig;
  private router: Router;
  private globalMiddleware: Middleware[] = [];
  private wsManager: WebSocketManager;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.router = new Router();
    this.wsManager = new WebSocketManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.globalMiddleware.push(requestIdMiddleware());
    this.globalMiddleware.push(securityHeaders());
    this.globalMiddleware.push(corsMiddleware({
      origins: this.config.corsOrigins,
      credentials: true,
    }));

    const globalLimiter = new RateLimiter(this.config.rateLimit);
    this.globalMiddleware.push(globalLimiter.middleware());

    if (this.config.env !== 'test') {
      this.globalMiddleware.push(loggingMiddleware());
    }
  }

  private setupRoutes(): void {
    this.router.register(authRoutes);
    this.router.register(messageRoutes);
    this.router.register(storyRoutes);
    this.router.register(snapRoutes);
    this.router.register(callRoutes);
    this.router.register(groupRoutes);
    this.router.register(discoverRoutes);
    this.router.register(arFilterRoutes);
    this.router.register(aiRoutes);
    this.router.register(bitmojiRoutes);
    this.router.register(mapRoutes);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      // Run global middleware
      for (const mw of this.globalMiddleware) {
        let shouldContinue = true;
        await new Promise<void>((resolve) => {
          mw(req, res, (err?: Error) => {
            if (err) shouldContinue = false;
            resolve();
          });
        });
        if (!shouldContinue || res.headersSent) return;
      }

      // Match route
      const match = this.router.match(req.method, req.path);
      if (!match) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `${req.method} ${req.path} not found`, statusCode: 404 },
        });
        return;
      }

      const { route, params } = match;
      req.params = params;

      // Auth check
      if (route.requiresAuth) {
        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Bearer token required', statusCode: 401 },
          });
          return;
        }

        const token = authHeader.substring(7);
        const decoded = this.decodeToken(token);
        if (!decoded) {
          res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', statusCode: 401 },
          });
          return;
        }

        req.userId = decoded.sub;
        req.user = {
          id: decoded.sub,
          phoneNumber: decoded.phone || '',
          username: decoded.username || '',
          displayName: decoded.displayName || '',
          role: decoded.role || 'user',
        };
        req.deviceId = req.headers['x-device-id'] || decoded.deviceId;
      }

      // Run route-specific middleware
      for (const mw of route.middleware) {
        let shouldContinue = true;
        await new Promise<void>((resolve) => {
          mw(req, res, (err?: Error) => {
            if (err) shouldContinue = false;
            resolve();
          });
        });
        if (!shouldContinue || res.headersSent) return;
      }

      // Execute handler
      await route.handler(req, res);
    } catch (error) {
      const handler = errorHandler();
      handler(error as Error, req, res, () => {});
    }
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Handle WebSocket connection upgrade
   */
  handleWebSocketConnection(userId: string, deviceId: string, send: (event: WSEvent) => void): { onMessage: (data: string) => void; onClose: () => void } {
    this.wsManager.addConnection(userId, deviceId, send);

    // Send connection confirmation
    send({
      type: 'presence:update',
      payload: { userId, status: 'online' },
      timestamp: Date.now(),
    });

    return {
      onMessage: (data: string) => {
        try {
          const event = JSON.parse(data) as WSEvent;
          this.handleWSEvent(userId, deviceId, event);
        } catch {
          // Invalid message format
        }
      },
      onClose: () => {
        this.wsManager.removeConnection(userId, deviceId);
      },
    };
  }

  private handleWSEvent(userId: string, deviceId: string, event: WSEvent): void {
    switch (event.type) {
      case 'typing:start':
      case 'typing:stop': {
        const payload = event.payload as { conversationId: string };
        messagingService.setTyping(payload.conversationId, userId, event.type === 'typing:start');
        // Broadcast to other participants
        this.wsManager.broadcast(
          this.getConversationParticipants(payload.conversationId, userId),
          { type: event.type, payload: { userId, conversationId: payload.conversationId }, timestamp: Date.now() }
        );
        break;
      }
      case 'message:read': {
        const payload = event.payload as { conversationId: string; messageIds: string[] };
        messagingService.markAsRead(payload.conversationId, userId, payload.messageIds);
        break;
      }
      case 'presence:update': {
        this.wsManager.ping(userId, deviceId);
        break;
      }
      default:
        break;
    }
  }

  private getConversationParticipants(conversationId: string, excludeUserId: string): string[] {
    // Simplified - in production would look up conversation participants
    return [];
  }

  getRoutes(): Array<{ method: string; path: string; requiresAuth: boolean }> {
    const allRoutes = [
      ...authRoutes, ...messageRoutes, ...storyRoutes, ...snapRoutes,
      ...callRoutes, ...groupRoutes, ...discoverRoutes, ...arFilterRoutes,
      ...aiRoutes, ...bitmojiRoutes, ...mapRoutes,
    ];
    return allRoutes.map((r) => ({
      method: r.method,
      path: r.path,
      requiresAuth: r.requiresAuth ?? true,
    }));
  }

  getHealthStatus(): { status: string; uptime: number; version: string; routes: number; wsConnections: number } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0',
      routes: this.getRoutes().length,
      wsConnections: this.wsManager.getOnlineCount(),
    };
  }

  start(): void {
    const http = require('http');
    const server = http.createServer(async (incomingReq: any, outgoingRes: any) => {
      let body = '';
      incomingReq.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      incomingReq.on('end', async () => {
        const url = new URL(incomingReq.url || '/', `http://${incomingReq.headers.host}`);

        const req: Request = {
          method: incomingReq.method || 'GET',
          url: incomingReq.url || '/',
          path: url.pathname,
          params: {},
          query: Object.fromEntries(url.searchParams.entries()),
          body: body ? JSON.parse(body) : {},
          headers: incomingReq.headers as Record<string, string>,
          ip: incomingReq.socket?.remoteAddress || '127.0.0.1',
        };

        let statusCode = 200;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const res: Response = {
          statusCode: 200,
          headersSent: false,
          status(code: number) { statusCode = code; res.statusCode = code; return res; },
          json(data: unknown) {
            if (res.headersSent) return;
            res.headersSent = true;
            outgoingRes.writeHead(statusCode, headers);
            outgoingRes.end(JSON.stringify(data));
          },
          send(data: string) {
            if (res.headersSent) return;
            res.headersSent = true;
            outgoingRes.writeHead(statusCode, headers);
            outgoingRes.end(data);
          },
          setHeader(name: string, value: string) { headers[name] = value; return res; },
        };

        if (req.path === '/health') {
          res.status(200).json(this.getHealthStatus());
          return;
        }

        await this.handleRequest(req, res);

        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Endpoint not found', statusCode: 404 },
          });
        }
      });
    });

    // WebSocket upgrade handling
    server.on('upgrade', (request: any, socket: any, head: Buffer) => {
      // Simplified WebSocket upgrade - in production would use ws library
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      // Extract auth from query params for WS connections
      const token = url.searchParams.get('token');
      if (!token) {
        socket.destroy();
        return;
      }

      const decoded = this.decodeToken(token);
      if (!decoded) {
        socket.destroy();
        return;
      }

      const deviceId = url.searchParams.get('deviceId') || 'unknown';
      console.log(`[WS] User ${decoded.sub} connected from device ${deviceId}`);

      // For simulation, we just track the connection
      this.wsManager.addConnection(decoded.sub, deviceId, (event: WSEvent) => {
        try {
          socket.write(JSON.stringify(event));
        } catch {}
      });

      socket.on('close', () => {
        this.wsManager.removeConnection(decoded.sub, deviceId);
      });
    });

    this.wsManager.start();

    server.listen(this.config.port, this.config.host, () => {
      console.log(`[QuantChat] Server running at http://${this.config.host}:${this.config.port}`);
      console.log(`[QuantChat] WebSocket endpoint: ws://${this.config.host}:${this.config.port}/ws`);
      console.log(`[QuantChat] Environment: ${this.config.env}`);
      console.log(`[QuantChat] Routes registered: ${this.getRoutes().length}`);
    });
  }
}

export { Router, WebSocketManager };
export default QuantChatServer;
