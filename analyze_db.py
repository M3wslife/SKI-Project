import sqlite3
from datetime import datetime

conn = sqlite3.connect('local.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Table row counts
tables = ['invoices', 'invoice_items', 'inventory_products', 'inventory_warehouse_stock', 'inventory_transfer_logs']
print("=== TABLE COUNTS ===")
for t in tables:
    cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]} rows")

# Invoice statuses
print("\n=== Invoice Statuses & Revenue ===")
cur.execute("SELECT status, COUNT(*) as cnt, ROUND(SUM(pre_tax_amount),0) as revenue FROM invoices GROUP BY status ORDER BY cnt DESC")
for row in cur.fetchall():
    print(dict(row))

# Sample invoice
print("\n=== Sample Invoice ===")
cur.execute("SELECT timestamp, pre_tax_amount, net_amount, vat_amount, customer_name, customer_code, status FROM invoices LIMIT 3")
for row in cur.fetchall():
    d = dict(row)
    if d['timestamp']:
        d['date'] = datetime.fromtimestamp(d['timestamp']/1000).strftime('%Y-%m-%d')
    print(d)

# Revenue by month
print("\n=== Revenue by Month ===")
cur.execute("""
  SELECT
    strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) as month,
    COUNT(*) as orders,
    ROUND(SUM(pre_tax_amount),0) as revenue,
    ROUND(SUM(net_amount),0) as net_amount
  FROM invoices
  WHERE status NOT IN ('CANCELLED', 'VOID')
  GROUP BY month
  ORDER BY month
""")
for row in cur.fetchall():
    print(dict(row))

# Top SKUs
print("\n=== Top 10 SKUs by Revenue ===")
cur.execute("""
  SELECT ii.sku, ii.name,
    ROUND(SUM(ii.quantity),0) as qty,
    ROUND(SUM(ii.pre_tax_amount),0) as revenue
  FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id = i.id
  WHERE i.status NOT IN ('CANCELLED', 'VOID')
  GROUP BY ii.sku
  ORDER BY revenue DESC
  LIMIT 10
""")
for row in cur.fetchall():
    print(dict(row))

# Inventory summary
print("\n=== Inventory Summary ===")
cur.execute("""
  SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN status='ACTIVE' THEN 1 END) as active,
    COUNT(CASE WHEN status='INACTIVE' THEN 1 END) as inactive,
    ROUND(SUM(available),0) as total_available,
    ROUND(SUM(remaining),0) as total_remaining
  FROM inventory_products
""")
print(dict(cur.fetchone()))

# Categories
print("\n=== Top Categories ===")
cur.execute("""
  SELECT category, COUNT(*) as cnt, ROUND(SUM(available),0) as total_avail
  FROM inventory_products
  GROUP BY category
  ORDER BY cnt DESC
  LIMIT 10
""")
for row in cur.fetchall():
    print(dict(row))

# Warehouses
print("\n=== Warehouses ===")
cur.execute("""
  SELECT warehouse_code, warehouse_name, COUNT(*) as products, 
    ROUND(SUM(remaining),0) as total_remaining,
    ROUND(SUM(available),0) as total_available
  FROM inventory_warehouse_stock
  GROUP BY warehouse_code
  ORDER BY total_remaining DESC
""")
for row in cur.fetchall():
    print(dict(row))

# Customer stats
print("\n=== Top 10 Customers ===")
cur.execute("""
  SELECT customer_name, customer_code,
    COUNT(*) as orders,
    ROUND(SUM(pre_tax_amount),0) as revenue
  FROM invoices
  WHERE status NOT IN ('CANCELLED', 'VOID') AND customer_name IS NOT NULL
  GROUP BY customer_name
  ORDER BY revenue DESC
  LIMIT 10
""")
for row in cur.fetchall():
    print(dict(row))

conn.close()
