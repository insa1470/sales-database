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
        status: '',
        legal_rep: '',
        founded: '',
        credit_code: '',
        district: '',
        email: '',
        phone: '',
        more_phones: '',
        website: '',
        staff: '',
        scale: '',
        biz_type: '',
        industry_main: '',
        industry_sub: '',
        scope: '',
        intro: '',
        province: info.province || '',
        city: info.city || '',
        address: info.address || '',
        capital: info.capital || '',
        source: '广交会',
        hedging: true,
        in_import: false,
        is_bonded: false,
        canton140: true,
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
