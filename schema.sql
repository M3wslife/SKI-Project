-- SKI Project Database Schema

-- Invoice Headers
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    task_number TEXT,
    workflow_id TEXT,
    status TEXT,
    company TEXT,
    mid TEXT,
    timestamp INTEGER,
    updated_timestamp INTEGER,
    net_amount REAL,
    vat_amount REAL,
    pre_tax_amount REAL,
    shipping_amount REAL,
    paid_amount REAL,
    remaining_amount REAL,
    customer_name TEXT,
    customer_code TEXT,
    peak_id TEXT,
    peak_code TEXT,
    assignee_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT,
    invoice_id TEXT,
    sku TEXT,
    name TEXT,
    quantity REAL,
    unit TEXT,
    price REAL,
    net_amount REAL,
    pre_tax_amount REAL,
    vat_amount REAL,
    discount_value REAL,
    discount_unit TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Inventory Products
CREATE TABLE IF NOT EXISTS inventory_products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT,
    alias TEXT,
    category TEXT,
    sub_category TEXT,
    brand TEXT,
    unit TEXT,
    price REAL,
    original_price REAL,
    purchase_price REAL,
    available REAL,
    remaining REAL,
    incoming REAL,
    status TEXT,
    barcode TEXT,
    group_name TEXT,
    timestamp INTEGER,
    updated_timestamp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Warehouse Stock
CREATE TABLE IF NOT EXISTS inventory_warehouse_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT,
    warehouse_code TEXT,
    warehouse_name TEXT,
    bin_code TEXT,
    remaining REAL,
    available REAL,
    FOREIGN KEY (product_id) REFERENCES inventory_products(id)
);

-- Inventory Transfer Logs
CREATE TABLE IF NOT EXISTS inventory_transfer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT,
    from_warehouse TEXT,
    to_warehouse TEXT,
    from_bin TEXT,
    to_bin TEXT,
    quantity REAL,
    actor TEXT,
    note TEXT,
    timestamp INTEGER,
    FOREIGN KEY (product_id) REFERENCES inventory_products(id)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_invoice_timestamp ON invoices(timestamp);
CREATE INDEX IF NOT EXISTS idx_invoice_task_number ON invoices(task_number);
CREATE INDEX IF NOT EXISTS idx_item_sku ON invoice_items(sku);
CREATE INDEX IF NOT EXISTS idx_item_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_warehouse_stock(product_id);
