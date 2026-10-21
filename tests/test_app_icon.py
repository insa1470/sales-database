import json
import struct
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
DEPLOY = (ROOT / "scripts/deploy_pages.sh").read_text(encoding="utf-8")


def png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise AssertionError(f"{path} is not a PNG")
    return struct.unpack(">II", data[16:24])


class HunterHubAppIconTests(unittest.TestCase):
    def test_html_links_versioned_install_assets(self):
        self.assertIn('rel="manifest" href="manifest-v1.webmanifest"', HTML)
        self.assertIn('rel="icon" type="image/svg+xml" href="assets/hunter-hub-target-v1.svg"', HTML)
        self.assertIn('rel="apple-touch-icon" sizes="180x180" href="assets/hunter-hub-icon-180-v1.png"', HTML)
        self.assertIn('name="theme-color" content="#F2F2F7"', HTML)

    def test_login_and_my_list_use_the_shared_target_asset(self):
        source = 'src="assets/hunter-hub-target-v1.svg"'
        self.assertEqual(HTML.count(source), 2)
        self.assertNotIn('<div class="login-logo">🎯</div>', HTML)
        self.assertNotIn('<div class="mylist-icon">🎯</div>', HTML)

    def test_shared_target_is_legible_at_mobile_ui_sizes(self):
        self.assertIn(".login-logo  { width: 68px; height: 68px", HTML)
        self.assertIn(".mylist-icon img { width: 34px; height: 34px", HTML)

    def test_manifest_has_install_and_maskable_icons(self):
        manifest = json.loads((ROOT / "manifest-v1.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(manifest["name"], "Hunter Hub")
        self.assertEqual(manifest["start_url"], "/")
        self.assertEqual(manifest["display"], "standalone")
        icons = {(icon["sizes"], icon["purpose"]): icon["src"] for icon in manifest["icons"]}
        self.assertEqual(icons[("192x192", "any")], "/assets/hunter-hub-icon-192-v1.png")
        self.assertEqual(icons[("512x512", "any maskable")], "/assets/hunter-hub-icon-512-v1.png")

    def test_png_assets_have_the_declared_dimensions(self):
        for size in (180, 192, 512):
            path = ROOT / f"assets/hunter-hub-icon-{size}-v1.png"
            self.assertEqual(png_dimensions(path), (size, size))

    def test_manifest_is_revalidated_and_icons_are_versioned(self):
        headers = (ROOT / "_headers").read_text(encoding="utf-8")
        self.assertIn("/manifest-v1.webmanifest", headers)
        self.assertIn("Cache-Control: no-cache, must-revalidate", headers)
        self.assertIn("/assets/hunter-hub-icon-*-v1.png", headers)

    def test_safe_deploy_allowlist_includes_icons_but_not_raw_data(self):
        required = (
            "manifest-v1.webmanifest",
            "_headers",
            "assets/hunter-hub-target-v1.svg",
            "assets/hunter-hub-icon-180-v1.png",
            "assets/hunter-hub-icon-192-v1.png",
            "assets/hunter-hub-icon-512-v1.png",
        )
        for path in required:
            self.assertIn(path, DEPLOY)
        self.assertNotRegex(DEPLOY, r"public_files=\([^)]*\.xlsx")
        self.assertNotRegex(DEPLOY, r"public_files=\([^)]*\.csv")


if __name__ == "__main__":
    unittest.main()
