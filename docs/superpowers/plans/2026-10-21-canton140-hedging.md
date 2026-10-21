# 第140屆廣交會＋套保名單 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在正式 Hunter Hub 新增「第140届广交会＋套保名单」共 300 家，支援城市與期別篩選，並保留既有登入、D1 名單、追蹤與標記功能。

**Architecture:** 以目前與線上雜湊一致的本機專案為唯一基準，新增獨立 `canton140.json` 與可單元測試的 `canton140.js`，在瀏覽器載入時合併資料。既有企業保留原欄位與 ID，新企業使用固定 ID；廣交會資料放在 `canton140_info`，避免覆寫工商資料。

**Tech Stack:** Cloudflare Pages、Pages Worker、D1、原生 HTML/CSS/JavaScript、Python 3、openpyxl、Node.js 內建 test runner、Wrangler 4

---

### Task 1: 保存正式站基準並建立安全提交點

**Files:**
- Modify/commit existing: `index.html`
- Modify/commit existing: `data.json`
- Modify/commit existing: `_worker.js`
- Modify/commit existing: `schema.sql`
- Add existing untracked: `DEPLOY.md`
- Do not add: `.wrangler/`, `.claude/`, `.DS_Store`, `*.xlsx`, `*.csv`

- [ ] **Step 1: 驗證本機檔案與正式站一致**

Run:

```bash
curl -fsSL https://sales.deepmystic.net/ -o /tmp/hunter-live-index.html
curl -fsSL https://sales.deepmystic.net/data.json -o /tmp/hunter-live-data.json
shasum -a 256 index.html /tmp/hunter-live-index.html
shasum -a 256 data.json /tmp/hunter-live-data.json
```

Expected:

```text
b006945426ef958777305f162251f8e0b36c96211ecbe9dd30c20fb3c93053c6  index.html
b006945426ef958777305f162251f8e0b36c96211ecbe9dd30c20fb3c93053c6  /tmp/hunter-live-index.html
e9f3547c5629e36668dede91901520d340054c2563da698ed963c80b69b22e8e  data.json
e9f3547c5629e36668dede91901520d340054c2563da698ed963c80b69b22e8e  /tmp/hunter-live-data.json
```

- [ ] **Step 2: 驗證正式資料與現有 Worker 功能基準**

Run:

```bash
jq -e 'length == 2475 and (map(.id) | min == 0) and (map(.id) | max == 2474)' data.json
rg -n '/api/activity|/api/flag|company_flags' _worker.js schema.sql index.html
```

Expected: `jq` returns `true`; all three files contain the activity/flag implementation.

- [ ] **Step 3: 只提交正式站必要檔案，不納入原始名單或本機設定**

Run:

```bash
git add index.html data.json _worker.js schema.sql DEPLOY.md
git diff --cached --check
git commit -m "chore: preserve deployed Hunter Hub baseline"
```

Expected: commit succeeds; `git status --short` still lists raw spreadsheets and local folders as untracked, but no tracked live-source changes remain.

### Task 2: 建立可測試的廣交會合併模組

**Files:**
- Create: `canton140.js`
- Create: `tests/canton140.test.js`

- [ ] **Step 1: 寫入合併、缺值與期別判斷的失敗測試**

