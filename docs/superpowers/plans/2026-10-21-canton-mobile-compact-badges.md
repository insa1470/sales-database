# Canton Mobile Compact Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Canton Fair mobile company list on one horizontal layer while limiting the right side to two high-priority short badges.

**Architecture:** Add a pure badge-selection function to `canton140.js`, then render both full and compact badge containers in the existing row. CSS media queries select the compact version only for Canton rows at widths up to 600px, leaving desktop and other combinations unchanged.

**Tech Stack:** Vanilla JavaScript, CSS media queries, Node test runner, Python unittest contract checks, Cloudflare Pages.

---

### Task 1: Compact badge selection

**Files:**
- Modify: `tests/canton140.test.js`
- Modify: `canton140.js`

- [ ] **Step 1: Write the failing unit tests**

Import `compactCantonBadges` and assert that it returns at most two items in this order: unique status flags, B grade, compact phase, then import/bonded signal. Assert that A grade and hedging never appear.

```js
test('selects at most two compact mobile badges by priority', () => {
  const company = {
    in_import: true,
    hedging: true,
    canton140_info: { phase: ['第1期', '第3期'], match_grade: 'B' },
  };
  assert.deepEqual(compactCantonBadges(company, ['credit']), [
    { kind: 'flag-credit', label: '婉拒' },
    { kind: 'grade-b', label: 'B' },
  ]);
  assert.deepEqual(compactCantonBadges(company), [
    { kind: 'grade-b', label: 'B' },
    { kind: 'phase', label: '1/3期' },
  ]);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/canton140.test.js`

Expected: FAIL because `compactCantonBadges` is not exported.

- [ ] **Step 3: Implement the pure selector**

Add `compactCantonBadges(company, flagTypes = [])` to `canton140.js`. Deduplicate flags, map `credit/rejected/existing` to `婉拒/合作/其他`, include only B grade, compact phases to `1/3期`, add `保税` or `进出口`, and return `items.slice(0, 2)`.

- [ ] **Step 4: Run the unit tests and confirm GREEN**

Run: `node --test tests/canton140.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add canton140.js tests/canton140.test.js
git commit -m "feat: select compact Canton mobile badges"
```

### Task 2: Responsive list rendering

**Files:**
- Modify: `tests/test_hunter_hub_ui.py`
- Modify: `index.html`

- [ ] **Step 1: Write the failing UI contract test**

Assert that the page contains `canton-row`, `full-badges`, `compact-badges`, a `max-width: 600px` media rule, and a call to `Canton140.compactCantonBadges`.

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `python3 -m unittest tests.test_hunter_hub_ui -v`

Expected: FAIL because the compact containers and responsive rules do not exist.

- [ ] **Step 3: Render responsive badge containers**

Add a Canton-only row class. Keep `badges(d)` inside `.full-badges`, render the pure helper output inside `.compact-badges`, escape every label, and map kinds to existing color classes.

- [ ] **Step 4: Add the mobile media query**

At `max-width: 600px`, hide `.canton-row .full-badges`, show `.canton-row .compact-badges` as a single non-wrapping row, and use slightly smaller padding. Leave all other rows and desktop behavior unchanged.

- [ ] **Step 5: Run UI and syntax tests**

Run:

```bash
python3 -m unittest tests.test_hunter_hub_ui -v
node --check canton140.js
perl -0777 -ne 'while (/<script(?:\s[^>]*)?>(.*?)<\/script>/sg) { print "$1\n" }' index.html > /tmp/hunter-inline.js
node --check /tmp/hunter-inline.js
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/test_hunter_hub_ui.py
git commit -m "fix: compact Canton badges on mobile"
```

### Task 3: Visual, security, and release verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the full regression suite**

```bash
node --test tests/canton140.test.js
python3 -m unittest tests.test_build_canton140 tests.test_hunter_hub_ui tests.test_worker_security -v
node tests/validate_canton140_integration.mjs
bash -n scripts/deploy_pages.sh
git diff --check
```

Expected: all tests pass and the integration reports `base=2475 canton=300 merged=2741`.

- [ ] **Step 2: Capture a 390px screenshot**

Open the Canton combination in a 390×844 viewport. Confirm the row remains one layer, company names gain width, no row has more than two compact badges, and no badge is clipped.

- [ ] **Step 3: Deploy through the allowlisted script**

Run: `bash scripts/deploy_pages.sh`

Expected: Cloudflare reports a completed deployment using only the public-file allowlist.

- [ ] **Step 4: Verify production**

Confirm `index.html` and `canton140.js` match local files, the data remains 300 rows, D1 endpoints return arrays, and a representative `.xlsx` URL returns 404 with `Cache-Control: no-store`.

- [ ] **Step 5: Merge and push**

Fast-forward `main`, rerun the full regression suite, push `origin/main`, and delete the feature branch after success.
