import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _sql: ReturnType<typeof neon> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function ensureDb() {
  if (!_db) {
    _sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(_sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return ensureDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export type Db = ReturnType<typeof drizzle>;
