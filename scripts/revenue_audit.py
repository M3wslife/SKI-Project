import sqlite3
import os
from datetime import datetime

def format_currency(val):
    return f"THB {val:,.2f}"

def run_audit(year='2026', statuses=['BILLING_NOTE', 'PAID', 'PENDING']):
    db_path = 'dashboard/data/local.db'
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("="*60)
    print(f" REVENUE AUDIT REPORT - YEAR: {year}")
    print(f" Active Statuses: {', '.join(statuses)}")
    print(f" Source of Truth: invoice_items.pre_tax_amount")
    print("="*60)

    # Build WHERE clause
    where_parts = []
    params = []

    if year != 'all':
        where_parts.append("strftime('%Y', datetime(i.timestamp/1000, 'unixepoch', 'localtime')) = ?")
        params.append(year)
    
    if statuses:
        placeholders = ', '.join(['?'] * len(statuses))
        where_parts.append(f"i.status IN ({placeholders})")
        params.extend(statuses)
    
    where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

    # 1. Audit by Month
    query = f"""
    SELECT 
        strftime('%Y-%m', datetime(i.timestamp/1000, 'unixepoch', 'localtime')) as month,
        SUM(ii.pre_tax_amount) as item_revenue,
        SUM(i.pre_tax_amount) as header_revenue_full,
        COUNT(DISTINCT i.id) as order_count
    FROM invoices i
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    {where_clause}
    GROUP BY month
    ORDER BY month
    """
    
    cur.execute(query, params)
    rows = cur.fetchall()

    print(f"{'Month':<10} | {'Orders':<8} | {'Item Revenue (SOT)':<20} | {'Header Check':<15} | {'Drift'}")
    print("-" * 80)

    total_items = 0
    total_headers = 0
    total_orders = 0

    for row in rows:
        month = row['month']
        orders = row['order_count']
        item_rev = row['item_revenue'] or 0
        header_rev = row['header_revenue_full'] or 0
        drift = item_rev - header_rev
        
        total_items += item_rev
        total_headers += header_rev
        total_orders += orders

        print(f"{month:<10} | {orders:<8} | {format_currency(item_rev):<20} | {format_currency(header_rev):<15} | {format_currency(drift)}")

    print("-" * 80)
    print(f"{'TOTAL':<10} | {total_orders:<8} | {format_currency(total_items):<20} | {format_currency(total_headers):<15} | {format_currency(total_items - total_headers)}")
    print("="*60)

    # 2. Check for Ghost Invoices (Invoices with no items)
    cur.execute(f"""
        SELECT i.id, i.status, i.pre_tax_amount 
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        {where_clause}
        AND ii.id IS NULL
        LIMIT 10
    """, params)
    ghosts = cur.fetchall()
    if ghosts:
        print("\n[WARNING] Ghost Invoices Found (Header exists, but no items):")
        for g in ghosts:
            print(f" ID: {g['id']} | Status: {g['status']} | Header Amount: {format_currency(g['pre_tax_amount'])}")
    else:
        print("\n[SUCCESS] No Ghost Invoices found in the selected range.")

    conn.close()

if __name__ == "__main__":
    # Default audit for active 2026 statuses
    run_audit()