Create `tests/canton140.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCompanyName,
  mergeCanton140Data,
  cantonCity,
  matchesCantonPhase,
} = require('../canton140.js');

test('normalizes legal punctuation without changing company text', () => {
  assert.equal(normalizeCompanyName('彩迅工业（深圳）有限公司'), '彩迅工业深圳有限公司');
  assert.equal(normalizeCompanyName('彩迅工业(深圳)有限公司'), '彩迅工业深圳有限公司');
});

test('enriches an existing company without overwriting工商 fields', () => {
  const base = [{ id: 8, name: '甲公司', city: '深圳市', capital: '100万元', hedging: true }];
  const canton = [{ id: 8, name: '甲公司', city: '东莞市', capital: 'CNY 2,000,000', phase: ['第1期'] }];
  const result = mergeCanton140Data(base, canton);
  assert.equal(result.length, 1);
  assert.equal(result[0].city, '深圳市');
  assert.equal(result[0].capital, '100万元');
  assert.equal(result[0].canton140_info.city, '东莞市');
});

test('adds a new company with a stable id and hedging marker', () => {
  const result = mergeCanton140Data([], [{ id: 2475, name: '乙公司', city: '深圳市', capital: null, phase: ['第2期'] }]);
  assert.equal(result[0].id, 2475);
  assert.equal(result[0].hedging, true);
  assert.equal(result[0].canton140, true);
});

test('uses 待确认 for missing Canton city and matches any selected phase', () => {
  const company = { canton140_info: { city: null, phase: ['第1期', '第3期'] } };
  assert.equal(cantonCity(company), '待确认');
  assert.equal(matchesCantonPhase(company, ['第2期', '第3期']), true);
  assert.equal(matchesCantonPhase(company, ['第2期']), false);
});

test('rejects duplicate or conflicting ids', () => {
  assert.throws(
    () => mergeCanton140Data([{ id: 1, name: '甲公司' }], [{ id: 1, name: '另一家公司', phase: ['第1期'] }]),
    /id conflict/
  );
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run:

```bash
node --test tests/canton140.test.js
```

Expected: FAIL with `Cannot find module '../canton140.js'`.

- [ ] **Step 3: 實作純函式模組**

Create `canton140.js` as a browser/CommonJS-compatible module exposing exactly these functions:

```javascript
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Canton140 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeCompanyName(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\s\u200b\ufeff·•,，。．、()（）]+/g, '')
      .trim();
  }

  function mergeCanton140Data(baseRows, cantonRows) {
    const result = baseRows.map(row => ({ ...row }));
    const byId = new Map(result.map(row => [row.id, row]));
    const byName = new Map(result.map(row => [normalizeCompanyName(row.name), row]));

    for (const info of cantonRows) {
      const normalized = normalizeCompanyName(info.name);
      const idMatch = byId.get(info.id);
      const nameMatch = byName.get(normalized);
      if (idMatch && normalizeCompanyName(idMatch.name) !== normalized) {
        throw new Error(`id conflict: ${info.id}`);
      }
      const existing = idMatch || nameMatch;
      if (existing) {
        if (existing.id !== info.id) throw new Error(`id conflict: ${info.id}`);
        existing.canton140 = true;
        existing.canton140_info = { ...info };
        continue;
      }
      const created = {
        id: info.id,
        name: info.name,
        status: '', legal_rep: '', founded: '', credit_code: '', district: '',
        email: '', phone: '', more_phones: '', website: '', staff: '', scale: '',
        biz_type: '', industry_main: '', industry_sub: '', scope: '', intro: '',
        province: info.province || '', city: info.city || '', address: info.address || '',
        capital: info.capital || '', source: '广交会', hedging: true,
        in_import: false, is_bonded: false, canton140: true,
        canton140_info: { ...info },
      };
      result.push(created);
      byId.set(created.id, created);
      byName.set(normalized, created);
    }
    return result;
  }

  function cantonCity(company) {
    return company?.canton140_info?.city || '待确认';
  }

  function matchesCantonPhase(company, selectedPhases) {
    if (!selectedPhases.length) return true;
    const phases = company?.canton140_info?.phase || [];
    return selectedPhases.some(phase => phases.includes(phase));
  }

  return { normalizeCompanyName, mergeCanton140Data, cantonCity, matchesCantonPhase };
});
```

- [ ] **Step 4: 執行測試確認通過並提交**

Run:

```bash
node --test tests/canton140.test.js
git add canton140.js tests/canton140.test.js
git commit -m "feat: add Canton Fair data merge utilities"
```

Expected: 5 tests pass.

### Task 3: 產製並驗證 300 家 `canton140.json`

**Files:**
- Create: `scripts/build_canton140.py`
- Create: `tests/test_build_canton140.py`
- Create: `canton140.json`

**External source files:**
- `/Users/insahung/Documents/Murphy/outputs/canton-fair-140-20261021/第140屆廣交會完整參展商名單.xlsx`
- `/Users/insahung/Documents/10_進行中專案/業務系統/行銷資料庫/套保名单-截至202306.xlsx`

- [ ] **Step 1: 寫入資料規則的失敗測試**

Create `tests/test_build_canton140.py` with `unittest` cases for:

```python
from scripts.build_canton140 import normalize_name, core_name, allocate_ids, validate_rows


