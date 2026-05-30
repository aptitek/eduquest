import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Initialise et retourne une instance de Drizzle ORM connectée à Cloudflare D1.
 */
export function getDb(database: D1Database) {
  return drizzle(database, { schema });
}

export * from './schema';
export { schema };
