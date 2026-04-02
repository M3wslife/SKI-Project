import requests
import json

URL = 'http://localhost:3000/api/pl?year=2026'

try:
    # Since I don't have a running server in this environment, I'll mock the DB call or just assume it works if the code is correct.
    # Wait, I can't easily query the Next.js API route without a running server.
    # I'll just query the local.db directly with the same logic to verify the data exists.
    import sqlite3
    db = sqlite3.connect('dashboard/data/local.db')
    cursor = db.cursor()
    
    print("--- Channels ---")
    channels = cursor.execute("""
      SELECT
        COALESCE(sale_channel, 'Other') as name,
        ROUND(SUM(pre_tax_amount), 2) as value
      FROM invoice_items
      GROUP BY name
      ORDER BY value DESC
    """).fetchall()
    for c in channels:
        print(f"{c[0]}: {c[1]}")
        
    print("\n--- Shops ---")
    shops = cursor.execute("""
      SELECT
        COALESCE(shop_name, 'Other') as name,
        ROUND(SUM(pre_tax_amount), 2) as value
      FROM invoice_items
      GROUP BY name
      ORDER BY value DESC
      LIMIT 10
    """).fetchall()
    for s in shops:
        print(f"{s[0]}: {s[1]}")
        
    db.close()
except Exception as e:
    print(f"Error: {e}")
