import bcrypt from 'bcrypt';
import db, { assertDatabaseConfig } from '../db/index.js';
import authRepository from '../modules/auth/auth.repository.js';
import { sendEmailVerification } from '../modules/auth/auth.service.js';
import type { AuthDependencies } from '../modules/auth/auth.types.js';
import emailService from '../services/email.service.js';
import userRepository from '../modules/user/user.repository.js';

const name = process.env.BOOTSTRAP_ADMIN_NAME;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

try {
  assertDatabaseConfig();
  const dependencies: AuthDependencies = {
    users: userRepository,
    sessions: authRepository,
    emailService,
    emailTokenSigningKey: process.env.EMAIL_TOKEN_KEY ?? '',
  };
  const existingAdmin = await userRepository.getPrimaryAdmin();
  let admin = existingAdmin;
  if (!admin) {
    if (!name || !email || !password || password.length < 6) {
      throw new Error(
        'Configura BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL y una BOOTSTRAP_ADMIN_PASSWORD de al menos 6 caracteres',
      );
    }
    admin = await userRepository.createPrimaryAdmin({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
  }
  if (admin.email_verified) {
    console.log(`El administrador principal ${admin.email} ya está verificado`);
  } else {
    await sendEmailVerification(admin.id, admin.email, dependencies);
    console.log(
      `Administrador principal listo; se envió un enlace de verificación a ${admin.email}`,
    );
  }
} catch (error) {
  console.error('No se pudo crear el administrador inicial:', error);
  process.exitCode = 1;
} finally {
  await db.end();
}
