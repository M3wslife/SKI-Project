import sqlite3

def get_rev(query):
    conn = sqlite3.connect('dashboard/data/local.db')
    cursor = conn.cursor()
    cursor.execute(query)
    val = cursor.fetchone()[0]
    conn.close()
    return val

# Standardized Revenue Query
standard_query = "SELECT ROUND(SUM(it.pre_tax_amount), 2) FROM invoice_items it JOIN invoices i ON it.invoice_id = i.id WHERE i.status NOT IN ('VOIDED')"

# Current API query logic check (simulation)
total_rev = get_rev(standard_query)
print(f"Total Standard Revenue: {total_rev}")

# Monthly check
monthly_query = "SELECT strftime('%Y-%m', datetime(it.timestamp/1000, 'unixepoch')) as m, ROUND(SUM(it.pre_tax_amount), 2) FROM invoice_items it JOIN invoices i ON it.invoice_id = i.id WHERE i.status NOT IN ('VOIDED') GROUP BY m"
conn = sqlite3.connect('dashboard/data/local.db')
cursor = conn.cursor()
cursor.execute(monthly_query)
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")
conn.close()
