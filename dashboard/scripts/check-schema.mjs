import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.turso') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const res = await client.execute("SELECT sql FROM sqlite_master WHERE name='summaries'");
    console.log(res.rows[0].sql);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
