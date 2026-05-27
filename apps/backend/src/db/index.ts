import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function shouldUseSsl(databaseUrl: string) {
  const host = new URL(databaseUrl).hostname;
  return !['localhost', '127.0.0.1', 'postgres'].includes(host);
}

/**
 * Initialise et retourne une instance de Drizzle ORM connectée à PostgreSQL.
 * Spécifiquement optimisé pour les Workers Cloudflare (pool de connexions de 1 max par instance).
 */
export function getDb(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 1, // Limite critique pour le Serverless/Cloudflare Workers pour éviter d'épuiser les connexions Postgres
    ssl: shouldUseSsl(databaseUrl)
      ? { rejectUnauthorized: false } // Requis pour les connexions cloud sécurisées comme Neon ou Supabase
      : false,
  });

  return drizzle(client, { schema });
}

export * from './schema';
export { schema };
