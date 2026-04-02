import sqlite3
from datetime import datetime
import sys

conn = sqlite3.connect('local.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

out = []

def p(s):
    out.append(str(s))

# Table row counts
p("=== TABLE COUNTS ===")
tables = ['invoices', 'invoice_items', 'inventory_products', 'inventory_warehouse_stock', 'inventory_transfer_logs']
for t in tables:
    cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
    p(f"  {t}: {cur.fetchone()[0]} rows")

# Invoice statuses
p("\n=== Invoice Statuses & Revenue ===")
cur.execute("SELECT status, COUNT(*) as cnt, ROUND(SUM(pre_tax_amount),0) as revenue FROM invoices GROUP BY status ORDER BY cnt DESC")
for row in cur.fetchall():
    p(dict(row))

# Sample invoice
p("\n=== Sample Invoice ===")
cur.execute("SELECT timestamp, pre_tax_amount, net_amount, vat_amount, customer_name, customer_code, status FROM invoices LIMIT 3")
for row in cur.fetchall():
    d = dict(row)
    if d['timestamp']:
        d['date'] = datetime.fromtimestamp(d['timestamp']/1000).strftime('%Y-%m-%d')
    p(d)

# Revenue by month
p("\n=== Revenue by Month ===")
cur.execute("""
  SELECT
    strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) as month,
    COUNT(*) as orders,
    ROUND(SUM(pre_tax_amount),0) as revenue,
    ROUND(SUM(net_amount),0) as net_amount
  FROM invoices
  WHERE status NOT IN ('CANCELLED', 'VOID', 'VOIDED')
  GROUP BY month
  ORDER BY month
""")
for row in cur.fetchall():
    p(dict(row))

# Top SKUs
p("\n=== Top 10 SKUs by Revenue ===")
cur.execute("""
  SELECT ii.sku, ii.name,
    ROUND(SUM(ii.quantity),0) as qty,
    ROUND(SUM(ii.pre_tax_amount),0) as revenue
  FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id = i.id
  WHERE i.status NOT IN ('CANCELLED', 'VOID', 'VOIDED')
  GROUP BY ii.sku
  ORDER BY revenue DESC
  LIMIT 10
""")
for row in cur.fetchall():
    p(dict(row))

# Inventory summary
p("\n=== Inventory Summary ===")
cur.execute("""
  SELECT
    COUNT(*) as total_products,
    COUNT(CASE WHEN status='ACTIVE' THEN 1 END) as active,
    COUNT(CASE WHEN status='INACTIVE' THEN 1 END) as inactive,
    ROUND(SUM(available),0) as total_available,
    ROUND(SUM(remaining),0) as total_remaining
  FROM inventory_products
""")
p(dict(cur.fetchone()))

# Categories
p("\n=== Top Categories ===")
cur.execute("""
  SELECT category, COUNT(*) as cnt, ROUND(SUM(available),0) as total_avail
  FROM inventory_products
  GROUP BY category
  ORDER BY cnt DESC
  LIMIT 10
""")
for row in cur.fetchall():
    p(dict(row))

# Warehouses
p("\n=== Warehouses ===")
cur.execute("""
  SELECT warehouse_code, warehouse_name, COUNT(DISTINCT product_id) as products,
    ROUND(SUM(remaining),0) as total_remaining,
    ROUND(SUM(available),0) as total_available
  FROM inventory_warehouse_stock
  GROUP BY warehouse_code
  ORDER BY total_remaining DESC
""")
for row in cur.fetchall():
    p(dict(row))

# Customer stats
p("\n=== Top 10 Customers ===")
cur.execute("""
  SELECT customer_name, customer_code,
    COUNT(*) as orders,
    ROUND(SUM(pre_tax_amount),0) as revenue
  FROM invoices
  WHERE status NOT IN ('CANCELLED', 'VOID', 'VOIDED') AND customer_name IS NOT NULL
  GROUP BY customer_name
  ORDER BY revenue DESC
  LIMIT 10
""")
for row in cur.fetchall():
    p(dict(row))

# Purchase price vs sale price (for margin)
p("\n=== Margin Potential (sample products with purchase price) ===")
cur.execute("""
  SELECT sku, name, price, purchase_price,
    ROUND((price - purchase_price) / price * 100, 1) as margin_pct
  FROM inventory_products
  WHERE purchase_price > 0 AND price > 0
  ORDER BY margin_pct DESC
  LIMIT 10
""")
for row in cur.fetchall():
    p(dict(row))

conn.close()

# Write to file with utf-8
with open('analyze_output2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print("Done. Check analyze_output2.txt")