def test_normalize_and_core_name():
    assert normalize_name("彩迅工业（深圳）有限公司") == normalize_name("彩迅工业(深圳)有限公司")
    assert core_name("深圳市甲科技有限公司") == core_name("深圳甲科技有限责任公司")


def test_allocate_ids_preserves_existing_and_starts_after_maximum():
    base = [{"id": 2, "name": "甲公司"}, {"id": 9, "name": "乙公司"}]
    canton = [{"name": "甲公司"}, {"name": "丙公司"}]
    rows = allocate_ids(base, canton)
    assert rows[0]["id"] == 2
    assert rows[1]["id"] == 10


def test_validate_rows_enforces_contract():
    rows = [
        {"id": i, "name": f"公司{i}", "match_grade": "A", "phase": ["第1期"], "city": "深圳市"}
        for i in range(294)
    ] + [
        {"id": 1000 + i, "name": f"候选{i}", "match_grade": "B", "phase": ["第2期"], "city": None}
        for i in range(6)
    ]
    validate_rows(rows, expected_total=300, expected_a=294, expected_b=6)
```

- [ ] **Step 2: 執行測試確認失敗**

Run:

```bash
python3 -m pytest tests/test_build_canton140.py -q
```

Expected: FAIL because `scripts/build_canton140.py` does not exist.

- [ ] **Step 3: 實作可重跑的資料產製器**

Implement `scripts/build_canton140.py` with these public functions: `normalize_name`, `core_name`, `load_canton`, `load_hedge`, `match_ab`, `fetch_supplier_detail`, `enrich_rows`, `allocate_ids`, and `validate_rows`. The CLI must require `--canton-workbook`, `--hedge-workbook`, `--base-data`, `--cache-dir`, and `--output`; it must call those functions in that order and write the output only after `validate_rows` succeeds.

Implementation requirements:

- Reuse the approved A/B logic: exact normalized names are A; unique exact core-name or edit-distance/ratio candidates are B.
- Read sheet `參展商名單` from row 4 and sheet `原始数据` from row 2.
- Fetch `https://www.cantonfair.org.cn/appbuyerapi/supplier/detail?supplierNo=<id>` with timeout, bounded concurrency and local cache.
- Map official `provinceName`, `cityName`, `companyAddress` and `registeredCapital` to Chinese province/city suffixes without guessing missing values.
- Split multi-phase strings into unique arrays preserving phase order.
- Preserve all section/booth pairs and official supplier page URL.
- Assign existing Hunter Hub IDs by normalized exact company name; assign new IDs sequentially from `max(data.json.id)+1`.
- Write UTF-8 pretty JSON only after all 300 records pass validation.
- Exit non-zero if API responses are incomplete, IDs collide, names duplicate, A/B counts drift, or phase values fall outside `第1期/第2期/第3期`.

- [ ] **Step 4: 執行單元測試並產製資料**

Run:

