import crypto from 'node:crypto';
import type { CSRFConfig, CSRFTokenPair } from './types.js';

export interface CSRFPluginRequest {
  method: string;
  cookies?: Record<string, string>;
  headers: Record<string, string | undefined>;
}

export interface CSRFPluginReply {
  status: (code: number) => { send: (body: unknown) => void };
}

export interface CSRFPluginInstance {
  addHook: (
    hook: string,
    handler: (request: CSRFPluginRequest, reply: CSRFPluginReply) => Promise<void>,
  ) => void;
}

export class DoubleSubmitCSRF {
  private readonly config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = config;
  }

  generateTokenPair(): CSRFTokenPair {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString(36);
    const payload = `${token}.${timestamp}`;
    const signature = crypto.createHmac('sha256', this.config.secret).update(payload).digest('hex');
    const cookie = `${payload}.${signature}`;
    const header = cookie;
    return { cookie, header };
  }

  validate(cookieToken: string, headerToken: string): boolean {
    if (!cookieToken || !headerToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (cookieBuffer.length !== headerBuffer.length) {
      return false;
    }

    const tokensMatch = crypto.timingSafeEqual(cookieBuffer, headerBuffer);
    if (!tokensMatch) {
      return false;
    }

    // Verify HMAC signature
    const parts = cookieToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [token, timestamp, signature] = parts as [string, string, string];
    const payload = `${token}.${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    const signatureValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    if (!signatureValid) {
      return false;
    }

    // Check TTL
    const tokenTime = parseInt(timestamp, 36);
    const now = Date.now();
    if (now - tokenTime > this.config.ttlMs) {
      return false;
    }

    return true;
  }

  createFastifyPlugin() {
    const validate = this.validate.bind(this);
    const { cookieName, headerName } = this.config;

    return function csrfPlugin(
      fastify: CSRFPluginInstance,
      _opts: Record<string, unknown>,
      done: () => void,
    ) {
      fastify.addHook('preHandler', async (request: CSRFPluginRequest, reply: CSRFPluginReply) => {
        const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        if (!mutatingMethods.includes(request.method)) {
          return;
        }

        const cookieToken = request.cookies?.[cookieName] ?? '';
        const headerToken = request.headers[headerName.toLowerCase()] ?? '';

        if (!validate(cookieToken, headerToken)) {
          reply.status(403).send({ error: 'CSRF validation failed' });
        }
      });
      done();
    };
  }
}
