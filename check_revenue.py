import sqlite3

db_path = r'c:\Users\autob\OneDrive\Desktop\SKi SKC\SKI Project\local.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 2026 filter
year_filter = "strftime('%Y', datetime(timestamp/1000, 'unixepoch', 'localtime')) = '2026'"

print("--- Revenue Analysis for 2026 ---")

# 1. Header sum from invoices table
cursor.execute(f"SELECT SUM(pre_tax_amount) FROM invoices WHERE status NOT IN ('VOIDED') AND {year_filter}")
header_sum = cursor.fetchone()[0]
print(f"Header Sum (invoices table): {header_sum:,.2f}")

# 2. Item sum from invoice_items table (joining with invoices for the date filter)
cursor.execute(f"""
    SELECT SUM(ii.pre_tax_amount) 
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.status NOT IN ('VOIDED') AND {year_filter.replace('timestamp', 'i.timestamp')}
""")
item_sum = cursor.fetchone()[0]
print(f"Item Sum (invoice_items table joined): {item_sum:,.2f}")

# 3. Item sum from invoice_items table (all items, no join)
cursor.execute("SELECT SUM(pre_tax_amount) FROM invoice_items")
item_sum_raw = cursor.fetchone()[0]
print(f"Item Sum (invoice_items table RAW, all time): {item_sum_raw:,.2f}")

# 4. Count invoices and items
cursor.execute(f"SELECT COUNT(*) FROM invoices WHERE status NOT IN ('VOIDED') AND {year_filter}")
invoice_count = cursor.fetchone()[0]
print(f"Invoice count: {invoice_count}")

cursor.execute(f"""
    SELECT COUNT(ii.id) 
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.status NOT IN ('VOIDED') AND {year_filter.replace('timestamp', 'i.timestamp')}
""")
item_count = cursor.fetchone()[0]
print(f"Item count: {item_count}")

# 5. Check for missing links
cursor.execute("SELECT COUNT(*) FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices)")
missing_links = cursor.fetchone()[0]
print(f"Items with no parent invoice: {missing_links}")

conn.close()
