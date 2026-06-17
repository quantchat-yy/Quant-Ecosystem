import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import type { AuthContext } from '@quant/auth';
import type { PermissionScope, QuantApp } from '@quant/common';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

export interface RequireAuthOptions {
  scopes?: string[];
}

async function authPlugin(
  fastify: FastifyInstance,
  opts: { jwtSecret: string; jwtIssuer: string; jwtAudience: string },
) {
  const secret = new TextEncoder().encode(opts.jwtSecret);

  fastify.decorateRequest('auth', undefined as unknown as AuthContext);

  fastify.decorate('requireAuth', function (options?: RequireAuthOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
            statusCode: 401,
          },
        });
      }

      const token = authHeader.slice(7);

      try {
        const { payload } = await jose.jwtVerify(token, secret, {
          issuer: opts.jwtIssuer,
          audience: opts.jwtAudience,
        });

        const authContext: AuthContext = {
          userId: payload.sub ?? '',
          email: (payload['email'] as string) ?? '',
          username: (payload['username'] as string) ?? '',
          role: (payload['role'] as string) ?? '',
          scopes: (payload['scopes'] as PermissionScope[]) ?? [],
          sessionId: payload.jti ?? '',
          app: (payload['app'] as QuantApp) ?? 'quantmail',
          tokenId: payload.jti ?? '',
        };

        request.auth = authContext;

        // Check scopes if required. Scope evaluation is backed by
        // `@quant/identity-permissions` (RBAC) via the `evaluateScopes`
        // decoration installed by the identity-permissions plugin. When that
        // plugin is not registered (e.g. the bare auth plugin in isolation),
        // fall back to the original exact-match semantics so 401/403 behaviour
        // (design Property P7) is unchanged.
        if (options?.scopes && options.scopes.length > 0) {
          const evaluateScopes = (
            fastify as unknown as {
              evaluateScopes?: (granted: readonly string[], required: readonly string[]) => boolean;
            }
          ).evaluateScopes;
          const grantedScopes = authContext.scopes as unknown as string[];
          const hasScopes =
            typeof evaluateScopes === 'function'
              ? evaluateScopes(grantedScopes, options.scopes)
              : options.scopes.every((scope) =>
                  authContext.scopes.includes(scope as PermissionScope),
                );
          if (!hasScopes) {
            return reply.status(403).send({
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
                statusCode: 403,
              },
            });
          }
        }
      } catch {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            statusCode: 401,
          },
        });
      }
    };
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (
      options?: RequireAuthOptions,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
});
