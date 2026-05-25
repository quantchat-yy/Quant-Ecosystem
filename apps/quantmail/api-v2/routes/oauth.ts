import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getTokenService } from '../services';

const tokenRequestSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string(),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
  refresh_token: z.string().optional(),
});

const revokeSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
});

const authorizeQuerySchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  response_type: z.literal('code'),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['plain', 'S256']).optional(),
});

export default async function oauthRoutes(fastify: FastifyInstance) {
  fastify.get('/oauth/authorize', async (request, reply) => {
    const parseResult = authorizeQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const { client_id, redirect_uri, state } = parseResult.data;

    // In a real implementation, this would show a consent screen
    // For now, return a placeholder authorization code
    const code = crypto.randomUUID();

    return reply.status(200).send({
      success: true,
      data: {
        code,
        state,
        redirect_uri,
        client_id,
      },
    });
  });

  fastify.post('/oauth/token', async (request, reply) => {
    const parseResult = tokenRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const { grant_type, refresh_token } = parseResult.data;

    if (grant_type === 'refresh_token' && refresh_token) {
      const service = getTokenService();
      const tokens = await service.refreshTokens(refresh_token);
      if (!tokens) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_GRANT',
            message: 'Invalid refresh token',
            statusCode: 400,
          },
        });
      }
      return reply.status(200).send({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
      });
    }

    // authorization_code grant - not yet implemented
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'authorization_code grant is not yet implemented',
        statusCode: 501,
      },
    });
  });

  fastify.post('/oauth/revoke', async (request, reply) => {
    const parseResult = revokeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const { token } = parseResult.data;
    const service = getTokenService();
    const payload = await service.validateAccessToken(token);
    if (payload) {
      await service.revokeToken(payload.jti, 'oauth_revoke');
    }

    // Always return 200 per RFC 7009
    return reply.status(200).send({ success: true });
  });

  fastify.get('/.well-known/jwks.json', async (_request, reply) => {
    const service = getTokenService();
    const jwks = await service.getJWKS();
    return reply.status(200).send(jwks);
  });
}
