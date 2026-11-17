import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import bcrypt from 'bcrypt';
import type { AuthDependencies } from '../auth/auth.types.js';
import { authenticate, requireRole } from '../auth/auth.hooks.js';
import { sendEmailVerification } from '../auth/auth.service.js';
import { toPublicUser } from '../auth/auth.utils.js';
import {
  createUserRouteSchema,
  resendUserVerificationRouteSchema,
} from './admin.routes.schemas.js';

export const registerAdminRoutes = (
  fastify: FastifyInstance,
  dependencies: AuthDependencies,
  signingKey: string,
) => {
  const routes = fastify.withTypeProvider<ZodTypeProvider>();

  routes.post(
    '/admin/users',
    {
      preHandler: [authenticate(dependencies, signingKey), requireRole('admin')],
      schema: createUserRouteSchema,
    },
    async (request, reply) => {
      const user = await dependencies.users.create({
        name: request.body.name,
        email: request.body.email.trim().toLowerCase(),
        phone: request.body.phone ?? null,
        role: request.body.role,
        passwordHash: await bcrypt.hash(request.body.password, 12),
      });
      try {
        await sendEmailVerification(user.id, user.email, dependencies);
      } catch (error) {
        request.log.error({ err: error, userId: user.id }, 'No se pudo enviar la verificación');
        return reply.code(503).send({
          message:
            'Cuenta creada, pero no se pudo enviar la verificación. Corrige el correo y reenvíala desde administración.',
        });
      }
      return reply.code(201).send({
        message: 'Cuenta creada. Debe confirmar su correo antes de iniciar sesión.',
        user: toPublicUser(user),
      });
    },
  );

  routes.post(
    '/admin/users/:userId/resend-verification',
    {
      preHandler: [authenticate(dependencies, signingKey), requireRole('admin')],
      schema: resendUserVerificationRouteSchema,
    },
    async (request, reply) => {
      const user = await dependencies.users.getById(request.params.userId);
      if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' });
      if (user.email_verified) {
        return reply.code(409).send({ message: 'El correo ya está verificado' });
      }
      try {
        await sendEmailVerification(user.id, user.email, dependencies);
      } catch (error) {
        request.log.error({ err: error, userId: user.id }, 'No se pudo reenviar la verificación');
        return reply.code(503).send({ message: 'No se pudo enviar el correo de verificación' });
      }
      return reply.send({ message: 'Correo de verificación enviado nuevamente' });
    },
  );
};
