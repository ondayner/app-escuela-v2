import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'profesor', 'alumno']);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  password: z.string().min(6).max(200),
  phone: z.string().trim().min(7).max(30).optional(),
  role: userRoleSchema,
});
