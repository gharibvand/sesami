import { defineConfig } from '@mikro-orm/postgresql';

function buildClientUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL;
  }
  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? '5432';
  const user = process.env.DATABASE_USER ?? 'postgres';
  const pass = process.env.DATABASE_PASS ?? '123';
  const db = process.env.DATABASE_NAME ?? 'sesami';
  return `postgres://${user}:${pass}@${host}:${port}/${db}`;
}

export default defineConfig({
  clientUrl: buildClientUrl(),
  dbName: process.env.DATABASE_NAME ?? 'sesami',
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    snapshot: true,
  },
});
