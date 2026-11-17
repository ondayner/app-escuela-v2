import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { DatabaseError } from 'pg';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import authRepository from './modules/auth/auth.repository.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import type { AuthDependencies } from './modules/auth/auth.types.js';
import { registerAdminRoutes } from './modules/admin/admin.routes.js';
import userRepository from './modules/user/user.repository.js';
import emailService from './services/email.service.js';

export const createApp = (
  dependencies: AuthDependencies = {
    users: userRepository,
    sessions: authRepository,
    emailService,
    emailTokenSigningKey: process.env.EMAIL_TOKEN_KEY ?? '',
  },
  signingKey = process.env.ACCESS_TOKEN_KEY,
): FastifyInstance => {
  if (!signingKey || signingKey.length < 32) {
    throw new Error('ACCESS_TOKEN_KEY debe contener al menos 32 caracteres');
  }
  if (dependencies.emailTokenSigningKey.length < 32) {
    throw new Error('EMAIL_TOKEN_KEY debe contener al menos 32 caracteres');
  }

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(fastifyCookie);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('currentUser', null);
  app.decorateRequest('sessionId', null);

  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({ message: 'Los datos enviados no son válidos' });
    }
    if (error instanceof DatabaseError && error.code === '23505') {
      return reply.code(409).send({ message: 'Ya existe una cuenta con ese correo' });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Error interno del servidor' });
  });

  app.get('/health', async () => ({ status: 'ok', version: '2.0.0' }));
  app.register(
    async (routes) => {
      registerAuthRoutes(routes, dependencies, signingKey);
      registerAdminRoutes(routes, dependencies, signingKey);
    },
    { prefix: '/api' },
  );

  return app;
};
