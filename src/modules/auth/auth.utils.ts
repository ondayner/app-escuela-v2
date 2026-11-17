import type { FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { PublicUser, User } from '../user/user.types.js';
import { emailVerificationTokenSchema } from './auth.schemas.js';

const accessTokenLifetimeSeconds = 8 * 60 * 60;

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

export const createAccessToken = (userId: string, sessionId: string, signingKey: string) =>
  jwt.sign({ sid: sessionId }, signingKey, {
    subject: userId,
    expiresIn: accessTokenLifetimeSeconds,
  });

export const setAccessTokenCookie = (reply: FastifyReply, token: string) => {
  reply.setCookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: accessTokenLifetimeSeconds,
    path: '/',
  });
};

export const createEmailVerificationToken = (userId: string, signingKey: string) =>
  jwt.sign({ userId }, signingKey, { expiresIn: '1d' });

export const verifyEmailVerificationToken = (token: string, signingKey: string) =>
  emailVerificationTokenSchema.parse(jwt.verify(token, signingKey));
