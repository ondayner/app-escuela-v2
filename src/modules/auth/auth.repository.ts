import db from '../../db/index.js';
import type { SessionRepository } from './auth.types.js';

const sessionRepository = {
  async create(sessionId, userId, expiresAt) {
    await db.query('INSERT INTO sessions(id, user_id, expires_at) VALUES($1, $2, $3)', [
      sessionId,
      userId,
      expiresAt,
    ]);
  },
  async getActive(sessionId, userId) {
    const result = await db.query(
      `SELECT id FROM sessions
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [sessionId, userId],
    );
    return result.rowCount === 1;
  },
  async revoke(sessionId) {
    await db.query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL', [
      sessionId,
    ]);
  },
} satisfies SessionRepository;

export default sessionRepository;
