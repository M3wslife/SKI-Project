import sqlite3

def run():
    conn = sqlite3.connect('local.db')
    cur = conn.cursor()
    
    print("--- RAW SUMS ---")
    cur.execute("SELECT SUM(pre_tax_amount) FROM invoice_items")
    print(f"invoice_items raw sum: {cur.fetchone()[0]}")
    
    cur.execute("SELECT SUM(pre_tax_amount) FROM invoices WHERE status != 'VOIDED'")
    print(f"invoices (header) raw sum: {cur.fetchone()[0]}")
    
    print("\n--- SAMPLE INVOICE ITEMS ---")
    cur.execute("SELECT invoice_id, sku, quantity, price, pre_tax_amount FROM invoice_items LIMIT 5")
    for row in cur.fetchall():
        print(row)
        
    print("\n--- JOIN TEST ---")
    cur.execute("""
        SELECT SUM(ii.pre_tax_amount) 
        FROM invoice_items ii 
        JOIN invoices i ON ii.invoice_id = i.id 
        WHERE i.status != 'VOIDED'
    """)
    print(f"JOINED sum: {cur.fetchone()[0]}")
    
    conn.close()

if __name__ == "__main__":
    run()
