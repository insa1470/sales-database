import unittest
from pathlib import Path


WORKER = Path("_worker.js").read_text(encoding="utf-8")


class WorkerSecurityTests(unittest.TestCase):
    def test_raw_spreadsheet_and_csv_paths_are_blocked(self):
        self.assertIn("SENSITIVE_ASSET_PATTERN", WORKER)
        self.assertIn("status: 404", WORKER)
        self.assertIn("Cache-Control': 'no-store", WORKER)


if __name__ == "__main__":
    unittest.main()