```bash
python3 -m pytest tests/test_build_canton140.py -q
python3 scripts/build_canton140.py \
  --canton-workbook '/Users/insahung/Documents/Murphy/outputs/canton-fair-140-20261021/第140屆廣交會完整參展商名單.xlsx' \
  --hedge-workbook '/Users/insahung/Documents/10_進行中專案/業務系統/行銷資料庫/套保名单-截至202306.xlsx' \
  --base-data data.json \
  --cache-dir /tmp/hunter-canton140-cache \
  --output canton140.json
```

Expected: tests pass; command reports `A=294 B=6 total=300 existing=34 new=266`.

- [ ] **Step 5: 執行完整資料驗收**

Run:

```bash
jq -e 'length == 300' canton140.json
jq -e '[.[].id] | length == (unique | length)' canton140.json
jq -e '[.[] | select(.match_grade=="A")] | length == 294' canton140.json
jq -e '[.[] | select(.match_grade=="B")] | length == 6' canton140.json
jq -e '[.[] | select(.city != null)] | length == 285' canton140.json
jq -e '[.[] | select(.capital != null)] | length == 285' canton140.json
```

Expected: every command returns `true`.

- [ ] **Step 6: 提交產製器、測試與衍生資料**

Run:

```bash
git add scripts/build_canton140.py tests/test_build_canton140.py canton140.json
git commit -m "feat: build verified Canton Fair hedging dataset"
```

### Task 4: 加入 Hunter Hub 入口、城市與期別篩選

**Files:**
- Modify: `index.html`
- Create: `tests/test_hunter_hub_ui.py`

- [ ] **Step 1: 寫入 UI 契約的失敗測試**

Create `tests/test_hunter_hub_ui.py` to assert:

```python
from pathlib import Path


HTML = Path("index.html").read_text(encoding="utf-8")


def test_canton_assets_and_combo_are_wired():
    assert '<script src="canton140.js"></script>' in HTML
    assert "第140届广交会 ＋ 套保名单" in HTML
    assert "canton140.json" in HTML
    assert "canton140_hedging" in HTML


def test_phase_filter_and_detail_contract_exist():
    assert 'id="fPhaseSection"' in HTML
    assert 'id="fPhase"' in HTML
    assert "广交会期别" in HTML
    assert "广交会展商资料，未经工商核验" in HTML
    assert "查看广交会官方页面" in HTML


def test_canton_list_keeps_flagged_companies_visible():
    assert "currentCombo.key !== 'canton140_hedging'" in HTML
```

- [ ] **Step 2: 執行測試確認失敗**

Run:

```bash
python3 -m pytest tests/test_hunter_hub_ui.py -q
```

Expected: FAIL because the Canton Fair UI is not wired yet.

- [ ] **Step 3: 加入 UI 標記、狀態與載入流程**

Modify `index.html` as follows:

- Load `canton140.js` before the existing inline application script.
- Add a hidden `fPhaseSection` with chips `第1期`, `第2期`, `第3期`.
- Extend `activeF` and `pendingF` with `phase: []`.
- Replace the single `fetch('data.json')` flow with a guarded base-data fetch plus optional `canton140.json` fetch; call `Canton140.mergeCanton140Data` only after both JSON payloads validate.
- If `canton140.json` fails, keep the base 2,475 records usable and store a `canton140LoadError` message for the combo card.
- Add combo key `canton140_hedging` with filter `d => d.canton140 === true`.
- Make the combo count dynamic and update the `全部名单` description from `allData.length`.
- Preserve all 300 Canton records even when they have existing D1 flags; continue rendering the existing flag badges.

The filter condition must be equivalent to:

```javascript
if (currentCombo.key !== 'my_list'
    && currentCombo.key !== 'canton140_hedging'
    && isCompanyFlagged(d.id)) return false;

if (currentCombo.key === 'canton140_hedging') {
  if (activeF.city.length && !activeF.city.includes(Canton140.cantonCity(d))) return false;
  if (!Canton140.matchesCantonPhase(d, activeF.phase)) return false;
} else {
  if (activeF.city.length && !activeF.city.includes(d.city)) return false;
}
```

