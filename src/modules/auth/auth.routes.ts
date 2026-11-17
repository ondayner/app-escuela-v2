import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import type { AuthDependencies } from './auth.types.js';
import { authenticate } from './auth.hooks.js';
import {
  currentSessionRouteSchema,
  loginRouteSchema,
  logoutRouteSchema,
  verifyEmailRouteSchema,
} from './auth.routes.schemas.js';
import {
  createAccessToken,
  setAccessTokenCookie,
  toPublicUser,
  verifyEmailVerificationToken,
} from './auth.utils.js';

export const registerAuthRoutes = (
  fastify: FastifyInstance,
  dependencies: AuthDependencies,
  signingKey: string,
) => {
  const routes = fastify.withTypeProvider<ZodTypeProvider>();

  routes.post('/auth/login', { schema: loginRouteSchema }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const user = await dependencies.users.getByEmail(email);
    if (!user || !(await bcrypt.compare(request.body.password, user.password_hash))) {
      return reply.code(401).send({ message: 'Correo o contraseña inválidos' });
    }
    if (!user.email_verified) {
      return reply.code(403).send({ message: 'Confirma tu correo antes de iniciar sesión' });
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await dependencies.sessions.create(sessionId, user.id, expiresAt);
    setAccessTokenCookie(reply, createAccessToken(user.id, sessionId, signingKey));
    return reply.send({ message: 'Sesión iniciada', user: toPublicUser(user) });
  });

  routes.get('/auth/verify-email', { schema: verifyEmailRouteSchema }, async (request, reply) => {
    let userId: string;
    try {
      ({ userId } = verifyEmailVerificationToken(
        request.query.token,
        dependencies.emailTokenSigningKey,
      ));
    } catch {
      return reply.code(400).send({ message: 'El token es inválido, venció o ya fue utilizado' });
    }

    const user = await dependencies.users.getById(userId);
    if (!user || user.email_verified) {
      return reply.code(400).send({ message: 'El token es inválido, venció o ya fue utilizado' });
    }
    if (!(await dependencies.users.verifyEmail(userId))) {
      return reply.code(400).send({ message: 'El token es inválido, venció o ya fue utilizado' });
    }
    return reply.send({ message: 'Correo verificado. Ya puedes iniciar sesión.' });
  });

  routes.get(
    '/auth/me',
    {
      preHandler: authenticate(dependencies, signingKey),
      schema: { ...currentSessionRouteSchema },
    },
    async (request) => ({ user: request.currentUser }),
  );

  routes.post(
    '/auth/logout',
    {
      preHandler: authenticate(dependencies, signingKey),
      schema: logoutRouteSchema,
    },
    async (request, reply) => {
      if (request.sessionId) await dependencies.sessions.revoke(request.sessionId);
      reply.clearCookie('accessToken', { path: '/' });
      return reply.send({ message: 'Sesión cerrada' });
    },
  );
};
