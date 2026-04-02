import sqlite3
import pandas as pd
import os
from datetime import datetime

def export_db_to_excel(db_path, excel_path):
    """
    Exports all tables from a SQLite database to an Excel file,
    with each table in a separate sheet.
    """
    print(f"Connecting to database: {db_path}")
    if not os.path.exists(db_path):
        print(f"Error: Database file '{db_path}' not found.")
        return

    try:
        # Create a connection to the database
        conn = sqlite3.connect(db_path)
        
        # Get a list of all tables in the database
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
        
        if not tables:
            print("No tables found in the database.")
            return

        print(f"Found tables: {', '.join(tables)}")
        
        # Use Pandas ExcelWriter to save multiple dataframes to different sheets
        with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
            for table_name in tables:
                print(f"Exporting table: {table_name}...")
                # Read table into a DataFrame
                # Constraints: Using standard SELECT ensures no data modification
                df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
                
                # Write to Excel sheet
                df.to_excel(writer, sheet_name=table_name, index=False)
        
        print(f"Successfully exported data to: {excel_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    DB_FILE = "local.db"
    TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
    OUTPUT_FILE = f"export_local_db_{TIMESTAMP}.xlsx"
    
    # Check for pandas and openpyxl
    try:
        import openpyxl
    except ImportError:
        print("Required library 'openpyxl' not found. Please install it using: pip install openpyxl")
    else:
        export_db_to_excel(DB_FILE, OUTPUT_FILE)
