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
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in Turso:', res.rows.map(r => r.name));
    
    // Check if summaries table exists
    const hasSummaries = res.rows.some(r => r.name === 'summaries');
    if (hasSummaries) {
      const count = await client.execute("SELECT COUNT(*) as count FROM summaries");
      console.log('Summaries row count:', count.rows[0].count);
    } else {
      console.log('Summaries table does NOT exist.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