- [ ] **Step 4: 加入列表標籤與廣交會詳情區塊**

Modify `badges(d)`, `renderRow(d)` and `openSheet(id)` so Canton records show:

```html
<span class="badge badge-canton-phase">第1期</span>
<span class="badge badge-canton-grade-a">A级</span>
```

The detail section must read from `d.canton140_info` and render:

- 匹配级别及原因
- 期别
- 展区及展位
- 广交会所在地与地址
- 广交会注册资本，缺值为 `待确认`
- `广交会展商资料，未经工商核验`
- Official URL with `target="_blank" rel="noopener noreferrer"`

Use an HTML escape helper for every Canton text field before inserting it into `innerHTML`; accept an official link only when it starts with `https://365.cantonfair.org.cn/`.

- [ ] **Step 5: 完成篩選面板顯示與清除規則**

Implement these rules:

- `fPhaseSection` is visible only when `currentCombo.key === 'canton140_hedging'`.
- The Canton city chips come from `canton140_info.city`, plus `待确认`; other lists keep using top-level `city`.
- `renderScopeChips`, `removeF`, `clearAll`, reset/apply events and FAB count include `phase`.
- Returning home or entering another combo resets `phase`.
- Same-class selections use OR; city and phase use AND.

- [ ] **Step 6: 執行全部自動測試並提交**

Run:

```bash
node --test tests/canton140.test.js
python3 -m pytest tests/test_build_canton140.py tests/test_hunter_hub_ui.py -q
node --check canton140.js
git diff --check
git add index.html tests/test_hunter_hub_ui.py
git commit -m "feat: add Canton Fair hedging filter to Hunter Hub"
```

Expected: all tests pass and `git diff --check` has no output.

### Task 5: 本機整合、視覺與回歸驗收

**Files:**
- Create: `tests/validate_canton140_integration.mjs`
- Optional generated screenshot outside git: `/tmp/hunter-canton140-preview.png`

- [ ] **Step 1: 寫入並執行整合驗證器**

Create `tests/validate_canton140_integration.mjs` to load `data.json`, `canton140.json` and `canton140.js`, then assert:

```javascript
assert.equal(canton.length, 300);
assert.equal(merged.length, 2741);
assert.equal(merged.filter(row => row.canton140).length, 300);
assert.equal(canton.filter(row => row.match_grade === 'A').length, 294);
assert.equal(canton.filter(row => row.match_grade === 'B').length, 6);
assert.equal(canton.filter(row => row.city).length, 285);
assert.equal(canton.filter(row => row.capital).length, 285);
assert.equal(new Set(merged.map(row => row.id)).size, merged.length);
```

Run:

```bash
node tests/validate_canton140_integration.mjs
```

Expected: prints `Canton140 integration OK: base=2475 canton=300 merged=2741`.

- [ ] **Step 2: 啟動本機靜態預覽並做 HTTP smoke test**

Run in a terminal session:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then run:

```bash
curl -fsS http://127.0.0.1:4173/ | rg '第140届广交会|canton140.js'
curl -fsS http://127.0.0.1:4173/canton140.json | jq 'length'
```

Expected: first command finds both strings; second prints `300`.

- [ ] **Step 3: 在瀏覽器驗收桌面與行動版**

Open `http://127.0.0.1:4173/`, seed a harmless local login session if needed, then verify:

- Home card shows 300.
- Opening the combo shows all 300, including flagged companies with their status badges.
- Shenzhen filter returns 271; `待确认` returns 15.
- Phase filters support single and multiple selections, including cross-phase companies.
- Capital and official link render in detail without replacing existing工商资本.
- Mobile width 390px and desktop width 1280px have no horizontal overflow.
- Other combos, search, pagination and detail sheets still work.

- [ ] **Step 4: 提交整合驗證器**

Run:

