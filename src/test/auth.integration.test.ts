import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import type { AuthDependencies, SessionRepository } from '../modules/auth/auth.types.js';
import type { CreateUserParams, User, UserRepository } from '../modules/user/user.types.js';
import type { EmailService } from '../services/email.service.js';

const signingKey = 'test-secret-key-with-at-least-32-characters';
const emailTokenSigningKey = 'test-email-token-key-with-at-least-32-characters';
const newUserPassword = 'clave-elegida-en-el-test';
const users = new Map<string, User>();
const sessions = new Map<string, { userId: string; expiresAt: Date }>();
const sentTokens = new Map<string, string>();
const cookieValue = (header: string | string[] | undefined) => {
  const cookie = Array.isArray(header) ? header[0] : header;
  return cookie?.split(';')[0] ?? '';
};

const userRepository: UserRepository = {
  async getByEmail(email) {
    return [...users.values()].find((user) => user.email === email.toLowerCase()) ?? null;
  },
  async getById(id) {
    return users.get(id) ?? null;
  },
  async getPrimaryAdmin() {
    return (
      [...users.values()]
        .filter((user) => user.role === 'admin')
        .sort((first, second) => first.created_at.getTime() - second.created_at.getTime())[0] ??
      null
    );
  },
  async verifyEmail(id) {
    const user = users.get(id);
    if (!user || user.email_verified) return false;
    user.email_verified = true;
    return true;
  },
  async create(params: CreateUserParams) {
    const user: User = {
      id: randomUUID(),
      name: params.name,
      email: params.email.toLowerCase(),
      password_hash: params.passwordHash,
      phone: params.phone,
      role: params.role,
      email_verified: false,
      created_at: new Date(),
    };
    users.set(user.id, user);
    return user;
  },
  async createPrimaryAdmin(params) {
    return this.create({ ...params, phone: null, role: 'admin' });
  },
};

const emailService: EmailService = {
  async sendEmailVerification(to, token) {
    sentTokens.set(to, token);
  },
};

const sessionRepository: SessionRepository = {
  async create(id, userId, expiresAt) {
    sessions.set(id, { userId, expiresAt });
  },
  async getActive(id, userId) {
    const session = sessions.get(id);
    return Boolean(session && session.userId === userId && session.expiresAt > new Date());
  },
  async revoke(id) {
    sessions.delete(id);
  },
};

const dependencies: AuthDependencies = {
  users: userRepository,
  sessions: sessionRepository,
  emailService,
  emailTokenSigningKey,
};

describe('registro administrativo e sesión unificada', () => {
  let app: ReturnType<typeof createApp>;
  let adminCookie: string;

  beforeEach(async () => {
    users.clear();
    sessions.clear();
    sentTokens.clear();
    app = createApp(dependencies, signingKey);
    const admin = await userRepository.create({
      name: 'Administración',
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('password-segura', 4),
      phone: null,
      role: 'admin',
    });
    admin.email_verified = true;
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: admin.email, password: 'password-segura' },
    });
    adminCookie = cookieValue(response.headers['set-cookie']);
  });

  afterEach(async () => {
    await app.close();
  });

  it('no expone auto-registro y exige sesión de administración para crear cuentas', async () => {
    const publicRegistration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Alumno', email: 'alumno@example.com', password: 'password' },
    });
    const unauthenticatedCreate = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      payload: {
        name: 'Alumno',
        email: 'alumno@example.com',
        password: newUserPassword,
        role: 'alumno',
      },
    });

    expect(publicRegistration.statusCode).toBe(404);
    expect(unauthenticatedCreate.statusCode).toBe(401);
  });

  it('exige verificar el correo antes del login y acepta el enlace una sola vez', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: adminCookie },
      payload: {
        name: 'Alumna',
        email: 'alumna@example.com',
        password: newUserPassword,
        role: 'alumno',
      },
    });
    const body = created.json<{ user: User }>();
    const loginBeforeVerification = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alumna@example.com', password: newUserPassword },
    });
    const verificationToken = sentTokens.get('alumna@example.com');
    const verification = await app.inject({
      method: 'GET',
      url: `/api/auth/verify-email?token=${verificationToken}`,
    });
    const replay = await app.inject({
      method: 'GET',
      url: `/api/auth/verify-email?token=${verificationToken}`,
    });
    const loginAfterVerification = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alumna@example.com', password: newUserPassword },
    });

    expect(created.statusCode).toBe(201);
    expect(body.user.role).toBe('alumno');
    expect(body.user).not.toHaveProperty('password_hash');
    expect(body).not.toHaveProperty('password');
    expect(loginBeforeVerification.statusCode).toBe(403);
    expect(verification.statusCode).toBe(200);
    expect(replay.statusCode).toBe(400);
    expect(loginAfterVerification.statusCode).toBe(200);
    expect(loginAfterVerification.json().user.role).toBe('alumno');
  });

  it('bloquea la creación de cuentas a usuarios autenticados que no son administradores', async () => {
    const student = await userRepository.create({
      name: 'Alumno',
      email: 'alumno@example.com',
      passwordHash: await bcrypt.hash('password-segura', 4),
      phone: null,
      role: 'alumno',
    });
    student.email_verified = true;
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: student.email, password: 'password-segura' },
    });
    const studentCookie = cookieValue(login.headers['set-cookie']);
    const create = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: studentCookie },
      payload: {
        name: 'Otro alumno',
        email: 'otro@example.com',
        password: newUserPassword,
        role: 'alumno',
      },
    });

    expect(login.statusCode).toBe(200);
    expect(create.statusCode).toBe(403);
  });
});
