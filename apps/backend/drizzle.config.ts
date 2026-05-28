import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const devVarsPath = join(process.cwd(), '.dev.vars');
  if (existsSync(devVarsPath)) {
    const devVars = readFileSync(devVarsPath, 'utf8');
    const databaseUrlLine = devVars
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && line.startsWith('DATABASE_URL='));

    if (databaseUrlLine) {
      const rawValue = databaseUrlLine.slice('DATABASE_URL='.length).trim();
      return rawValue.replace(/^["']|["']$/g, '');
    }
  }

  return 'postgresql://postgres:postgres@localhost:5432/eduquest';
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
