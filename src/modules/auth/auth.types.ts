import type { UserRepository } from '../user/user.types.js';
import type { EmailService } from '../../services/email.service.js';

export interface SessionRepository {
  create(sessionId: string, userId: string, expiresAt: Date): Promise<void>;
  getActive(sessionId: string, userId: string): Promise<boolean>;
  revoke(sessionId: string): Promise<void>;
}

export interface AuthDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  emailService: EmailService;
  emailTokenSigningKey: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: import('../user/user.types.js').PublicUser | null;
    sessionId: string | null;
  }
}
