# Hunter Hub App Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Hunter Hub 的紅白靶心與藍綠飛鏢統一為網站內、瀏覽器及手機主畫面使用的正式 App Icon。

**Architecture:** 以單一 SVG 作為視覺來源，產生 180、192、512px PNG；HTML 以 SVG 顯示站內圖示，manifest 與 Apple touch link 使用版本化 PNG。Cloudflare Pages 透過既有部署白名單只公開必要檔案。

**Tech Stack:** 靜態 HTML/CSS、SVG、Web App Manifest、Python unittest、Cloudflare Pages/Wrangler。

---

### Task 1: 建立 App Icon 合約測試

**Files:**
- Create: `tests/test_app_icon.py`

- [ ] **Step 1: Write the failing test**

檢查 HTML 連結、站內圖示、manifest 欄位、PNG 尺寸與部署白名單；並確認白名單沒有 Excel/CSV。

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_app_icon.py -v`

Expected: FAIL，因 `manifest-v1.webmanifest` 與圖示檔案尚未建立。

### Task 2: 建立圖示與安裝設定

**Files:**
- Create: `assets/hunter-hub-target-v1.svg`
- Create: `assets/hunter-hub-icon-180-v1.png`
- Create: `assets/hunter-hub-icon-192-v1.png`
- Create: `assets/hunter-hub-icon-512-v1.png`
- Create: `manifest-v1.webmanifest`
- Create: `_headers`
- Modify: `index.html`
- Modify: `scripts/deploy_pages.sh`

- [ ] **Step 1: Create the visual source**

建立紅白靶心與藍綠飛鏢 SVG，飛鏢由右上指向靶心，不包含文字或獵刀。

- [ ] **Step 2: Generate PNG sizes**

使用 macOS Quick Look 將 SVG 渲染為 PNG，再以 `sips` 產生 180、192、512px 版本。

- [ ] **Step 3: Wire the website and manifest**

在 `<head>` 加入 manifest、favicon、Apple touch icon、theme color；以同一 SVG 取代登入頁及「我的名單」的 emoji。

- [ ] **Step 4: Keep deployment allowlisted**

部署腳本逐一列出 manifest、headers、SVG 與三個 PNG，並保留 Excel/CSV 禁止公開的設計。

- [ ] **Step 5: Run test to verify it passes**

Run: `python3 -m unittest tests/test_app_icon.py -v`

Expected: PASS。

### Task 3: 回歸測試、手機檢查與部署

**Files:**
- Modify only if verification identifies a defect.

- [ ] **Step 1: Run all automated tests**

Run: `python3 -m unittest discover -s tests -p 'test_*.py' -v && node --test tests/canton140.test.js && node tests/validate_canton140_integration.mjs`

Expected: all tests pass。

- [ ] **Step 2: Inspect at mobile width**

以 390px viewport 打開登入頁及首頁，確認圖示沒有裁切、模糊或擠壓文字。

- [ ] **Step 3: Commit and push**

只加入本計畫列出的程式、資產及文件，排除所有未追蹤 Excel/CSV，再推送 `main`。

- [ ] **Step 4: Deploy via the safe script**

Run: `bash scripts/deploy_pages.sh`

Expected: Wrangler 回報 Pages deployment URL，部署包不含 Excel/CSV。

- [ ] **Step 5: Verify production**

檢查 `https://sales.deepmystic.net/`、`/manifest-v1.webmanifest` 與三個 PNG 回傳 200，並核對 manifest 仍引用版本化圖示。
