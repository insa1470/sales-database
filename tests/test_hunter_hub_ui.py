import unittest
from pathlib import Path


HTML = Path("index.html").read_text(encoding="utf-8")


class HunterHubCantonUITests(unittest.TestCase):
    def test_canton_assets_and_combo_are_wired(self):
        self.assertIn('<script src="canton140.js"></script>', HTML)
        self.assertIn("第140届广交会 ＋ 套保名单", HTML)
        self.assertIn("canton140.json", HTML)
        self.assertIn("canton140_hedging", HTML)

    def test_phase_filter_and_detail_contract_exist(self):
        self.assertIn('id="fPhaseSection"', HTML)
        self.assertIn('id="fPhase"', HTML)
        self.assertIn("广交会期别", HTML)
        self.assertIn("广交会展商资料，未经工商核验", HTML)
        self.assertIn("查看广交会官方页面", HTML)

    def test_canton_list_keeps_flagged_companies_visible(self):
        self.assertIn("currentCombo.key !== 'canton140_hedging'", HTML)


if __name__ == "__main__":
    unittest.main()
