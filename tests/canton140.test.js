const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCompanyName,
  mergeCanton140Data,
  cantonCity,
  matchesCantonPhase,
  compactCantonBadges,
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

test('selects at most two compact mobile badges by priority', () => {
  const company = {
    in_import: true,
    hedging: true,
    scale: 'L(大型)',
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

test('shortens trade signals and hides redundant A grade and hedging badges', () => {
  const importer = {
    in_import: true,
    hedging: true,
    canton140_info: { phase: ['第2期'], match_grade: 'A' },
  };
  const bonded = {
    is_bonded: true,
    hedging: true,
    canton140_info: { phase: [], match_grade: 'A' },
  };

  assert.deepEqual(compactCantonBadges(importer), [
    { kind: 'phase', label: '2期' },
    { kind: 'import', label: '进出口' },
  ]);
  assert.deepEqual(compactCantonBadges(bonded), [
    { kind: 'bonded', label: '保税' },
  ]);
});
