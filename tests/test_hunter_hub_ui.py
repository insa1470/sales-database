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

    def test_canton_mobile_rows_use_compact_badges(self):
        self.assertIn("compact-row", HTML)
        self.assertIn("full-badges", HTML)
        self.assertIn("compact-badges", HTML)
        self.assertIn("max-width: 600px", HTML)
        self.assertIn("Canton140.compactCantonBadges", HTML)

    def test_my_list_home_preview_has_names_without_badges(self):
        start = HTML.index("function renderMyListHome()")
        end = HTML.index("function enterMyList()", start)
        home_preview = HTML[start:end]
        self.assertNotIn("mylist-row-badge", home_preview)
        self.assertNotIn("scaleBadge(d.scale)", home_preview)

    def test_my_list_mobile_rows_use_compact_badges(self):
        self.assertIn("Canton140.compactMyListBadges", HTML)
        self.assertIn("currentCombo?.key==='my_list'", HTML)


if __name__ == "__main__":
    unittest.main()
