import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.turso') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const year = '2026';
  const key = `main:${year}:`;
  console.log(`Checking key: '${key}'`);
  
  const res = await client.execute({
    sql: "SELECT data FROM summaries WHERE category = 'pl' AND key = ?",
    args: [key]
  });
  
  if (res.rows.length > 0) {
    console.log('Row found!');
    console.log(res.rows[0].data.substring(0, 500)); // Print start of JSON
  } else {
    console.log('Row NOT found.');
  }
}

main().catch(console.error);
