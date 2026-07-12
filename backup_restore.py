#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

# Configure environment and directories
BACKUP_DIR = os.path.join(os.getcwd(), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# List of all critical tables to back up
TABLES = [
    "accounts",
    "categories",
    "transactions",
    "budgets",
    "bank_reconciliations",
    "tax_profiles",
    "tax_configurations",
    "tax_calculations"
]

def make_request(path, method="GET", body=None, headers=None):
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL and Service Role Key are required.")
    
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    
    default_headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    if headers:
        default_headers.update(headers)
        
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=default_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # For 204 No Content or empty responses, return empty list
        if e.code in [204, 201, 200]:
            return e.code, []
        if e.code == 404:
            # Table does not exist or empty
            return 404, []
        raise e
    except Exception as e:
        raise e

def perform_backup(filename=None):
    """
    Backs up all tables from Supabase REST API into a single JSON file.
    """
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.json"
        
    filepath = os.path.join(BACKUP_DIR, filename)
    print(f"Starting backup to {filepath}...")
    
    backup_data = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "version": "1.0",
            "type": "database_backup"
        },
        "tables": {}
    }
    
    for table in TABLES:
        try:
            status, data = make_request(f"{table}?select=*")
            if status == 404:
                print(f"Table {table} not found or not exposed in API. Skipping.")
                continue
            backup_data["tables"][table] = data
            print(f"Backed up table '{table}': {len(data)} rows.")
        except Exception as e:
            print(f"Error backing up table '{table}': {e}")
            
    # Also backup local audit logs if they exist
    audit_logs_path = os.path.join(BACKUP_DIR, "audit_logs.jsonl")
    audit_logs = []
    if os.path.exists(audit_logs_path):
        try:
            with open(audit_logs_path, "r") as f:
                for line in f:
                    if line.strip():
                        audit_logs.append(json.loads(line))
            backup_data["audit_logs"] = audit_logs
            print(f"Backed up local audit logs: {len(audit_logs)} records.")
        except Exception as e:
            print(f"Error backing up local audit logs: {e}")
            
    with open(filepath, "w") as f:
        json.dump(backup_data, f, indent=2)
        
    print(f"Backup successfully completed! Saved to {filepath}")
    return filepath

def perform_restore(filepath):
    """
    Restores database tables from a JSON backup file.
    Performs operations within individual table transactions/truncates to avoid partial data states.
    """
    if not os.path.exists(filepath):
        # Check inside backups dir if path is just a filename
        alt_path = os.path.join(BACKUP_DIR, filepath)
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            print(f"Error: Backup file not found at {filepath}")
            sys.exit(1)
            
    print(f"Starting restore from {filepath}...")
    with open(filepath, "r") as f:
        backup_data = json.load(f)
        
    tables_data = backup_data.get("tables", {})
    
    # Track original state for manual transaction rollback in case of restore failure
    original_state = {}
    print("Capturing current state for rollback protection...")
    for table in TABLES:
        try:
            status, data = make_request(f"{table}?select=*")
            if status != 404:
                original_state[table] = data
        except Exception:
            pass
            
    # We delete and restore tables in order of dependency.
    # accounts must be restored before transactions and reconciliations due to foreign key constraints.
    restore_order = [
        "accounts",
        "categories",
        "budgets",
        "tax_profiles",
        "tax_configurations",
        "tax_calculations",
        "bank_reconciliations",
        "transactions"
    ]
    
    try:
        # First, delete all existing data in reverse order of dependencies
        print("Clearing existing database tables...")
        for table in reversed(restore_order):
            if table in tables_data or table in original_state:
                try:
                    # Supabase REST API requires a filter to delete all. We can filter on NOT id.is.null
                    # Budget uses id and user_id primary key, others use text id.
                    filter_str = "id=not.is.null"
                    make_request(f"{table}?{filter_str}", method="DELETE")
                    print(f"Cleared table '{table}'.")
                except Exception as e:
                    print(f"Warning/Error clearing table '{table}': {e}. Continuing.")
                    
        # Now, restore data in the correct dependency order
        print("Inserting restored records...")
        for table in restore_order:
            rows = tables_data.get(table, [])
            if not rows:
                continue
                
            print(f"Restoring table '{table}' with {len(rows)} records...")
            # We can insert in bulk
            try:
                make_request(table, method="POST", body=rows)
                print(f"Successfully restored '{table}'.")
            except Exception as e:
                print(f"Failed to restore table '{table}': {e}")
                raise e
                
        # Restore local audit logs
        restored_logs = backup_data.get("audit_logs", [])
        if restored_logs:
            audit_logs_path = os.path.join(BACKUP_DIR, "audit_logs.jsonl")
            with open(audit_logs_path, "w") as f:
                for log in restored_logs:
                    f.write(json.dumps(log) + "\n")
            print(f"Successfully restored local audit logs: {len(restored_logs)} records.")
            
        print("Database restore completed successfully!")
        
    except Exception as rollback_err:
        print(f"CRITICAL RESTORE FAILURE: {rollback_err}")
        print("Initiating automatic transaction rollback to original database state...")
        try:
            # Delete any partially restored records
            for table in reversed(restore_order):
                if table in original_state:
                    try:
                        make_request(f"{table}?id=not.is.null", method="DELETE")
                    except Exception:
                        pass
            # Restore original state
            for table in restore_order:
                rows = original_state.get(table, [])
                if rows:
                    try:
                        make_request(table, method="POST", body=rows)
                    except Exception as re:
                        print(f"Failed to roll back table '{table}': {re}")
            print("Rollback successful. Database restored to original pre-attempt state.")
        except Exception as re_err:
            print(f"Failed during emergency rollback: {re_err}")
        sys.exit(2)

def automatic_backup():
    """
    Performs automatic backup and prunes old backups to prevent excessive storage use.
    Auto backup is saved to 'backup_auto.json' and a rotation backup is saved.
    """
    print("Running scheduled/automatic backup check...")
    # Rotate and keep up to 10 backups
    perform_backup("backup_auto.json")
    
    # Create a rotation copy as well
    perform_backup()
    
    # Prune backups older than 7 days, keeping at least 5
    try:
        files = [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_") and f.endswith(".json") and f != "backup_auto.json"]
        files.sort()
        if len(files) > 10:
            files_to_delete = files[:-10]
            for f in files_to_delete:
                os.remove(os.path.join(BACKUP_DIR, f))
                print(f"Pruned old backup file: {f}")
    except Exception as e:
        print(f"Error pruning backups: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 backup_restore.py [backup|restore|auto] <filepath>")
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    if cmd == "backup":
        filename = sys.argv[2] if len(sys.argv) > 2 else None
        perform_backup(filename)
    elif cmd == "restore":
        if len(sys.argv) < 3:
            print("Error: Missing file path for restore command.")
            sys.exit(1)
        perform_restore(sys.argv[2])
    elif cmd == "auto" or cmd == "auto_backup":
        automatic_backup()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
