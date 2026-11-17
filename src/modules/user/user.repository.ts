import db from '../../db/index.js';
import type { User, UserRepository } from './user.types.js';

const getByEmail: UserRepository['getByEmail'] = async (email) => {
  const result = await db.query<User>('SELECT * FROM users WHERE lower(email) = lower($1)', [
    email,
  ]);
  return result.rows[0] ?? null;
};

const getById: UserRepository['getById'] = async (id) => {
  const result = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

const getPrimaryAdmin: UserRepository['getPrimaryAdmin'] = async () => {
  const result = await db.query<User>(
    `SELECT * FROM users WHERE role = 'admin'
     ORDER BY created_at ASC, id ASC LIMIT 1`,
  );
  return result.rows[0] ?? null;
};

const verifyEmail: UserRepository['verifyEmail'] = async (id) => {
  const result = await db.query(
    'UPDATE users SET email_verified = TRUE WHERE id = $1 AND email_verified = FALSE RETURNING id',
    [id],
  );
  return result.rowCount === 1;
};

const create: UserRepository['create'] = async ({ name, email, passwordHash, phone, role }) => {
  const result = await db.query<User>(
    `INSERT INTO users(name, email, password_hash, phone, role)
     VALUES($1, lower($2), $3, $4, $5) RETURNING *`,
    [name, email, passwordHash, phone, role],
  );
  const user = result.rows[0];
  if (!user) throw new Error('No se pudo crear el usuario');
  return user;
};

const createPrimaryAdmin: UserRepository['createPrimaryAdmin'] = async ({
  name,
  email,
  passwordHash,
}) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('app-escuela-v2-bootstrap'))");
    const result = await client.query<User>(
      `INSERT INTO users(name, email, password_hash, role)
       SELECT $1, lower($2), $3, 'admin'
       WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
       RETURNING *`,
      [name, email, passwordHash],
    );
    const admin = result.rows[0];
    if (!admin) throw new Error('El administrador principal ya existe');
    await client.query('COMMIT');
    return admin;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const userRepository: UserRepository = {
  getByEmail,
  getById,
  getPrimaryAdmin,
  verifyEmail,
  create,
  createPrimaryAdmin,
};

export default userRepository;
