import Database from 'better-sqlite3';
import path from 'path';

const LOCAL_DB = './data/local.db';

async function main() {
  try {
    const db = new Database(LOCAL_DB);
    console.log('--- Checking Local DB (data/local.db) ---');
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    if (tables.some(t => t.name === 'invoice_items')) {
      const yrRes = db.prepare(`
        SELECT 
          strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, 
          COUNT(*) as cnt
        FROM invoice_items 
        GROUP BY yr
      `).all();
      console.table(yrRes);
      
      const invRes = db.prepare(`
        SELECT 
          strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, 
          COUNT(*) as cnt
        FROM invoices 
        GROUP BY yr
      `).all();
      console.table(invRes);
    } else {
      console.log('invoice_items table missing in local.db');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
