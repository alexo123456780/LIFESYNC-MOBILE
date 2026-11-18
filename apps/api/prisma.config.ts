import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` no necesita la base; migrate y seed sí fallan sin DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
