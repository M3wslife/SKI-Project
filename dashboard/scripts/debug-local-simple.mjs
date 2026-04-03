import Database from 'better-sqlite3';

const LOCAL_DB = './data/local.db';

async function main() {
  try {
    const db = new Database(LOCAL_DB);
    console.log('Local Invoices Years:');
    const invYrs = db.prepare(`SELECT strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, COUNT(*) as cnt FROM invoices GROUP BY yr`).all();
    console.log(JSON.stringify(invYrs, null, 2));

    console.log('Local Item Years:');
    const itemYrs = db.prepare(`SELECT strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, COUNT(*) as cnt FROM invoice_items GROUP BY yr`).all();
    console.log(JSON.stringify(itemYrs, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
