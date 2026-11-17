import { createApp } from './app.js';
import { assertDatabaseConfig } from './db/index.js';

assertDatabaseConfig();
const app = createApp();
const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ host: '0.0.0.0', port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
