import unittest

from scripts.build_canton140 import allocate_ids, core_name, normalize_name, validate_rows


class BuildCanton140Tests(unittest.TestCase):
    def test_normalize_and_core_name(self):
        self.assertEqual(
            normalize_name("彩迅工业（深圳）有限公司"),
            normalize_name("彩迅工业(深圳)有限公司"),
        )
        self.assertEqual(core_name("深圳市甲科技有限公司"), core_name("深圳甲科技有限责任公司"))


    def test_allocate_ids_preserves_existing_and_starts_after_maximum(self):
        base = [{"id": 2, "name": "甲公司"}, {"id": 9, "name": "乙公司"}]
        canton = [{"name": "甲公司"}, {"name": "丙公司"}]
        rows = allocate_ids(base, canton)
        self.assertEqual(rows[0]["id"], 2)
        self.assertEqual(rows[1]["id"], 10)


    def test_validate_rows_enforces_contract(self):
        rows = [
            {
                "id": i,
                "supplier_no": f"A{i:03d}",
                "name": f"公司{i}",
                "match_grade": "A",
                "phase": ["第1期"],
                "city": "深圳市",
                "official_url": f"https://365.cantonfair.org.cn/zh-CN/shops?id=A{i:03d}",
            }
            for i in range(294)
        ] + [
            {
                "id": 1000 + i,
                "supplier_no": f"B{i:03d}",
                "name": f"候选{i}",
                "match_grade": "B",
                "phase": ["第2期"],
                "city": None,
                "official_url": f"https://365.cantonfair.org.cn/zh-CN/shops?id=B{i:03d}",
            }
            for i in range(6)
        ]
        validate_rows(rows, expected_total=300, expected_a=294, expected_b=6)


if __name__ == "__main__":
    unittest.main()
