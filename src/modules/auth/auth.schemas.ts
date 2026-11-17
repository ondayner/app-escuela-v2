import { z } from 'zod';

export const emailSchema = z.email().max(254);
export const loginPasswordSchema = z.string().min(1).max(200);
export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: emailSchema,
  phone: z.string().nullable(),
  role: z.enum(['admin', 'profesor', 'alumno']),
});
export const messageSchema = z.object({ message: z.string() });
export const loginBodySchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});
export const emailVerificationTokenSchema = z.object({
  userId: z.uuid(),
  iat: z.number(),
  exp: z.number(),
});
