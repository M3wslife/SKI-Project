import requests
import sqlite3
import json
import time
from datetime import datetime

import os
from datetime import datetime, timedelta

# Configuration
WFM_URL = os.environ.get('WFM_URL', 'https://open-api.dataslot.app/search/wfm/v1/SKi')
DB_PATH = os.environ.get('DB_PATH', 'dashboard/data/local.db')

# Default Time Range: 2026-01-01 to Today
START_2026 = 1767225600000 # 2026-01-01 00:00:00 UTC
now = datetime.now()
START_TIMESTAMP = int(os.environ.get('START_TIMESTAMP', START_2026))
END_TIMESTAMP = int(os.environ.get('END_TIMESTAMP', (now + timedelta(days=1)).timestamp() * 1000))

def init_db():
    if not os.path.exists(os.path.dirname(DB_PATH)):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    # Ensure schema is applied even if file exists (adds new columns)
    with open('schema.sql', 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    conn.close()
    print(f"Database initialized at {DB_PATH}")

def process_hits(hits, conn):
    cursor = conn.cursor()
    for hit in hits:
        h_id = hit.get('id')
        detail = hit.get('detail', {})
        order = detail.get('order', {})
        customer = detail.get('customerInfo', {})
        peak = detail.get('peakInfo', {})
        
        timestamp = hit.get('timestamp')
        
        # 🟢 UPDATED MAPPING: Prioritize SALE_ORDER.detail.order.salesChannel
        # If missing, fallback to existing customer info (group/branchName)
        sale_channel = order.get('salesChannel') or customer.get('group')
        shop_name = order.get('salesChannel') or customer.get('branchName')

        # Insert Invoice
        cursor.execute("""
            INSERT OR REPLACE INTO invoices (
                id, task_number, workflow_id, status, company, mid, 
                timestamp, updated_timestamp, net_amount, vat_amount, 
                pre_tax_amount, shipping_amount, paid_amount, remaining_amount,
                customer_name, customer_code, peak_id, peak_code, assignee_name,
                sale_channel, shop_name, customer_grade, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            h_id,
            hit.get('taskNumber'),
            hit.get('workflowId'),
            hit.get('status'),
            hit.get('company'),
            hit.get('mid'),
            timestamp,
            hit.get('updatedTimestamp'),
            order.get('netAmount'),
            order.get('vatAmount'),
            order.get('preTaxAmount'),
            order.get('shippingAmount'),
            order.get('paidAmount'),
            order.get('remainingAmount'),
            customer.get('name'),
            customer.get('code'),
            peak.get('id'),
            peak.get('code'),
            (detail.get('assignees') or [{}])[0].get('employeeNumber') if detail.get('assignees') else None,
            sale_channel,
            shop_name,
            customer.get('grade'),
            detail.get('taskInfo', {}).get('createdDate')
        ))
        # Clear existing items for this invoice to prevent duplication
        cursor.execute("DELETE FROM invoice_items WHERE invoice_id = ?", (h_id,))

        # Insert Items
        items = order.get('items', [])
        for item in items:
            cursor.execute("""
                INSERT INTO invoice_items (
                    item_id, invoice_id, sku, name, quantity, unit,
                    price, net_amount, pre_tax_amount, vat_amount,
                    discount_value, discount_unit, timestamp,
                    sale_channel, shop_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get('itemId'),
                h_id,
                item.get('sku'),
                item.get('name'),
                item.get('quantity'),
                item.get('unit'),
                item.get('price'),
                item.get('netAmount'),
                item.get('preTaxAmount'),
                item.get('vatAmount'),
                item.get('discount', {}).get('value'),
                item.get('discount', {}).get('unit'),
                timestamp,
                sale_channel,
                shop_name
            ))
    conn.commit()

def fetch_data():
    conn = sqlite3.connect(DB_PATH)
    workflows = ['INVOICE', 'TAX_INVOICE']
    
    for wf in workflows:
        page = 1
        hits_per_page = 100
        total_fetched_wf = 0
        print(f"Fetching workflow: {wf}")
        
        while True:
            print(f"  Fetching page {page} for {wf}...")
            payload = {
                "hitsPerPage": hits_per_page,
                "page": page,
                "filter": [
                    f"workflowId = {wf}",
                    "type = TASK",
                    f"timestamp >= {START_TIMESTAMP}",
                    f"timestamp < {END_TIMESTAMP}"
                ],
                "sort": ["timestamp:desc"]
            }
            
            response = requests.post(WFM_URL, json=payload, headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
            if response.status_code != 200:
                print(f"  Error {response.status_code}: {response.text}")
                break
                
            data = response.json()
            hits = data.get('hits', [])
            if not hits:
                break
                
            process_hits(hits, conn)
            total_fetched_wf += len(hits)
            print(f"    Processed {len(hits)} hits (Workflow {wf} Total: {total_fetched_wf})")
            
            total_pages = data.get('totalPages', 0)
            if page >= total_pages:
                break
                
            page += 1
            time.sleep(0.5)
            
        print(f"Completed {wf}. Total: {total_fetched_wf}")
        
    conn.close()
    print(f"Data fetch complete for all workflows.")

if __name__ == "__main__":
    init_db()
    fetch_data()
