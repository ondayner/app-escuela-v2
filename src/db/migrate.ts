import { readFile } from 'node:fs/promises';
import db, { assertDatabaseConfig } from './index.js';

try {
  assertDatabaseConfig();
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await db.query(schema);
  console.log('Esquema V2 aplicado.');
} catch (error) {
  console.error('No se pudo aplicar el esquema V2:', error);
  process.exitCode = 1;
} finally {
  await db.end();
}
