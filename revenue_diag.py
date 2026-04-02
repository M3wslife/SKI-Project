import sqlite3
import json

def analyze():
    conn = sqlite3.connect('local.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    results = {}

    # 1. Total Header Revenue 2026
    cur.execute("""
        SELECT SUM(pre_tax_amount) as total
        FROM invoices 
        WHERE status NOT IN ('VOIDED') 
        AND strftime('%Y', datetime(timestamp/1000, 'unixepoch', 'localtime')) = '2026'
    """)
    results['header_revenue_2026'] = cur.fetchone()['total']

    # 2. Total Item Revenue 2026 (Joined)
    cur.execute("""
        SELECT SUM(ii.pre_tax_amount) as total
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE i.status NOT IN ('VOIDED')
        AND strftime('%Y', datetime(i.timestamp/1000, 'unixepoch', 'localtime')) = '2026'
    """)
    results['item_revenue_2026_joined'] = cur.fetchone()['total']

    # 3. Total Item Revenue (Raw table, no filter)
    cur.execute("SELECT SUM(pre_tax_amount) FROM invoice_items")
    results['item_revenue_raw_all_time'] = cur.fetchone()[0]

    # 4. Count invoices with and without items
    cur.execute("""
        SELECT COUNT(*) as cnt
        FROM invoices i
        WHERE NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id)
        AND status NOT IN ('VOIDED')
        AND strftime('%Y', datetime(timestamp/1000, 'unixepoch', 'localtime')) = '2026'
    """)
    results['invoices_without_items_2026'] = cur.fetchone()['cnt']

    cur.execute("""
        SELECT COUNT(*) as cnt
        FROM invoices i
        WHERE EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id)
        AND status NOT IN ('VOIDED')
        AND strftime('%Y', datetime(timestamp/1000, 'unixepoch', 'localtime')) = '2026'
    """)
    results['invoices_with_items_2026'] = cur.fetchone()['cnt']

    # 5. Check a few invoices where header != sum(items)
    cur.execute("""
        SELECT i.id, i.pre_tax_amount as header_amount, SUM(ii.pre_tax_amount) as items_amount
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE i.status NOT IN ('VOIDED')
        AND strftime('%Y', datetime(i.timestamp/1000, 'unixepoch', 'localtime')) = '2026'
        GROUP BY i.id
        HAVING ABS(i.pre_tax_amount - SUM(ii.pre_tax_amount)) > 1.0
        LIMIT 5
    """)
    results['mismatched_invoices_sample'] = [dict(row) for row in cur.fetchall()]

    conn.close()
    
    with open('revenue_diag.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    analyze()
