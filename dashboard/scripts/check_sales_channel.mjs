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
    const res = await client.execute(`
      SELECT 
        shop_name, 
        sale_channel, 
        COUNT(*) as count 
      FROM invoices 
      GROUP BY shop_name, sale_channel
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('Current Shop and Sale Channel distribution:');
    console.table(res.rows);

    const sample = await client.execute("SELECT * FROM invoices WHERE sale_channel IS NOT NULL LIMIT 5");
    console.log('Sample invoice data:');
    console.log(JSON.stringify(sample.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
