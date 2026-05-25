import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { passwordService } from '@quant/auth';
import { createAppError } from '@quant/server-core';
import { getTokenService, resetTokenService } from '../services';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
});

const loginSchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().optional(),
    password: z.string(),
  })
  .refine((data) => data.email || data.username, {
    message: 'Either email or username is required',
    path: ['email'],
  });

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// In-memory user store for demonstration (would be replaced by database in production)
interface StoredUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
}

const users: Map<string, StoredUser> = new Map();

// Exported for testing - allows resetting state between tests
export function resetState() {
  users.clear();
  resetTokenService();
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }
    const { email, username, displayName, password } = parseResult.data;

    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email) {
        throw createAppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      if (user.username === username) {
        throw createAppError('Username already taken', 409, 'USERNAME_EXISTS');
      }
    }

    // Hash password
    const passwordHash = await passwordService.hash(password);

    // Create user
    const userId = `user_${crypto.randomUUID()}`;
    const user: StoredUser = {
      id: userId,
      email,
      username,
      displayName,
      passwordHash,
    };
    users.set(userId, user);

    // Generate tokens
    const service = getTokenService();
    const tokens = await service.generateTokenPair(
      userId,
      { email, username, role: 'user' },
      ['profile:read', 'profile:write'],
      'quantmail',
    );

    return reply.status(201).send({
      success: true,
      data: {
        user: { id: userId, email, username, displayName },
        tokens,
      },
    });
  });

  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }
    const { email, username, password } = parseResult.data;

    // Find user
    let foundUser: StoredUser | undefined;
    for (const user of users.values()) {
      if ((email && user.email === email) || (username && user.username === username)) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw createAppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const valid = await passwordService.verify(foundUser.passwordHash, password);
    if (!valid) {
      throw createAppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const service = getTokenService();
    const tokens = await service.generateTokenPair(
      foundUser.id,
      { email: foundUser.email, username: foundUser.username, role: 'user' },
      ['profile:read', 'profile:write'],
      'quantmail',
    );

    return reply.status(200).send({
      success: true,
      data: { tokens },
    });
  });

  fastify.post('/token/refresh', async (request, reply) => {
    const parseResult = refreshSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }
    const { refreshToken } = parseResult.data;

    const service = getTokenService();
    const tokens = await service.refreshTokens(refreshToken);

    if (!tokens) {
      throw createAppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    return reply.status(200).send({
      success: true,
      data: { tokens },
    });
  });

  fastify.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const service = getTokenService();
      const payload = await service.validateAccessToken(token);
      if (payload) {
        await service.revokeToken(payload.jti, 'logout');
      }
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });
}
