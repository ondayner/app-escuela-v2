import type { AuthDependencies } from './auth.types.js';
import { createEmailVerificationToken } from './auth.utils.js';

export const sendEmailVerification = async (
  userId: string,
  email: string,
  dependencies: AuthDependencies,
) => {
  const token = createEmailVerificationToken(userId, dependencies.emailTokenSigningKey);
  await dependencies.emailService.sendEmailVerification(email, token);
};
