import Database from 'better-sqlite3';
import path from 'path';

async function main() {
  try {
    const db = new Database('./local.db');
    const res = db.prepare("SELECT category, key FROM summaries WHERE category='pl' AND key LIKE 'main:2026%'").all();
    console.log('Local 2026 PL Keys:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
