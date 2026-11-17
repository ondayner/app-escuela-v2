import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL;
const db = new Pool({ connectionString });

export const assertDatabaseConfig = () => {
  if (!connectionString) throw new Error('POSTGRES_URL no está configurado');
};

export default db;
