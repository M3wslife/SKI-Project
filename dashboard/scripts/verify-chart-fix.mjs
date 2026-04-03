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
    const res = await client.execute({
      sql: "SELECT data FROM summaries WHERE category='pl' AND key='main:2026:'",
    });
    
    if (res.rows.length > 0) {
      const data = JSON.parse(res.rows[0].data);
      console.log('Summary structure keys:', Object.keys(data));
      if (data.monthlyData) {
        console.log('monthlyData first item:', data.monthlyData[0]);
        console.log('monthlyData count:', data.monthlyData.length);
      } else {
        console.log('monthlyData MISSING!');
      }
    } else {
      console.log('No 2026 Yearly Summary found.');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