```bash
git add tests/validate_canton140_integration.mjs
git commit -m "test: verify Canton Fair integration totals"
```

### Task 6: Cloudflare 預檢、部署與正式站驗證

**Files:**
- No source changes expected

- [ ] **Step 1: 確認 Wrangler 身分與 Pages 專案**

Run:

```bash
~/.nvm/versions/node/v24.14.1/bin/node ~/.nvm/versions/node/v24.14.1/bin/wrangler whoami
~/.nvm/versions/node/v24.14.1/bin/node ~/.nvm/versions/node/v24.14.1/bin/wrangler pages project list
```

Expected: authenticated Cloudflare account and project `sales-database` are shown. If authentication has expired, stop before deployment and ask the user to complete `wrangler login`.

- [ ] **Step 2: 建立部署前備份與最終測試**

Run:

```bash
mkdir -p /tmp/hunter-hub-predeploy
curl -fsSL https://sales.deepmystic.net/ -o /tmp/hunter-hub-predeploy/index.html
curl -fsSL https://sales.deepmystic.net/data.json -o /tmp/hunter-hub-predeploy/data.json
shasum -a 256 /tmp/hunter-hub-predeploy/index.html /tmp/hunter-hub-predeploy/data.json
node --test tests/canton140.test.js
python3 -m pytest tests/test_build_canton140.py tests/test_hunter_hub_ui.py -q
node tests/validate_canton140_integration.mjs
git status --short
```

Expected: tests pass; only intentional raw/local untracked files remain.

- [ ] **Step 3: 部署至 Cloudflare Pages**

Run:

```bash
~/.nvm/versions/node/v24.14.1/bin/node ~/.nvm/versions/node/v24.14.1/bin/wrangler pages deploy '/Users/insahung/Documents/10_進行中專案/業務系統/行銷資料庫' --project-name=sales-database --branch=main
```

Expected: Wrangler returns a successful deployment URL. Save the deployment ID and preview URL in the execution notes.

- [ ] **Step 4: 驗證正式站靜態資料與既有 API**

Run:

```bash
curl -fsSL https://sales.deepmystic.net/ | rg '第140届广交会|canton140.js|canton140.json'
curl -fsSL https://sales.deepmystic.net/canton140.json | jq -e 'length == 300'
curl -fsSL https://sales.deepmystic.net/api/activity | jq -e 'has("tracking") and has("flags")'
curl -fsSL https://sales.deepmystic.net/api/companies/claimed | jq -e 'has("claimed")'
```

Expected: all checks succeed and existing API responses keep their expected shapes.

- [ ] **Step 5: 正式站視覺驗收**

Open `https://sales.deepmystic.net/` and repeat the Task 5 desktop/mobile checks. Confirm the title, 300 count, city/phase filters, detail data, official link and existing D1 interactions.

- [ ] **Step 6: 同步 GitHub main**

Run:

```bash
git status --short
git switch main
git merge --ff-only feature/canton140-hedging
git push origin main
```

Expected: GitHub `main` contains the preserved live baseline, feature, tests and documentation; raw spreadsheets and `.wrangler/` remain untracked locally.

### Task 7: 失敗時回復

**Files:**
- Recovery input: `/tmp/hunter-hub-predeploy/index.html`
- Recovery input: `/tmp/hunter-hub-predeploy/data.json`

- [ ] **Step 1: 僅在正式驗收失敗時執行回復**

Restore the previous committed baseline files from the baseline commit, keep D1 untouched, redeploy the baseline directory with the same Wrangler command, and verify:

```bash
curl -fsSL https://sales.deepmystic.net/ | shasum -a 256
curl -fsSL https://sales.deepmystic.net/data.json | shasum -a 256
curl -fsSL https://sales.deepmystic.net/api/activity | jq -e 'has("tracking") and has("flags")'
```

Expected: hashes match the deployment backup and D1 APIs remain healthy. Never delete or recreate the D1 database during rollback.
