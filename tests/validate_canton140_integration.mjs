import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mergeCanton140Data, normalizeCompanyName } = require('../canton140.js');
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url), 'utf8'));
const canton = JSON.parse(fs.readFileSync(new URL('../canton140.json', import.meta.url), 'utf8'));
const merged = mergeCanton140Data(base, canton);

assert.equal(base.length, 2475);
assert.equal(canton.length, 300);
assert.equal(merged.length, 2741);
assert.equal(merged.filter(row => row.canton140).length, 300);
assert.equal(canton.filter(row => row.match_grade === 'A').length, 294);
assert.equal(canton.filter(row => row.match_grade === 'B').length, 6);
assert.equal(canton.filter(row => row.city).length, 285);
assert.equal(canton.filter(row => row.capital).length, 285);
assert.equal(canton.filter(row => row.city === '深圳市').length, 271);
assert.equal(canton.filter(row => !row.city).length, 15);
assert.equal(new Set(merged.map(row => row.id)).size, merged.length);
assert.equal(
  new Set(canton.map(row => normalizeCompanyName(row.name))).size,
  canton.length,
);

const existingCantonRows = canton.filter(row => base.some(baseRow => baseRow.id === row.id));
assert.equal(existingCantonRows.length, 34);
for (const cantonRow of existingCantonRows) {
  const before = base.find(row => row.id === cantonRow.id);
  const after = merged.find(row => row.id === cantonRow.id);
  assert.equal(after.city, before.city);
  assert.equal(after.capital, before.capital);
  assert.equal(after.canton140_info.supplier_no, cantonRow.supplier_no);
}

console.log('Canton140 integration OK: base=2475 canton=300 merged=2741');
