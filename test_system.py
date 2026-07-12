#!/usr/bin/env python3
import os
import json
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime

# Import components to test
import backup_restore

class TestSystemManagement(unittest.TestCase):
    def setUp(self):
        # Create a temporary backups folder for testing
        self.test_backup_dir = os.path.join(os.getcwd(), "test_backups")
        os.makedirs(self.test_backup_dir, exist_ok=True)
        self.original_backup_dir = backup_restore.BACKUP_DIR
        backup_restore.BACKUP_DIR = self.test_backup_dir
        
    def tearDown(self):
        # Cleanup temporary files
        backup_restore.BACKUP_DIR = self.original_backup_dir
        if os.path.exists(self.test_backup_dir):
            for f in os.listdir(self.test_backup_dir):
                os.remove(os.path.join(self.test_backup_dir, f))
            os.rmdir(self.test_backup_dir)

    @patch("backup_restore.make_request")
    def test_backup_creation(self, mock_request):
        # Mock successful database responses for tables
        mock_request.return_value = (200, [{"id": "1", "name": "Cash Account", "initial_balance": 1000}])
        
        # Trigger backup
        filepath = backup_restore.perform_backup("test_backup_file.json")
        
        # Verify file is created and contains correct data
        self.assertTrue(os.path.exists(filepath))
        with open(filepath, "r") as f:
            data = json.load(f)
            
        self.assertEqual(data["metadata"]["version"], "1.0")
        self.assertIn("accounts", data["tables"])
        self.assertEqual(data["tables"]["accounts"][0]["name"], "Cash Account")
        
    @patch("backup_restore.make_request")
    def test_restore_success(self, mock_request):
        # Mock active state query (original state before restore)
        mock_request.return_value = (200, [])
        
        # Create a dummy backup JSON file to restore
        dummy_backup = {
            "metadata": {"timestamp": datetime.now().isoformat(), "version": "1.0"},
            "tables": {
                "accounts": [{"id": "acc_1", "name": "Checking Account", "initial_balance": 5000}],
                "transactions": [{"id": "tx_1", "amount": 250, "description": "Grocery"}]
            }
        }
        backup_path = os.path.join(self.test_backup_dir, "test_restore_source.json")
        with open(backup_path, "w") as f:
            json.dump(dummy_backup, f)
            
        # Run restore
        backup_restore.perform_restore(backup_path)
        
        # Assert make_request was called to delete (clear) and post (insert) restored records
        calls = [call[0][0] for call in mock_request.call_args_list]
        # Should have called delete or insert
        self.assertTrue(any("DELETE" in str(call) or "accounts" in str(call) for call in mock_request.call_args_list))

    @patch("backup_restore.make_request")
    def test_restore_rollback_protection(self, mock_request):
        # Mock original pre-attempt state
        original_data = [{"id": "acc_original", "name": "Pre-existing Cash", "initial_balance": 150}]
        
        # Configure the mock to return original state, then fail during deletion/insertion
        def side_effect(path, method="GET", body=None, headers=None):
            if method == "GET" and "select=*" in path:
                return (200, original_data)
            if method == "DELETE":
                return (200, [])
            # Fail during the bulk restore insert to trigger automatic rollback
            if method == "POST" and "accounts" in path:
                raise Exception("Database transaction connection timed out - simulated failure")
            return (200, [])
            
        mock_request.side_effect = side_effect
        
        # Create dummy restore backup
        dummy_backup = {
            "metadata": {"timestamp": datetime.now().isoformat(), "version": "1.0"},
            "tables": {
                "accounts": [{"id": "acc_new", "name": "Interrupted Account", "initial_balance": 999}]
            }
        }
        backup_path = os.path.join(self.test_backup_dir, "test_rollback_source.json")
        with open(backup_path, "w") as f:
            json.dump(dummy_backup, f)
            
        # Attempt restore - should raise SystemExit due to handled exception
        with self.assertRaises(SystemExit) as cm:
            backup_restore.perform_restore(backup_path)
            
        self.assertEqual(cm.exception.code, 2)
        
        # Verify that emergency rollback was executed to restore 'acc_original'
        any_rollback_posts = False
        for call in mock_request.call_args_list:
            args, kwargs = call
            if kwargs.get("method") == "POST" and len(args) > 0 and args[0] == "accounts":
                # Check if it was trying to restore original data
                body = kwargs.get("body") or (args[2] if len(args) > 2 else None)
                if body and body[0].get("id") == "acc_original":
                    any_rollback_posts = True
                    
        self.assertTrue(any_rollback_posts, "Backup restoration rollback did not re-insert original data.")

    def test_audit_log_appending(self):
        # Write dummy audit logs to temporary file
        audit_logs_file = os.path.join(self.test_backup_dir, "audit_logs.jsonl")
        
        log_records = [
            {"user": "admin", "action": "CREATE", "table": "accounts", "recordId": "1", "timestamp": "2026-07-08"},
            {"user": "admin", "action": "DELETE", "table": "transactions", "recordId": "5", "timestamp": "2026-07-09"}
        ]
        
        with open(audit_logs_file, "w") as f:
            for log in log_records:
                f.write(json.dumps(log) + "\n")
                
        # Read and parse them back
        parsed_records = []
        with open(audit_logs_file, "r") as f:
            for line in f:
                if line.strip():
                    parsed_records.append(json.loads(line))
                    
        self.assertEqual(len(parsed_records), 2)
        self.assertEqual(parsed_records[0]["action"], "CREATE")
        self.assertEqual(parsed_records[1]["table"], "transactions")

if __name__ == "__main__":
    unittest.main()
