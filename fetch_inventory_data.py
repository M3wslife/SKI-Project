import requests
import sqlite3
import json
import time

import os

# Configuration
INV_URL = os.environ.get('INV_URL', 'https://search.inventory.dataslot.app/indexes/inventories/search')
INV_AUTH = os.environ.get('INV_AUTH', 'Bearer rlQEd84B9Yh6xmjRqXmSbWanM3W6h3FW')
DB_PATH = os.environ.get('DB_PATH', 'dashboard/data/local.db')

def init_db():
    if not os.path.exists(os.path.dirname(DB_PATH)):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    # Ensure schema is applied even if file exists (adds new columns)
    with open('schema.sql', 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    conn.close()
    print(f"Database schema updated at {DB_PATH}")

def process_hits(hits, conn):
    cursor = conn.cursor()
    def safe_str(val):
        if val is None: return None
        if isinstance(val, (dict, list)): return json.dumps(val)
        return str(val)

    for hit in hits:
        p_id = hit.get('id')
        detail = hit.get('detail', {})
        
        # Insert/Update Product
        cursor.execute("""
            INSERT OR REPLACE INTO inventory_products (
                id, sku, name, alias, category, sub_category, brand, unit,
                price, original_price, purchase_price, available, remaining,
                incoming, status, barcode, group_name, timestamp, updated_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p_id,
            hit.get('sku'),
            hit.get('name'),
            hit.get('alias'),
            safe_str(hit.get('category')),
            safe_str(hit.get('subCategory')),
            safe_str(hit.get('brand')),
            hit.get('unit'),
            hit.get('price'),
            hit.get('originalPrice'),
            hit.get('purchasePrice'),
            hit.get('available'),
            hit.get('remaining'),
            hit.get('incoming'),
            hit.get('status'),
            hit.get('barcode'),
            safe_str(hit.get('group')),
            hit.get('timestamp'),
            hit.get('updatedTimestamp')
        ))
        
        # Insert Transfer Logs
        transfer_logs = detail.get('transferLogs', [])
        for log in transfer_logs:
            cursor.execute("""
                INSERT INTO inventory_transfer_logs (
                    product_id, from_warehouse, to_warehouse, from_bin, to_bin,
                    quantity, actor, note, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p_id,
                log.get('fromWarehouse'),
                log.get('toWarehouse'),
                safe_str(log.get('fromBin')),
                safe_str(log.get('toBin')),
                log.get('quantity'),
                log.get('by'),
                log.get('note'),
                log.get('timestamp')
            ))
            
        # Insert Warehouse Stock
        stock_data = hit.get('stock', {})
        if isinstance(stock_data, dict):
            for wh_code, wh_detail in stock_data.items():
                if isinstance(wh_detail, dict):
                    cursor.execute("""
                        INSERT INTO inventory_warehouse_stock (
                            product_id, warehouse_code, warehouse_name, bin_code,
                            remaining, available
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        p_id,
                        wh_code,
                        wh_detail.get('name'),
                        safe_str(wh_detail.get('bin')),
                        wh_detail.get('remaining'),
                        wh_detail.get('available')
                    ))

    conn.commit()

def fetch_inventory():
    conn = sqlite3.connect(DB_PATH)
    page = 1
    hits_per_page = 500 # Larger page size for bulk fetch
    total_fetched = 0
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': INV_AUTH
    }
    
    while True:
        print(f"Fetching page {page}...")
        payload = {
            "hitsPerPage": hits_per_page,
            "page": page,
            "filter": ["company = SKi"],
            "sort": []
        }
        
        response = requests.post(INV_URL, json=payload, headers=headers)
        if response.status_code != 200:
            print(f"Error {response.status_code}: {response.text}")
            break
            
        data = response.json()
        hits = data.get('hits', [])
        if not hits:
            break
            
        process_hits(hits, conn)
        total_fetched += len(hits)
        print(f"  Processed {len(hits)} hits (Total: {total_fetched})")
        
        total_pages = data.get('totalPages', 0)
        if page >= total_pages:
            break
            
        page += 1
        time.sleep(0.5) 
        
    conn.close()
    print(f"Inventory fetch complete. Total records: {total_fetched}")

if __name__ == "__main__":
    init_db()
    fetch_inventory()
