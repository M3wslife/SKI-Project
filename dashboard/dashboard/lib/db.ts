import Database from 'better-sqlite3';
import { createClient, Client } from '@libsql/client';
import path from 'path';

import fs from 'fs';

// Database configuration
const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

// Resilient path search for Vercel layering
function resolveDbPath() {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, 'public', 'local.db'),
    path.join(cwd, 'local.db'),
    path.join(cwd, 'data', 'local.db'),
    // Vercel serverless functions sometimes have a deep path
    path.join(cwd, '.next', 'server', 'chunks', 'public', 'local.db'),
    path.join(cwd, '.next', 'server', 'public', 'local.db'),
  ];

  console.log(`🔍 Searching for database in ${cwd}...`);

  for (const p of paths) {
    if (fs.existsSync(p)) {
      const stats = fs.statSync(p);
      console.log(`✅ Database found: ${p} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return p;
    } else {
      console.log(`❌ Not found at: ${p}`);
    }
  }
  
  const defaultPath = paths[0];
  console.error(`🚨 CRITICAL: Database not found in ANY search path! Defaulting to: ${defaultPath}`);
  return defaultPath;
}

const DB_PATH = resolveDbPath();

interface DbClient {
  all: (sql: string, params?: any[]) => Promise<any[]>;
  get: (sql: string, params?: any[]) => Promise<any | undefined>;
  run: (sql: string, params?: any[]) => Promise<void>;
}

let client: DbClient | null = null;

export function getDb(): DbClient {
  if (client) return client;

  // Use Turso ONLY if provided (Cloud Mode)
  if (TURSO_URL) {
    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });

    client = {
      all: async (sql, params = []) => {
        const result = await libsql.execute({ sql, args: params });
        return result.rows as any[];
      },
      get: async (sql, params = []) => {
        const result = await libsql.execute({ sql, args: params });
        return result.rows[0] as any;
      },
      run: async (sql, params = []) => {
        await libsql.execute({ sql, args: params });
      }
    };
    return client;
  }

  // DEFAULT: Use Embedded local.db (Bundled Asset for Vercel)
  const isProduction = process.env.NODE_ENV === 'production';
  const sqlite = new Database(DB_PATH, { readonly: isProduction });
  
  if (!isProduction) {
    sqlite.pragma('journal_mode = WAL');
  }

  client = {
    all: async (sql, params = []) => {
      return sqlite.prepare(sql).all(...params);
    },
    get: async (sql, params = []) => {
      return sqlite.prepare(sql).get(...params);
    },
    run: async (sql, params = []) => {
      if (isProduction) throw new Error('Database is read-only in production.');
      sqlite.prepare(sql).run(...params);
    }
  };

  return client;
}
