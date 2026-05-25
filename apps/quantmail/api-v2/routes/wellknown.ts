import type { FastifyInstance } from 'fastify';

export default async function wellknownRoutes(fastify: FastifyInstance) {
  fastify.get('/.well-known/openid-configuration', async (request, reply) => {
    const baseUrl = `${request.protocol}://${request.hostname}`;

    return reply.status(200).send({
      issuer: process.env['JWT_ISSUER'] ?? 'quantmail',
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'profile:read',
        'profile:write',
        'mail:read',
        'mail:write',
      ],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      code_challenge_methods_supported: ['plain', 'S256'],
    });
  });
}
