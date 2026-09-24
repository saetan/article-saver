import { defineConfig } from 'drizzle-kit'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://article_saver:article_saver@localhost:5432/article_saver'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema/postgres.ts',
  out: './server/db/migrations/postgres',
  dbCredentials: {
    url: databaseUrl
  }
})
