import type { FastifySchema } from 'fastify';
import { z } from 'zod';
import { messageSchema, publicUserSchema } from '../auth/auth.schemas.js';
import { createUserSchema } from '../user/user.schemas.js';

export const createUserRouteSchema = {
  description: 'Crea una cuenta con la contraseña definida por administración',
  tags: ['Admin'],
  summary: 'Crear usuario',
  body: createUserSchema,
  response: {
    201: z.object({ message: z.string(), user: publicUserSchema }),
    400: messageSchema,
    401: messageSchema,
    403: messageSchema,
    409: messageSchema,
    503: messageSchema,
  },
} satisfies FastifySchema;

export const resendUserVerificationRouteSchema = {
  description: 'Reenvía la confirmación de correo a una cuenta no verificada',
  tags: ['Admin'],
  summary: 'Reenviar confirmación de correo',
  params: z.object({ userId: z.uuid() }),
  response: {
    200: messageSchema,
    401: messageSchema,
    403: messageSchema,
    404: messageSchema,
    409: messageSchema,
    503: messageSchema,
  },
} satisfies FastifySchema;
