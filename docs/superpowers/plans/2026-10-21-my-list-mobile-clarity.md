# My List Mobile Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make company names the priority in the Hunter Hub home preview and keep the full mobile My List to at most two action-oriented short badges.

**Architecture:** Extend the existing pure compact-badge module with a My List-specific selector that may include hedging. Reuse the current dual full/compact badge containers and responsive CSS for both Canton and My List rows, while removing the scale badge from the home preview.

**Tech Stack:** Vanilla JavaScript, CSS media queries, Node test runner, Python unittest contract checks, Cloudflare Pages.

---

### Task 1: My List compact badge selector

**Files:**
- Modify: `tests/canton140.test.js`
- Modify: `canton140.js`

- [ ] **Step 1: Write the failing unit test**

Import `compactMyListBadges` and verify the priority order and the My List-only hedging fallback:

```js
test('selects My List mobile badges with hedging as final priority', () => {
  assert.deepEqual(compactMyListBadges({ hedging: true }), [
    { kind: 'hedge', label: '套保' },
  ]);
  assert.deepEqual(compactMyListBadges({
    in_import: true,
    hedging: true,
    canton140_info: { phase: ['第1期'], match_grade: 'B' },
  }), [
    { kind: 'grade-b', label: 'B' },
    { kind: 'phase', label: '1期' },
  ]);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/canton140.test.js`

Expected: FAIL because `compactMyListBadges` is not exported.

- [ ] **Step 3: Implement the selector**

Refactor the existing selection logic into a private `buildCompactBadges(company, flagTypes, includeHedging)` helper. Keep `compactCantonBadges` with `includeHedging=false`, and export `compactMyListBadges` with `includeHedging=true`. Add `{ kind: 'hedge', label: '套保' }` after the bonded/import signal and before slicing to two.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `node --test tests/canton140.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add canton140.js tests/canton140.test.js
git commit -m "feat: select compact My List badges"
```

### Task 2: Home preview and responsive My List rows

**Files:**
- Modify: `tests/test_hunter_hub_ui.py`
- Modify: `index.html`

- [ ] **Step 1: Write failing UI contract tests**

Assert that `renderMyListHome` no longer outputs `mylist-row-badge` or `scaleBadge(d.scale)`, My List rows receive the compact-row class, and `compactBadges` calls `Canton140.compactMyListBadges` for `currentCombo.key==='my_list'`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `python3 -m unittest tests.test_hunter_hub_ui -v`

Expected: FAIL because the home badge and Canton-only responsive class remain.

- [ ] **Step 3: Remove homepage preview badges**

Delete `.mylist-row-badge` and remove this markup from `renderMyListHome`:

```html
<div class="mylist-row-badge">${scaleBadge(d.scale)}</div>
```

- [ ] **Step 4: Apply compact rows to both contexts**

Rename the responsive selector from `.canton-row` to `.compact-row`. Add that class when the active key is `canton140_hedging` or `my_list`. In `compactBadges(d)`, call `compactMyListBadges` for My List and `compactCantonBadges` otherwise. Map `hedge` to `badge-hedge`.

- [ ] **Step 5: Run UI and syntax tests**

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
git commit -m "fix: clarify My List on mobile"
```

### Task 3: Visual verification and release

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the complete regression suite**

```bash
node --test tests/canton140.test.js
python3 -m unittest tests.test_build_canton140 tests.test_hunter_hub_ui tests.test_worker_security -v
node tests/validate_canton140_integration.mjs
bash -n scripts/deploy_pages.sh
git diff --check
```

Expected: all tests pass and integration reports `base=2475 canton=300 merged=2741`.

- [ ] **Step 2: Verify at a true 390px viewport**

Seed a three-company My List in the preview and open the full My List. Confirm the homepage contains names only, the full list contains no more than two compact badges per row, and neither state clips or overflows.

- [ ] **Step 3: Deploy and verify production**

Run `bash scripts/deploy_pages.sh`, compare live `index.html` and `canton140.js` to local files, verify D1 endpoints still return arrays, and confirm a representative `.xlsx` URL returns 404 with `Cache-Control: no-store`.

- [ ] **Step 4: Merge and push**

Fast-forward `main`, rerun the regression suite on the merged result, push `origin/main`, and delete the feature branch.
