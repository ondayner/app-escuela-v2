import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import type { AuthDependencies } from './auth.types.js';
import type { UserRole } from '../user/user.types.js';
import { toPublicUser } from './auth.utils.js';

export const authenticate =
  (dependencies: AuthDependencies, signingKey: string) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.accessToken;
    if (!token) return reply.code(401).send({ message: 'Debes iniciar sesión' });

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, signingKey);
    } catch {
      return reply.code(401).send({ message: 'Sesión inválida o vencida' });
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      return reply.code(401).send({ message: 'Sesión inválida' });
    }

    const sessionExists = await dependencies.sessions.getActive(payload.sid, payload.sub);
    const user = sessionExists ? await dependencies.users.getById(payload.sub) : null;
    if (!user) return reply.code(401).send({ message: 'Sesión vencida' });
    request.currentUser = toPublicUser(user);
    request.sessionId = payload.sid;
  };

export const requireRole =
  (...allowedRoles: UserRole[]) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser || !allowedRoles.includes(request.currentUser.role)) {
      return reply.code(403).send({ message: 'No tienes permisos para esta operación' });
    }
  };
