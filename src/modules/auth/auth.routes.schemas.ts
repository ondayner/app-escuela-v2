import type { FastifySchema } from 'fastify';
import { z } from 'zod';
import { loginBodySchema, messageSchema, publicUserSchema } from './auth.schemas.js';

export const loginRouteSchema = {
  description: 'Inicia sesión con cualquier cuenta activa',
  tags: ['Auth'],
  summary: 'Iniciar sesión',
  body: loginBodySchema,
  response: {
    200: z.object({ message: z.string(), user: publicUserSchema }),
    401: messageSchema,
    403: messageSchema,
  },
} satisfies FastifySchema;

export const verifyEmailRouteSchema = {
  description: 'Confirma el correo usando el token enviado por email',
  tags: ['Auth'],
  summary: 'Verificar correo',
  querystring: z.object({ token: z.jwt({ message: 'Token inválido' }) }),
  response: {
    200: messageSchema,
    400: messageSchema,
  },
} satisfies FastifySchema;

export const currentSessionRouteSchema = {
  description: 'Devuelve la cuenta asociada a la sesión actual',
  tags: ['Auth'],
  summary: 'Consultar sesión actual',
  response: {
    200: z.object({ user: publicUserSchema.nullable() }),
    401: messageSchema,
  },
} satisfies FastifySchema;

export const logoutRouteSchema = {
  description: 'Revoca y cierra la sesión actual',
  tags: ['Auth'],
  summary: 'Cerrar sesión',
  response: {
    200: messageSchema,
    401: messageSchema,
  },
} satisfies FastifySchema;
